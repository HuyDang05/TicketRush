import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SeatmapCanvas from '../../components/seatmap/SeatmapCanvas';
import SeatmapPreview from '../../components/seatmap/SeatmapPreview';
import eventService from '../../services/event.service';
import { generateSeatsForZone } from '../../lib/seatGenerator';
import './SeatmapEditorPage.css';

// ── Constants ──────────────────────────────────────────────────────────────────
const ZONE_COLORS = [
  '#c8860a', '#3d6828', '#1a4a7a', '#7a1a3a',
  '#1a5a5a', '#5a1a7a', '#6b3a1a', '#1a3a6b',
];

const mkZoneId = () => `z_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function countZoneSeats(z) {
  if (z.blockType === 'floor')
    return (z.children || []).reduce((s, c) => s + countZoneSeats(c), 0);
  if (z.blockType === 'arc') {
    const rows = z.config?.rows ?? z.rows ?? 3;
    const base = z.config?.baseSeats ?? 10;
    if (z.config?.seatsPerRow)
      return String(z.config.seatsPerRow).split(',').reduce((s, v) => s + (parseInt(v.trim()) || 0), 0);
    return Array.from({ length: rows }, (_, i) => base + i * 2).reduce((a, b) => a + b, 0);
  }
  if (z.blockType === 'table')
    return (z.config?.tableCount ?? 1) * (z.config?.seatsPerTable ?? 8);
  return (z.rows ?? 5) * (z.cols ?? 10);
}

function makeZone(overrides = {}) {
  return {
    id: mkZoneId(),
    name: 'Khu mới',
    color: ZONE_COLORS[Math.floor(Math.random() * ZONE_COLORS.length)],
    blockType: 'rows',
    config: { rows: 5, cols: 10 },
    rows: 5,
    cols: 10,
    price: 500000,
    x: 60,
    y: 60,
    rotation: 0,
    ...overrides,
  };
}

function makeFloor(overrides = {}) {
  return {
    id: mkZoneId(),
    name: 'Tang 1',
    color: ZONE_COLORS[Math.floor(Math.random() * ZONE_COLORS.length)],
    blockType: 'floor',
    grouped: false,
    config: {},
    children: [],
    x: 60,
    y: 60,
    width: 400,
    height: 300,
    rotation: 0,
    ...overrides,
  };
}

// ── Block Palette Cards ────────────────────────────────────────────────────────
const BLOCK_TYPES = [
  { type: 'rows',  icon: '▬', name: 'Hàng thẳng',  desc: 'rows × cols',    defaultConfig: { rows: 5, cols: 10 } },
  { type: 'arc',   icon: '◔', name: 'Vòng cung',    desc: 'arc theater',   defaultConfig: { radius: 200, startAngle: -60, endAngle: 60, rows: 3, baseSeats: 10 } },
  { type: 'table', icon: '⬤', name: 'Bàn tròn',     desc: 'table layout',  defaultConfig: { tableCount: 4, seatsPerTable: 8, tableRadius: 40 } },
  { type: 'floor', icon: '▦', name: 'Tầng lầu',     desc: 'multi-level',   defaultConfig: {} },
];

const CHILD_BLOCK_TYPES = BLOCK_TYPES.filter(b => b.type !== 'floor');

// ── Shared UI Components ───────────────────────────────────────────────────────
const PropRow = ({ label, children }) => (
  <div className="prop-row">
    <span className="prop-row__label">{label}</span>
    {children}
  </div>
);

const StepperRow = ({ label, value, onDec, onInc }) => (
  <div className="prop-row">
    <span className="prop-row__label">{label}</span>
    <div className="sme-stepper">
      <button onClick={onDec} className="sme-stepper__btn">−</button>
      <span className="sme-stepper__value">{value}</span>
      <button onClick={onInc} className="sme-stepper__btn">+</button>
    </div>
  </div>
);

const SliderRow = ({ label, min, max, value, onChange: onCh, suffix = '' }) => (
  <div className="slider-row">
    <span className="slider-row__label">{label}</span>
    <input type="range" min={min} max={max} value={value} onChange={e => onCh(Number(e.target.value))}
      className="slider-row__input" />
    <span className="slider-row__value">{value}{suffix}</span>
  </div>
);

const SectionHead = ({ open, onClick, children }) => (
  <div
    onClick={onClick}
    className={`section-head${open ? ' section-head--mb' : ''}`}
  >
    {children}
    <span className="section-head__arrow">{open ? '▾' : '▸'}</span>
  </div>
);

// ── Property Panel ─────────────────────────────────────────────────────────────
function PropertyPanel({ zone, onChange, onRemove, onFlip }) {
  const [openSections, setOpenSections] = useState({ basic: true, shape: true, position: true });
  const [colorInput, setColorInput] = useState(zone.color);

  useEffect(() => { setColorInput(zone.color); }, [zone.color]);

  const toggleSection = (key) =>
    setOpenSections(s => ({ ...s, [key]: !s[key] }));

  const bt = zone.blockType || 'rows';
  const totalSeats = countZoneSeats(zone);

  const focusOn  = e => { e.target.style.borderColor = '#FF6B35'; };
  const focusOff = e => { e.target.style.borderColor = '#333'; };



  const updateConfig = (key, val) =>
    onChange('config', { ...(zone.config || {}), [key]: val });

  const handleShapeChange = (newShape) => {
    const defaults = {
      rows:  { rows: 5, cols: 10 },
      arc:   { radius: 200, startAngle: -60, endAngle: 60, rows: 3, baseSeats: 10 },
      table: { tableCount: 4, seatsPerTable: 8, tableRadius: 40 },
    };
    onChange('blockType', newShape);
    onChange('config', defaults[newShape]);
    if (newShape === 'rows') { onChange('rows', 5); onChange('cols', 10); }
  };

  const arcRows = zone.config?.rows ?? zone.rows ?? 3;
  const arcBase = zone.config?.baseSeats ?? 10;
  const seatsPerRowStr = zone.config?.seatsPerRow
    ?? Array.from({ length: arcRows }, (_, i) => arcBase + i * 2).join(', ');

  return (
    <div className="prop-panel">
      {/* Panel header */}
      <div className="prop-panel__header">
        <div className="prop-panel__title">
          {zone.name}
        </div>
        <button onClick={onRemove} title="Xóa khu" className="prop-panel__delete-btn">🗑</button>
      </div>

      <div className="prop-panel__body">
        {/* Basic Properties */}
        <div className="prop-panel__section">
          <SectionHead open={openSections.basic} onClick={() => toggleSection('basic')}>Thuộc tính cơ bản</SectionHead>
          {openSections.basic && (
            <>
              <PropRow label="Tên khu">
                <input value={zone.name} className="sme-input" onFocus={focusOn} onBlur={focusOff}
                  onChange={e => onChange('name', e.target.value)} />
              </PropRow>
              <PropRow label="Hình dạng">
                <select value={bt} className="sme-select" onFocus={focusOn} onBlur={focusOff}
                  onChange={e => handleShapeChange(e.target.value)}>
                  <option value="rows" className="sme-option">Hàng thẳng</option>
                  <option value="arc"  className="sme-option">Vòng cung</option>
                  <option value="table" className="sme-option">Bàn tròn</option>
                </select>
              </PropRow>
              <PropRow label="Màu sắc">
                <div className="sme-color-row">
                  <div className="sme-color-preview" style={{ background: zone.color }} />
                  <input value={colorInput} maxLength={7} className="sme-input"
                    onFocus={focusOn}
                    onBlur={e => { focusOff(e); setColorInput(zone.color); }}
                    onChange={e => {
                      setColorInput(e.target.value);
                      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) onChange('color', e.target.value);
                    }} />
                </div>
              </PropRow>
              {/* Color swatches */}
              <div className="sme-swatches">
                {ZONE_COLORS.map(c => (
                  <button key={c} onClick={() => { onChange('color', c); setColorInput(c); }}
                    className="sme-swatch"
                    style={{ background: c, border: zone.color === c ? '2px solid #fff' : '1px solid transparent' }} />
                ))}
              </div>
              <PropRow label="Giá vé">
                <div className="sme-price-wrap">
                  <input type="number" value={zone.price ?? 0} min={0} step={50000}
                    className="sme-price-input"
                    onFocus={e => { e.target.parentElement.style.borderColor = '#FF6B35'; }}
                    onBlur={e => { e.target.parentElement.style.borderColor = '#333'; }}
                    onChange={e => onChange('price', Number(e.target.value))} />
                  <span className="sme-price-suffix">đ</span>
                </div>
              </PropRow>
            </>
          )}
        </div>

        {/* Shape Config */}
        <div className="prop-panel__section">
          {bt === 'arc' && (
            <>
              <SectionHead open={openSections.shape} onClick={() => toggleSection('shape')}>Cấu hình vòng cung</SectionHead>
              {openSections.shape && (
                <>
                  <SliderRow label="Bán kính" min={50} max={500} value={zone.config?.radius ?? 200}
                    onChange={v => updateConfig('radius', v)} />
                  <PropRow label="Góc bắt đầu">
                    <input type="number" value={zone.config?.startAngle ?? -60} min={-180} max={180}
                      className="sme-input" onFocus={focusOn} onBlur={focusOff}
                      onChange={e => updateConfig('startAngle', Number(e.target.value))} />
                  </PropRow>
                  <PropRow label="Góc kết thúc">
                    <input type="number" value={zone.config?.endAngle ?? 60} min={-180} max={180}
                      className="sme-input" onFocus={focusOn} onBlur={focusOff}
                      onChange={e => updateConfig('endAngle', Number(e.target.value))} />
                  </PropRow>
                  <StepperRow label="Số hàng"
                    value={zone.config?.rows ?? 3}
                    onDec={() => updateConfig('rows', Math.max(1, (zone.config?.rows ?? 3) - 1))}
                    onInc={() => updateConfig('rows', Math.min(20, (zone.config?.rows ?? 3) + 1))} />
                  <PropRow label="Ghế/hàng">
                    <input type="text" value={seatsPerRowStr} placeholder="10, 12, 14"
                      className="sme-input" onFocus={focusOn} onBlur={focusOff}
                      onChange={e => updateConfig('seatsPerRow', e.target.value)} />
                  </PropRow>
                  <PropRow label="Hướng">
                    <button
                      className="sme-flip-btn"
                      onClick={() => onFlip?.()}
                    >
                      ↕ Lật ngược
                    </button>
                  </PropRow>
                </>
              )}
            </>
          )}
          {bt === 'rows' && (
            <>
              <SectionHead open={openSections.shape} onClick={() => toggleSection('shape')}>Cấu hình hàng ghế</SectionHead>
              {openSections.shape && (
                <>
                  <StepperRow label="Số hàng"
                    value={zone.rows ?? 5}
                    onDec={() => onChange('rows', Math.max(1, (zone.rows ?? 5) - 1))}
                    onInc={() => onChange('rows', Math.min(50, (zone.rows ?? 5) + 1))} />
                  <StepperRow label="Ghế / hàng"
                    value={zone.cols ?? 10}
                    onDec={() => onChange('cols', Math.max(1, (zone.cols ?? 10) - 1))}
                    onInc={() => onChange('cols', Math.min(60, (zone.cols ?? 10) + 1))} />
                </>
              )}
            </>
          )}
          {bt === 'table' && (
            <>
              <SectionHead open={openSections.shape} onClick={() => toggleSection('shape')}>Cấu hình bàn tròn</SectionHead>
              {openSections.shape && (
                <>
                  <StepperRow label="Số bàn"
                    value={zone.config?.tableCount ?? 4}
                    onDec={() => updateConfig('tableCount', Math.max(1, (zone.config?.tableCount ?? 4) - 1))}
                    onInc={() => updateConfig('tableCount', Math.min(50, (zone.config?.tableCount ?? 4) + 1))} />
                  <StepperRow label="Ghế / bàn"
                    value={zone.config?.seatsPerTable ?? 8}
                    onDec={() => updateConfig('seatsPerTable', Math.max(2, (zone.config?.seatsPerTable ?? 8) - 1))}
                    onInc={() => updateConfig('seatsPerTable', Math.min(20, (zone.config?.seatsPerTable ?? 8) + 1))} />
                </>
              )}
            </>
          )}
        </div>

        {/* Position */}
        <div className="prop-panel__section">
          <SectionHead open={openSections.position} onClick={() => toggleSection('position')}>Vị trí</SectionHead>
          {openSections.position && (
            <>
              <div className="sme-xy-row">
                <div className="sme-xy-col">
                  <div className="sme-xy-label">X</div>
                  <input type="number" value={Math.round(zone.x ?? 0)}
                    className="sme-input" onFocus={focusOn} onBlur={focusOff}
                    onChange={e => onChange('x', Number(e.target.value))} />
                </div>
                <div className="sme-xy-col">
                  <div className="sme-xy-label">Y</div>
                  <input type="number" value={Math.round(zone.y ?? 0)}
                    className="sme-input" onFocus={focusOn} onBlur={focusOff}
                    onChange={e => onChange('y', Number(e.target.value))} />
                </div>
              </div>
              <SliderRow label="Xoay" min={0} max={360} value={zone.rotation ?? 0} suffix="°"
                onChange={v => onChange('rotation', v)} />
            </>
          )}
        </div>

        {/* Stats */}
        <div className="sme-stats">
          {[
            { label: 'Tổng ghế',    value: totalSeats.toLocaleString('vi-VN'),           cls: 'sme-stats__value--green' },
            { label: 'Giá/ghế',     value: (zone.price || 0).toLocaleString('vi-VN') + 'đ', cls: 'sme-stats__value--orange' },
            { label: 'Tổng giá trị',value: ((totalSeats * (zone.price || 0)) / 1e6).toFixed(1) + 'tr đ', cls: 'sme-stats__value--white' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="sme-stats__row">
              <span className="sme-stats__label">{label}</span>
              <span className={`sme-stats__value ${cls}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Floor Property Panel ───────────────────────────────────────────────────────
function FloorPropertyPanel({ zone, ungroupedChildren, onChange, onRemove, onAddChild, onRemoveChild, onChangeChild, onGroup, onUngroup, selectedChildId, onSelectChild }) {
  const [colorInput, setColorInput] = useState(zone.color);
  useEffect(() => { setColorInput(zone.color); }, [zone.color]);

  const focusOn  = e => { e.target.style.borderColor = '#FF6B35'; };
  const focusOff = e => { e.target.style.borderColor = '#333'; };

  const totalSeats = countZoneSeats(zone);

  return (
    <div className="prop-panel">
      {/* Header */}
      <div className="prop-panel__header">
        <div className="prop-panel__title">
          {zone.name}
        </div>
        <span className="floor-tag">TANG</span>
        {zone.grouped ? (
          <button
            onClick={onUngroup}
            title="Tach cac khoi seat thanh doc lap"
            className="floor-ungroup-btn"
          >Tach nhom</button>
        ) : (
          <button
            onClick={onGroup}
            title="Gom cac khoi seat ben trong thanh 1 tang"
            className="floor-group-btn"
          >Group</button>
        )}
        <button onClick={onRemove} title="Xoa tang" className="prop-panel__delete-btn">🗑</button>
      </div>

      <div className="prop-panel__body">
        {/* Floor basic props */}
        <div className="prop-panel__section">
          <div className="floor-section-label">
            Thong tin tang
          </div>
          <div className="prop-row">
            <span className="prop-row__label">Ten tang</span>
            <input value={zone.name} className="sme-input" onFocus={focusOn} onBlur={focusOff}
              onChange={e => onChange('name', e.target.value)} />
          </div>
          <div className="prop-row">
            <span className="prop-row__label">Mau sac</span>
            <div className="sme-color-row">
              <div className="sme-color-preview--sm" style={{ background: zone.color }} />
              <input value={colorInput} maxLength={7} className="sme-input"
                onFocus={focusOn}
                onBlur={e => { focusOff(e); setColorInput(zone.color); }}
                onChange={e => {
                  setColorInput(e.target.value);
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) onChange('color', e.target.value);
                }} />
            </div>
          </div>
          <div className="sme-swatches--floor">
            {ZONE_COLORS.map(c => (
              <button key={c} onClick={() => { onChange('color', c); setColorInput(c); }}
                className="sme-swatch"
                style={{ background: c, border: zone.color === c ? '2px solid #fff' : '1px solid transparent' }} />
            ))}
          </div>
        </div>

        {/* Children list */}
        <div className="prop-panel__section">
          {(() => {
            const displayChildren = zone.grouped ? (zone.children || []) : (ungroupedChildren || []);
            return (
              <>
                <div className="floor-section-label">
                  Khu ghe trong tang ({displayChildren.length})
                  {!zone.grouped && displayChildren.length > 0 && (
                    <span className="floor-ungroup-warn">— chua group</span>
                  )}
                </div>
                {displayChildren.map(child => (
                  <div key={child.id}
                    onClick={() => onSelectChild(child.id)}
                    className="floor-child-item"
                    style={{
                      background: selectedChildId === child.id ? 'rgba(255,107,53,.1)' : '#1A1A1A',
                      border: `1px solid ${selectedChildId === child.id ? 'rgba(255,107,53,.4)' : '#2A2A2A'}`,
                    }}
                  >
                    <div className="floor-child-item__dot" style={{ background: child.color }} />
                    <span className="floor-child-item__name">{child.name}</span>
                    <span className="floor-child-item__count">{countZoneSeats(child)}</span>
                    <button onClick={e => { e.stopPropagation(); onRemoveChild(child.id); }}
                      className="floor-child-item__remove">✕</button>
                  </div>
                ))}
                {displayChildren.length === 0 && (
                  <div className="floor-no-children">Chua co khu ghe nao</div>
                )}
                {/* Add child block buttons */}
                <div className="floor-add-label">Them khu ghe:</div>
                <div className="floor-add-btns">
                  {CHILD_BLOCK_TYPES.map(bt => (
                    <button key={bt.type} onClick={() => onAddChild(bt.type, bt.defaultConfig)}
                      className="floor-add-btn">
                      <span>{bt.icon}</span> {bt.name}
                    </button>
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        {/* Selected child editor (inline) */}
        {selectedChildId && (() => {
          const allChildren = zone.grouped ? (zone.children || []) : (ungroupedChildren || []);
          const child = allChildren.find(c => c.id === selectedChildId);
          if (!child) return null;
          return (
            <div className="prop-panel__section">
              <div className="floor-section-label floor-section-label--orange">
                Chinh sua: {child.name}
              </div>
              <ChildEditor child={child} onChange={(key, val) => onChangeChild(child.id, key, val)} />
            </div>
          );
        })()}

        {/* Stats */}
        <div className="sme-stats">
          <div className="sme-stats__row">
            <span className="sme-stats__label">Tong ghe (tang)</span>
            <span className="sme-stats__value sme-stats__value--green">{totalSeats.toLocaleString('vi-VN')}</span>
          </div>
          <div className="sme-stats__row">
            <span className="sme-stats__label">So khu ghe</span>
            <span className="sme-stats__value sme-stats__value--orange">{(zone.grouped ? (zone.children || []) : (ungroupedChildren || [])).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Child zone inline editor (used inside FloorPropertyPanel) ─────────────────
function ChildEditor({ child, onChange }) {
  const bt = child.blockType || 'rows';
  const updateConfig = (key, val) => onChange('config', { ...(child.config || {}), [key]: val });

  const focusOn  = e => { e.target.style.borderColor = '#FF6B35'; };
  const focusOff = e => { e.target.style.borderColor = '#333'; };



  return (
    <>
      <PropRow label="Ten khu">
        <input value={child.name} className="sme-input" onFocus={focusOn} onBlur={focusOff}
          onChange={e => onChange('name', e.target.value)} />
      </PropRow>
      <PropRow label="Gia ve">
        <div className="sme-price-wrap">
          <input type="number" value={child.price ?? 0} min={0} step={50000}
            className="sme-price-input"
            onFocus={e => { e.target.parentElement.style.borderColor = '#FF6B35'; }}
            onBlur={e => { e.target.parentElement.style.borderColor = '#333'; }}
            onChange={e => onChange('price', Number(e.target.value))} />
          <span className="sme-price-suffix">d</span>
        </div>
      </PropRow>
      {bt === 'rows' && (
        <>
          <StepperRow label="So hang" value={child.rows ?? 5}
            onDec={() => onChange('rows', Math.max(1, (child.rows ?? 5) - 1))}
            onInc={() => onChange('rows', Math.min(50, (child.rows ?? 5) + 1))} />
          <StepperRow label="Ghe / hang" value={child.cols ?? 10}
            onDec={() => onChange('cols', Math.max(1, (child.cols ?? 10) - 1))}
            onInc={() => onChange('cols', Math.min(60, (child.cols ?? 10) + 1))} />
        </>
      )}
      {bt === 'arc' && (
        <>
          <StepperRow label="So hang" value={child.config?.rows ?? 3}
            onDec={() => updateConfig('rows', Math.max(1, (child.config?.rows ?? 3) - 1))}
            onInc={() => updateConfig('rows', Math.min(20, (child.config?.rows ?? 3) + 1))} />
          <StepperRow label="Ghe co so" value={child.config?.baseSeats ?? 10}
            onDec={() => updateConfig('baseSeats', Math.max(1, (child.config?.baseSeats ?? 10) - 1))}
            onInc={() => updateConfig('baseSeats', Math.min(60, (child.config?.baseSeats ?? 10) + 1))} />
        </>
      )}
      {bt === 'table' && (
        <>
          <StepperRow label="So ban" value={child.config?.tableCount ?? 4}
            onDec={() => updateConfig('tableCount', Math.max(1, (child.config?.tableCount ?? 4) - 1))}
            onInc={() => updateConfig('tableCount', Math.min(50, (child.config?.tableCount ?? 4) + 1))} />
          <StepperRow label="Ghe / ban" value={child.config?.seatsPerTable ?? 8}
            onDec={() => updateConfig('seatsPerTable', Math.max(2, (child.config?.seatsPerTable ?? 8) - 1))}
            onInc={() => updateConfig('seatsPerTable', Math.min(20, (child.config?.seatsPerTable ?? 8) + 1))} />
        </>
      )}
    </>
  );
}

// ── Empty State for right panel ────────────────────────────────────────────────
function EmptyPanel() {
  return (
    <div className="empty-panel">
      <svg width="48" height="48" fill="none" stroke="#333" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
      </svg>
      <p className="empty-panel__hint">Chọn khu ghế để chỉnh sửa</p>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  const isError = msg.startsWith('⚠') || msg.startsWith('✗');
  return (
    <div className={`sme-toast ${isError ? 'sme-toast--error' : 'sme-toast--success'}`}>
      {msg}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SeatmapEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [seatmapVersion, setSeatmapVersion] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [showGrid, setShowGrid]     = useState(true);
  const [measureMode, setMeasureMode] = useState(false);
  const [bgImage, setBgImage]       = useState(null);
  const bgFileRef = useRef(null);
  const [zones, setZones]           = useState([]);

  // Load
  useEffect(() => {
    if (!id) { setLoading(false); return; }
    Promise.all([
      eventService.getSeatmap(id),
      eventService.getAdminEventById(id).catch(() => null),
    ])
      .then(([seatmapRes, eventRes]) => {
        const { seatmapJson, seatmapVersion: ver } = seatmapRes.data;
        setSeatmapVersion(ver ?? 1);
        if (seatmapJson?.zones?.length) {
          setZones(seatmapJson.zones.map((z, i) => ({
            id:        z.id        || mkZoneId(),
            name:      z.name      || `Khu ${i + 1}`,
            color:     z.color     || ZONE_COLORS[i % ZONE_COLORS.length],
            blockType: z.blockType || 'rows',
            config:    z.config    || {},
            rows:      z.config?.rows ?? z.rows ?? 5,
            cols:      z.config?.cols ?? z.cols ?? 10,
            price:     typeof z.price === 'number' ? z.price : Number(z.price) || 500000,
            x:         z.x        ?? 60,
            y:         z.y        ?? 60,
            rotation:  z.rotation ?? 0,
          })));
        }
        const ev = eventRes?.data?.event || eventRes?.data || null;
        setEvent(ev);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const addZone = useCallback((blockType = 'rows', defaultConfig = null, dropPos = null) => {
    if (blockType === 'floor') {
      const f = makeFloor({
        name: `Tang ${zones.length + 1}`,
        color: ZONE_COLORS[zones.length % ZONE_COLORS.length],
        x: dropPos?.x ?? 80 + zones.length * 20,
        y: dropPos?.y ?? 80,
        grouped: false,
        width: 400,
        height: 300,
      });
      setZones(prev => [...prev, f]);
      setSelectedZoneId(f.id);
      setSelectedChildId(null);
      return;
    }
    const defaults = {
      rows:  { rows: 5, cols: 10 },
      arc:   { radius: 200, startAngle: -60, endAngle: 60, rows: 3, baseSeats: 10 },
      table: { tableCount: 4, seatsPerTable: 8, tableRadius: 40 },
    };
    const cfg = defaultConfig || defaults[blockType];
    const z = makeZone({
      name: `Khu ${zones.length + 1}`,
      color: ZONE_COLORS[zones.length % ZONE_COLORS.length],
      blockType,
      config: cfg,
      rows: cfg.rows ?? 5,
      cols: cfg.cols ?? 10,
      x: dropPos?.x ?? 80 + zones.length * 20,
      y: dropPos?.y ?? 80,
    });
    setZones(prev => [...prev, z]);
    setSelectedZoneId(z.id);
    setSelectedChildId(null);
  }, [zones.length]);

  const handleCanvasUpdate = useCallback((zoneId, patch) => {
    if (zoneId === '__restore__') { setZones(patch); return; }
    setZones(prev => prev.map(z => z.id === zoneId ? { ...z, ...patch } : z));
  }, []);

  const handleDropBlock = useCallback(({ type, defaultConfig, x, y }) => {
    addZone(type, defaultConfig, { x, y });
  }, [addZone]);

  const updateZone = (zoneId, key, val) =>
    setZones(prev => prev.map(z => {
      if (z.id !== zoneId) return z;
      if (key === 'config') return { ...z, config: { ...(z.config || {}), ...val } };
      // keep config.rows / config.cols in sync so canvas renders immediately
      if (key === 'rows') return { ...z, rows: val, config: { ...(z.config || {}), rows: val } };
      if (key === 'cols') return { ...z, cols: val, config: { ...(z.config || {}), cols: val } };
      return { ...z, [key]: val };
    }));

  const removeZone = useCallback((zoneId) => {
    setZones(prev => prev.filter(z => z.id !== zoneId));
    if (selectedZoneId === zoneId) { setSelectedZoneId(null); setSelectedChildId(null); }
  }, [selectedZoneId]);

  const addChildToFloor = useCallback((floorId, blockType, defaultConfig) => {
    const defaults = {
      rows:  { rows: 5, cols: 10 },
      arc:   { radius: 200, startAngle: -60, endAngle: 60, rows: 3, baseSeats: 10 },
      table: { tableCount: 4, seatsPerTable: 8, tableRadius: 40 },
    };
    const cfg = defaultConfig || defaults[blockType];

    setZones(prev => {
      const floor = prev.find(z => z.id === floorId);
      if (!floor) return prev;

      // Ungrouped: add as a top-level zone positioned inside the frame
      if (!floor.grouped) {
        const existingInFrame = prev.filter(z => z._floorId === floorId);
        const offsetX = 20 + existingInFrame.length * 20;
        const offsetY = 40 + existingInFrame.length * 20;
        const child = makeZone({
          name: `Khu ${existingInFrame.length + 1}`,
          color: ZONE_COLORS[existingInFrame.length % ZONE_COLORS.length],
          blockType, config: cfg, rows: cfg.rows ?? 5, cols: cfg.cols ?? 10,
          x: (floor.x ?? 0) + offsetX,
          y: (floor.y ?? 0) + offsetY,
          _floorId: floorId,
        });
        return [...prev, child];
      }

      // Grouped: add as child inside floor
      const child = makeZone({
        name: `Khu ${(floor.children || []).length + 1}`,
        color: ZONE_COLORS[(floor.children || []).length % ZONE_COLORS.length],
        blockType, config: cfg, rows: cfg.rows ?? 5, cols: cfg.cols ?? 10,
        x: 20, y: 40,
      });
      setSelectedChildId(child.id);
      return prev.map(z => z.id !== floorId ? z : { ...z, children: [...(z.children || []), child] });
    });
  }, []);

  const removeChildFromFloor = useCallback((floorId, childId) => {
    setZones(prev => {
      const floor = prev.find(z => z.id === floorId);
      if (!floor) return prev;
      if (!floor.grouped) {
        // Ungrouped: remove the top-level zone
        return prev.filter(z => z.id !== childId);
      }
      return prev.map(z => z.id !== floorId ? z : { ...z, children: (z.children || []).filter(c => c.id !== childId) });
    });
    setSelectedChildId(prev => prev === childId ? null : prev);
  }, []);

  // Group: collect top-level zones overlapping the frame bounds → children
  const groupFloor = useCallback((floorId) => {
    const FRAME_PAD = 20;
    setZones(prev => {
      const floor = prev.find(z => z.id === floorId);
      if (!floor) return prev;
      const fx = floor.x ?? 0;
      const fy = floor.y ?? 0;
      const fw = floor.width ?? 400;
      const fh = floor.height ?? 300;

      // Collect only zones whose position is currently inside the frame bounds
      const inside = prev.filter(z =>
        z.id !== floorId &&
        z.blockType !== 'floor' &&
        (z.x ?? 0) >= fx && (z.x ?? 0) <= fx + fw &&
        (z.y ?? 0) >= fy && (z.y ?? 0) <= fy + fh
      );

      if (inside.length === 0) return prev;

      // Convert absolute positions → frame-local coords (relative to floor top-left)
      const rawChildren = inside.map(({ _floorId: _f, ...z }) => ({
        ...z,
        x: (z.x ?? 0) - fx,
        y: (z.y ?? 0) - fy,
      }));

      // Ensure all children have x,y >= FRAME_PAD (same invariant FloorBlock expects).
      // If any child is closer to the edge than FRAME_PAD, shift all children inward
      // and move the floor frame outward by the same amount so canvas positions are preserved.
      const minX = Math.min(...rawChildren.map(c => c.x));
      const minY = Math.min(...rawChildren.map(c => c.y));
      const shiftX = minX < FRAME_PAD ? FRAME_PAD - minX : 0;
      const shiftY = minY < FRAME_PAD ? FRAME_PAD - minY : 0;

      const children = rawChildren.map(c => ({
        ...c,
        x: c.x + shiftX,
        y: c.y + shiftY,
      }));

      const newFloor = {
        ...floor,
        grouped: true,
        children,
        x: fx - shiftX,
        y: fy - shiftY,
      };

      const insideIds = new Set(inside.map(z => z.id));
      return [
        ...prev.filter(z => !insideIds.has(z.id) && z.id !== floorId),
        newFloor,
      ];
    });
    setSelectedChildId(null);
  }, []);

  // Ungroup: extract all children as top-level zones at absolute positions, set grouped:false
  const ungroupFloor = useCallback((floorId) => {
    setZones(prev => {
      const floor = prev.find(z => z.id === floorId);
      if (!floor) return prev;
      const extracted = (floor.children || []).map(({ _floorId: _f, ...child }) => ({
        ...child,
        x: (floor.x ?? 0) + (child.x ?? 0),
        y: (floor.y ?? 0) + (child.y ?? 0),
      }));
      return prev.map(z => z.id === floorId ? { ...z, grouped: false, children: [] } : z)
                 .concat(extracted);
    });
    setSelectedChildId(null);
  }, []);

  const updateChildZone = useCallback((floorId, childId, key, val) => {
    const applyKey = (obj) => {
      if (key === 'config') return { ...obj, config: { ...(obj.config || {}), ...val } };
      if (key === 'rows')   return { ...obj, rows: val, config: { ...(obj.config || {}), rows: val } };
      if (key === 'cols')   return { ...obj, cols: val, config: { ...(obj.config || {}), cols: val } };
      return { ...obj, [key]: val };
    };
    setZones(prev => {
      const floor = prev.find(z => z.id === floorId);
      if (!floor) return prev;
      if (!floor.grouped) {
        return prev.map(z => z.id !== childId ? z : applyKey(z));
      }
      return prev.map(z => {
        if (z.id !== floorId) return z;
        return { ...z, children: (z.children || []).map(c => c.id !== childId ? c : applyKey(c)) };
      });
    });
  }, []);

  // Flip (rotate 180°) around the block's own center so position stays the same.
  // Rotation pivot is (x, y) i.e. top-left corner, so we compensate x/y to keep center fixed.
  const handleFlipZone = useCallback((zoneId) => {
    setZones(prev => prev.map(z => {
      if (z.id !== zoneId) return z;
      const oldRot = (z.rotation ?? 0) * Math.PI / 180;
      const newRot = ((z.rotation ?? 0) + 180) % 360;
      const newRotRad = newRot * Math.PI / 180;
      // Approximate rendered size (use stored width/height if available)
      const SEAT_STEP = 19; // SEAT_SIZE + SEAT_GAP
      const cfg = z.config || {};
      const numRows = cfg.rows ?? z.rows ?? 3;
      const baseRadius = cfg.radius ?? 200;
      const maxR = baseRadius + (numRows - 1) * SEAT_STEP + 15;
      const naturalW = z.width  ?? maxR * 2;
      const naturalH = z.height ?? maxR * 2;
      const hw = naturalW / 2;
      const hh = naturalH / 2;
      // Center of block in canvas coords under old rotation
      const cx = (z.x ?? 0) + hw * Math.cos(oldRot) - hh * Math.sin(oldRot);
      const cy = (z.y ?? 0) + hw * Math.sin(oldRot) + hh * Math.cos(oldRot);
      // New top-left so that center stays the same under new rotation
      const nx = cx - hw * Math.cos(newRotRad) + hh * Math.sin(newRotRad);
      const ny = cy - hw * Math.sin(newRotRad) - hh * Math.cos(newRotRad);
      return { ...z, rotation: newRot, x: Math.round(nx), y: Math.round(ny) };
    }));
  }, []);

  const totalSeats   = zones.reduce((s, z) => s + countZoneSeats(z), 0);
  const totalRevenue = zones.reduce((s, z) => s + countZoneSeats(z) * (z.price || 0), 0);
  const revStr = totalRevenue >= 1e9
    ? (totalRevenue / 1e9).toFixed(2) + 'tỷ đ'
    : Math.round(totalRevenue / 1e6) + 'tr đ';

  const handleSave = useCallback(async () => {
    if (zones.length === 0) { setToast('⚠ Phải có ít nhất 1 khu vực'); return; }
    // Flatten: grouped floors expand to children; ungrouped floors are skipped (their zones are top-level); regular zones included
    const flatZones = zones.flatMap(z => {
      if (z.blockType === 'floor') return z.grouped ? (z.children || []) : [];
      if (z._floorId) return [z]; // ungrouped child still top-level
      return [z];
    });
    if (flatZones.length === 0) { setToast('⚠ Phải có ít nhất 1 khu vực có ghế'); return; }
    for (const z of flatZones) {
      if (!z.name.trim())        { setToast('⚠ Tên khu vực không được để trống'); return; }
      if ((z.price || 0) <= 0)   { setToast('⚠ Giá vé phải lớn hơn 0'); return; }
      if (countZoneSeats(z) < 1) { setToast(`⚠ Khu "${z.name}" phải có ít nhất 1 ghế`); return; }
    }
    setSaving(true);
    try {
      const seatmapPayload = {
        venue: event?.venue || '',
        zones: flatZones.map(z => {
          const generated = generateSeatsForZone(z);
          const seats = generated.map(s => ({
            id: `${z.id}_${s.row}_${s.col}`, label: s.label, row: s.row, col: s.col,
          }));
          return {
            id: z.id, name: z.name.trim(), color: z.color, price: z.price,
            blockType: z.blockType || 'rows',
            config: z.config || { rows: z.rows ?? 5, cols: z.cols ?? 10 },
            x: z.x ?? 60, y: z.y ?? 60, rotation: z.rotation ?? 0,
            seats,
          };
        }),
      };
      const res = await eventService.saveSeatmap(id, seatmapVersion, seatmapPayload);
      setSeatmapVersion(res.data.seatmapVersion);
      setToast('✓ Đã lưu sơ đồ ghế thành công');
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể lưu sơ đồ ghế';
      if (err.response?.data?.currentVersion != null)
        setSeatmapVersion(err.response.data.currentVersion);
      setToast(`⚠ ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [zones, id, seatmapVersion, event]);

  const handlePublish = useCallback(async () => {
    await handleSave();
    setTimeout(() => navigate('/admin/events'), 800);
  }, [handleSave, navigate]);

  const selectedZone = zones.find(z => z.id === selectedZoneId);

  // ── Styles ──
  const Btn = ({ onClick, disabled, children, variant = 'ghost', style: sx = {} }) => {
    const base = {
      display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
      borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
      border: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap', fontFamily: 'inherit',
      opacity: disabled ? 0.6 : 1,
    };
    const variants = {
      ghost:        { background: 'transparent', color: '#AAAAAA', border: '1px solid #333' },
      'orange-ghost': { background: 'transparent', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.5)' },
      orange:       { background: '#FF6B35', color: '#FFF', border: '1px solid #FF6B35' },
    };
    return (
      <button style={{ ...base, ...variants[variant], ...sx }} onClick={onClick} disabled={disabled}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '.85'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = disabled ? '.6' : '1'; }}>
        {children}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="sme-loading">
        Đang tải...
      </div>
    );
  }

  return (
    <div className="sme-root">
      {/* ── HEADER ── */}
      <div className="sme-header">
        {/* Left: back + breadcrumb */}
        <div className="sme-header__left">
          <div onClick={() => navigate('/admin/events')} className="sme-header__back">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </div>
          <div className="sme-header__breadcrumb">
            Admin / Sự kiện
            {event && <> / <span className="sme-header__breadcrumb-event">{event.title || event.name}</span></>}
            {' / '}<span className="sme-header__breadcrumb-page">Thiết kế ghế</span>
          </div>
        </div>

        {/* Center: title + badge */}
        <div className="sme-header__center">
          <span className="sme-header__title">Sơ đồ ghế</span>
          <span className="sme-header__badge">
            Đang chỉnh sửa
          </span>
        </div>

        {/* Right: actions */}
        <div className="sme-header__actions">
          <Btn variant="ghost" onClick={() => setShowPreview(true)}>👁 Xem trước</Btn>
          <Btn variant="orange-ghost" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu nháp'}
          </Btn>
          <Btn variant="orange" onClick={handlePublish} disabled={saving}>✓ Xuất bản</Btn>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="sme-main">

        {/* ─── LEFT SIDEBAR ─── */}
        <div className="sme-sidebar">
          <div className="sme-sidebar__section-label">
            Khối ghế
          </div>

          {BLOCK_TYPES.map(bt => (
            <div
              key={bt.type}
              className="blk-card"
              draggable
              onDragStart={e => e.dataTransfer.setData('application/x-block-type', JSON.stringify({ type: bt.type, defaultConfig: bt.defaultConfig }))}
              onClick={() => addZone(bt.type, bt.defaultConfig)}
            >
              <div className="blk-icon">{bt.icon}</div>
              <div className="sme-sidebar__blk-text">
                <div className="sme-sidebar__blk-name">{bt.name}</div>
                <div className="sme-sidebar__blk-desc">{bt.desc}</div>
              </div>
            </div>
          ))}

          <div className="sme-sidebar__divider" />

          <div className="sme-sidebar__section-label--sm">
            Công cụ
          </div>

          {/* Upload nền */}
          <div className="tool-btn" onClick={() => bgFileRef.current?.click()}>
            <span className="sme-sidebar__tool-icon">🖼</span> Upload nền
          </div>
          {bgImage && (
            <div className="tool-btn tool-btn--danger tool-btn--bg-clear"
              onClick={() => setBgImage(null)}>
              ✕ Xóa ảnh nền
            </div>
          )}
          <input ref={bgFileRef} type="file" accept="image/*" className="sme-hidden-input"
            onChange={e => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = ev => {
                const img = new window.Image();
                img.onload = () => setBgImage(img);
                img.src = ev.target.result;
              };
              reader.readAsDataURL(file);
              e.target.value = '';
            }} />

          {/* Bật lưới */}
          <div className={`tool-btn${showGrid ? ' active' : ''}`} onClick={() => setShowGrid(g => !g)}>
            <span className="sme-sidebar__tool-icon">⊞</span> Bật lưới
          </div>

          {/* Đo khoảng cách */}
          <div className={`tool-btn${measureMode ? ' active' : ''}`}
            onClick={() => setMeasureMode(m => !m)}>
            <span className="sme-sidebar__tool-icon">📐</span> Đo khoảng cách
          </div>

          {/* Xóa chọn */}
          {selectedZoneId && (
            <div className="tool-btn tool-btn--danger" onClick={() => removeZone(selectedZoneId)}>
              <span>🗑</span> Xóa chọn
            </div>
          )}

          <div className="sme-sidebar__divider" />

          {/* Zone list */}
          <div className="sme-sidebar__section-label--sm">
            Khu vực ({zones.filter(z => !z._floorId).length})
          </div>
          {zones.filter(z => !z._floorId).map(z => (
            <div key={z.id}>
              {/* Top-level zone/floor row */}
              <div
                onClick={() => { setSelectedZoneId(prev => prev === z.id ? null : z.id); setSelectedChildId(null); }}
                className="sme-zone-row"
                style={{
                  borderLeft: `2px solid ${selectedZoneId === z.id ? z.color : 'transparent'}`,
                  background: selectedZoneId === z.id ? 'rgba(255,255,255,.04)' : 'transparent',
                }}
                onMouseEnter={e => { if (selectedZoneId !== z.id) e.currentTarget.style.background = '#1E1E1E'; }}
                onMouseLeave={e => { if (selectedZoneId !== z.id) e.currentTarget.style.background = 'transparent'; }}
              >
                {z.blockType === 'floor'
                  ? <span style={{ fontSize: 11, color: z.color, flexShrink: 0 }}>▦</span>
                  : <div className="sme-zone-row__dot" style={{ background: z.color }} />}
                <span className="sme-zone-row__name">{z.name}</span>
                {z.blockType === 'floor' && (
                  <span style={{ fontSize: 9, color: z.grouped ? '#FF6B35' : '#facc15', marginRight: 4, fontWeight: 600 }}>
                    {z.grouped ? 'TANG' : 'TANG*'}
                  </span>
                )}
                <span className="sme-zone-row__count">{countZoneSeats(z)}</span>
              </div>
              {/* Floor children (indented) — grouped: from zone.children; ungrouped: from top-level zones with _floorId */}
              {z.blockType === 'floor' && selectedZoneId === z.id && (() => {
                const kids = z.grouped
                  ? (z.children || [])
                  : zones.filter(c => c._floorId === z.id);
                return kids.map(child => (
                  <div key={child.id}
                    onClick={() => setSelectedChildId(prev => prev === child.id ? null : child.id)}
                    className="sme-child-row"
                    style={{
                      borderLeft: `2px solid ${selectedChildId === child.id ? child.color : 'transparent'}`,
                      background: selectedChildId === child.id ? 'rgba(255,255,255,.03)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (selectedChildId !== child.id) e.currentTarget.style.background = '#181818'; }}
                    onMouseLeave={e => { if (selectedChildId !== child.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="sme-child-row__dot" style={{ background: child.color }} />
                    <span className="sme-child-row__name">{child.name}</span>
                    <span className="sme-child-row__count">{countZoneSeats(child)}</span>
                  </div>
                ));
              })()}
            </div>
          ))}
          {zones.length === 0 && (
            <div className="sme-zone-list__empty">
              Kéo khối từ trên hoặc nhấn Thêm
            </div>
          )}

          <div className="sme-sidebar__divider" />

          {/* History */}
          <div>
            <div
              onClick={() => setHistoryOpen(h => !h)}
              className="sme-history__toggle"
            >
              Lịch sử <span>{historyOpen ? '▾' : '▸'}</span>
            </div>
            {historyOpen && (
              <div className="sme-history__body">
                {zones.length > 0
                  ? zones.slice().reverse().slice(0, 5).map((z, i) => (
                    <div key={z.id} className={`hist-item${i === 0 ? ' latest' : ''}`}>{z.name}</div>
                  ))
                  : <div className="hist-item">Khởi tạo sơ đồ</div>}
              </div>
            )}
          </div>
        </div>

        {/* ─── CENTER CANVAS ─── */}
        <div className="sme-canvas-area">
          <SeatmapCanvas
            zones={zones}
            selectedId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
            onUpdateZone={handleCanvasUpdate}
            onDropBlock={handleDropBlock}
            onDeleteZone={removeZone}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid(g => !g)}
            measureMode={measureMode}
            onToggleMeasure={() => setMeasureMode(m => !m)}
            bgImage={bgImage}
            onBgChange={setBgImage}
          />

          {/* Status Bar */}
          <div className="sme-statusbar">
            <div className="sme-statusbar__info">
              {zones.length} khu · {totalSeats.toLocaleString('vi-VN')} ghế · Tổng giá trị: {revStr}
            </div>
            <div className="sme-statusbar__live">
              <div className="sme-statusbar__live-dot" />
              <span className="sme-statusbar__live-label">Canvas tự động lưu</span>
            </div>
            <div className="sme-statusbar__version-wrap">
              <span className="sme-statusbar__version">
                v{seatmapVersion}
              </span>
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <div className="sme-right-panel">
          {selectedZone ? (
            selectedZone.blockType === 'floor' ? (
              <FloorPropertyPanel
                zone={selectedZone}
                ungroupedChildren={zones.filter(z => z._floorId === selectedZone.id)}
                onChange={(key, val) => updateZone(selectedZone.id, key, val)}
                onRemove={() => removeZone(selectedZone.id)}
                onGroup={() => groupFloor(selectedZone.id)}
                onUngroup={() => ungroupFloor(selectedZone.id)}
                onAddChild={(blockType, cfg) => addChildToFloor(selectedZone.id, blockType, cfg)}
                onRemoveChild={(childId) => removeChildFromFloor(selectedZone.id, childId)}
                onChangeChild={(childId, key, val) => updateChildZone(selectedZone.id, childId, key, val)}
                selectedChildId={selectedChildId}
                onSelectChild={setSelectedChildId}
              />
            ) : (
              <PropertyPanel
                zone={selectedZone}
                onChange={(key, val) => updateZone(selectedZone.id, key, val)}
                onRemove={() => removeZone(selectedZone.id)}
                onFlip={() => handleFlipZone(selectedZone.id)}
              />
            )
          ) : (
            <EmptyPanel />
          )}
        </div>
      </div>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      {showPreview && <SeatmapPreview zones={zones} onClose={() => setShowPreview(false)} />}
    </div>
  );
}
