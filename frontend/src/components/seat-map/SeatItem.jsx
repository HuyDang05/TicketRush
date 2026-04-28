import { useState } from 'react';

const STATUS_STYLE = {
  AVAILABLE: { bg: '#22c55e', cursor: 'pointer', label: 'Còn trống' },
  LOCKED:    { bg: '#555555', cursor: 'not-allowed', label: 'Đang giữ' },
  SOLD:      { bg: '#ef4444', cursor: 'not-allowed', label: 'Đã bán' },
};

export default function SeatItem({ seat, isSelected, onSelect, zonePrice }) {
  const [hovered, setHovered] = useState(false);

  const isAvailable = seat.status === 'AVAILABLE';
  const style = STATUS_STYLE[seat.status] || STATUS_STYLE.AVAILABLE;

  const bg = isSelected ? '#3b82f6' : style.bg;
  const cursor = isSelected ? 'pointer' : style.cursor;

  function handleClick() {
    if (isAvailable) onSelect(seat);
  }

  const price = zonePrice ?? seat.zone?.price;

  return (
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
  );
}
