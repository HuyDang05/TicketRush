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
<<<<<<< HEAD
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 28,
          height: 28,
          borderRadius: 5,
          background: bg,
          border: isSelected ? '2px solid #93c5fd' : '2px solid transparent',
          cursor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          fontWeight: 700,
          color: '#fff',
          padding: 0,
          transition: 'transform 0.1s',
          transform: hovered && isAvailable ? 'scale(1.15)' : 'scale(1)',
          fontFamily: "inherit",
        }}
        disabled={!isAvailable && !isSelected}
        title=""
      >
        {isSelected ? '✓' : seat.label?.slice(1)}
      </button>

      {hovered && (
        <div style={{
          position: 'absolute',
          bottom: '110%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#111',
          border: '1px solid #333',
          borderRadius: 6,
          padding: '5px 10px',
          fontSize: 11,
          fontWeight: 600,
          color: '#fff',
          whiteSpace: 'nowrap',
          zIndex: 100,
          pointerEvents: 'none',
          lineHeight: 1.6,
        }}>
          <div>{seat.label}</div>
          {price != null && (
            <div style={{ color: '#FF6B35' }}>{price.toLocaleString('vi-VN')}đ</div>
          )}
          <div style={{ color: isSelected ? '#93c5fd' : style.bg, fontSize: 10 }}>{isSelected ? 'Đang chọn' : style.label}</div>
        </div>
      )}
    </div>
=======
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
>>>>>>> dev
  );
}
