import SeatItem from './SeatItem';

export default function SeatGrid({ seats, selectedSeats, onSelectSeat, zonePrice }) {
  const rowMap = {};
  seats.forEach((seat) => {
    const rowKey = seat.label?.[0] ?? '?';
    if (!rowMap[rowKey]) rowMap[rowKey] = [];
    rowMap[rowKey].push(seat);
  });

  const rowKeys = Object.keys(rowMap).sort();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 8px' }}>
      {rowKeys.map((rowKey) => {
        const rowSeats = rowMap[rowKey].sort((a, b) => {
          const na = parseInt(a.label?.slice(1)) || 0;
          const nb = parseInt(b.label?.slice(1)) || 0;
          return na - nb;
        });
        return (
          <div key={rowKey} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 20,
              fontSize: 11,
              fontWeight: 700,
              color: '#AAAAAA',
              textAlign: 'center',
              flexShrink: 0,
            }}>{rowKey}</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {rowSeats.map((seat) => (
                <SeatItem
                  key={seat.id}
                  seat={seat}
                  isSelected={selectedSeats.some((s) => s.id === seat.id)}
                  onSelect={onSelectSeat}
                  zonePrice={zonePrice}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
