const BLOCK_TYPES = [
  {
    type: 'rows',
    label: 'Hàng thẳng',
    icon: '▬',
    defaultConfig: { rows: 5, cols: 10, aisleAfterCol: [] },
  },
  {
    type: 'arc',
    label: 'Vòng cung',
    icon: '◔',
    defaultConfig: { radius: 150, startAngle: -60, endAngle: 60, rows: 3 },
  },
  {
    type: 'table',
    label: 'Bàn tròn',
    icon: '⬤',
    defaultConfig: { seatsPerTable: 8, tableRadius: 40 },
  },
];

const DESCRIPTIONS = {
  rows: 'Ghế xếp thành hàng ngang thẳng, phù hợp cho hội trường, rạp chiếu phim.',
  arc: 'Ghế cong theo vòng cung hướng về sân khấu, tầm nhìn đồng đều hơn.',
  table: 'Ghế quanh bàn tròn, dùng cho tiệc, gala dinner.',
};

export default function BlockPalette({ onDragStart }) {
  return (
    <div style={{ padding: '14px 12px' }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: '#AAAAAA',
        letterSpacing: 1.2, textTransform: 'uppercase',
        marginBottom: 12,
      }}>
        Loại khu vực
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {BLOCK_TYPES.map(block => (
          <div
            key={block.type}
            draggable
            onDragStart={e => {
              e.dataTransfer.effectAllowed = 'copy';
              e.dataTransfer.setData(
                'application/x-block-type',
                JSON.stringify({ type: block.type, defaultConfig: block.defaultConfig }),
              );
              onDragStart?.(block);
            }}
            title={DESCRIPTIONS[block.type]}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 13px',
              background: '#1A1A1A',
              border: '1px solid #2e2e2e',
              borderRadius: 9,
              cursor: 'grab',
              userSelect: 'none',
              transition: 'border-color .15s, background .15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,107,53,.5)';
              e.currentTarget.style.background = 'rgba(255,107,53,.06)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#2e2e2e';
              e.currentTarget.style.background = '#1A1A1A';
            }}
            onMouseDown={e => { e.currentTarget.style.cursor = 'grabbing'; }}
            onMouseUp={e => { e.currentTarget.style.cursor = 'grab'; }}
          >
            {/* Icon */}
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: 'rgba(255,107,53,.12)',
              border: '1px solid rgba(255,107,53,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: '#FF6B35',
            }}>
              {block.icon}
            </div>

            {/* Label + hint */}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                {block.label}
              </div>
              <div style={{
                fontSize: 10, color: '#666', marginTop: 3,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: 170,
              }}>
                {DESCRIPTIONS[block.type]}
              </div>
            </div>

            {/* Drag handle dots */}
            <div style={{
              marginLeft: 'auto', flexShrink: 0,
              display: 'grid', gridTemplateColumns: 'repeat(2, 4px)', gap: 3,
            }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: '#444' }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tip */}
      <div style={{
        marginTop: 16, padding: '10px 12px',
        background: '#161616', border: '1px dashed #2a2a2a',
        borderRadius: 8, fontSize: 11, color: '#555', lineHeight: 1.6,
      }}>
        Kéo và thả một loại khu vực vào canvas để thêm vào sơ đồ.
      </div>
    </div>
  );
}

export { BLOCK_TYPES };
