// Purpose: Component hien thi so do ghe cho customer khi chon ghe.
import SeatItem from './SeatItem';
import './seat-map.css';

export default function SeatGrid({ seats, selectedSeats, onSelectSeat, zonePrice, accentColor }) {
  const rowMap = {};
  seats.forEach((seat) => {
    const rowKey = seat.row ?? seat.label?.[0] ?? '?';
    if (!rowMap[rowKey]) rowMap[rowKey] = [];
    rowMap[rowKey].push(seat);
  });

  const rowKeys = Object.keys(rowMap).sort();

  return (
    <div className="seat-grid">
      {rowKeys.map((rowKey) => {
        const rowSeats = rowMap[rowKey].sort((a, b) => {
          const na = a.col ?? parseInt(a.label?.replace(/^[A-Za-z]+/, '')) ?? 0;
          const nb = b.col ?? parseInt(b.label?.replace(/^[A-Za-z]+/, '')) ?? 0;
          return na - nb;
        });
        return (
          <div key={rowKey} className="seat-grid__row">
            <span className="seat-grid__row-label">{rowKey}</span>
            <div className="seat-grid__seats">
              {rowSeats.map((seat) => (
                <SeatItem
                  key={seat.id}
                  seat={{ ...seat, price: seat.price ?? zonePrice ?? 0 }}
                  isSelected={selectedSeats.some((s) => s.id === seat.id)}
                  onSelect={onSelectSeat}
                  accentColor={accentColor}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
