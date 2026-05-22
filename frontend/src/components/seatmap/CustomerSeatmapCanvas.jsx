import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group, Arc } from 'react-konva';
import { useTheme } from '../../hooks/useTheme';
import { css, cx, setNodeCss } from "../../lib/runtimeCss";
const GRID_SIZE = 10;
const SEAT_SIZE = 15;
const SEAT_GAP = 4;
const SEAT_STEP = SEAT_SIZE + SEAT_GAP;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const ZOOM_FACTOR = 1.12;
const WORLD_W = 1200;
const WORLD_H = 900;
const STAGE_LABEL_X = WORLD_W / 2 - 120;
const STAGE_LABEL_Y = 16;
function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
const colLetter = n => {
  let s = '';
  do {
    s = String.fromCharCode(65 + n % 26) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
};
function genRowsSeats(zone) {
  const rows = zone.config?.rows ?? zone.rows ?? 5;
  const cols = zone.config?.cols ?? zone.cols ?? 10;
  const seats = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) seats.push({
    key: `${r}_${c}`,
    label: `${colLetter(r)}${c + 1}`,
    x: SEAT_GAP + c * SEAT_STEP,
    y: 22 + SEAT_GAP + r * SEAT_STEP,
    row: r,
    col: c
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
  const legacySeatsPerRow = zone.arcSeatsPerRow;
  let seatsPerRow;
  if (cfg.seatsPerRow) {
    seatsPerRow = String(cfg.seatsPerRow).split(',').map(v => Math.max(1, parseInt(v.trim()) || (cfg.baseSeats ?? 10)));
    while (seatsPerRow.length < numRows) seatsPerRow.push(seatsPerRow[seatsPerRow.length - 1] + 2);
  } else if (Array.isArray(legacySeatsPerRow) && legacySeatsPerRow.length > 0) {
    seatsPerRow = legacySeatsPerRow.map(v => Math.max(1, Number(v) || 1));
    while (seatsPerRow.length < numRows) seatsPerRow.push(seatsPerRow[seatsPerRow.length - 1]);
  } else {
    const base = cfg.baseSeats ?? 10;
    seatsPerRow = Array.from({
      length: numRows
    }, (_, i) => base + i * 2);
  }
  const toRad = d => d * Math.PI / 180;
  const maxRadius = baseRadius + (numRows - 1) * rowSpacing + SEAT_SIZE;
  const originX = maxRadius + SEAT_SIZE;
  const originY = maxRadius + SEAT_SIZE;
  const rawSeats = [];
  for (let r = 0; r < numRows; r++) {
    const radius = baseRadius + r * rowSpacing;
    const count = seatsPerRow[r] || 1;
    const span = endDeg - startDeg;
    const step = count > 1 ? span / (count - 1) : 0;
    for (let c = 0; c < count; c++) {
      const angleRad = toRad(startDeg + c * step - 90);
      rawSeats.push({
        key: `${r}_${c}`,
        label: `${colLetter(r)}${c + 1}`,
        x: originX + radius * Math.cos(angleRad) - SEAT_SIZE / 2,
        y: originY + radius * Math.sin(angleRad) - SEAT_SIZE / 2,
        row: r,
        col: c
      });
    }
  }
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  rawSeats.forEach(s => {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + SEAT_SIZE);
    maxY = Math.max(maxY, s.y + SEAT_SIZE);
  });
  minX -= 4;
  minY -= 4;
  maxX += 4;
  maxY += 4;
  return {
    seats: rawSeats.map(s => ({
      ...s,
      x: s.x - minX,
      y: s.y - minY
    })),
    w: maxX - minX,
    h: maxY - minY,
    cx: originX - minX,
    cy: originY - minY
  };
}
function genTableSeats(zone) {
  const cfg = zone.config || {};
  const tableCount = cfg.tableCount ?? 4;
  const seatsPerTable = cfg.seatsPerTable ?? 8;
  const tableRadius = cfg.tableRadius ?? 36;
  const orbitRadius = tableRadius + SEAT_SIZE / 2 + 4;
  const cols = Math.ceil(Math.sqrt(tableCount));
  const rows = Math.ceil(tableCount / cols);
  const cellSize = orbitRadius * 2 + SEAT_STEP + 16;
  const LABEL_H = 22;
  const tables = [];
  for (let t = 0; t < tableCount; t++) {
    const col = t % cols;
    const row = Math.floor(t / cols);
    const cx = SEAT_GAP + col * cellSize + cellSize / 2;
    const cy = LABEL_H + SEAT_GAP + row * cellSize + cellSize / 2;
    tables.push({
      key: `t${t}`,
      cx,
      cy,
      seats: Array.from({
        length: seatsPerTable
      }, (_, s) => {
        const angle = 2 * Math.PI * s / seatsPerTable - Math.PI / 2;
        return {
          key: `${t}_${s}`,
          label: `T${t + 1}-${s + 1}`,
          row: t,
          col: s,
          x: cx + orbitRadius * Math.cos(angle),
          y: cy + orbitRadius * Math.sin(angle)
        };
      })
    });
  }
  return {
    tables,
    w: cols * cellSize + SEAT_GAP * 2,
    h: rows * cellSize + SEAT_GAP * 2 + LABEL_H
  };
}
function zoneNaturalSize(zone) {
  const bt = zone.blockType || 'rows';
  if (bt === 'floor') return {
    w: zone.width ?? 400,
    h: zone.height ?? 300
  };
  const gen = bt === 'arc' ? genArcSeats : bt === 'table' ? genTableSeats : genRowsSeats;
  const nat = gen(zone);
  return {
    w: zone.width ?? nat.w,
    h: zone.height ?? nat.h
  };
}
function computeBBox(zones) {
  const FRAME_PAD = 20;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  zones.forEach(zone => {
    const zx = zone.x ?? 0,
      zy = zone.y ?? 0;
    if (zone.blockType === 'floor' && zone.grouped && (zone.children || []).length > 0) {
      let fMaxR = 0,
        fMaxB = 0;
      zone.children.forEach(child => {
        const {
          w: cw,
          h: ch
        } = zoneNaturalSize(child);
        fMaxR = Math.max(fMaxR, (child.x ?? FRAME_PAD) + cw);
        fMaxB = Math.max(fMaxB, (child.y ?? FRAME_PAD) + ch);
      });
      maxX = Math.max(maxX, zx + Math.max(240, fMaxR + FRAME_PAD));
      maxY = Math.max(maxY, zy + Math.max(100, fMaxB + FRAME_PAD));
    } else {
      const {
        w,
        h
      } = zoneNaturalSize(zone);
      maxX = Math.max(maxX, zx + w);
      maxY = Math.max(maxY, zy + h);
    }
    minX = Math.min(minX, zx);
    minY = Math.min(minY, zy);
  });
  if (minX === Infinity) return null;
  return {
    minX,
    minY,
    maxX,
    maxY,
    w: maxX - minX,
    h: maxY - minY
  };
}

// ── SeatNode: renders one seat with all possible states ───────────────────────
function SeatNode({
  x,
  y,
  size = SEAT_SIZE,
  zone,
  row,
  col,
  label,
  isCircle,
  dbZone,
  selectedSeats,
  othersSelectingSeats,
  onSeatClick,
  palette,
  interactive
}) {
  const dbSeat = dbZone?.seats?.find(s => s.row === row && s.col === col) ?? (label ? dbZone?.seats?.find(s => s.label === label) : undefined);
  const isSelected = !!(dbSeat && selectedSeats[dbSeat.id]);
  const isOtherSelecting = !!(dbSeat && othersSelectingSeats[dbSeat.id]);
  const status = dbSeat?.status || 'UNAVAILABLE';
  let fill,
    stroke,
    strokeW = 0.8,
    dash;
  if (!dbSeat) {
    fill = 'transparent';
    stroke = palette.noSeatStroke;
  } else if (isSelected) {
    fill = '#FFA500';
    stroke = '#FFA500';
    strokeW = 1;
  } else if (status === 'SOLD') {
    fill = '#F44336';
    stroke = '#F44336';
  } else if (status === 'LOCKED' || isOtherSelecting) {
    fill = '#888888';
    stroke = '#888888';
    strokeW = 1;
    dash = isOtherSelecting ? [3, 2] : undefined;
  } else {
    fill = '#4CAF50';
    stroke = '#4CAF50';
  }

  // Ghế đang bị người khác xem vẫn có thể click (chỉ là soft-select, chưa lock)
  const canClick = interactive && dbSeat && (status === 'AVAILABLE' || isSelected);
  const handleEnter = e => {
setNodeCss(e.target.getStage().container(), { cursor: interactive ? canClick ? 'pointer' : 'not-allowed' : 'grab' }, 'cursor');
  };
  const handleLeave = e => {
setNodeCss(e.target.getStage().container(), { cursor: 'grab' }, 'cursor');
  };
  const handleClick = e => {
    e.cancelBubble = true;
    if (canClick) onSeatClick?.(dbSeat, zone, dbZone);
  };
  const commonProps = {
    fill,
    stroke,
    strokeWidth: strokeW,
    ...(dash ? {
      dash
    } : {}),
    onMouseEnter: handleEnter,
    onMouseLeave: handleLeave,
    onClick: handleClick,
    onTap: handleClick
  };
  if (isCircle) return <Circle x={x} y={y} radius={size / 2} {...commonProps} />;
  return <Rect x={x} y={y} width={size} height={size} cornerRadius={3} {...commonProps} />;
}

// ── Block renderers ───────────────────────────────────────────────────────────

function RowsBlock({
  zone,
  dbZone,
  selectedSeats,
  othersSelectingSeats,
  onSeatClick,
  palette,
  interactive
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
      {seats.map(s => <SeatNode key={s.key} x={s.x} y={s.y} zone={zone} dbZone={dbZone} row={s.row} col={s.col} label={s.label} selectedSeats={selectedSeats} othersSelectingSeats={othersSelectingSeats} onSeatClick={onSeatClick} palette={palette} interactive={interactive} />)}
    </Group>;
}
function ArcBlock({
  zone,
  dbZone,
  selectedSeats,
  othersSelectingSeats,
  onSeatClick,
  palette,
  interactive
}) {
  const {
    seats,
    w,
    h,
    cx,
    cy
  } = genArcSeats(zone);
  const scaleX = zone.width ? zone.width / w : 1;
  const scaleY = zone.height ? zone.height / h : 1;
  const cfg = zone.config || {};
  const startDeg = cfg.startAngle ?? -60;
  const spanDeg = (cfg.endAngle ?? 60) - startDeg;
  const numRows = cfg.rows ?? zone.rows ?? 3;
  const baseRadius = cfg.radius ?? 160;
  const rowSpacing = SEAT_STEP + 2;
  return <Group x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0} scaleX={scaleX} scaleY={scaleY}>
      {Array.from({
      length: numRows
    }).map((_, r) => <Arc key={r} x={cx} y={cy} innerRadius={baseRadius + r * rowSpacing - SEAT_SIZE / 2 - 1} outerRadius={baseRadius + r * rowSpacing + SEAT_SIZE / 2 + 1} angle={spanDeg} rotation={startDeg - 90} fill={hexToRgba(zone.color, 0.08)} stroke={hexToRgba(zone.color, 0.3)} strokeWidth={0.8} listening={false} />)}
      <Text x={cx - 30} y={0} width={60} text={zone.name} fontSize={10} fontStyle="bold" fill={zone.color} align="center" listening={false} />
      {seats.map(s => <SeatNode key={s.key} x={s.x} y={s.y} zone={zone} dbZone={dbZone} row={s.row} col={s.col} label={s.label} selectedSeats={selectedSeats} othersSelectingSeats={othersSelectingSeats} onSeatClick={onSeatClick} palette={palette} interactive={interactive} />)}
    </Group>;
}
function TableBlock({
  zone,
  dbZone,
  selectedSeats,
  othersSelectingSeats,
  onSeatClick,
  palette,
  interactive
}) {
  const {
    tables,
    w,
    h
  } = genTableSeats(zone);
  const scaleX = zone.width ? zone.width / w : 1;
  const scaleY = zone.height ? zone.height / h : 1;
  const tableRadius = zone.config?.tableRadius ?? 36;
  return <Group x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0} scaleX={scaleX} scaleY={scaleY}>
      <Rect width={w} height={h} fill={hexToRgba(zone.color, 0.05)} stroke={hexToRgba(zone.color, 0.35)} strokeWidth={1} cornerRadius={8} listening={false} />
      <Text x={8} y={5} text={zone.name} fontSize={10} fontStyle="bold" fill={zone.color} listening={false} />
      {tables.map((t, i) => <Group key={t.key}>
          <Circle x={t.cx} y={t.cy} radius={tableRadius} fill={hexToRgba(zone.color, 0.18)} stroke={zone.color} strokeWidth={1.2} listening={false} />
          <Text x={t.cx - 10} y={t.cy - 6} width={20} text={`${i + 1}`} fontSize={10} fontStyle="bold" fill={zone.color} align="center" listening={false} />
          {t.seats.map(s => <SeatNode key={s.key} x={s.x} y={s.y} isCircle size={SEAT_SIZE - 2} zone={zone} dbZone={dbZone} row={s.row} col={s.col} label={s.label} selectedSeats={selectedSeats} othersSelectingSeats={othersSelectingSeats} onSeatClick={onSeatClick} palette={palette} interactive={interactive} />)}
        </Group>)}
    </Group>;
}
function FloorBlock({
  zone,
  dbZones,
  selectedSeats,
  othersSelectingSeats,
  onSeatClick,
  palette,
  interactive
}) {
  const children = zone.children || [];
  const FRAME_PAD = 20;
  const zoneProps = {
    dbZones,
    selectedSeats,
    othersSelectingSeats,
    onSeatClick,
    palette,
    interactive
  };

  // Ungrouped floor (grouped === false): frame + children at absolute canvas coordinates
  if (zone.grouped === false) {
    const w = zone.width ?? 400;
    const h = zone.height ?? 300;
    return <>
        <Group x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0}>
          <Rect width={w} height={h} fill={hexToRgba(zone.color, 0.03)} stroke={hexToRgba(zone.color, 0.45)} strokeWidth={1.5} dash={[8, 4]} cornerRadius={10} listening={false} />
          <Rect x={0} y={0} width={100} height={22} fill={hexToRgba(zone.color, 0.2)} cornerRadius={[10, 0, 8, 0]} listening={false} />
          <Text x={8} y={5} text={`▦  ${zone.name}`} fontSize={10} fontStyle="bold" fill={zone.color} listening={false} />
        </Group>
        {children.map(child => <ZoneBlock key={child.id} zone={child} {...zoneProps} />)}
      </>;
  }
  const {
    w,
    h
  } = (() => {
    if (children.length === 0) return {
      w: 240,
      h: 100
    };
    let maxR = 0,
      maxB = 0;
    children.forEach(child => {
      const {
        w: cw,
        h: ch
      } = zoneNaturalSize(child);
      maxR = Math.max(maxR, (child.x ?? FRAME_PAD) + cw);
      maxB = Math.max(maxB, (child.y ?? FRAME_PAD) + ch);
    });
    return {
      w: Math.max(240, maxR + FRAME_PAD),
      h: Math.max(100, maxB + FRAME_PAD)
    };
  })();
  return <Group x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0}>
      <Rect width={w} height={h} fill={hexToRgba(zone.color, 0.04)} stroke={hexToRgba(zone.color, 0.5)} strokeWidth={1.5} dash={[6, 3]} cornerRadius={10} listening={false} />
      <Rect x={0} y={0} width={80} height={20} fill={hexToRgba(zone.color, 0.25)} cornerRadius={[10, 0, 8, 0]} listening={false} />
      <Text x={8} y={4} text={`▦  ${zone.name}`} fontSize={10} fontStyle="bold" fill={zone.color} listening={false} />

      {children.map(child => {
      const cx = child.x ?? FRAME_PAD;
      const cy = child.y ?? FRAME_PAD;
      const bt = child.blockType || 'rows';
      const dbZone = dbZones?.find(z => z.id === child.id);
      let naturalW, naturalH, innerContent;
      if (bt === 'arc') {
        const {
          seats,
          w: nw,
          h: nh,
          cx: acx,
          cy: acy
        } = genArcSeats(child);
        naturalW = nw;
        naturalH = nh;
        const cfg = child.config || {};
        const startDeg = cfg.startAngle ?? -60;
        const spanDeg = (cfg.endAngle ?? 60) - startDeg;
        const numRows = cfg.rows ?? child.rows ?? 3;
        const baseRadius = cfg.radius ?? 160;
        const rowSpacing = SEAT_STEP + 2;
        innerContent = <>
              {Array.from({
            length: numRows
          }).map((_, r) => <Arc key={r} x={acx} y={acy} innerRadius={baseRadius + r * rowSpacing - SEAT_SIZE / 2 - 1} outerRadius={baseRadius + r * rowSpacing + SEAT_SIZE / 2 + 1} angle={spanDeg} rotation={startDeg - 90} fill={hexToRgba(child.color, 0.08)} listening={false} />)}
              <Text x={acx - 20} y={0} text={child.name} fontSize={9} fill={child.color} listening={false} />
              {seats.map(s => <SeatNode key={s.key} x={s.x} y={s.y + 12} size={SEAT_SIZE - 2} zone={child} dbZone={dbZone} row={s.row} col={s.col} label={s.label} selectedSeats={selectedSeats} othersSelectingSeats={othersSelectingSeats} onSeatClick={onSeatClick} palette={palette} interactive={interactive} />)}
            </>;
      } else if (bt === 'table') {
        const {
          tables: tbls,
          w: nw,
          h: nh
        } = genTableSeats(child);
        naturalW = nw;
        naturalH = nh;
        const tR = child.config?.tableRadius ?? 36;
        const sR = (SEAT_SIZE - 2) / 2;
        innerContent = <>
              <Text x={4} y={0} text={child.name} fontSize={9} fill={child.color} listening={false} />
              {tbls.map(t => <Group key={t.key}>
                  <Circle x={t.cx} y={t.cy + 12} radius={tR} fill={hexToRgba(child.color, 0.15)} stroke={child.color} strokeWidth={1} listening={false} />
                  {t.seats.map(s => <SeatNode key={s.key} x={s.x} y={s.y + 12} isCircle size={sR * 2} zone={child} dbZone={dbZone} row={s.row} col={s.col} label={s.label} selectedSeats={selectedSeats} othersSelectingSeats={othersSelectingSeats} onSeatClick={onSeatClick} palette={palette} interactive={interactive} />)}
                </Group>)}
            </>;
      } else {
        const {
          seats,
          w: nw,
          h: nh
        } = genRowsSeats(child);
        naturalW = nw;
        naturalH = nh;
        innerContent = <>
              <Rect width={nw} height={nh} fill={hexToRgba(child.color, 0.06)} stroke={hexToRgba(child.color, 0.35)} strokeWidth={0.8} cornerRadius={4} listening={false} />
              <Text x={6} y={4} text={child.name} fontSize={9} fill={child.color} listening={false} />
              {seats.map(s => <SeatNode key={s.key} x={s.x} y={s.y} size={SEAT_SIZE - 2} zone={child} dbZone={dbZone} row={s.row} col={s.col} label={s.label} selectedSeats={selectedSeats} othersSelectingSeats={othersSelectingSeats} onSeatClick={onSeatClick} palette={palette} interactive={interactive} />)}
            </>;
      }
      const scaleX = child.width ? child.width / naturalW : 1;
      const scaleY = child.height ? child.height / naturalH : 1;
      return <Group key={child.id} x={cx} y={cy} rotation={child.rotation ?? 0} scaleX={scaleX} scaleY={scaleY}>
            <Rect width={naturalW} height={naturalH} fill="transparent" />
            {innerContent}
          </Group>;
    })}
    </Group>;
}
function ZoneBlock({
  zone,
  dbZones,
  selectedSeats,
  othersSelectingSeats,
  onSeatClick,
  palette,
  interactive
}) {
  const bt = zone.blockType || (zone.arcSeatsPerRow ? 'arc' : 'rows');
  const dbZone = dbZones?.find(z => z.id === zone.id) ?? dbZones?.find(z => z.name === zone.name);
  const props = {
    selectedSeats,
    othersSelectingSeats,
    onSeatClick,
    palette,
    interactive
  };
  if (bt === 'arc') return <ArcBlock zone={zone} dbZone={dbZone} {...props} />;
  if (bt === 'table') return <TableBlock zone={zone} dbZone={dbZone} {...props} />;
  if (bt === 'floor') return <FloorBlock zone={zone} dbZones={dbZones} {...props} />;
  return <RowsBlock zone={zone} dbZone={dbZone} {...props} />;
}

// ── Main canvas ───────────────────────────────────────────────────────────────
export default function CustomerSeatmapCanvas({
  layoutZones,
  dbZones,
  selectedSeats = {},
  othersSelectingSeats = {},
  onSeatClick,
  interactive = true
}) {
  const {
    theme
  } = useTheme();
  const isLight = theme === 'light';

  // Theme-aware palette for Konva canvas (cannot use CSS variables directly)
  const palette = isLight ? {
    canvasBg: '#F0EBE3',
    gridLine: '#DDD6CE',
    toolbarBg: '#FFF9F2',
    toolbarBorder: '#E5DED5',
    btnColor: '#6F6A64',
    btnBorder: '#E5DED5',
    zoomBg: '#F6F2EB',
    zoomBorder: '#E5DED5',
    soldFill: '#C9A89A',
    lockedFill: '#C5BCBB',
    noSeatStroke: 'rgba(0,0,0,0.06)'
  } : {
    canvasBg: '#111111',
    gridLine: '#1e1e1e',
    toolbarBg: '#161616',
    toolbarBorder: '#222222',
    btnColor: '#888888',
    btnBorder: '#2a2a2a',
    zoomBg: '#1a1a1a',
    zoomBorder: '#2a2a2a',
    soldFill: '#4A1A1A',
    lockedFill: '#2a2a2a',
    noSeatStroke: 'rgba(255,255,255,0.05)'
  };
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const [size, setSize] = useState({
    width: 800,
    height: 600
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
  const stageDraggedRef = useRef(false);
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
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const {
        width,
        height
      } = entry.contentRect;
      setSize({
        width: Math.floor(width),
        height: Math.floor(height)
      });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);
  const initialCentered = useRef(false);

  // Only auto-center when layoutZones is first loaded
  useEffect(() => {
    if (!layoutZones || layoutZones.length === 0 || !size.width || !size.height) return;
    if (initialCentered.current) return; // Đã center rồi thì không reset lại nữa khi zones thay đổi (socket update)

    const bbox = computeBBox(layoutZones);
    if (!bbox) return;
    const newPos = {
      x: size.width / 2 - (bbox.minX + bbox.w / 2),
      y: size.height / 2 - (bbox.minY + bbox.h / 2)
    };
    stageScaleRef.current = 1;
    stagePosRef.current = newPos;
    setStageScale(1);
    setStagePos(newPos);
    initialCentered.current = true;
  }, [layoutZones, size.width, size.height]);
  const handleWheel = e => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const oldScale = stage.scaleX();
    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const newScale = oldScale * (direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR);
    applyZoomAtPoint(newScale, pointer.x, pointer.y);
  };
  const zoomBy = dir => {
    const factor = dir > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    const newScale = stageScaleRef.current * factor;
    applyZoomAtPoint(newScale, size.width / 2, size.height / 2);
  };
  const zoomTo100 = () => {
    const bbox = computeBBox(layoutZones);
    const newPos = {
      x: size.width / 2 - (bbox ? bbox.minX + bbox.w / 2 : 0),
      y: size.height / 2 - (bbox ? bbox.minY + bbox.h / 2 : 0)
    };
    stageScaleRef.current = 1;
    stagePosRef.current = newPos;
    setStageScale(1);
    setStagePos(newPos);
  };
  const zoomPct = Math.round(stageScale * 100);
  const contentBBox = computeBBox(layoutZones || []);
  const stageLabelX = contentBBox ? contentBBox.minX + contentBBox.w / 2 - 120 : STAGE_LABEL_X;
  return <div className={css({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: palette.canvasBg,
    height: '100%'
  }, "CustomerSeatmapCanvas")}>

      {/* Toolbar */}
      <div className={css({
      height: 38,
      flexShrink: 0,
      borderBottom: `1px solid ${palette.toolbarBorder}`,
      background: palette.toolbarBg,
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: 6,
      userSelect: 'none'
    }, "CustomerSeatmapCanvas")}>
        <div className={css({
        flex: 1
      }, "CustomerSeatmapCanvas")} />
        <button onClick={zoomTo100} className={css({
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: 'transparent',
        border: `1px solid ${palette.btnBorder}`,
        borderRadius: 5,
        color: palette.btnColor,
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all .15s'
      }, "CustomerSeatmapCanvas")} onMouseEnter={e => {
setNodeCss(e.currentTarget, { color: '#FF6B35' }, 'color');
setNodeCss(e.currentTarget, { borderColor: 'rgba(255,107,53,.5)' }, 'borderColor');
      }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { color: palette.btnColor }, 'color');
setNodeCss(e.currentTarget, { borderColor: palette.btnBorder }, 'borderColor');
      }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
          </svg>
          Reset view
        </button>
        <div className={css({
        display: 'flex',
        alignItems: 'center',
        background: palette.zoomBg,
        border: `1px solid ${palette.zoomBorder}`,
        borderRadius: 6,
        overflow: 'hidden'
      }, "CustomerSeatmapCanvas")}>
          <button onClick={() => zoomBy(-1)} className={css({
          background: 'transparent',
          border: 'none',
          borderRight: `1px solid ${palette.zoomBorder}`,
          color: palette.btnColor,
          padding: '4px 10px',
          fontSize: 14,
          cursor: 'pointer',
          fontFamily: 'inherit',
          lineHeight: 1,
          transition: 'color .15s'
        }, "CustomerSeatmapCanvas")} onMouseEnter={e => {
setNodeCss(e.currentTarget, { color: isLight ? '#1E1B18' : '#fff' }, 'color');
setNodeCss(e.currentTarget, { background: isLight ? '#EFE7DD' : '#262626' }, 'background');
        }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { color: palette.btnColor }, 'color');
setNodeCss(e.currentTarget, { background: 'transparent' }, 'background');
        }}>−</button>
          <button onClick={zoomTo100} className={css({
          background: 'transparent',
          border: 'none',
          color: palette.btnColor,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          minWidth: 46,
          textAlign: 'center',
          transition: 'color .15s'
        }, "CustomerSeatmapCanvas")} onMouseEnter={e => {
setNodeCss(e.currentTarget, { color: isLight ? '#1E1B18' : '#fff' }, 'color');
        }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { color: palette.btnColor }, 'color');
        }}>{zoomPct}%</button>
          <button onClick={() => zoomBy(1)} className={css({
          background: 'transparent',
          border: 'none',
          borderLeft: `1px solid ${palette.zoomBorder}`,
          color: palette.btnColor,
          padding: '4px 10px',
          fontSize: 14,
          cursor: 'pointer',
          fontFamily: 'inherit',
          lineHeight: 1,
          transition: 'color .15s'
        }, "CustomerSeatmapCanvas")} onMouseEnter={e => {
setNodeCss(e.currentTarget, { color: isLight ? '#1E1B18' : '#fff' }, 'color');
setNodeCss(e.currentTarget, { background: isLight ? '#EFE7DD' : '#262626' }, 'background');
        }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { color: palette.btnColor }, 'color');
setNodeCss(e.currentTarget, { background: 'transparent' }, 'background');
        }}>+</button>
        </div>
      </div>

      {/* Stage */}
      <div ref={containerRef} className={css({
      flex: 1,
      position: 'relative',
      overflow: 'hidden'
    }, "CustomerSeatmapCanvas")}>
        <Stage ref={stageRef} width={size.width} height={size.height} x={stagePos.x} y={stagePos.y} scaleX={stageScale} scaleY={stageScale} draggable onWheel={handleWheel} onMouseEnter={e => {
setNodeCss(e.target.getStage().container(), { cursor: 'grab' }, 'cursor');
      }} onMouseLeave={e => {
setNodeCss(e.target.getStage().container(), { cursor: 'default' }, 'cursor');
      }} onDragStart={e => {
        if (e.target === stageRef.current) {
          stageDraggedRef.current = true;
setNodeCss(stageRef.current.container(), { cursor: 'grabbing' }, 'cursor');
        }
      }} onDragEnd={e => {
        if (e.target === stageRef.current) {
          const p = {
            x: e.target.x(),
            y: e.target.y()
          };
          stagePosRef.current = p;
          setStagePos(p);
          stageDraggedRef.current = false;
setNodeCss(stageRef.current.container(), { cursor: 'grab' }, 'cursor');
        }
      }}>
          <Layer listening={false}>
            {(() => {
            const lines = [];
            for (let x = 0; x <= WORLD_W; x += GRID_SIZE) lines.push(<Rect key={`gv${x}`} x={x} y={0} width={0.5} height={WORLD_H} fill={palette.gridLine} />);
            for (let y = 0; y <= WORLD_H; y += GRID_SIZE) lines.push(<Rect key={`gh${y}`} x={0} y={y} width={WORLD_W} height={0.5} fill={palette.gridLine} />);
            return lines;
          })()}
          </Layer>

          <Layer listening={false}>
            <Rect x={stageLabelX} y={STAGE_LABEL_Y} width={240} height={32} fill="#FF6B35" cornerRadius={[6, 6, 0, 0]} />
            <Text x={stageLabelX} y={STAGE_LABEL_Y + 6} width={240} text="★  SÂN KHẤU  ★" fontSize={11} fontStyle="bold" fill="#fff" align="center" letterSpacing={2} />
          </Layer>

          <Layer>
            {layoutZones?.map(z => <ZoneBlock key={z.id} zone={z} dbZones={dbZones} selectedSeats={selectedSeats} othersSelectingSeats={othersSelectingSeats} onSeatClick={onSeatClick} palette={palette} interactive={interactive} />)}
          </Layer>
        </Stage>
      </div>
    </div>;
}
