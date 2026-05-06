const colLetter = (n) => {
  let s = '';
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
};

const DEG = Math.PI / 180;

/**
 * Hàng thẳng: ghế xếp theo lưới rows × cols.
 *
 * @param {{ rows, cols, startX, startY, seatSize, gap, aisleAfterCol? }} config
 * @returns {Array<{ id, label, row, col, position: {x,y} }>}
 */
export function generateRowSeats(config) {
  const { rows, cols, startX = 0, startY = 0, seatSize = 24, gap = 4, aisleAfterCol = [] } = config;
  const step   = seatSize + gap;
  const aisle  = new Set(aisleAfterCol);
  const seats  = [];

  for (let r = 0; r < rows; r++) {
    let xOffset = 0;
    for (let c = 0; c < cols; c++) {
      const label = `${colLetter(r)}${c + 1}`;
      seats.push({
        id:       label,
        label,
        row:      r,
        col:      c,
        position: { x: startX + xOffset, y: startY + r * step },
      });
      xOffset += step;
      // extra gap after aisle column
      if (aisle.has(c)) xOffset += seatSize;
    }
  }

  return seats;
}

/**
 * Vòng cung: ghế phân bố theo tọa độ cực hướng về tâm (sân khấu).
 *
 * @param {{ centerX, centerY, radius, startAngle, endAngle, rows, seatsPerRow }} config
 *   - angles in degrees (0° = right, 90° = down)
 *   - seatsPerRow: number[] — số ghế cho từng hàng (index = row)
 * @returns {Array<{ id, label, row, col, position: {x,y}, angle }>}
 */
export function generateArcSeats(config) {
  const {
    centerX = 0,
    centerY = 0,
    radius      = 200,
    startAngle  = -60,
    endAngle    = 60,
    rows        = 3,
    seatsPerRow = [],
    rowSpacing  = 40,
  } = config;

  const seats = [];

  for (let r = 0; r < rows; r++) {
    const rowRadius = radius + r * rowSpacing;
    const count     = seatsPerRow[r] ?? 10;

    // With only 1 seat, place it at the arc midpoint
    const angleStep = count > 1 ? (endAngle - startAngle) / (count - 1) : 0;
    const midOffset = count === 1 ? (startAngle + endAngle) / 2 - startAngle : 0;

    for (let s = 0; s < count; s++) {
      const angleDeg = startAngle + (count === 1 ? midOffset : s * angleStep);
      const angleRad = angleDeg * DEG;
      const label    = `${colLetter(r)}${s + 1}`;

      seats.push({
        id:       label,
        label,
        row:      r,
        col:      s,
        angle:    angleDeg,
        position: {
          x: centerX + rowRadius * Math.cos(angleRad),
          y: centerY + rowRadius * Math.sin(angleRad),
        },
      });
    }
  }

  return seats;
}

/**
 * Bàn tròn: ghế phân bố đều quanh chu vi của mỗi bàn.
 *
 * @param {{ tables, seatsPerTable, tableRadius, startX, startY, tableSpacingX, tableSpacingY }} config
 * @returns {Array<{ id, label, tableIndex, seatIndex, position: {x,y}, angle }>}
 */
export function generateTableSeats(config) {
  const {
    tables         = 1,
    seatsPerTable  = 8,
    tableRadius    = 40,
    startX         = 0,
    startY         = 0,
    tableSpacingX  = tableRadius * 3,
    tableSpacingY  = tableRadius * 3,
    tablesPerRow   = 4,
  } = config;

  const seats = [];

  for (let t = 0; t < tables; t++) {
    const col    = t % tablesPerRow;
    const row    = Math.floor(t / tablesPerRow);
    const cx     = startX + col * tableSpacingX;
    const cy     = startY + row * tableSpacingY;

    for (let s = 0; s < seatsPerTable; s++) {
      const angleRad = (s / seatsPerTable) * 2 * Math.PI - Math.PI / 2;
      const label    = `T${t + 1}-${s + 1}`;

      seats.push({
        id:         label,
        label,
        tableIndex: t,
        seatIndex:  s,
        angle:      (angleRad / DEG),
        position: {
          x: cx + tableRadius * Math.cos(angleRad),
          y: cy + tableRadius * Math.sin(angleRad),
        },
      });
    }
  }

  return seats;
}

/**
 * Dispatcher: chọn đúng generator dựa vào blockType của zone.
 *
 * @param {object} zone  — zone object từ editor state
 * @returns {Array}
 */
export function generateSeatsForZone(zone) {
  const bt = zone.blockType || 'rows';

  if (bt === 'arc') {
    const cfg = zone.config ?? {};
    const rows = cfg.rows ?? zone.rows ?? 3;

    // Parse seatsPerRow: stored as comma string or array
    let seatsPerRow;
    if (Array.isArray(cfg.seatsPerRow)) {
      seatsPerRow = cfg.seatsPerRow;
    } else if (typeof cfg.seatsPerRow === 'string' && cfg.seatsPerRow.trim()) {
      seatsPerRow = cfg.seatsPerRow.split(',').map(v => parseInt(v.trim()) || 10);
    } else {
      const base = cfg.baseSeats ?? 10;
      seatsPerRow = Array.from({ length: rows }, (_, i) => base + i * 2);
    }

    return generateArcSeats({
      centerX:    (zone.x ?? 0) + (cfg.radius ?? 200),
      centerY:    (zone.y ?? 0) + (cfg.radius ?? 200),
      radius:     cfg.radius     ?? 200,
      startAngle: cfg.startAngle ?? -60,
      endAngle:   cfg.endAngle   ?? 60,
      rows,
      seatsPerRow,
      rowSpacing: cfg.rowSpacing ?? 40,
    });
  }

  if (bt === 'table') {
    const cfg = zone.config ?? {};
    return generateTableSeats({
      tables:        cfg.tableCount    ?? 1,
      seatsPerTable: cfg.seatsPerTable ?? 8,
      tableRadius:   cfg.tableRadius   ?? 40,
      startX:        zone.x ?? 0,
      startY:        zone.y ?? 0,
    });
  }

  // default: rows
  return generateRowSeats({
    rows:         zone.config?.rows ?? zone.rows ?? 5,
    cols:         zone.config?.cols ?? zone.cols ?? 10,
    startX:       zone.x ?? 0,
    startY:       zone.y ?? 0,
    seatSize:     24,
    gap:          4,
    aisleAfterCol: zone.config?.aisleAfterCol ?? [],
  });
}
