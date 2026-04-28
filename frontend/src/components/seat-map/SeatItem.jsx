export default function SeatItem({ seat, onSelect, isSelected }) {
  const getStatusClasses = (status) => {
    if (isSelected) return 'bg-blue-500 hover:bg-blue-600 cursor-pointer text-white';

    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-500 hover:bg-green-600 cursor-pointer text-white';
      case 'LOCKED':
        return 'bg-gray-400 cursor-not-allowed text-white';
      case 'SOLD':
        return 'bg-red-500 cursor-not-allowed text-white';
      default:
        return 'bg-gray-300';
    }
  };

  const priceLabel = seat.zone?.price
    ? `${seat.zone.price.toLocaleString()}đ`
    : seat.price
    ? `${seat.price.toLocaleString()}đ`
    : '—';

  const title = `${seat.label} • ${priceLabel} • ${seat.status}`;

  return (
    <button
      onClick={() => seat.status === 'AVAILABLE' && onSelect(seat)}
      disabled={seat.status !== 'AVAILABLE'}
      title={title}
      className={`w-8 h-8 rounded text-xs font-semibold transition ${getStatusClasses(
        seat.status
      )} ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
    >
      {seat.label.replace(/^./, '')}
    </button>
  );
}
