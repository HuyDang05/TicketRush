// Purpose: Component seatmap editor/preview, xu ly ve va tuong tac voi so do ghe.
import { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group, Arc } from 'react-konva';
import './SeatmapPreview.css';

// ── Constants (match SeatmapCanvas exactly) ────────────────────────────────────
import { css, cx, setNodeCss } from "../../lib/runtimeCss";
const SEAT_SIZE = 16;
const SEAT_GAP = 4;
const SEAT_STEP = SEAT_SIZE + SEAT_GAP;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4;
const ZOOM_FACTOR = 1.12;
const WORLD_W = 1200;
const STAGE_LABEL_X = WORLD_W / 2 - 120;
const STAGE_LABEL_Y = 16;

// ── Seat status palette ────────────────────────────────────────────────────────
const STATUS_COLOR = {
  available: {
    fill: '#166534',
    stroke: '#22c55e',
    hover: '#16a34a'
  },
  sold: {
    fill: '#7f1d1d',
    stroke: '#dc2626',
    hover: '#7f1d1d'
  },
  locked: {
    fill: '#1f1f1f',
    stroke: '#3f3f3f',
    hover: '#1f1f1f'
  },
  selected: {
    fill: '#FF6B35',
    stroke: '#FF6B35',
    hover: '#FF6B35'
  }
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function rowLetter(n) {
  let s = '';
  do {
    s = String.fromCharCode(65 + n % 26) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

// Deterministic demo status derived from seat id (stable across renders)
function demoStatus(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(31, h) + id.charCodeAt(i) | 0;
  const v = Math.abs(h) % 100;
  if (v < 60) return 'available';
  if (v < 78) return 'sold';
  return 'locked';
}

// ── Geometry generators (identical to SeatmapCanvas) ──────────────────────────
function genRowsSeats(zone) {
  const rows = zone.config?.rows ?? zone.rows ?? 5;
  const cols = zone.config?.cols ?? zone.cols ?? 10;
  const seats = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) seats.push({
    id: `${zone.id}_${r}_${c}`,
    key: `${r}_${c}`,
    x: SEAT_GAP + c * SEAT_STEP,
    y: 22 + SEAT_GAP + r * SEAT_STEP,
    row: r,
    col: c,
    label: `${rowLetter(r)}${c + 1}`
  });
  return {
    seats,
    w: cols * SEAT_STEP + SEAT_GAP,
    h: rows * SEAT_STEP + SEAT_GAP + 22
  };
}
function genArcSeats(zone) {
  const cfg = zone.config || {};
  const numRows = cfg.rows ?? zone.rows ?? 3;
  const baseRadius = cfg.radius ?? 160;
  const startDeg = cfg.startAngle ?? -60;
  const endDeg = cfg.endAngle ?? 60;
  const rowSpacing = SEAT_STEP + 2;
  let seatsPerRow;
  if (cfg.seatsPerRow) {
    seatsPerRow = String(cfg.seatsPerRow).split(',').map(v => Math.max(1, parseInt(v.trim()) || (cfg.baseSeats ?? 10)));
    while (seatsPerRow.length < numRows) seatsPerRow.push(seatsPerRow[seatsPerRow.length - 1] + 2);
  } else {
    const base = cfg.baseSeats ?? 10;
    seatsPerRow = Array.from({
      length: numRows
    }, (_, i) => base + i * 2);
  }
  const toRad = d => d * Math.PI / 180;
  const maxRadius = baseRadius + (numRows - 1) * rowSpacing + SEAT_SIZE;
  const cx = maxRadius + SEAT_SIZE;
  const cy = maxRadius + SEAT_SIZE;
  const seats = [];
  for (let r = 0; r < numRows; r++) {
    const radius = baseRadius + r * rowSpacing;
    const count = seatsPerRow[r] || 1;
    const span = endDeg - startDeg;
    const step = count > 1 ? span / (count - 1) : 0;
    for (let c = 0; c < count; c++) {
      const rad = toRad(startDeg + c * step - 90);
      seats.push({
        id: `${zone.id}_${r}_${c}`,
        key: `${r}_${c}`,
        x: cx + radius * Math.cos(rad) - SEAT_SIZE / 2,
        y: cy + radius * Math.sin(rad) - SEAT_SIZE / 2,
        row: r,
        col: c,
        label: `${rowLetter(r)}${c + 1}`
      });
    }
  }
  const w = (maxRadius + SEAT_SIZE) * 2;
  const h = (maxRadius + SEAT_SIZE) * 2;
  return {
    seats,
    w,
    h,
    cx,
    cy,
    maxRadius,
    numRows,
    baseRadius,
    startDeg,
    endDeg,
    rowSpacing
  };
}
function genTableSeats(zone) {
  const cfg = zone.config || {};
  const tableCount = cfg.tableCount ?? 4;
  const seatsPerTable = cfg.seatsPerTable ?? 8;
  const tableRadius = cfg.tableRadius ?? 36;
  const seatRadius = SEAT_SIZE / 2;
  const orbitRadius = tableRadius + seatRadius + 4;
  const cols = Math.ceil(Math.sqrt(tableCount));
  const rows = Math.ceil(tableCount / cols);
  const cellSize = orbitRadius * 2 + SEAT_STEP + 16;
  const LABEL_H = 22;
  const tables = [];
  for (let t = 0; t < tableCount; t++) {
    const col = t % cols;
    const row = Math.floor(t / cols);
    const tcx = SEAT_GAP + col * cellSize + cellSize / 2;
    const tcy = LABEL_H + SEAT_GAP + row * cellSize + cellSize / 2;
    const seatsT = [];
    for (let s = 0; s < seatsPerTable; s++) {
      const angle = 2 * Math.PI * s / seatsPerTable - Math.PI / 2;
      seatsT.push({
        id: `${zone.id}_t${t}_s${s}`,
        key: `${t}_${s}`,
        x: tcx + orbitRadius * Math.cos(angle),
        y: tcy + orbitRadius * Math.sin(angle),
        label: `T${t + 1}-${s + 1}`
      });
    }
    tables.push({
      key: `t${t}`,
      idx: t,
      cx: tcx,
      cy: tcy,
      seats: seatsT
    });
  }
  const w = cols * cellSize + SEAT_GAP * 2;
  const h = rows * cellSize + SEAT_GAP * 2 + LABEL_H;
  return {
    tables,
    w,
    h,
    tableRadius,
    seatRadius
  };
}
function childNaturalSize(child) {
  const bt = child.blockType || 'rows';
  if (bt === 'arc') {
    const d = genArcSeats(child);
    return {
      w: d.w,
      h: d.h
    };
  }
  if (bt === 'table') {
    const d = genTableSeats(child);
    return {
      w: d.w,
      h: d.h
    };
  }
  const d = genRowsSeats(child);
  return {
    w: d.w,
    h: d.h
  };
}

// ── Interactive seat ───────────────────────────────────────────────────────────
function PreviewSeat({
  x,
  y,
  id,
  isCircle = false,
  radius,
  selectedIds,
  onToggle
}) {
  const [hovered, setHovered] = useState(false);
  const base = demoStatus(id);
  const status = selectedIds.has(id) ? 'selected' : base;
  const palette = STATUS_COLOR[status];
  const canClick = base === 'available' || selectedIds.has(id);
  const fill = hovered && canClick ? palette.hover : palette.fill;
  const handlers = {
    onMouseEnter: e => {
      if (canClick) {
setNodeCss(e.target.getStage().container(), { cursor: 'pointer' }, 'cursor');
        setHovered(true);
      }
    },
    onMouseLeave: e => {
setNodeCss(e.target.getStage().container(), { cursor: 'default' }, 'cursor');
      setHovered(false);
    },
    onClick: e => {
      e.cancelBubble = true;
      if (canClick) onToggle(id);
    },
    onTap: e => {
      e.cancelBubble = true;
      if (canClick) onToggle(id);
    }
  };
  if (isCircle) {
    return <Circle x={x} y={y} radius={radius} fill={fill} stroke={palette.stroke} strokeWidth={1} {...handlers} />;
  }
  return <Rect x={x} y={y} width={SEAT_SIZE} height={SEAT_SIZE} offsetX={SEAT_SIZE / 2} offsetY={SEAT_SIZE / 2} scaleX={hovered && canClick ? 1.15 : 1} scaleY={hovered && canClick ? 1.15 : 1} fill={fill} stroke={palette.stroke} strokeWidth={1} cornerRadius={3} {...handlers} />;
}

// ── Rows zone ─────────────────────────────────────────────────────────────────
function PreviewRows({
  zone,
  selectedIds,
  onToggle
}) {
  const {
    seats,
    w,
    h
  } = genRowsSeats(zone);
  const scaleX = zone.width ? zone.width / w : 1;
  const scaleY = zone.height ? zone.height / h : 1;
  return <Group x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0} scaleX={scaleX} scaleY={scaleY}>
      <Rect width={w} height={h} fill={hexToRgba(zone.color, 0.07)} stroke={hexToRgba(zone.color, 0.4)} strokeWidth={1} cornerRadius={6} listening={false} />
      <Text x={8} y={5} text={zone.name} fontSize={10} fontStyle="bold" fill={zone.color} listening={false} />
      {seats.map(s => <PreviewSeat key={s.key} x={s.x + SEAT_SIZE / 2} y={s.y + SEAT_SIZE / 2} id={s.id} selectedIds={selectedIds} onToggle={onToggle} />)}
    </Group>;
}

// ── Arc zone ──────────────────────────────────────────────────────────────────
function PreviewArc({
  zone,
  selectedIds,
  onToggle
}) {
  const {
    seats,
    w,
    h,
    cx,
    cy,
    numRows,
    baseRadius,
    startDeg,
    endDeg,
    rowSpacing
  } = genArcSeats(zone);
  const scaleX = zone.width ? zone.width / w : 1;
  const scaleY = zone.height ? zone.height / h : 1;
  const spanDeg = endDeg - startDeg;
  const outerR = baseRadius + (numRows - 1) * rowSpacing + SEAT_SIZE / 2 + 2;
  return <Group x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0} scaleX={scaleX} scaleY={scaleY}>
      {Array.from({
      length: numRows
    }).map((_, r) => <Arc key={r} x={cx} y={cy} innerRadius={baseRadius + r * rowSpacing - SEAT_SIZE / 2 - 1} outerRadius={baseRadius + r * rowSpacing + SEAT_SIZE / 2 + 1} angle={spanDeg} rotation={startDeg - 90} fill={hexToRgba(zone.color, 0.08)} stroke={hexToRgba(zone.color, 0.3)} strokeWidth={0.8} listening={false} />)}
      <Text x={cx - 30} y={cy - outerR - 18} width={60} text={zone.name} fontSize={10} fontStyle="bold" fill={zone.color} align="center" listening={false} />
      {seats.map(s => <PreviewSeat key={s.key} x={s.x + SEAT_SIZE / 2} y={s.y + SEAT_SIZE / 2} id={s.id} selectedIds={selectedIds} onToggle={onToggle} />)}
    </Group>;
}

// ── Table zone ────────────────────────────────────────────────────────────────
function PreviewTable({
  zone,
  selectedIds,
  onToggle
}) {
  const {
    tables,
    w,
    h,
    tableRadius,
    seatRadius
  } = genTableSeats(zone);
  const scaleX = zone.width ? zone.width / w : 1;
  const scaleY = zone.height ? zone.height / h : 1;
  return <Group x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0} scaleX={scaleX} scaleY={scaleY}>
      <Rect width={w} height={h} fill={hexToRgba(zone.color, 0.05)} stroke={hexToRgba(zone.color, 0.35)} strokeWidth={1} cornerRadius={8} listening={false} />
      <Text x={8} y={5} text={zone.name} fontSize={10} fontStyle="bold" fill={zone.color} listening={false} />
      {tables.map(t => <Group key={t.key} listening={false}>
          <Circle x={t.cx} y={t.cy} radius={tableRadius} fill={hexToRgba(zone.color, 0.18)} stroke={zone.color} strokeWidth={1.2} />
          <Text x={t.cx - 10} y={t.cy - 6} width={20} text={`${t.idx + 1}`} fontSize={10} fontStyle="bold" fill={zone.color} align="center" />
        </Group>)}
      {tables.flatMap(t => t.seats.map(s => <PreviewSeat key={s.key} x={s.x} y={s.y} id={s.id} isCircle radius={seatRadius} selectedIds={selectedIds} onToggle={onToggle} />))}
    </Group>;
}

// ── Child zone inside grouped floor ───────────────────────────────────────────
function PreviewChildZone({
  zone,
  selectedIds,
  onToggle
}) {
  // Parent Group handles positioning; render zone at 0,0
  const z0 = {
    ...zone,
    x: 0,
    y: 0,
    rotation: 0,
    width: undefined,
    height: undefined
  };
  const bt = zone.blockType || 'rows';
  if (bt === 'arc') return <PreviewArc zone={z0} selectedIds={selectedIds} onToggle={onToggle} />;
  if (bt === 'table') return <PreviewTable zone={z0} selectedIds={selectedIds} onToggle={onToggle} />;
  return <PreviewRows zone={z0} selectedIds={selectedIds} onToggle={onToggle} />;
}

// ── Floor zone ────────────────────────────────────────────────────────────────
function PreviewFloor({
  zone,
  selectedIds,
  onToggle
}) {
  const isGrouped = zone.grouped !== false;
  const children = zone.children || [];
  if (!isGrouped) {
    const w = zone.width ?? 400;
    const h = zone.height ?? 300;
    return <Group x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0} listening={false}>
        <Rect width={w} height={h} fill={hexToRgba(zone.color, 0.03)} stroke={hexToRgba(zone.color, 0.35)} strokeWidth={1.5} dash={[8, 4]} cornerRadius={10} />
        <Rect x={0} y={0} width={100} height={22} fill={hexToRgba(zone.color, 0.2)} cornerRadius={[10, 0, 8, 0]} />
        <Text x={8} y={5} text={`▦  ${zone.name}`} fontSize={10} fontStyle="bold" fill={zone.color} />
      </Group>;
  }

  // Compute frame size from children
  let maxW = 240,
    maxH = 100;
  children.forEach(child => {
    const {
      w: cw,
      h: ch
    } = childNaturalSize(child);
    maxW = Math.max(maxW, (child.x ?? 10) + cw + 20);
    maxH = Math.max(maxH, (child.y ?? 30) + ch + 20);
  });
  const w = Math.max(zone.width ?? maxW, maxW);
  const h = Math.max(zone.height ?? maxH, maxH);
  return <Group x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0}>
      <Rect width={w} height={h} fill={hexToRgba(zone.color, 0.04)} stroke={hexToRgba(zone.color, 0.45)} strokeWidth={1.5} dash={[6, 3]} cornerRadius={10} listening={false} />
      <Rect x={0} y={0} width={80} height={20} fill={hexToRgba(zone.color, 0.25)} cornerRadius={[10, 0, 8, 0]} listening={false} />
      <Text x={8} y={4} text={`▦  ${zone.name}`} fontSize={10} fontStyle="bold" fill={zone.color} listening={false} />
      {children.map(child => <Group key={child.id} x={child.x ?? 10} y={child.y ?? 30}>
          <PreviewChildZone zone={child} selectedIds={selectedIds} onToggle={onToggle} />
        </Group>)}
    </Group>;
}

// ── Zone router ───────────────────────────────────────────────────────────────
function PreviewZone({
  zone,
  selectedIds,
  onToggle
}) {
  const bt = zone.blockType || 'rows';
  if (bt === 'floor') return <PreviewFloor zone={zone} selectedIds={selectedIds} onToggle={onToggle} />;
  if (bt === 'arc') return <PreviewArc zone={zone} selectedIds={selectedIds} onToggle={onToggle} />;
  if (bt === 'table') return <PreviewTable zone={zone} selectedIds={selectedIds} onToggle={onToggle} />;
  return <PreviewRows zone={zone} selectedIds={selectedIds} onToggle={onToggle} />;
}

// ── Collect all seats (for selection bar) ─────────────────────────────────────
function collectZoneSeats(zone) {
  const bt = zone.blockType || 'rows';
  if (bt === 'arc') return genArcSeats(zone).seats.map(s => ({
    ...s,
    zoneName: zone.name,
    zoneColor: zone.color
  }));
  if (bt === 'table') return genTableSeats(zone).tables.flatMap(t => t.seats).map(s => ({
    ...s,
    zoneName: zone.name,
    zoneColor: zone.color
  }));
  return genRowsSeats(zone).seats.map(s => ({
    ...s,
    zoneName: zone.name,
    zoneColor: zone.color
  }));
}
function collectAllSeats(zones) {
  return zones.flatMap(zone => {
    if (zone.blockType === 'floor') return (zone.children || []).flatMap(c => collectZoneSeats(c));
    return collectZoneSeats(zone);
  });
}

// ── Selection bar (DOM overlay above Konva) ────────────────────────────────────
function SelectionBar({
  allSeats,
  selectedIds,
  onClear
}) {
  if (selectedIds.size === 0) return null;
  const selected = allSeats.filter(s => selectedIds.has(s.id));
  const shown = selected.slice(0, 5);
  const extra = selected.length - shown.length;
  return <div className="sp-selbar">
      <div className="sp-selbar__tags">
        {shown.map(s => <div key={s.id} className={css({
        background: `${s.zoneColor}20`,
        border: `1px solid ${s.zoneColor}55`,
        borderRadius: 5,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 700,
        color: s.zoneColor,
        whiteSpace: 'nowrap'
      }, "SeatmapPreview")}>
            {s.zoneName} · {s.label}
          </div>)}
        {extra > 0 && <span className="sp-selbar__extra">+{extra} ghế nữa</span>}
      </div>
      <div className="sp-selbar__count">{selectedIds.size} ghế đã chọn</div>
      <button className="sp-selbar__clear" onClick={onClear}>Bỏ chọn</button>
    </div>;
}

// ── Main Preview Modal ─────────────────────────────────────────────────────────
export default function SeatmapPreview({
  zones,
  onClose
}) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const [size, setSize] = useState({
    width: 0,
    height: 0
  });
  const [stagePos, setStagePos] = useState({
    x: 0,
    y: 0
  });
  const [stageScale, setStageScale] = useState(1);
  const stageScaleRef = useRef(1);
  const stagePosRef = useRef({
    x: 0,
    y: 0
  });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const applyZoomAtPoint = useCallback((newScale, pointX, pointY) => {
    const stage = stageRef.current;
    const oldScale = stage ? stage.scaleX() : stageScaleRef.current;
    const pos = stage ? {
      x: stage.x(),
      y: stage.y()
    } : stagePosRef.current;
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newScale));
    const mpt = {
      x: (pointX - pos.x) / oldScale,
      y: (pointY - pos.y) / oldScale
    };
    const newPos = {
      x: pointX - mpt.x * clamped,
      y: pointY - mpt.y * clamped
    };
    stageScaleRef.current = clamped;
    stagePosRef.current = newPos;
    setStageScale(clamped);
    setStagePos(newPos);
  }, []);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      const {
        width,
        height
      } = e.contentRect;
      setSize({
        width: Math.floor(width),
        height: Math.floor(height)
      });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Close on Escape
  useEffect(() => {
    const h = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Fit all zones into view
  const fitView = useCallback(() => {
    if (!zones.length || !size.width) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const z of zones) {
      const x = z.x ?? 60,
        y = z.y ?? 60;
      let w, h;
      if (z.blockType === 'floor') {
        w = z.width ?? 400;
        h = z.height ?? 300;
      } else if (z.blockType === 'arc') {
        const d = genArcSeats(z);
        w = d.w;
        h = d.h;
      } else if (z.blockType === 'table') {
        const d = genTableSeats(z);
        w = d.w;
        h = d.h;
      } else {
        const d = genRowsSeats(z);
        w = d.w;
        h = d.h;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }
    const pad = 80;
    const contentW = maxX - minX + pad * 2;
    const contentH = maxY - minY + pad * 2;
    const scale = Math.min(MAX_ZOOM, Math.min((size.width - 40) / contentW, (size.height - 40) / contentH));
    const newPos = {
      x: (size.width - contentW * scale) / 2 - (minX - pad) * scale,
      y: (size.height - contentH * scale) / 2 - (minY - pad) * scale
    };
    stageScaleRef.current = scale;
    stagePosRef.current = newPos;
    setStageScale(scale);
    setStagePos(newPos);
  }, [zones, size]);
  useEffect(() => {
    fitView();
  }, [fitView]);

  // Wheel zoom
  const handleWheel = useCallback(e => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const oldScale = stage.scaleX();
    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const newScale = oldScale * (direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR);
    applyZoomAtPoint(newScale, pointer.x, pointer.y);
  }, [applyZoomAtPoint]);
  const zoomBy = dir => {
    const factor = dir > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    const newScale = stageScaleRef.current * factor;
    applyZoomAtPoint(newScale, size.width / 2, size.height / 2);
  };
  const toggleSeat = useCallback(seatId => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(seatId) ? next.delete(seatId) : next.add(seatId);
      return next;
    });
  }, []);
  const allSeats = collectAllSeats(zones);
  const zoomPct = Math.round(stageScale * 100);
  const totalSeats = allSeats.length;
  return <div className="sp-overlay" onClick={e => {
    if (e.target === e.currentTarget) onClose();
  }}>
      <div className="sp-modal">

        {/* ── Header ── */}
        <div className="sp-header">
          <div className="sp-header__badge">XEM TRƯỚC</div>
          <div className="sp-header__title">Sơ đồ ghế</div>
          <div className="sp-header__subtitle">Chế độ khách hàng · Read-only</div>
          <div className="sp-header__spacer" />

          <div className="sp-legend">
            {[{
            color: '#22c55e',
            label: 'Có thể chọn'
          }, {
            color: '#FF6B35',
            label: 'Đang chọn'
          }, {
            color: '#dc2626',
            label: 'Đã bán'
          }, {
            color: '#3f3f3f',
            label: 'Đang giữ'
          }].map(l => <div key={l.label} className="sp-legend__item">
                <div className={cx("sp-legend__dot", css({
              background: l.color
            }, "SeatmapPreview"))} />
                <span className="sp-legend__label">{l.label}</span>
              </div>)}
          </div>

          <div className="sp-divider" />

          <button className="sp-zoom-btn" onClick={() => zoomBy(-1)} title="Thu nhỏ">−</button>
          <button className="sp-zoom-btn" onClick={() => zoomBy(1)} title="Phóng to">+</button>
          <span className="sp-zoom-level">{zoomPct}%</span>
          <button className="sp-fit-btn" onClick={fitView} title="Vừa khung">Fit</button>

          <div className="sp-divider" />

          <button className="sp-close-btn" onClick={onClose} title="Đóng (Esc)">✕</button>
        </div>

        {/* ── Konva Stage ── */}
        <div ref={containerRef} className="sp-canvas">
          {size.width > 0 && <Stage ref={stageRef} width={size.width} height={size.height} scaleX={stageScale} scaleY={stageScale} x={stagePos.x} y={stagePos.y} draggable onDragEnd={e => {
          if (e.target === stageRef.current) {
            const p = {
              x: e.target.x(),
              y: e.target.y()
            };
            stagePosRef.current = p;
            setStagePos(p);
          }
        }} onWheel={handleWheel}>
              {/* Stage label */}
              <Layer listening={false}>
                <Rect x={STAGE_LABEL_X} y={STAGE_LABEL_Y} width={240} height={32} fill="#FF6B35" cornerRadius={[6, 6, 0, 0]} />
                <Text x={STAGE_LABEL_X} y={STAGE_LABEL_Y + 6} width={240} text="★  SÂN KHẤU  ★" fontSize={11} fontStyle="bold" fill="#fff" align="center" letterSpacing={2} />
              </Layer>

              {/* Zones */}
              <Layer>
                {zones.map(zone => <PreviewZone key={zone.id} zone={zone} selectedIds={selectedIds} onToggle={toggleSeat} />)}
              </Layer>
            </Stage>}

          {/* Selection bar — DOM overlay on top of Konva */}
          <SelectionBar allSeats={allSeats} selectedIds={selectedIds} onClear={() => setSelectedIds(new Set())} />

          {zones.length === 0 && <div className="sp-empty">
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <div className="sp-empty__text">Chưa có khu vực nào để xem trước</div>
            </div>}
        </div>

        {/* ── Footer ── */}
        <div className="sp-footer">
          <span>Cuộn để zoom · Kéo để di chuyển · Click ghế xanh để chọn</span>
          <div className="sp-footer__spacer" />
          <span className="sp-footer__count">
            {zones.length} khu · {totalSeats.toLocaleString()} ghế
          </span>
        </div>
      </div>
    </div>;
}
