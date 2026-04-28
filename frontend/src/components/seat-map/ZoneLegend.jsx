const ITEMS = [
  { color: '#22c55e', label: 'Còn trống' },
  { color: '#555555', label: 'Đang giữ' },
  { color: '#ef4444', label: 'Đã bán' },
  { color: '#3b82f6', label: 'Đang chọn' },
];

export default function ZoneLegend() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', padding: '10px 0' }}>
      {ITEMS.map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#AAAAAA' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
          {label}
        </div>
      ))}
    </div>
  );
}
