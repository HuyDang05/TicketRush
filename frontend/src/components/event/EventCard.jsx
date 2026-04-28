import { useState } from 'react';
import { Link } from 'react-router-dom';

const CARD_GRADIENTS = [
  'linear-gradient(135deg,#2d1200,#8b3a00)',
  'linear-gradient(135deg,#0a1a2d,#0a3d6b)',
  'linear-gradient(135deg,#0d2200,#1a4400)',
  'linear-gradient(135deg,#1a0a2d,#4a1a7a)',
  'linear-gradient(135deg,#1a1000,#5a3a00)',
  'linear-gradient(135deg,#001a1a,#006666)',
  'linear-gradient(135deg,#1a0010,#6a0040)',
  'linear-gradient(135deg,#001a0a,#004d20)',
];
const CARD_EMOJIS = ['🎸', '🎹', '⚽', '🎪', '🎷', '🏊', '🎭', '🎤'];

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function EventCard({ event }) {
  const [hovered, setHovered] = useState(false);
  const idx = hashCode(event.id || event.title) % CARD_GRADIENTS.length;
  const gradient = CARD_GRADIENTS[idx];
  const emoji = CARD_EMOJIS[idx];

  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    : '';

  const minPrice = event.zones?.length
    ? Math.min(...event.zones.map((z) => z.price))
    : null;

  return (
    <Link
      to={`/event/${event.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--card)',
        border: `1px solid ${hovered ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color .2s, filter .2s, transform .2s',
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        filter: hovered ? 'brightness(1.07)' : 'none',
        transform: hovered ? 'translateY(-3px)' : 'none',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform .3s',
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', background: gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36,
            transform: hovered ? 'scale(1.04)' : 'scale(1)',
            transition: 'transform .3s',
          }}>{emoji}</div>
        )}
        {dateStr && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: 'var(--accent)', color: '#fff',
            fontSize: 11, fontWeight: 700,
            padding: '3px 8px', borderRadius: 5, lineHeight: 1.4,
          }}>{dateStr}</div>
        )}
        {event.category && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)',
            color: '#fff', fontSize: 11, fontWeight: 500,
            padding: '3px 8px', borderRadius: 5,
          }}>{event.category}</div>
        )}
      </div>

      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{
          fontSize: 15, fontWeight: 700, lineHeight: 1.4, marginBottom: 8,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{event.title}</div>

        {event.venue && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--muted)', marginBottom: 5 }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            {event.venue}
          </div>
        )}

        {event.date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--muted)', marginBottom: 5 }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            {new Date(event.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
            {minPrice != null ? `Từ ${minPrice.toLocaleString('vi-VN')}đ` : 'Liên hệ'}
          </span>
          <span style={{
            border: '1px solid var(--accent)', color: 'var(--accent)',
            background: hovered ? 'var(--accent)' : 'transparent',
            ...(hovered ? { color: '#fff' } : {}),
            borderRadius: 6, fontSize: 12, fontWeight: 600, padding: '5px 12px',
            transition: 'background .2s, color .2s',
          }}>Đặt vé →</span>
        </div>
      </div>
    </Link>
  );
}
