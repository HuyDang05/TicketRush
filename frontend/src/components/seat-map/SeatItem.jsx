export default function SeatItem({ seat, onSelect, isSelected }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-blue-400 hover:bg-blue-500 cursor-pointer';
      case 'LOCKED':
        return 'bg-yellow-400 cursor-not-allowed';
      case 'SOLD':
        return 'bg-red-400 cursor-not-allowed';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <button
      onClick={() => seat.status === 'AVAILABLE' && onSelect(seat)}
      disabled={seat.status !== 'AVAILABLE'}
      className={`w-8 h-8 rounded text-xs font-semibold transition ${getStatusColor(
        seat.status
      )} ${isSelected ? 'ring-2 ring-green-500' : ''}`}
    >
      {seat.label.replace(/^./, '')}
    </button>
  );
}
