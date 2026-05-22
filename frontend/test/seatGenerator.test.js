import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateArcSeats,
  generateRowSeats,
  generateSeatsForZone,
  generateTableSeats,
} from '../src/lib/seatGenerator.js';

test('generateRowSeats creates predictable row labels and aisle spacing', () => {
  const seats = generateRowSeats({ rows: 2, cols: 3, seatSize: 10, gap: 2, aisleAfterCol: [0] });

  assert.equal(seats.length, 6);
  assert.deepEqual(seats.map((seat) => seat.label), ['A1', 'A2', 'A3', 'B1', 'B2', 'B3']);
  assert.equal(seats[1].position.x, 22);
  assert.equal(seats[3].position.y, 12);
});

test('generateArcSeats places single-seat rows at the arc midpoint', () => {
  const [seat] = generateArcSeats({
    centerX: 0,
    centerY: 0,
    radius: 100,
    startAngle: -60,
    endAngle: 60,
    rows: 1,
    seatsPerRow: [1],
  });

  assert.equal(seat.label, 'A1');
  assert.equal(Math.round(seat.angle), 0);
  assert.equal(Math.round(seat.position.x), 100);
  assert.equal(Math.round(seat.position.y), 0);
});

test('generateTableSeats creates seats around each table', () => {
  const seats = generateTableSeats({ tables: 2, seatsPerTable: 4, tableRadius: 10, tableSpacingX: 50 });

  assert.equal(seats.length, 8);
  assert.equal(seats[0].label, 'T1-1');
  assert.equal(seats[4].label, 'T2-1');
  assert.equal(seats[4].position.x, 50);
});

test('generateSeatsForZone dispatches by block type', () => {
  assert.equal(generateSeatsForZone({ blockType: 'rows', rows: 1, cols: 2 }).length, 2);
  assert.equal(generateSeatsForZone({ blockType: 'arc', config: { rows: 2, baseSeats: 3 } }).length, 8);
  assert.equal(generateSeatsForZone({ blockType: 'table', config: { tableCount: 2, seatsPerTable: 6 } }).length, 12);
});
