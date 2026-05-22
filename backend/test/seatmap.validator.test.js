const test = require('node:test');
const assert = require('node:assert/strict');

const { saveSeatmapBody } = require('../src/validators/seatmap.validator');

function validSeatmap(overrides = {}) {
  return {
    seatmapVersion: 1,
    seatmap: {
      zones: [
        {
          id: 'zone-1',
          name: 'VIP',
          price: 500000,
          rows: 1,
          cols: 2,
          seats: [
            { id: 'seat-1', label: 'A1', row: 0, col: 0 },
            { id: 'seat-2', label: 'A2', row: 0, col: 1 },
          ],
        },
      ],
    },
    ...overrides,
  };
}

test('save seatmap validator accepts a valid seatmap and coerces numeric fields', () => {
  const parsed = saveSeatmapBody.parse({
    seatmapVersion: '2',
    seatmap: {
      zones: [
        {
          id: 'zone-1',
          name: 'VIP',
          price: '500000',
          rows: '1',
          cols: '2',
          seats: [
            { id: 'seat-1', label: 'A1', row: '0', col: '0' },
          ],
        },
      ],
    },
  });

  assert.equal(parsed.seatmapVersion, 2);
  assert.equal(parsed.seatmap.zones[0].price, 500000);
  assert.equal(parsed.seatmap.zones[0].seats[0].row, 0);
});

test('save seatmap validator rejects duplicate zone ids', () => {
  const payload = validSeatmap({
    seatmap: {
      zones: [
        validSeatmap().seatmap.zones[0],
        { ...validSeatmap().seatmap.zones[0], name: 'Regular' },
      ],
    },
  });

  assert.equal(saveSeatmapBody.safeParse(payload).success, false);
});

test('save seatmap validator rejects duplicate seats in the same zone', () => {
  const payload = validSeatmap();
  payload.seatmap.zones[0].seats.push({ id: 'seat-2', label: 'A2', row: 0, col: 1 });

  assert.equal(saveSeatmapBody.safeParse(payload).success, false);
});

test('save seatmap validator rejects unsafe ids, empty seat lists, and excessive prices', () => {
  assert.equal(saveSeatmapBody.safeParse(validSeatmap({
    seatmap: {
      zones: [{ ...validSeatmap().seatmap.zones[0], id: 'bad id!' }],
    },
  })).success, false);

  assert.equal(saveSeatmapBody.safeParse(validSeatmap({
    seatmap: {
      zones: [{ ...validSeatmap().seatmap.zones[0], seats: [] }],
    },
  })).success, false);

  assert.equal(saveSeatmapBody.safeParse(validSeatmap({
    seatmap: {
      zones: [{ ...validSeatmap().seatmap.zones[0], price: 100000001 }],
    },
  })).success, false);
});
