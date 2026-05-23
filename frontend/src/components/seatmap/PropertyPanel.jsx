// Purpose: Component seatmap editor/preview, xu ly ve va tuong tac voi so do ghe.
import { useState } from 'react';
import { css, cx, setNodeCss } from "../../lib/runtimeCss";
import './PropertyPanel.css';
const ZONE_COLORS = ['#c8860a', '#3d6828', '#1a4a7a', '#7a1a3a', '#1a5a5a', '#5a1a7a', '#6b3a1a', '#1a3a6b', '#FF6B35', '#e53e3e', '#805ad5', '#38a169'];
const SHAPE_OPTIONS = [{
  value: 'rows',
  label: 'Hàng thẳng'
}, {
  value: 'arc',
  label: 'Vòng cung'
}, {
  value: 'table',
  label: 'Bàn tròn'
}];
function calcTotalSeats(zone) {
  const bt = zone.blockType || 'rows';
  if (bt === 'arc') {
    const rows = zone.config?.rows ?? zone.rows ?? 3;
    const seatsPerRow = zone.config?.seatsPerRow;
    if (seatsPerRow && typeof seatsPerRow === 'string') {
      return seatsPerRow.split(',').reduce((s, v) => s + (parseInt(v.trim()) || 0), 0);
    }
    const baseSeats = zone.config?.baseSeats ?? 10;
    let total = 0;
    for (let r = 0; r < rows; r++) total += baseSeats + r * 2;
    return total;
  }
  if (bt === 'table') {
    return (zone.config?.tableCount ?? 1) * (zone.config?.seatsPerTable ?? 8);
  }
  return (zone.rows ?? 5) * (zone.cols ?? 10);
}
export default function PropertyPanel({
  zone,
  onChange,
  onRemove
}) {
  const [colorInput, setColorInput] = useState(zone.color);
  if (!zone) return null;
  const bt = zone.blockType || 'rows';
  const totalSeats = calcTotalSeats(zone);
  const INPUT = {
    width: '100%',
    background: '#141414',
    border: '1px solid #2e2e2e',
    borderRadius: 7,
    padding: '8px 11px',
    color: '#fff',
    fontFamily: 'inherit',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color .15s'
  };
  const focusOn = e => {
setNodeCss(e.target, { borderColor: '#FF6B35' }, 'borderColor');
  };
  const focusOff = e => {
setNodeCss(e.target, { borderColor: '#2e2e2e' }, 'borderColor');
  };
  const Label = ({
    children
  }) => <div className={css({
    fontSize: 10,
    fontWeight: 800,
    color: '#888',
    letterSpacing: .8,
    textTransform: 'uppercase',
    marginBottom: 5
  }, "PropertyPanel")}>
      {children}
    </div>;
  const Field = ({
    label,
    children
  }) => <div className={css({
    marginBottom: 12
  }, "PropertyPanel")}>
      <Label>{label}</Label>
      {children}
    </div>;
  const Divider = ({
    label
  }) => <div className={css({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '16px 0 12px'
  }, "PropertyPanel")}>
      <div className={css({
      height: 1,
      flex: 1,
      background: '#2a2a2a'
    }, "PropertyPanel")} />
      <span className={css({
      fontSize: 9,
      fontWeight: 800,
      color: '#555',
      letterSpacing: 1,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap'
    }, "PropertyPanel")}>{label}</span>
      <div className={css({
      height: 1,
      flex: 1,
      background: '#2a2a2a'
    }, "PropertyPanel")} />
    </div>;
  const updateConfig = (key, val) => onChange('config', {
    ...(zone.config || {}),
    [key]: val
  });
  const handleShapeChange = newShape => {
    const defaults = {
      rows: {
        rows: 5,
        cols: 10,
        aisleAfterCol: []
      },
      arc: {
        radius: 200,
        startAngle: -60,
        endAngle: 60,
        rows: 3,
        baseSeats: 10
      },
      table: {
        seatsPerTable: 8,
        tableRadius: 40,
        tableCount: 1
      }
    };
    onChange('blockType', newShape);
    onChange('config', defaults[newShape]);
    if (newShape === 'rows') {
      onChange('rows', 5);
      onChange('cols', 10);
    }
  };
  const handleColorHex = val => {
    setColorInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) onChange('color', val);
  };
  const arcRows = zone.config?.rows ?? zone.rows ?? 3;
  const arcBase = zone.config?.baseSeats ?? 10;
  const seatsPerRowStr = zone.config?.seatsPerRow ?? Array.from({
    length: arcRows
  }, (_, i) => arcBase + i * 2).join(', ');
  return <div className={css({
    background: '#181818',
    border: `1.5px solid ${zone.color}44`,
    borderRadius: 11,
    padding: '16px 14px',
    animation: 'ppFadeIn .18s ease'
  }, "PropertyPanel")}>
      {/* Header */}
      <div className={css({
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16
    }, "PropertyPanel")}>
        <div className={css({
        width: 13,
        height: 13,
        borderRadius: 4,
        background: zone.color,
        flexShrink: 0
      }, "PropertyPanel")} />
        <span className={css({
        fontSize: 10,
        fontWeight: 800,
        color: '#AAAAAA',
        letterSpacing: 1.2,
        textTransform: 'uppercase'
      }, "PropertyPanel")}>
          Zone Properties
        </span>
      </div>

      {/* Tên khu */}
      <Field label="Tên khu">
        <input type="text" value={zone.name} className={css(INPUT, "PropertyPanel")} onFocus={focusOn} onBlur={focusOff} onChange={e => onChange('name', e.target.value)} />
      </Field>

      {/* Hình dạng */}
      <Field label="Hình dạng">
        <select value={bt} className={css({
        ...INPUT,
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: 28
      }, "PropertyPanel")} onFocus={focusOn} onBlur={focusOff} onChange={e => handleShapeChange(e.target.value)}>
          {SHAPE_OPTIONS.map(o => <option key={o.value} value={o.value} className={css({
          background: '#1a1a1a'
        }, "PropertyPanel")}>{o.label}</option>)}
        </select>
      </Field>

      {/* Màu */}
      <Field label="Màu">
        <div className={css({
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        marginBottom: 8
      }, "PropertyPanel")}>
          {ZONE_COLORS.map(c => <button key={c} onClick={() => {
          onChange('color', c);
          setColorInput(c);
        }} className={css({
          width: 22,
          height: 22,
          borderRadius: 5,
          background: c,
          cursor: 'pointer',
          border: zone.color === c ? '2.5px solid #fff' : '2px solid transparent',
          transition: 'transform .12s'
        }, "PropertyPanel")} onMouseEnter={e => {
setNodeCss(e.currentTarget, { transform: 'scale(1.2)' }, 'transform');
        }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { transform: 'scale(1)' }, 'transform');
        }} />)}
        </div>
        <div className={css({
        display: 'flex',
        gap: 8,
        alignItems: 'center'
      }, "PropertyPanel")}>
          <div className={css({
          width: 30,
          height: 30,
          borderRadius: 6,
          background: zone.color,
          flexShrink: 0,
          border: '1px solid #333'
        }, "PropertyPanel")} />
          <input type="text" value={colorInput} className={css({
          ...INPUT,
          fontFamily: 'monospace',
          flex: 1
        }, "PropertyPanel")} onFocus={focusOn} onBlur={e => {
          focusOff(e);
          setColorInput(zone.color);
        }} onChange={e => handleColorHex(e.target.value)} maxLength={7} />
        </div>
      </Field>

      {/* Giá / ghế */}
      <Field label="Giá / ghế (VNĐ)">
        <input type="number" value={zone.price ?? 0} min={0} step={50000} className={css(INPUT, "PropertyPanel")} onFocus={focusOn} onBlur={focusOff} onChange={e => onChange('price', Number(e.target.value))} />
        {zone.price > 0 && <div className={css({
        fontSize: 11,
        color: '#888',
        marginTop: 4
      }, "PropertyPanel")}>
            {zone.price.toLocaleString('vi-VN')}đ
          </div>}
      </Field>

      {/* ── Vòng cung ── */}
      {bt === 'arc' && <>
          <Divider label="Cấu hình vòng cung" />

          <Field label="Bán kính (px)">
            <input type="number" value={zone.config?.radius ?? 200} min={50} max={800} className={css(INPUT, "PropertyPanel")} onFocus={focusOn} onBlur={focusOff} onChange={e => updateConfig('radius', Number(e.target.value))} />
          </Field>

          <div className={css({
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        marginBottom: 12
      }, "PropertyPanel")}>
            <div>
              <Label>Góc bắt đầu (°)</Label>
              <input type="number" value={zone.config?.startAngle ?? -60} min={-180} max={180} className={css(INPUT, "PropertyPanel")} onFocus={focusOn} onBlur={focusOff} onChange={e => updateConfig('startAngle', Number(e.target.value))} />
            </div>
            <div>
              <Label>Góc kết thúc (°)</Label>
              <input type="number" value={zone.config?.endAngle ?? 60} min={-180} max={180} className={css(INPUT, "PropertyPanel")} onFocus={focusOn} onBlur={focusOff} onChange={e => updateConfig('endAngle', Number(e.target.value))} />
            </div>
          </div>

          <Field label="Số hàng">
            <input type="number" value={zone.config?.rows ?? 3} min={1} max={20} className={css(INPUT, "PropertyPanel")} onFocus={focusOn} onBlur={focusOff} onChange={e => updateConfig('rows', Number(e.target.value))} />
          </Field>

          <Field label="Ghế / hàng (cách nhau dấu phẩy)">
            <input type="text" value={seatsPerRowStr} className={css(INPUT, "PropertyPanel")} onFocus={focusOn} onBlur={focusOff} placeholder="10, 12, 14" onChange={e => updateConfig('seatsPerRow', e.target.value)} />
          </Field>
        </>}

      {/* ── Hàng thẳng ── */}
      {bt === 'rows' && <>
          <Divider label="Cấu hình hàng ghế" />
          <div className={css({
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        marginBottom: 12
      }, "PropertyPanel")}>
            <div>
              <Label>Số hàng</Label>
              <input type="number" value={zone.rows ?? 5} min={1} max={50} className={css(INPUT, "PropertyPanel")} onFocus={focusOn} onBlur={focusOff} onChange={e => onChange('rows', Math.max(1, Number(e.target.value)))} />
            </div>
            <div>
              <Label>Ghế / hàng</Label>
              <input type="number" value={zone.cols ?? 10} min={1} max={60} className={css(INPUT, "PropertyPanel")} onFocus={focusOn} onBlur={focusOff} onChange={e => onChange('cols', Math.max(1, Number(e.target.value)))} />
            </div>
          </div>
        </>}

      {/* ── Bàn tròn ── */}
      {bt === 'table' && <>
          <Divider label="Cấu hình bàn tròn" />
          <div className={css({
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        marginBottom: 12
      }, "PropertyPanel")}>
            <div>
              <Label>Số bàn</Label>
              <input type="number" value={zone.config?.tableCount ?? 1} min={1} max={50} className={css(INPUT, "PropertyPanel")} onFocus={focusOn} onBlur={focusOff} onChange={e => updateConfig('tableCount', Number(e.target.value))} />
            </div>
            <div>
              <Label>Ghế / bàn</Label>
              <input type="number" value={zone.config?.seatsPerTable ?? 8} min={2} max={20} className={css(INPUT, "PropertyPanel")} onFocus={focusOn} onBlur={focusOff} onChange={e => updateConfig('seatsPerTable', Number(e.target.value))} />
            </div>
          </div>
        </>}

      {/* ── Vị trí ── */}
      <Divider label="Vị trí" />

      <div className={css({
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
      marginBottom: 12
    }, "PropertyPanel")}>
        <div>
          <Label>X (px)</Label>
          <input type="number" value={Math.round(zone.x ?? 0)} className={css(INPUT, "PropertyPanel")} onFocus={focusOn} onBlur={focusOff} onChange={e => onChange('x', Number(e.target.value))} />
        </div>
        <div>
          <Label>Y (px)</Label>
          <input type="number" value={Math.round(zone.y ?? 0)} className={css(INPUT, "PropertyPanel")} onFocus={focusOn} onBlur={focusOff} onChange={e => onChange('y', Number(e.target.value))} />
        </div>
      </div>

      <Field label="Xoay (°)">
        <input type="number" value={zone.rotation ?? 0} min={-360} max={360} className={css(INPUT, "PropertyPanel")} onFocus={focusOn} onBlur={focusOff} onChange={e => onChange('rotation', Number(e.target.value))} />
      </Field>

      {/* ── Tổng ghế ── */}
      <div className={css({
      background: `${zone.color}15`,
      border: `1px solid ${zone.color}40`,
      borderRadius: 8,
      padding: '10px 13px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14
    }, "PropertyPanel")}>
        <span className={css({
        fontSize: 12,
        color: '#AAAAAA'
      }, "PropertyPanel")}>Tổng ghế</span>
        <span className={css({
        fontSize: 16,
        fontWeight: 800,
        color: zone.color
      }, "PropertyPanel")}>
          {totalSeats.toLocaleString()}
        </span>
      </div>

      {/* ── Xóa ── */}
      <button onClick={onRemove} className={css({
      width: '100%',
      padding: '9px 0',
      background: 'transparent',
      border: '1px solid rgba(239,68,68,.35)',
      borderRadius: 8,
      color: '#f87171',
      fontFamily: 'inherit',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all .15s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7
    }, "PropertyPanel")} onMouseEnter={e => {
setNodeCss(e.currentTarget, { background: 'rgba(239,68,68,.08)' }, 'background');
setNodeCss(e.currentTarget, { borderColor: 'rgba(239,68,68,.6)' }, 'borderColor');
    }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { background: 'transparent' }, 'background');
setNodeCss(e.currentTarget, { borderColor: 'rgba(239,68,68,.35)' }, 'borderColor');
    }}>
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
        Xóa khu này
      </button>
    </div>;
}
