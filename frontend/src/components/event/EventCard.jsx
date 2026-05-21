import { Link } from 'react-router-dom';
import './event.css';
import { useLang } from '../../context/LangContext';

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

function removeVietnameseTones(str = '') {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export default function EventCard({ event }) {
  const idx = hashCode(event.id || event.title) % CARD_GRADIENTS.length;
  const gradient = CARD_GRADIENTS[idx];
  const emoji = CARD_EMOJIS[idx];
  const { lang } = useLang();

  const dateShort = event.date
    ? new Date(event.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    : '';

  const dateLong = event.date
    ? (() => {
        const d = new Date(event.date);
        const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        return `${days[d.getDay()]}, ${dateShort} · ${timeStr}`;
      })()
    : '';

  const minPrice = event.minPrice ?? (event.zones?.length
    ? Math.min(...event.zones.map(z => Number(z.price)))
    : null);

  return (
    <Link to={`/events/${event.id}`} className="event-card">
      <div className="event-card__thumb">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} className="event-card__thumb-img" />
        ) : (
          <div className="event-card__thumb-placeholder" style={{ background: gradient }}>
            {emoji}
          </div>
        )}
        {dateShort && <div className="event-card__date-badge">{dateShort}</div>}
        <div className="event-card__cat-badge">
          {lang === 'en' ? 'Music' : 'Âm nhạc'}
        </div>
      </div>

      <div className="event-card__body">
        <div className="event-card__title">{event.title}</div>

        {event.venue && (
          <div className="event-card__meta">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" />
            </svg>
            <span>
              {lang === 'en' ? removeVietnameseTones(event.venue) : event.venue}
            </span>
          </div>
        )}

        {dateLong && (
          <div className="event-card__meta">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {dateLong}
          </div>
        )}

        <div className="event-card__footer">
          <span className="event-card__price">
            {minPrice != null
              ? `${lang === 'en' ? 'From' : 'Từ'} ${minPrice.toLocaleString('vi-VN')}đ`
              : lang === 'en' ? 'Contact' : 'Liên hệ'}
          </span>
          <button onClick={e => e.preventDefault()} className="event-card__btn">
            {lang === 'en' ? 'Book now' : 'Đặt vé'} →
          </button>
        </div>
      </div>
    </Link>
  );
}
