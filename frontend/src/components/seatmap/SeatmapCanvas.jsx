import { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group, Arc, Transformer, Image as KonvaImage } from 'react-konva';

// ── Constants ──────────────────────────────────────────────────────────────────
import { css, cx, setNodeCss } from "../../lib/runtimeCss";
const GRID_SIZE = 10;
const SEAT_SIZE = 15;
const SEAT_GAP = 4;
const SEAT_STEP = SEAT_SIZE + SEAT_GAP;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const ZOOM_FACTOR = 1.12;
// Fixed world coordinate space — all blocks, grid, and stage label share these coords
const WORLD_W = 1200;
const WORLD_H = 900;
const STAGE_LABEL_X = WORLD_W / 2 - 120;
const STAGE_LABEL_Y = 16;

// ── Helpers ────────────────────────────────────────────────────────────────────
const snap = v => Math.round(v / GRID_SIZE) * GRID_SIZE;
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Seat geometry generators ───────────────────────────────────────────────────

function genRowsSeats(zone) {
  const rows = zone.config?.rows ?? zone.rows ?? 5;
  const cols = zone.config?.cols ?? zone.cols ?? 10;
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      seats.push({
        key: `${r}_${c}`,
        x: SEAT_GAP + c * SEAT_STEP,
        y: 22 + SEAT_GAP + r * SEAT_STEP,
        row: r,
        col: c
      });
    }
  }
  const w = cols * SEAT_STEP + SEAT_GAP;
  const h = rows * SEAT_STEP + SEAT_GAP + 22;
  return {
    seats,
    w,
    h
  };
}
function genArcSeats(zone) {
  const cfg = zone.config || {};
  const numRows = cfg.rows ?? zone.rows ?? 3;
  const baseRadius = cfg.radius ?? 160;
  const startDeg = cfg.startAngle ?? -60;
  const endDeg = cfg.endAngle ?? 60;
  const rowSpacing = SEAT_STEP + 2;

  // Parse per-row seat counts
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

  // Use a large virtual origin to compute raw seat positions, then crop to tight bbox
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
      const angleDeg = startDeg + c * step;
      const angleRad = toRad(angleDeg - 90); // -90 so 0° = top
      rawSeats.push({
        key: `${r}_${c}`,
        x: originX + radius * Math.cos(angleRad) - SEAT_SIZE / 2,
        y: originY + radius * Math.sin(angleRad) - SEAT_SIZE / 2,
        row: r,
        col: c
      });
    }
  }

  // Tight bounding box from actual seat positions — no extra padding, seats already have SEAT_SIZE
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
  // 4px breathing room on all sides
  minX -= 4;
  minY -= 4;
  maxX += 4;
  maxY += 4;

  // Shift all seats so bbox starts at (0, 0)
  const seats = rawSeats.map(s => ({
    ...s,
    x: s.x - minX,
    y: s.y - minY
  }));

  // Arc drawing origin in shifted space
  const cx = originX - minX;
  const cy = originY - minY;
  const w = maxX - minX;
  const h = maxY - minY;
  return {
    seats,
    w,
    h,
    cx,
    cy,
    maxRadius
  };
}
function genTableSeats(zone) {
  const cfg = zone.config || {};
  const tableCount = cfg.tableCount ?? 4;
  const seatsPerTable = cfg.seatsPerTable ?? 8;
  const tableRadius = cfg.tableRadius ?? 36;
  const seatRadius = SEAT_SIZE / 2;
  const orbitRadius = tableRadius + seatRadius + 4;

  // Arrange tables in a grid
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
    const tableSeats = [];
    for (let s = 0; s < seatsPerTable; s++) {
      const angle = 2 * Math.PI * s / seatsPerTable - Math.PI / 2;
      tableSeats.push({
        key: `${t}_${s}`,
        x: cx + orbitRadius * Math.cos(angle),
        y: cy + orbitRadius * Math.sin(angle)
      });
    }
    tables.push({
      key: `t${t}`,
      cx,
      cy,
      seats: tableSeats
    });
  }
  const w = cols * cellSize + SEAT_GAP * 2;
  const h = rows * cellSize + SEAT_GAP * 2 + LABEL_H;
  return {
    tables,
    w,
    h
  };
}

// ── Shared drag/transform hook for a zone group ───────────────────────────────
function useZoneGroup(zone, onChange) {
  const groupRef = useRef(null);
  const trRef = useRef(null);

  // Re-attach transformer whenever the group's scale changes (after a resize)
  // or when selection first happens so handles always match the actual bounds.
  useEffect(() => {
    if (trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  });
  const handleDragEnd = e => {
    e.cancelBubble = true;
    onChange(zone.id, {
      x: snap(e.target.x()),
      y: snap(e.target.y())
    });
  };

  // Called by each block with its natural (un-scaled) w/h so we can persist
  // the new pixel dimensions after the user resizes via the Transformer.
  const makeTransformEnd = (naturalW, naturalH, bakeScale = false) => () => {
    const node = groupRef.current;
    if (!node) return;
    const sx = node.scaleX();
    const sy = node.scaleY();
    if (bakeScale) {
      node.scaleX(1);
      node.scaleY(1);
    }
    onChange(zone.id, {
      x: snap(node.x()),
      y: snap(node.y()),
      rotation: node.rotation(),
      width: Math.max(60, snap(naturalW * sx)),
      height: Math.max(40, snap(naturalH * sy))
    });
  };
  return {
    groupRef,
    trRef,
    handleDragEnd,
    makeTransformEnd
  };
}

// ── Rows block ────────────────────────────────────────────────────────────────
function RowsBlock({
  zone,
  isSelected,
  onSelect,
  onChange,
  readOnly
}) {
  const {
    groupRef,
    trRef,
    handleDragEnd,
    makeTransformEnd
  } = useZoneGroup(zone, onChange);
  const {
    seats,
    w,
    h
  } = genRowsSeats(zone);
  const scaleX = zone.width ? zone.width / w : 1;
  const scaleY = zone.height ? zone.height / h : 1;
  return <>
      <Group ref={groupRef} x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0} scaleX={scaleX} scaleY={scaleY} draggable={!readOnly} onClick={e => {
      e.cancelBubble = true;
      onSelect(zone.id);
    }} onTap={e => {
      e.cancelBubble = true;
      onSelect(zone.id);
    }} onDragStart={e => {
      e.cancelBubble = true;
    }} onDragEnd={handleDragEnd} onTransformEnd={makeTransformEnd(w, h)}>
        {/* Hit area */}
        <Rect width={w} height={h} fill="transparent" />
        {/* Background */}
        <Rect width={w} height={h} fill={hexToRgba(zone.color, 0.07)} stroke={isSelected ? zone.color : hexToRgba(zone.color, 0.4)} strokeWidth={isSelected ? 1.5 : 1} cornerRadius={6} listening={false} />
        {/* Label */}
        <Text x={8} y={5} text={zone.name} fontSize={10} fontStyle="bold" fill={zone.color} listening={false} />
        {/* Seats */}
        {seats.map(s => <Rect key={s.key} x={s.x} y={s.y} width={SEAT_SIZE} height={SEAT_SIZE} fill={hexToRgba(zone.color, 0.55)} stroke={zone.color} strokeWidth={0.8} cornerRadius={3} listening={false} />)}
      </Group>
      {isSelected && !readOnly && <Transformer ref={trRef} rotateEnabled resizeEnabled={false} enabledAnchors={[]} />}
    </>;
}

// ── Arc block ─────────────────────────────────────────────────────────────────
function ArcBlock({
  zone,
  isSelected,
  onSelect,
  onChange,
  readOnly
}) {
  const {
    groupRef,
    trRef,
    handleDragEnd,
    makeTransformEnd
  } = useZoneGroup(zone, onChange);
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
  const endDeg = cfg.endAngle ?? 60;
  const numRows = cfg.rows ?? zone.rows ?? 3;
  const baseRadius = cfg.radius ?? 160;
  const rowSpacing = SEAT_STEP + 2;
  const outerR = baseRadius + (numRows - 1) * rowSpacing + SEAT_SIZE / 2 + 2;
  const spanDeg = endDeg - startDeg;
  return <>
      <Group ref={groupRef} x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0} scaleX={scaleX} scaleY={scaleY} draggable={!readOnly} onClick={e => {
      e.cancelBubble = true;
      onSelect(zone.id);
    }} onTap={e => {
      e.cancelBubble = true;
      onSelect(zone.id);
    }} onDragStart={e => {
      e.cancelBubble = true;
    }} onDragEnd={handleDragEnd} onTransformEnd={makeTransformEnd(w, h)}>
        {/* Hit area */}
        <Rect width={w} height={h} fill="transparent" />

        {/* Arc background fill — drawn as a Konva Arc (donut slice) */}
        {Array.from({
        length: numRows
      }).map((_, r) => {
        const innerR = baseRadius + r * rowSpacing - SEAT_SIZE / 2 - 1;
        const outerRr = baseRadius + r * rowSpacing + SEAT_SIZE / 2 + 1;
        return <Arc key={r} x={cx} y={cy} innerRadius={innerR} outerRadius={outerRr} angle={spanDeg} rotation={startDeg - 90} fill={hexToRgba(zone.color, 0.08)} stroke={isSelected ? zone.color : hexToRgba(zone.color, 0.3)} strokeWidth={isSelected ? 1.2 : 0.8} listening={false} />;
      })}

        {/* Zone label */}
        <Text x={cx - 30} y={cy - outerR - 18} width={60} text={zone.name} fontSize={10} fontStyle="bold" fill={zone.color} align="center" listening={false} />

        {/* Seats */}
        {seats.map(s => <Rect key={s.key} x={s.x} y={s.y} width={SEAT_SIZE} height={SEAT_SIZE} fill={hexToRgba(zone.color, 0.6)} stroke={zone.color} strokeWidth={0.8} cornerRadius={3} listening={false} />)}
      </Group>
      {isSelected && !readOnly && <Transformer ref={trRef} rotateEnabled resizeEnabled={false} enabledAnchors={[]} />}
    </>;
}

// ── Table block ───────────────────────────────────────────────────────────────
function TableBlock({
  zone,
  isSelected,
  onSelect,
  onChange,
  readOnly
}) {
  const {
    groupRef,
    trRef,
    handleDragEnd,
    makeTransformEnd
  } = useZoneGroup(zone, onChange);
  const {
    tables,
    w,
    h
  } = genTableSeats(zone);
  const scaleX = zone.width ? zone.width / w : 1;
  const scaleY = zone.height ? zone.height / h : 1;
  const tableRadius = zone.config?.tableRadius ?? 36;
  const seatR = SEAT_SIZE / 2;
  return <>
      <Group ref={groupRef} x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0} scaleX={scaleX} scaleY={scaleY} draggable={!readOnly} onClick={e => {
      e.cancelBubble = true;
      onSelect(zone.id);
    }} onTap={e => {
      e.cancelBubble = true;
      onSelect(zone.id);
    }} onDragStart={e => {
      e.cancelBubble = true;
    }} onDragEnd={handleDragEnd} onTransformEnd={makeTransformEnd(w, h)}>
        {/* Hit area */}
        <Rect width={w} height={h} fill="transparent" />
        {/* Background */}
        <Rect width={w} height={h} fill={hexToRgba(zone.color, 0.05)} stroke={isSelected ? zone.color : hexToRgba(zone.color, 0.35)} strokeWidth={isSelected ? 1.5 : 1} cornerRadius={8} listening={false} />
        {/* Label */}
        <Text x={8} y={5} text={zone.name} fontSize={10} fontStyle="bold" fill={zone.color} listening={false} />

        {tables.map(t => <Group key={t.key} listening={false}>
            {/* Table circle */}
            <Circle x={t.cx} y={t.cy} radius={tableRadius} fill={hexToRgba(zone.color, 0.18)} stroke={zone.color} strokeWidth={1.2} />
            {/* Table number */}
            <Text x={t.cx - 10} y={t.cy - 6} width={20} text={`${tables.indexOf(t) + 1}`} fontSize={10} fontStyle="bold" fill={zone.color} align="center" />
            {/* Seats around table */}
            {t.seats.map(s => <Circle key={s.key} x={s.x} y={s.y} radius={seatR} fill={hexToRgba(zone.color, 0.65)} stroke={zone.color} strokeWidth={0.8} />)}
          </Group>)}
      </Group>
      {isSelected && !readOnly && <Transformer ref={trRef} rotateEnabled resizeEnabled={false} enabledAnchors={[]} />}
    </>;
}

// ── Child natural size helper ─────────────────────────────────────────────────
// Returns the rendered (possibly scaled) size of a child block.
// If the child has explicit width/height (set by Transformer), use those.
function childNaturalSize(child) {
  const bt = child.blockType || 'rows';
  let natural;
  if (bt === 'arc') {
    const d = genArcSeats(child);
    natural = {
      w: d.w,
      h: d.h
    };
  } else if (bt === 'table') {
    const d = genTableSeats(child);
    natural = {
      w: d.w,
      h: d.h
    };
  } else {
    const d = genRowsSeats(child);
    natural = {
      w: d.w,
      h: d.h
    };
  }
  return {
    w: child.width ?? natural.w,
    h: child.height ?? natural.h
  };
}

// ── Floor (container) block ───────────────────────────────────────────────────
function FloorBlock({
  zone,
  isSelected,
  onSelect,
  onChange,
  readOnly
}) {
  const {
    groupRef,
    trRef,
    handleDragEnd,
    makeTransformEnd
  } = useZoneGroup(zone, onChange);
  const children = zone.children || [];
  const isGrouped = zone.grouped !== false; // default true for legacy zones

  // ── Ungrouped: fixed-size placeholder frame ───────────────────────────────
  if (!isGrouped) {
    const w = zone.width ?? 400;
    const h = zone.height ?? 300;
    return <>
        <Group ref={groupRef} x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0} draggable={!readOnly} onClick={e => {
        e.cancelBubble = true;
        onSelect(zone.id);
      }} onTap={e => {
        e.cancelBubble = true;
        onSelect(zone.id);
      }} onDragStart={e => {
        e.cancelBubble = true;
      }} onDragEnd={handleDragEnd} onTransformEnd={makeTransformEnd(w, h, true)}>
          {/* Hit area */}
          <Rect width={w} height={h} fill="transparent" onClick={e => {
          e.cancelBubble = true;
          onSelect(zone.id);
        }} />
          {/* Dashed frame */}
          <Rect width={w} height={h} fill={hexToRgba(zone.color, 0.03)} stroke={isSelected ? zone.color : hexToRgba(zone.color, 0.45)} strokeWidth={isSelected ? 2 : 1.5} dash={[8, 4]} cornerRadius={10} listening={false} />
          {/* Label badge */}
          <Rect x={0} y={0} width={100} height={22} fill={hexToRgba(zone.color, 0.2)} cornerRadius={[10, 0, 8, 0]} listening={false} />
          <Text x={8} y={5} text={`▦  ${zone.name}`} fontSize={10} fontStyle="bold" fill={zone.color} listening={false} />
          {/* "Chưa group" hint */}
          <Text x={w / 2 - 80} y={h / 2 - 16} width={160} text="Kéo seat vào đây rồi bấm Group" fontSize={11} fill={hexToRgba(zone.color, 0.45)} align="center" listening={false} />
          {/* Group button hint icon */}
          <Text x={w / 2 - 8} y={h / 2 + 4} text="⊞" fontSize={18} fill={hexToRgba(zone.color, 0.3)} align="center" listening={false} />
        </Group>
        {isSelected && !readOnly && <Transformer ref={trRef} rotateEnabled enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']} boundBoxFunc={(o, n) => n.width < 80 || n.height < 60 ? o : n} />}
      </>;
  }

  // ── Grouped: render children inside frame ─────────────────────────────────
  const FRAME_PAD = 20;

  // Children store (x,y) in the frame's local space (origin = top-left of frame).
  // Frame auto-sizes so all children fit with FRAME_PAD on every side.
  // If any child has x < FRAME_PAD or y < FRAME_PAD we re-normalize:
  //   shift all children right/down by the overflow amount, and move the frame
  //   left/up by the same amount so their canvas position stays the same.
  function frameSize(kids) {
    if (kids.length === 0) return {
      w: 240,
      h: 100
    };
    let maxR = 0,
      maxB = 0;
    kids.forEach(child => {
      const {
        w: cw,
        h: ch
      } = childNaturalSize(child);
      maxR = Math.max(maxR, (child.x ?? FRAME_PAD) + cw);
      maxB = Math.max(maxB, (child.y ?? FRAME_PAD) + ch);
    });
    return {
      w: Math.max(240, maxR + FRAME_PAD),
      h: Math.max(100, maxB + FRAME_PAD)
    };
  }
  const {
    w,
    h
  } = frameSize(children);
  const handleChildDragEnd = (childId, e) => {
    e.cancelBubble = true;
    // e.target.x/y is in the parent Group (frame) local space — use directly.
    const rawX = snap(e.target.x());
    const rawY = snap(e.target.y());
    const draft = children.map(c => c.id === childId ? {
      ...c,
      x: rawX,
      y: rawY
    } : c);

    // Find how much any child overflows the top/left padding boundary.
    let minX = Infinity,
      minY = Infinity;
    draft.forEach(c => {
      minX = Math.min(minX, c.x ?? FRAME_PAD);
      minY = Math.min(minY, c.y ?? FRAME_PAD);
    });
    const shiftX = minX < FRAME_PAD ? FRAME_PAD - minX : 0;
    const shiftY = minY < FRAME_PAD ? FRAME_PAD - minY : 0;

    // Re-normalize: push all children inward, pull frame outward by same amount.
    const updatedChildren = draft.map(c => ({
      ...c,
      x: (c.x ?? FRAME_PAD) + shiftX,
      y: (c.y ?? FRAME_PAD) + shiftY
    }));
    onChange(zone.id, {
      children: updatedChildren,
      x: snap((zone.x ?? 60) - shiftX),
      y: snap((zone.y ?? 60) - shiftY)
    });
  };
  return <>
      <Group ref={groupRef} x={zone.x ?? 60} y={zone.y ?? 60} rotation={zone.rotation ?? 0} draggable={!readOnly} onClick={e => {
      e.cancelBubble = true;
      onSelect(zone.id);
    }} onTap={e => {
      e.cancelBubble = true;
      onSelect(zone.id);
    }} onDragStart={e => {
      e.cancelBubble = true;
    }} onDragEnd={handleDragEnd} onTransformEnd={makeTransformEnd(w, h)}>
        <Rect width={w} height={h} fill="transparent" onClick={e => {
        e.cancelBubble = true;
        onSelect(zone.id);
      }} />
        <Rect width={w} height={h} fill={hexToRgba(zone.color, 0.04)} stroke={isSelected ? zone.color : hexToRgba(zone.color, 0.5)} strokeWidth={isSelected ? 2 : 1.5} dash={[6, 3]} cornerRadius={10} listening={false} />
        <Rect x={0} y={0} width={80} height={20} fill={hexToRgba(zone.color, 0.25)} cornerRadius={[10, 0, 8, 0]} listening={false} />
        <Text x={8} y={4} text={`▦  ${zone.name}`} fontSize={10} fontStyle="bold" fill={zone.color} listening={false} />

        {children.map(child => {
        const cx = child.x ?? FRAME_PAD;
        const cy = child.y ?? FRAME_PAD;
        const bt = child.blockType || 'rows';

        // Natural (unscaled) dimensions from geometry
        let naturalW, naturalH;
        let innerContent;
        if (bt === 'arc') {
          const {
            seats,
            w: nw,
            h: nh,
            cx: acx
          } = genArcSeats(child);
          naturalW = nw;
          naturalH = nh;
          innerContent = <>
                <Text x={acx - 20} y={0} text={child.name} fontSize={9} fill={child.color} listening={false} />
                {seats.map(s => <Rect key={s.key} x={s.x} y={s.y + 12} width={SEAT_SIZE - 2} height={SEAT_SIZE - 2} fill={hexToRgba(child.color, 0.55)} stroke={child.color} strokeWidth={0.6} cornerRadius={2} listening={false} />)}
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
                {tbls.map(t => <Group key={t.key} listening={false}>
                    <Circle x={t.cx} y={t.cy + 12} radius={tR} fill={hexToRgba(child.color, 0.15)} stroke={child.color} strokeWidth={1} />
                    {t.seats.map(s => <Circle key={s.key} x={s.x} y={s.y + 12} radius={sR} fill={hexToRgba(child.color, 0.6)} stroke={child.color} strokeWidth={0.6} />)}
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
                {seats.map(s => <Rect key={s.key} x={s.x} y={s.y} width={SEAT_SIZE - 2} height={SEAT_SIZE - 2} fill={hexToRgba(child.color, 0.5)} stroke={child.color} strokeWidth={0.6} cornerRadius={2} listening={false} />)}
              </>;
        }

        // Apply same scale as top-level block (child.width/height set by Transformer)
        const scaleX = child.width ? child.width / naturalW : 1;
        const scaleY = child.height ? child.height / naturalH : 1;
        return <Group key={child.id} x={cx} y={cy} rotation={child.rotation ?? 0} scaleX={scaleX} scaleY={scaleY} draggable={!readOnly} onDragStart={e => {
          e.cancelBubble = true;
        }} onDragEnd={e => handleChildDragEnd(child.id, e)} onMouseEnter={e => {
setNodeCss(e.target.getStage().container(), { cursor: readOnly ? 'default' : 'move' }, 'cursor');
        }} onMouseLeave={e => {
setNodeCss(e.target.getStage().container(), { cursor: 'default' }, 'cursor');
        }}>
              <Rect width={naturalW} height={naturalH} fill="transparent" />
              {innerContent}
            </Group>;
      })}
      </Group>
      {isSelected && !readOnly && <Transformer ref={trRef} rotateEnabled resizeEnabled={false} enabledAnchors={[]} />}
    </>;
}

// ── Zone router ───────────────────────────────────────────────────────────────
function ZoneBlock({
  zone,
  isSelected,
  onSelect,
  onChange,
  readOnly
}) {
  const bt = zone.blockType || 'rows';
  if (bt === 'arc') return <ArcBlock zone={zone} isSelected={isSelected} onSelect={onSelect} onChange={onChange} readOnly={readOnly} />;
  if (bt === 'table') return <TableBlock zone={zone} isSelected={isSelected} onSelect={onSelect} onChange={onChange} readOnly={readOnly} />;
  if (bt === 'floor') return <FloorBlock zone={zone} isSelected={isSelected} onSelect={onSelect} onChange={onChange} readOnly={readOnly} />;
  return <RowsBlock zone={zone} isSelected={isSelected} onSelect={onSelect} onChange={onChange} readOnly={readOnly} />;
}

// ── Stage drop target helper ───────────────────────────────────────────────────
function stagePoint(stageRef, clientX, clientY) {
  const stage = stageRef.current;
  const container = stage.container().getBoundingClientRect();
  const sx = (clientX - container.left - stage.x()) / stage.scaleX();
  const sy = (clientY - container.top - stage.y()) / stage.scaleY();
  return {
    x: snap(sx),
    y: snap(sy)
  };
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SeatmapCanvas({
  zones,
  selectedId,
  onSelectZone,
  onUpdateZone,
  onDropBlock,
  onDeleteZone,
  showGrid,
  measureMode,
  onToggleMeasure,
  bgImage,
  onBgChange,
  readOnly = false
}) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const [size, setSize] = useState({
    width: 800,
    height: 600
  });
  const fileRef = useRef(null);
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
  const [history, setHistory] = useState([[]]);
  const [histIdx, setHistIdx] = useState(0);
  const stageDraggedRef = useRef(false);

  // ── Measure tool state ────────────────────────────────────────────────────
  // pts: null | { ax, ay } | { ax, ay, bx, by }
  const [measurePts, setMeasurePts] = useState(null);

  // ── Resize observer ────────────────────────────────────────────────────────
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

  // ── Keyboard: undo/redo, delete, escape measure ──────────────────────────
  useEffect(() => {
    const handler = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if (ctrl && (e.key === 'y' || e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        handleRedo();
      }
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedId) {
        e.preventDefault();
        onDeleteZone?.(selectedId);
      }
      if (e.key === 'Escape' && measureMode) {
        setMeasurePts(null);
        onToggleMeasure?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ── Zoom step helpers ─────────────────────────────────────────────────────
  const zoomBy = direction => {
    const oldScale = stageScaleRef.current;
    const factor = direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    const newScale = oldScale * factor;
    applyZoomAtPoint(newScale, size.width / 2, size.height / 2);
  };

  // ── History helpers ────────────────────────────────────────────────────────
  const pushHistory = useCallback(newZones => {
    setHistory(prev => {
      const trimmed = prev.slice(0, histIdx + 1);
      return [...trimmed, newZones];
    });
    setHistIdx(prev => prev + 1);
  }, [histIdx]);
  const handleUndo = useCallback(() => {
    if (histIdx <= 0) return;
    const prev = history[histIdx - 1];
    setHistIdx(h => h - 1);
    onUpdateZone('__restore__', prev);
  }, [history, histIdx, onUpdateZone]);
  const handleRedo = useCallback(() => {
    if (histIdx >= history.length - 1) return;
    const next = history[histIdx + 1];
    setHistIdx(h => h + 1);
    onUpdateZone('__restore__', next);
  }, [history, histIdx, onUpdateZone]);
  const prevZonesRef = useRef(zones);
  useEffect(() => {
    if (prevZonesRef.current !== zones) {
      prevZonesRef.current = zones;
      setHistory(prev => [...prev.slice(0, histIdx + 1), zones]);
      setHistIdx(prev => prev + 1);
    }
  }, [zones, histIdx]);

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
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

  // ── Drop from palette ──────────────────────────────────────────────────────
  const handleDragOver = e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const handleDrop = e => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/x-block-type');
    if (!raw) return;
    const {
      type,
      defaultConfig
    } = JSON.parse(raw);
    const {
      x,
      y
    } = stagePoint(stageRef, e.clientX, e.clientY);
    onDropBlock({
      type,
      defaultConfig,
      x,
      y
    });
  };

  // ── Update zone position from drag/transform ──────────────────────────────
  const handleZoneChange = (zoneId, patch) => {
    onUpdateZone(zoneId, patch);
    const updated = zones.map(z => z.id === zoneId ? {
      ...z,
      ...patch
    } : z);
    pushHistory(updated);
  };

  // ── Background image upload ────────────────────────────────────────────────
  const handleBgUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new window.Image();
      img.onload = () => onBgChange?.(img);
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const zoomPct = Math.round(stageScale * 100);

  // ── Measure click handler ─────────────────────────────────────────────────
  const handleStageClick = e => {
    if (stageDraggedRef.current) return;
    if (measureMode) {
      const stage = stageRef.current;
      const pos = stage.getRelativePointerPosition();
      if (!measurePts || measurePts.bx !== undefined) {
        // Start new measurement
        setMeasurePts({
          ax: pos.x,
          ay: pos.y
        });
      } else {
        // Complete measurement
        setMeasurePts({
          ...measurePts,
          bx: pos.x,
          by: pos.y
        });
      }
      return;
    }
    if (e.target === stageRef.current) onSelectZone(null);
  };
  return <div className={css({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#111111'
  }, "SeatmapCanvas")}>

      {/* ── Toolbar ── */}
      <div className={css({
      height: 38,
      flexShrink: 0,
      borderBottom: '1px solid #222222',
      background: '#161616',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: 6
    }, "SeatmapCanvas")}>
        {[{
        label: '↩',
        title: 'Hoàn tác (Ctrl+Z)',
        action: handleUndo,
        disabled: histIdx <= 0
      }, {
        label: '↪',
        title: 'Làm lại (Ctrl+Y)',
        action: handleRedo,
        disabled: histIdx >= history.length - 1
      }].map(btn => <button key={btn.label} onClick={btn.action} disabled={btn.disabled} title={btn.title} className={css({
        background: 'transparent',
        border: '1px solid #2a2a2a',
        borderRadius: 5,
        color: btn.disabled ? '#333' : '#aaa',
        padding: '3px 9px',
        fontSize: 14,
        cursor: btn.disabled ? 'default' : 'pointer',
        fontFamily: 'inherit',
        transition: 'color .15s, border-color .15s'
      }, "SeatmapCanvas")} onMouseEnter={e => {
        if (!btn.disabled) {
setNodeCss(e.currentTarget, { color: '#fff' }, 'color');
setNodeCss(e.currentTarget, { borderColor: '#555' }, 'borderColor');
        }
      }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { color: btn.disabled ? '#333' : '#aaa' }, 'color');
setNodeCss(e.currentTarget, { borderColor: '#2a2a2a' }, 'borderColor');
      }}>{btn.label}</button>)}

        {measureMode && <>
            <div className={css({
          width: 1,
          height: 18,
          background: '#2a2a2a',
          margin: '0 4px'
        }, "SeatmapCanvas")} />
            <span className={css({
          fontSize: 11,
          color: '#facc15',
          fontWeight: 600
        }, "SeatmapCanvas")}>
              {!measurePts ? 'Click điểm A' : measurePts.bx === undefined ? 'Click điểm B' : `${Math.round(Math.hypot(measurePts.bx - measurePts.ax, measurePts.by - measurePts.ay))} px`}
            </span>
            <button onClick={() => setMeasurePts(null)} className={css({
          background: 'transparent',
          border: '1px solid #444',
          borderRadius: 4,
          color: '#888',
          padding: '2px 7px',
          fontSize: 11,
          cursor: 'pointer',
          fontFamily: 'inherit'
        }, "SeatmapCanvas")}>
              Xóa
            </button>
          </>}

        <input ref={fileRef} type="file" accept="image/*" className={css({
        display: 'none'
      }, "SeatmapCanvas")} onChange={handleBgUpload} />

        <div className={css({
        flex: 1
      }, "SeatmapCanvas")} />

        {/* Reset view */}
        <button onClick={() => {
        stageScaleRef.current = 1;
        stagePosRef.current = {
          x: 0,
          y: 0
        };
        setStageScale(1);
        setStagePos({
          x: 0,
          y: 0
        });
      }} title="Đặt lại vị trí và zoom" className={css({
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: 'transparent',
        border: '1px solid #2a2a2a',
        borderRadius: 5,
        color: '#888',
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all .15s'
      }, "SeatmapCanvas")} onMouseEnter={e => {
setNodeCss(e.currentTarget, { color: '#FF6B35' }, 'color');
setNodeCss(e.currentTarget, { borderColor: 'rgba(255,107,53,.5)' }, 'borderColor');
      }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { color: '#888' }, 'color');
setNodeCss(e.currentTarget, { borderColor: '#2a2a2a' }, 'borderColor');
      }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Reset view
        </button>

        {/* Zoom controls */}
        <div className={css({
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: 6,
        overflow: 'hidden'
      }, "SeatmapCanvas")}>
          <button onClick={() => zoomBy(-1)} title="Thu nhỏ" className={css({
          background: 'transparent',
          border: 'none',
          borderRight: '1px solid #2a2a2a',
          color: '#aaa',
          padding: '4px 10px',
          fontSize: 14,
          cursor: 'pointer',
          fontFamily: 'inherit',
          lineHeight: 1,
          transition: 'color .15s'
        }, "SeatmapCanvas")} onMouseEnter={e => {
setNodeCss(e.currentTarget, { color: '#fff' }, 'color');
setNodeCss(e.currentTarget, { background: '#262626' }, 'background');
        }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { color: '#aaa' }, 'color');
setNodeCss(e.currentTarget, { background: 'transparent' }, 'background');
        }}>−</button>
          <button onClick={() => {
          stageScaleRef.current = 1;
          stagePosRef.current = {
            x: 0,
            y: 0
          };
          setStageScale(1);
          setStagePos({
            x: 0,
            y: 0
          });
        }} title="Đặt lại zoom" className={css({
          background: 'transparent',
          border: 'none',
          color: '#aaa',
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          minWidth: 46,
          textAlign: 'center',
          transition: 'color .15s'
        }, "SeatmapCanvas")} onMouseEnter={e => {
setNodeCss(e.currentTarget, { color: '#fff' }, 'color');
        }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { color: '#aaa' }, 'color');
        }}>{zoomPct}%</button>
          <button onClick={() => zoomBy(1)} title="Phóng to" className={css({
          background: 'transparent',
          border: 'none',
          borderLeft: '1px solid #2a2a2a',
          color: '#aaa',
          padding: '4px 10px',
          fontSize: 14,
          cursor: 'pointer',
          fontFamily: 'inherit',
          lineHeight: 1,
          transition: 'color .15s'
        }, "SeatmapCanvas")} onMouseEnter={e => {
setNodeCss(e.currentTarget, { color: '#fff' }, 'color');
setNodeCss(e.currentTarget, { background: '#262626' }, 'background');
        }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { color: '#aaa' }, 'color');
setNodeCss(e.currentTarget, { background: 'transparent' }, 'background');
        }}>+</button>
        </div>
      </div>

      {/* ── Stage container ── */}
      <div ref={containerRef} className={css({
      flex: 1,
      overflow: 'hidden',
      cursor: measureMode ? 'crosshair' : 'default'
    }, "SeatmapCanvas")} onDragOver={handleDragOver} onDrop={handleDrop}>
        <Stage ref={stageRef} width={size.width} height={size.height} scaleX={stageScale} scaleY={stageScale} x={stagePos.x} y={stagePos.y} draggable={!measureMode} onDragStart={e => {
        if (e.target === stageRef.current) stageDraggedRef.current = true;
      }} onDragEnd={e => {
        if (e.target === stageRef.current) {
          const p = {
            x: e.target.x(),
            y: e.target.y()
          };
          stagePosRef.current = p;
          setStagePos(p);
          stageDraggedRef.current = false;
        }
      }} onWheel={handleWheel} onClick={handleStageClick} onTap={e => {
        if (e.target === stageRef.current) onSelectZone(null);
      }}>
          {/* Grid */}
          {showGrid && <Layer listening={false}>
              {(() => {
            const lines = [];
            for (let x = 0; x <= WORLD_W; x += GRID_SIZE) lines.push(<Rect key={`gv${x}`} x={x} y={0} width={0.5} height={WORLD_H} fill="#1e1e1e" />);
            for (let y = 0; y <= WORLD_H; y += GRID_SIZE) lines.push(<Rect key={`gh${y}`} x={0} y={y} width={WORLD_W} height={0.5} fill="#1e1e1e" />);
            return lines;
          })()}
            </Layer>}

          {/* Background image */}
          {bgImage && <Layer listening={false}>
              <KonvaImage image={bgImage} opacity={0.25} />
            </Layer>}

          {/* Stage label */}
          <Layer listening={false}>
            <Rect x={STAGE_LABEL_X} y={STAGE_LABEL_Y} width={240} height={32} fill="#FF6B35" cornerRadius={[6, 6, 0, 0]} />
            <Text x={STAGE_LABEL_X} y={STAGE_LABEL_Y + 6} width={240} text="★  SÂN KHẤU  ★" fontSize={11} fontStyle="bold" fill="#fff" align="center" letterSpacing={2} />
          </Layer>

          {/* Zones */}
          <Layer>
            {zones.map(zone => <ZoneBlock key={zone.id} zone={zone} isSelected={selectedId === zone.id} onSelect={onSelectZone} onChange={handleZoneChange} readOnly={readOnly} />)}
          </Layer>

          {/* Measure overlay */}
          {measureMode && measurePts && <Layer listening={false}>
              {/* Point A */}
              <Circle x={measurePts.ax} y={measurePts.ay} radius={5} fill="#facc15" stroke="#111" strokeWidth={1.5} />
              <Text x={measurePts.ax + 8} y={measurePts.ay - 14} text="A" fontSize={11} fontStyle="bold" fill="#facc15" />

              {/* Line + Point B + label (only when B is set) */}
              {measurePts.bx !== undefined && (() => {
            const dist = Math.round(Math.hypot(measurePts.bx - measurePts.ax, measurePts.by - measurePts.ay));
            const mx = (measurePts.ax + measurePts.bx) / 2;
            const my = (measurePts.ay + measurePts.by) / 2;
            return <>
                    {/* Line */}
                    <Rect x={measurePts.ax} y={measurePts.ay} width={Math.hypot(measurePts.bx - measurePts.ax, measurePts.by - measurePts.ay)} height={1.5} fill="#facc15" opacity={0.8} rotation={Math.atan2(measurePts.by - measurePts.ay, measurePts.bx - measurePts.ax) * 180 / Math.PI} offsetY={0.75} />
                    {/* Point B */}
                    <Circle x={measurePts.bx} y={measurePts.by} radius={5} fill="#facc15" stroke="#111" strokeWidth={1.5} />
                    <Text x={measurePts.bx + 8} y={measurePts.by - 14} text="B" fontSize={11} fontStyle="bold" fill="#facc15" />
                    {/* Distance label */}
                    <Rect x={mx - 28} y={my - 12} width={56} height={20} fill="rgba(0,0,0,.75)" cornerRadius={4} />
                    <Text x={mx - 28} y={my - 8} width={56} text={`${dist} px`} fontSize={11} fontStyle="bold" fill="#facc15" align="center" />
                  </>;
          })()}
            </Layer>}
        </Stage>
      </div>
    </div>;
}
