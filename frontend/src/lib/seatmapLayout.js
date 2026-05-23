// Purpose: Ham tien ich thuan, dung chung cho tinh toan layout, sinh ghe hoac className.
/**
 * Helpers for seatmap editor save/load and layout tree (floor frames + children).
 */

const FRAME_PAD = 20;

export function normalizeZone(z, index = 0) {
  const config = z.config || {};
  return {
    id: z.id || `z_${Date.now()}_${index}`,
    name: z.name || `Khu ${index + 1}`,
    color: z.color || '#c8860a',
    blockType: z.blockType || 'rows',
    config,
    rows: config.rows ?? z.rows ?? 5,
    cols: config.cols ?? z.cols ?? 10,
    price: typeof z.price === 'number' ? z.price : Number(z.price) || 500000,
    x: z.x ?? 60,
    y: z.y ?? 60,
    rotation: z.rotation ?? 0,
    width: z.width,
    height: z.height,
    grouped: z.grouped,
    children: Array.isArray(z.children)
      ? z.children.map((c, i) => normalizeZone(c, i))
      : undefined,
  };
}

/** Restore editor zone list from saved seatmapJson (prefers layout tree). */
export function zonesFromSeatmapJson(seatmapJson) {
  if (!seatmapJson) return [];

  // New saves keep the editable hierarchy in layout. Older data may only have
  // zones, so the loader falls back to zones to keep existing events editable.
  const raw = Array.isArray(seatmapJson.layout) && seatmapJson.layout.length > 0
    ? seatmapJson.layout
    : Array.isArray(seatmapJson.zones) && seatmapJson.zones.length > 0
      ? seatmapJson.zones
      : [];

  return raw.flatMap((z, i) => {
    const zone = normalizeZone(z, i);
    // Ungrouped floor: editor keeps frame + top-level children with _floorId
    if (zone.blockType === 'floor' && zone.grouped === false && zone.children?.length) {
      const { children, ...floor } = zone;
      return [
        { ...floor, children: [] },
        ...children.map((c, j) => ({ ...normalizeZone(c, j), _floorId: floor.id })),
      ];
    }
    return [zone];
  });
}

/** Flat seat zones for DB + seatmapJson.zones (absolute canvas coordinates). */
export function flattenZonesForDb(zones) {
  return zones.flatMap(z => {
    if (z.blockType === 'floor') {
      if (z.grouped && (z.children || []).length > 0) {
        const fx = z.x ?? 0;
        const fy = z.y ?? 0;
        // Grouped floor children are stored locally inside the frame in the
        // editor. Convert them to absolute canvas coordinates before saving seats.
        return z.children.map(child => ({
          ...child,
          x: (child.x ?? FRAME_PAD) + fx,
          y: (child.y ?? FRAME_PAD) + fy,
        }));
      }
      return [];
    }
    if (z._floorId) return [z];
    return [z];
  });
}

/** Full layout tree for rendering (floors, grouped children, local coords). */
export function buildLayoutForSave(zoneList) {
  return zoneList
    .filter(z => !z._floorId)
    .map(z => {
      // layout preserves editor-only information, while zones is flattened for
      // DB persistence. Keeping both lets customer rendering and admin editing
      // use the shape that is easiest for each workflow.
      const base = {
        id: z.id,
        name: z.name.trim(),
        color: z.color,
        price: z.price,
        blockType: z.blockType || 'rows',
        config: z.config || {},
        rows: z.rows,
        cols: z.cols,
        x: z.x ?? 60,
        y: z.y ?? 60,
        rotation: z.rotation ?? 0,
        width: z.width,
        height: z.height,
      };
      if (z.blockType === 'floor') {
        const ungroupedKids = zoneList.filter(c => c._floorId === z.id);
        base.grouped = z.grouped;
        // Ungrouped children live as top-level zones while editing, but they are
        // nested again in layout so reload can reconstruct the floor relationship.
        base.children = z.grouped
          ? (z.children || []).map(c => ({ ...c }))
          : ungroupedKids.map(c => ({ ...c }));
      }
      return base;
    });
}
