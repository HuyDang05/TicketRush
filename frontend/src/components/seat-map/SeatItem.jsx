import './seat-map.css';

export default function SeatItem({ seat, onSelect, isSelected, accentColor }) {
  const getClass = () => {
    if (isSelected) return 'seat-item seat-item--selected';
    switch (seat.status) {
      case 'AVAILABLE': return 'seat-item seat-item--available';
      case 'LOCKED':    return 'seat-item seat-item--locked';
      case 'SOLD':      return 'seat-item seat-item--sold';
      default:          return 'seat-item seat-item--default';
    }
  };

  const bgStyle = (seat.status === 'AVAILABLE' && !isSelected)
    ? { background: accentColor || '#22c55e' }
    : {};

  const num = seat.label?.replace(/^[A-Za-z]+/, '') || seat.label;

  return (
    <button
      onClick={() => seat.status === 'AVAILABLE' && onSelect && onSelect(seat)}
      disabled={seat.status !== 'AVAILABLE' && !isSelected}
      title={`${seat.label} · ${Number(seat.price || 0).toLocaleString('vi-VN')}đ`}
      className={getClass()}
      style={bgStyle}
    >
      {num}
    </button>
  );
}
