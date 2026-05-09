import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group, Arc } from 'react-konva';

const GRID_SIZE   = 10;
const SEAT_SIZE   = 15;
const SEAT_GAP    = 4;
const SEAT_STEP   = SEAT_SIZE + SEAT_GAP;
const MIN_ZOOM    = 0.2;
const MAX_ZOOM    = 4;
const ZOOM_FACTOR = 1.12;

function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Geometry generators (must match SeatmapCanvas.jsx exactly) ────────────────

function genRowsSeats(zone) {
  const rows = zone.config?.rows ?? zone.rows ?? 5;
  const cols = zone.config?.cols ?? zone.cols ?? 10;
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      seats.push({ key: `${r}_${c}`, x: SEAT_GAP + c * SEAT_STEP, y: 22 + SEAT_GAP + r * SEAT_STEP, row: r, col: c });
    }
  }
  const w = cols * SEAT_STEP + SEAT_GAP;
  const h = rows * SEAT_STEP + SEAT_GAP + 22;
  return { seats, w, h };
}

function genArcSeats(zone) {
  const cfg        = zone.config || {};
  const numRows    = cfg.rows ?? zone.rows ?? 3;
  const baseRadius = cfg.radius ?? 160;
  const startDeg   = cfg.startAngle ?? -60;
  const endDeg     = cfg.endAngle   ?? 60;
  const rowSpacing = SEAT_STEP + 2;

  let seatsPerRow;
  if (cfg.seatsPerRow) {
    seatsPerRow = String(cfg.seatsPerRow).split(',').map(v => Math.max(1, parseInt(v.trim()) || (cfg.baseSeats ?? 10)));
    while (seatsPerRow.length < numRows) seatsPerRow.push(seatsPerRow[seatsPerRow.length - 1] + 2);
  } else {
    const base = cfg.baseSeats ?? 10;
    seatsPerRow = Array.from({ length: numRows }, (_, i) => base + i * 2);
  }

  const toRad = (d) => (d * Math.PI) / 180;
  const maxRadius = baseRadius + (numRows - 1) * rowSpacing + SEAT_SIZE;
  const originX = maxRadius + SEAT_SIZE;
  const originY = maxRadius + SEAT_SIZE;

  const rawSeats = [];
  for (let r = 0; r < numRows; r++) {
    const radius = baseRadius + r * rowSpacing;
    const count  = seatsPerRow[r] || 1;
    const span   = endDeg - startDeg;
    const step   = count > 1 ? span / (count - 1) : 0;
    for (let c = 0; c < count; c++) {
      const angleDeg = startDeg + c * step;
      const angleRad = toRad(angleDeg - 90);
      rawSeats.push({
        key: `${r}_${c}`,
        x: originX + radius * Math.cos(angleRad) - SEAT_SIZE / 2,
        y: originY + radius * Math.sin(angleRad) - SEAT_SIZE / 2,
        row: r, col: c,
      });
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  rawSeats.forEach(s => {
    minX = Math.min(minX, s.x); minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + SEAT_SIZE); maxY = Math.max(maxY, s.y + SEAT_SIZE);
  });
  minX -= 4; minY -= 4; maxX += 4; maxY += 4;

  const seats = rawSeats.map(s => ({ ...s, x: s.x - minX, y: s.y - minY }));
  const cx = originX - minX;
  const cy = originY - minY;
  return { seats, w: maxX - minX, h: maxY - minY, cx, cy };
}

function genTableSeats(zone) {
  const cfg         = zone.config || {};
  const tableCount  = cfg.tableCount   ?? 4;
  const seatsPerTable = cfg.seatsPerTable ?? 8;
  const tableRadius = cfg.tableRadius  ?? 36;
  const seatRadius  = SEAT_SIZE / 2;
  const orbitRadius = tableRadius + seatRadius + 4;
  const cols        = Math.ceil(Math.sqrt(tableCount));
  const rows        = Math.ceil(tableCount / cols);
  const cellSize    = orbitRadius * 2 + SEAT_STEP + 16;
  const LABEL_H     = 22;

  const tables = [];
  for (let t = 0; t < tableCount; t++) {
    const col = t % cols;
    const row = Math.floor(t / cols);
    const cx  = SEAT_GAP + col * cellSize + cellSize / 2;
    const cy  = LABEL_H + SEAT_GAP + row * cellSize + cellSize / 2;
    const tableSeats = [];
    for (let s = 0; s < seatsPerTable; s++) {
      const angle = (2 * Math.PI * s) / seatsPerTable - Math.PI / 2;
      tableSeats.push({ key: `${t}_${s}`, row: t, col: s, x: cx + orbitRadius * Math.cos(angle), y: cy + orbitRadius * Math.sin(angle) });
    }
    tables.push({ key: `t${t}`, cx, cy, seats: tableSeats });
  }
  return { tables, w: cols * cellSize + SEAT_GAP * 2, h: rows * cellSize + SEAT_GAP * 2 + LABEL_H };
}

// ── Natural rendered size of a zone (respects saved width/height from Transformer) ──
function zoneNaturalSize(zone) {
  const bt = zone.blockType || 'rows';
  let natural;
  if (bt === 'arc')        natural = genArcSeats(zone);
  else if (bt === 'table') natural = genTableSeats(zone);
  else if (bt === 'floor') return { w: zone.width ?? 400, h: zone.height ?? 300 };
  else                     natural = genRowsSeats(zone);
  return { w: zone.width ?? natural.w, h: zone.height ?? natural.h };
}

// ── Tight bounding box of all zones (mirrors admin canvas logic) ───────────────
function computeBBox(zones) {
  const FRAME_PAD = 20;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  zones.forEach(zone => {
    const zx = zone.x ?? 0;
    const zy = zone.y ?? 0;

    if (zone.blockType === 'floor' && zone.grouped && (zone.children || []).length > 0) {
      // Grouped floor: frame auto-sizes around children
      let fMaxR = 0, fMaxB = 0;
      zone.children.forEach(child => {
        const { w: cw, h: ch } = zoneNaturalSize(child);
        fMaxR = Math.max(fMaxR, (child.x ?? FRAME_PAD) + cw);
        fMaxB = Math.max(fMaxB, (child.y ?? FRAME_PAD) + ch);
      });
      const fw = Math.max(240, fMaxR + FRAME_PAD);
      const fh = Math.max(100, fMaxB + FRAME_PAD);
      minX = Math.min(minX, zx); minY = Math.min(minY, zy);
      maxX = Math.max(maxX, zx + fw); maxY = Math.max(maxY, zy + fh);
    } else {
      const { w, h } = zoneNaturalSize(zone);
      minX = Math.min(minX, zx); minY = Math.min(minY, zy);
      maxX = Math.max(maxX, zx + w); maxY = Math.max(maxY, zy + h);
    }
  });

  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

// ── Seat node (clickable / status-aware) ──────────────────────────────────────
function SeatNode({ x, y, size = SEAT_SIZE, zone, row, col, isCircle, dbZone, selectedSeats, onSeatClick }) {
  const dbSeat   = dbZone?.seats?.find(s => s.row === row && s.col === col);
  const isSelected = dbSeat && selectedSeats[dbSeat.id];
  const status   = dbSeat?.status || 'UNAVAILABLE';

  let fill, stroke, strokeW = 0.8;
  if (!dbSeat) {
    fill = 'transparent'; stroke = 'rgba(255,255,255,0.05)';
  } else if (isSelected) {
    fill = '#FF6B35'; stroke = '#FF6B35'; strokeW = 1;
  } else if (status === 'SOLD') {
    fill = '#4A1A1A'; stroke = '#4A1A1A';
  } else if (status === 'LOCKED') {
    fill = '#2a2a2a'; stroke = '#2a2a2a';
  } else {
    fill = hexToRgba(zone.color, 0.55); stroke = zone.color;
  }

  const canClick = dbSeat && (status === 'AVAILABLE' || isSelected);

  const handleEnter = (e) => {
    e.target.getStage().container().style.cursor = canClick ? 'pointer' : 'not-allowed';
  };
  const handleLeave = (e) => {
    e.target.getStage().container().style.cursor = 'grab';
  };
  const handleClick = (e) => {
    e.cancelBubble = true;
    if (canClick) onSeatClick(dbSeat, zone, dbZone);
  };

  if (isCircle) {
    return (
      <Circle x={x} y={y} radius={size / 2} fill={fill} stroke={stroke} strokeWidth={strokeW}
        onMouseEnter={handleEnter} onMouseLeave={handleLeave} onClick={handleClick} onTap={handleClick} />
    );
  }
  return (
    <Rect x={x} y={y} width={size} height={size} cornerRadius={3} fill={fill} stroke={stroke} strokeWidth={strokeW}
      onMouseEnter={handleEnter} onMouseLeave={handleLeave} onClick={handleClick} onTap={handleClick} />
  );
}

// ── Block renderers (mirror admin SeatmapCanvas exactly, minus Transformer) ───

function RowsBlock({ zone, dbZone, selectedSeats, onSeatClick }) {
  const { seats, w, h } = genRowsSeats(zone);
  const scaleX = zone.width  ? zone.width  / w : 1;
  const scaleY = zone.height ? zone.height / h : 1;

  return (
    <Group x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0} scaleX={scaleX} scaleY={scaleY}>
      <Rect width={w} height={h} fill={hexToRgba(zone.color, 0.07)} stroke={hexToRgba(zone.color, 0.4)}
        strokeWidth={1} cornerRadius={6} listening={false} />
      <Text x={8} y={5} text={zone.name} fontSize={10} fontStyle="bold" fill={zone.color} listening={false} />
      {seats.map(s => (
        <SeatNode key={s.key} x={s.x} y={s.y} zone={zone} dbZone={dbZone} row={s.row} col={s.col}
          selectedSeats={selectedSeats} onSeatClick={onSeatClick} />
      ))}
    </Group>
  );
}

function ArcBlock({ zone, dbZone, selectedSeats, onSeatClick }) {
  const { seats, w, h, cx, cy } = genArcSeats(zone);
  const scaleX = zone.width  ? zone.width  / w : 1;
  const scaleY = zone.height ? zone.height / h : 1;
  const cfg        = zone.config || {};
  const startDeg   = cfg.startAngle ?? -60;
  const spanDeg    = (cfg.endAngle ?? 60) - startDeg;
  const numRows    = cfg.rows ?? zone.rows ?? 3;
  const baseRadius = cfg.radius ?? 160;
  const rowSpacing = SEAT_STEP + 2;

  return (
    <Group x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0} scaleX={scaleX} scaleY={scaleY}>
      {Array.from({ length: numRows }).map((_, r) => {
        const innerR  = baseRadius + r * rowSpacing - SEAT_SIZE / 2 - 1;
        const outerRr = baseRadius + r * rowSpacing + SEAT_SIZE / 2 + 1;
        return (
          <Arc key={r} x={cx} y={cy} innerRadius={innerR} outerRadius={outerRr} angle={spanDeg}
            rotation={startDeg - 90} fill={hexToRgba(zone.color, 0.08)}
            stroke={hexToRgba(zone.color, 0.3)} strokeWidth={0.8} listening={false} />
        );
      })}
      <Text x={cx - 30} y={0} width={60} text={zone.name} fontSize={10} fontStyle="bold"
        fill={zone.color} align="center" listening={false} />
      {seats.map(s => (
        <SeatNode key={s.key} x={s.x} y={s.y} zone={zone} dbZone={dbZone} row={s.row} col={s.col}
          selectedSeats={selectedSeats} onSeatClick={onSeatClick} />
      ))}
    </Group>
  );
}

function TableBlock({ zone, dbZone, selectedSeats, onSeatClick }) {
  const { tables, w, h } = genTableSeats(zone);
  const scaleX = zone.width  ? zone.width  / w : 1;
  const scaleY = zone.height ? zone.height / h : 1;
  const tableRadius = zone.config?.tableRadius ?? 36;

  return (
    <Group x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0} scaleX={scaleX} scaleY={scaleY}>
      <Rect width={w} height={h} fill={hexToRgba(zone.color, 0.05)} stroke={hexToRgba(zone.color, 0.35)}
        strokeWidth={1} cornerRadius={8} listening={false} />
      <Text x={8} y={5} text={zone.name} fontSize={10} fontStyle="bold" fill={zone.color} listening={false} />
      {tables.map(t => (
        <Group key={t.key}>
          <Circle x={t.cx} y={t.cy} radius={tableRadius} fill={hexToRgba(zone.color, 0.18)}
            stroke={zone.color} strokeWidth={1.2} listening={false} />
          <Text x={t.cx - 10} y={t.cy - 6} width={20} text={`${tables.indexOf(t) + 1}`}
            fontSize={10} fontStyle="bold" fill={zone.color} align="center" listening={false} />
          {t.seats.map(s => (
            <SeatNode key={s.key} x={s.x} y={s.y} isCircle size={SEAT_SIZE - 2} zone={zone} dbZone={dbZone}
              row={s.row} col={s.col} selectedSeats={selectedSeats} onSeatClick={onSeatClick} />
          ))}
        </Group>
      ))}
    </Group>
  );
}

function FloorBlock({ zone, dbZones, selectedSeats, onSeatClick }) {
  const children  = zone.children || [];
  const isGrouped = zone.grouped !== false;
  const FRAME_PAD = 20;

  function frameSize(kids) {
    if (kids.length === 0) return { w: 240, h: 100 };
    let maxR = 0, maxB = 0;
    kids.forEach(child => {
      const { w: cw, h: ch } = zoneNaturalSize(child);
      maxR = Math.max(maxR, (child.x ?? FRAME_PAD) + cw);
      maxB = Math.max(maxB, (child.y ?? FRAME_PAD) + ch);
    });
    return { w: Math.max(240, maxR + FRAME_PAD), h: Math.max(100, maxB + FRAME_PAD) };
  }

  const { w, h } = isGrouped ? frameSize(children) : { w: zone.width ?? 400, h: zone.height ?? 300 };

  return (
    <Group x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0}>
      {/* Dashed frame — identical to admin FloorBlock */}
      <Rect width={w} height={h}
        fill={hexToRgba(zone.color, 0.04)}
        stroke={hexToRgba(zone.color, 0.5)}
        strokeWidth={1.5} dash={[6, 3]} cornerRadius={10} listening={false} />
      {/* Label badge */}
      <Rect x={0} y={0} width={80} height={20}
        fill={hexToRgba(zone.color, 0.25)} cornerRadius={[10, 0, 8, 0]} listening={false} />
      <Text x={8} y={4} text={`▦  ${zone.name}`}
        fontSize={10} fontStyle="bold" fill={zone.color} listening={false} />

      {isGrouped && children.map(child => {
        const cx    = child.x ?? FRAME_PAD;
        const cy    = child.y ?? FRAME_PAD;
        const bt    = child.blockType || 'rows';
        const dbZone = dbZones?.find(z => z.id === child.id);

        let naturalW, naturalH, innerContent;
        if (bt === 'arc') {
          const { seats, w: nw, h: nh, cx: acx } = genArcSeats(child);
          naturalW = nw; naturalH = nh;
          const cfg        = child.config || {};
          const startDeg   = cfg.startAngle ?? -60;
          const spanDeg    = (cfg.endAngle ?? 60) - startDeg;
          const numRows    = cfg.rows ?? child.rows ?? 3;
          const baseRadius = cfg.radius ?? 160;
          const rowSpacing = SEAT_STEP + 2;
          innerContent = (
            <>
              {Array.from({ length: numRows }).map((_, r) => {
                const innerR  = baseRadius + r * rowSpacing - SEAT_SIZE / 2 - 1;
                const outerRr = baseRadius + r * rowSpacing + SEAT_SIZE / 2 + 1;
                return (
                  <Arc key={r} x={acx} y={genArcSeats(child).cy} innerRadius={innerR} outerRadius={outerRr}
                    angle={spanDeg} rotation={startDeg - 90} fill={hexToRgba(child.color, 0.08)} listening={false} />
                );
              })}
              <Text x={acx - 20} y={0} text={child.name} fontSize={9} fill={child.color} listening={false} />
              {seats.map(s => (
                <SeatNode key={s.key} x={s.x} y={s.y + 12} size={SEAT_SIZE - 2} zone={child} dbZone={dbZone}
                  row={s.row} col={s.col} selectedSeats={selectedSeats} onSeatClick={onSeatClick} />
              ))}
            </>
          );
        } else if (bt === 'table') {
          const { tables: tbls, w: nw, h: nh } = genTableSeats(child);
          naturalW = nw; naturalH = nh;
          const tR = child.config?.tableRadius ?? 36;
          const sR = (SEAT_SIZE - 2) / 2;
          innerContent = (
            <>
              <Text x={4} y={0} text={child.name} fontSize={9} fill={child.color} listening={false} />
              {tbls.map(t => (
                <Group key={t.key}>
                  <Circle x={t.cx} y={t.cy + 12} radius={tR}
                    fill={hexToRgba(child.color, 0.15)} stroke={child.color} strokeWidth={1} listening={false} />
                  {t.seats.map(s => (
                    <SeatNode key={s.key} x={s.x} y={s.y + 12} isCircle size={sR * 2} zone={child} dbZone={dbZone}
                      row={s.row} col={s.col} selectedSeats={selectedSeats} onSeatClick={onSeatClick} />
                  ))}
                </Group>
              ))}
            </>
          );
        } else {
          const { seats, w: nw, h: nh } = genRowsSeats(child);
          naturalW = nw; naturalH = nh;
          innerContent = (
            <>
              <Rect width={nw} height={nh} fill={hexToRgba(child.color, 0.06)}
                stroke={hexToRgba(child.color, 0.35)} strokeWidth={0.8} cornerRadius={4} listening={false} />
              <Text x={6} y={4} text={child.name} fontSize={9} fill={child.color} listening={false} />
              {seats.map(s => (
                <SeatNode key={s.key} x={s.x} y={s.y} size={SEAT_SIZE - 2} zone={child} dbZone={dbZone}
                  row={s.row} col={s.col} selectedSeats={selectedSeats} onSeatClick={onSeatClick} />
              ))}
            </>
          );
        }

        const scaleX = child.width  ? child.width  / naturalW : 1;
        const scaleY = child.height ? child.height / naturalH : 1;

        return (
          <Group key={child.id} x={cx} y={cy} rotation={child.rotation ?? 0} scaleX={scaleX} scaleY={scaleY}>
            <Rect width={naturalW} height={naturalH} fill="transparent" />
            {innerContent}
          </Group>
        );
      })}
    </Group>
  );
}

function ZoneBlock({ zone, dbZones, selectedSeats, onSeatClick }) {
  const bt     = zone.blockType || 'rows';
  const dbZone = dbZones?.find(z => z.id === zone.id);

  if (bt === 'arc')   return <ArcBlock   zone={zone} dbZone={dbZone} selectedSeats={selectedSeats} onSeatClick={onSeatClick} />;
  if (bt === 'table') return <TableBlock zone={zone} dbZone={dbZone} selectedSeats={selectedSeats} onSeatClick={onSeatClick} />;
  if (bt === 'floor') return <FloorBlock zone={zone} dbZones={dbZones} selectedSeats={selectedSeats} onSeatClick={onSeatClick} />;
  return            <RowsBlock zone={zone} dbZone={dbZone} selectedSeats={selectedSeats} onSeatClick={onSeatClick} />;
}

// ── Main canvas component ──────────────────────────────────────────────────────
export default function CustomerSeatmapCanvas({ layoutZones, dbZones, selectedSeats, onSeatClick }) {
  const containerRef    = useRef(null);
  const stageRef        = useRef(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [stagePos,   setStagePos]   = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const stageDraggedRef = useRef(false);

  // ── Resize observer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!layoutZones || layoutZones.length === 0 || !size.width || !size.height) return;
    const bbox = computeBBox(layoutZones);
    if (!bbox) return;
    const cx = bbox.minX + bbox.w / 2;
    const cy = bbox.minY + bbox.h / 2;
    setStageScale(1);
    setStagePos({
      x: size.width  / 2 - cx,
      y: size.height / 2 - cy,
    });
  }, [layoutZones, size.width, size.height]);

  // ── Wheel zoom (zoom toward cursor) ─────────────────────────────────────────
  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage    = stageRef.current;
    const oldScale = stageScale;
    const pointer  = stage.getPointerPosition();
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };
    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const newScale  = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldScale * (direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR)));
    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const zoomBy = (direction) => {
    const center    = { x: size.width / 2, y: size.height / 2 };
    const oldScale  = stageScale;
    const newScale  = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldScale * (direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR)));
    const mousePointTo = {
      x: (center.x - stagePos.x) / oldScale,
      y: (center.y - stagePos.y) / oldScale,
    };
    setStageScale(newScale);
    setStagePos({
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale,
    });
  };

  const zoomTo100 = () => {
    const bbox = computeBBox(layoutZones);
    const cx = bbox ? bbox.minX + bbox.w / 2 : 0;
    const cy = bbox ? bbox.minY + bbox.h / 2 : 0;
    setStageScale(1);
    setStagePos({
      x: size.width  / 2 - cx,
      y: size.height / 2 - cy,
    });
  };

  const zoomPct = Math.round(stageScale * 100);

  // Grid offset compensates for stage pan so lines stay aligned with canvas origin
  const gridOffX = ((-stagePos.x / stageScale) % GRID_SIZE + GRID_SIZE) % GRID_SIZE;
  const gridOffY = ((-stagePos.y / stageScale) % GRID_SIZE + GRID_SIZE) % GRID_SIZE;
  const gridW    = size.width  / stageScale + GRID_SIZE * 2;
  const gridH    = size.height / stageScale + GRID_SIZE * 2;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#111111', height: '100%' }}>

      {/* ── Toolbar ── */}
      <div style={{
        height: 38, flexShrink: 0,
        borderBottom: '1px solid #222222', background: '#161616',
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6, userSelect: 'none',
      }}>
        <div style={{ flex: 1 }} />

        <button onClick={zoomTo100} title="Đặt lại vị trí và zoom"
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 5, color: '#888', padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#FF6B35'; e.currentTarget.style.borderColor = 'rgba(255,107,53,.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#2a2a2a'; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
          </svg>
          Reset view
        </button>

        <div style={{ display: 'flex', alignItems: 'center', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, overflow: 'hidden' }}>
          <button onClick={() => zoomBy(-1)} title="Thu nhỏ"
            style={{ background: 'transparent', border: 'none', borderRight: '1px solid #2a2a2a', color: '#aaa', padding: '4px 10px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1, transition: 'color .15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#262626'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.background = 'transparent'; }}
          >−</button>
          <button onClick={zoomTo100} title="Zoom về 100%"
            style={{ background: 'transparent', border: 'none', color: '#aaa', padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minWidth: 46, textAlign: 'center', transition: 'color .15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#aaa'; }}
          >{zoomPct}%</button>
          <button onClick={() => zoomBy(1)} title="Phóng to"
            style={{ background: 'transparent', border: 'none', borderLeft: '1px solid #2a2a2a', color: '#aaa', padding: '4px 10px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1, transition: 'color .15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#262626'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.background = 'transparent'; }}
          >+</button>
        </div>
      </div>

      {/* ── Stage container ── */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Stage
          ref={stageRef}
          width={size.width} height={size.height}
          x={stagePos.x} y={stagePos.y}
          scaleX={stageScale} scaleY={stageScale}
          draggable
          onWheel={handleWheel}
          onMouseEnter={e => { e.target.getStage().container().style.cursor = 'grab'; }}
          onMouseLeave={e => { e.target.getStage().container().style.cursor = 'default'; }}
          onDragStart={e => {
            if (e.target === stageRef.current) {
              stageDraggedRef.current = true;
              stageRef.current.container().style.cursor = 'grabbing';
            }
          }}
          onDragEnd={e => {
            if (e.target === stageRef.current) {
              setStagePos({ x: e.target.x(), y: e.target.y() });
              stageDraggedRef.current = false;
              stageRef.current.container().style.cursor = 'grab';
            }
          }}
        >
          {/* Grid — offset-corrected so lines stay aligned when panning */}
          <Layer listening={false}>
            {(() => {
              const lines = [];
              for (let x = -gridOffX; x < gridW; x += GRID_SIZE)
                lines.push(<Rect key={`gv${x}`} x={x - stagePos.x / stageScale} y={-stagePos.y / stageScale} width={0.5} height={gridH} fill="#1e1e1e" />);
              for (let y = -gridOffY; y < gridH; y += GRID_SIZE)
                lines.push(<Rect key={`gh${y}`} x={-stagePos.x / stageScale} y={y - stagePos.y / stageScale} width={gridW} height={0.5} fill="#1e1e1e" />);
              return lines;
            })()}
          </Layer>

          {/* Stage label */}
          <Layer listening={false}>
            <Rect x={size.width / stageScale / 2 - 120} y={16} width={240} height={32}
              fill="#FF6B35" cornerRadius={[6, 6, 0, 0]} />
            <Text x={size.width / stageScale / 2 - 120} y={22} width={240}
              text="★  SÂN KHẤU  ★" fontSize={11} fontStyle="bold"
              fill="#fff" align="center" letterSpacing={2} />
          </Layer>

          {/* Zones */}
          <Layer>
            {layoutZones?.map(z => (
              <ZoneBlock key={z.id} zone={z} dbZones={dbZones} selectedSeats={selectedSeats} onSeatClick={onSeatClick} />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
