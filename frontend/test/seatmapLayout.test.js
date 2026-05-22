import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLayoutForSave,
  flattenZonesForDb,
  normalizeZone,
  zonesFromSeatmapJson,
} from '../src/lib/seatmapLayout.js';

test('normalizeZone fills editor defaults and coerces numeric price', () => {
  const zone = normalizeZone({ name: 'VIP', price: '750000', config: { rows: 2, cols: 4 } }, 3);

  assert.equal(zone.name, 'VIP');
  assert.equal(zone.rows, 2);
  assert.equal(zone.cols, 4);
  assert.equal(zone.price, 750000);
  assert.equal(zone.x, 60);
  assert.equal(zone.y, 60);
  assert.match(zone.id, /^z_/);
});

test('zonesFromSeatmapJson prefers layout over flat zones and expands ungrouped floors', () => {
  const zones = zonesFromSeatmapJson({
    zones: [{ id: 'flat', name: 'Flat', price: 1 }],
    layout: [
      {
        id: 'floor-1',
        name: 'Floor',
        blockType: 'floor',
        grouped: false,
        children: [{ id: 'child-1', name: 'Child', price: 100 }],
      },
    ],
  });

  assert.equal(zones.length, 2);
  assert.equal(zones[0].id, 'floor-1');
  assert.equal(zones[0].children.length, 0);
  assert.equal(zones[1]._floorId, 'floor-1');
});

test('flattenZonesForDb converts grouped floor children to absolute coordinates', () => {
  const flattened = flattenZonesForDb([
    {
      id: 'floor-1',
      blockType: 'floor',
      grouped: true,
      x: 100,
      y: 200,
      children: [{ id: 'child-1', x: 10, y: 20 }],
    },
    { id: 'standalone', x: 1, y: 2 },
  ]);

  assert.equal(flattened.length, 2);
  assert.equal(flattened[0].id, 'child-1');
  assert.equal(flattened[0].x, 110);
  assert.equal(flattened[0].y, 220);
  assert.equal(flattened[1].id, 'standalone');
});

test('buildLayoutForSave nests ungrouped floor children back into their floor', () => {
  const layout = buildLayoutForSave([
    {
      id: 'floor-1',
      name: ' Floor 1 ',
      blockType: 'floor',
      grouped: false,
      color: '#fff',
      price: 0,
      config: {},
      rows: 1,
      cols: 1,
    },
    {
      id: 'child-1',
      _floorId: 'floor-1',
      name: 'Child',
      blockType: 'rows',
      color: '#000',
      price: 100,
      config: {},
    },
  ]);

  assert.equal(layout.length, 1);
  assert.equal(layout[0].name, 'Floor 1');
  assert.equal(layout[0].children.length, 1);
  assert.equal(layout[0].children[0].id, 'child-1');
});
