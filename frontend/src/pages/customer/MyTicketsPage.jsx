import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import bookingService from '../../services/booking.service';

import './my-tickets.css';

function drawQRPattern(canvas, seed, size) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cell = Math.floor(size / 21);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  function rand(i) {
    const x = Math.sin(seed * 9301 + i * 49297) * 233280;
    return x - Math.floor(x);
  }
  ctx.fillStyle = '#111';
  for (let row = 0; row < 21; row++) {
    for (let col = 0; col < 21; col++) {
      const inFinder = (row < 8 && col < 8) || (row < 8 && col > 12) || (row > 12 && col < 8);
      if (inFinder) {
        const ir = row > 12 ? row - 14 : row;
        const ic = col > 12 ? col - 14 : col;
        if (ir === 0 || ir === 6 || ic === 0 || ic === 6 || (ir >= 2 && ir <= 4 && ic >= 2 && ic <= 4)) {
          ctx.fillRect(col * cell, row * cell, cell, cell);
        }
      } else if (rand(row * 21 + col) > 0.5) {
        ctx.fillRect(col * cell, row * cell, cell, cell);
      }
    }
  }
}

function QRCanvas({ seed, size, style }) {
  const ref = useRef(null);
  useEffect(() => { drawQRPattern(ref.current, seed, size); }, [seed, size]);
  return <canvas ref={ref} width={size} height={size} style={style} />;
}

function QRModal({ booking, onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  const event = booking?.seat?.zone?.event;
  const seed = booking?.id ? booking.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : 42;
  const ticketCode = `TICKET-${booking?.seat?.label || '?'}-${booking?.id?.slice(0, 8)?.toUpperCase() || ''}`;

  return (
    <div className="qr-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="qr-modal">
        <div className="qr-modal__header">
          <div className="qr-modal__title">{event?.name || 'Sự kiện'}</div>
          <button className="qr-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="qr-modal__body">
          <div className="qr-modal__qr-wrap">
            {booking?.qrCode
              ? <img src={booking.qrCode} alt="QR" style={{ width: 172, height: 172, objectFit: 'contain' }} />
              : <QRCanvas seed={seed} size={172} />
            }
          </div>
          <div className="qr-modal__info">
            {[
              { label: 'Mã vé', value: ticketCode },
              { label: 'Ngày', value: event?.date ? new Date(event.date).toLocaleDateString('vi-VN') : '—' },
              { label: 'Địa điểm', value: event?.location || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="qr-modal__info-row">
                <span className="qr-modal__info-label">{label}</span>
                <span className="qr-modal__info-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const THUMB_GRADIENTS = [
  'linear-gradient(160deg,#2d1000,#8b3500)',
  'linear-gradient(160deg,#0d2200,#1a4400)',
  'linear-gradient(160deg,#0a1a2d,#0a3d6b)',
  'linear-gradient(160deg,#1a1000,#5a3a00)',
  'linear-gradient(160deg,#1a001a,#5a005a)',
];
const THUMB_EMOJIS = ['🎤', '⚽', '🎹', '🎷', '🎭', '🎪'];

function TicketCard({ booking, idx, onViewQR }) {
  const event = booking.seat?.zone?.event;
  const isPast = booking.status === 'PAID' && event?.date && new Date(event.date) < new Date();
  const isUpcoming = !isPast && booking.status === 'PAID';
  const fmtVND = n => (n || 0).toLocaleString('vi-VN') + 'đ';

  return (
    <div className="booking-card" style={{ opacity: isPast ? 0.75 : 1 }}>
      <div className="booking-card__header">
        <div
          className="booking-card__thumb"
          style={{ background: THUMB_GRADIENTS[idx % THUMB_GRADIENTS.length] }}
        >
          {THUMB_EMOJIS[idx % THUMB_EMOJIS.length]}
        </div>
        <div className="booking-card__info">
          <div className="booking-card__title">{event?.name || 'Sự kiện'}</div>
          <div className="booking-card__meta">
            {event?.date && (
              <div className="booking-card__meta-item">
                <svg width="12" height="12" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                {new Date(event.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
            )}
            {event?.location && (
              <div className="booking-card__meta-item">
                <svg width="12" height="12" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                {event.location}
              </div>
            )}
          </div>
        </div>
        <div className="booking-card__status">
          <span
            className="booking-card__status-badge"
            style={isUpcoming
              ? { background: '#0F2A1A', color: '#4ade80' }
              : { background: 'rgba(170,170,170,.08)', color: '#AAAAAA' }
            }
          >
            {isUpcoming ? '● Sắp diễn ra' : 'Đã diễn ra'}
          </span>
        </div>
      </div>

      <div className="booking-card__body">
        <div className="booking-card__seat-row">
          <div className="booking-card__seat-badge">
            <div
              className="booking-card__seat-dot"
              style={{ background: isUpcoming ? '#FF6B35' : '#AAAAAA' }}
            />
            <span className="booking-card__seat-label">
              {booking.seat?.zone?.name || '—'} · Ghế {booking.seat?.label || '—'}
            </span>
          </div>
          <span className="booking-card__seat-price">{fmtVND(booking.totalPrice)}</span>
        </div>
      </div>

      <div className="booking-card__footer">
        <span className="booking-card__total">{fmtVND(booking.totalPrice)}</span>
        {isPast ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#AAAAAA', border: '1px solid #333333', borderRadius: 5, padding: '4px 10px' }}>
            Đã sử dụng
          </span>
        ) : (
          <button className="booking-card__qr-btn" onClick={() => onViewQR(booking)}>
            Xem QR
          </button>
        )}
      </div>
    </div>
  );
}

export default function MyTicketsPage() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modalBooking, setModalBooking] = useState(null);

  useEffect(() => {
    bookingService.getMyBookings()
      .then(res => setBookings(res.data?.data || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  const isUpcoming = b => b.status === 'PAID' && b.seat?.zone?.event?.date && new Date(b.seat.zone.event.date) >= new Date();
  const isPast = b => b.status === 'PAID' && b.seat?.zone?.event?.date && new Date(b.seat.zone.event.date) < new Date();

  const filtered = bookings.filter(b => {
    const matchFilter = filter === 'all' || (filter === 'upcoming' && isUpcoming(b)) || (filter === 'past' && isPast(b));
    const matchSearch = search === '' || (b.seat?.zone?.event?.name || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const upcomingCount = bookings.filter(isUpcoming).length;
  const pastCount = bookings.filter(isPast).length;

  const FilterTab = ({ id, label, count }) => (
    <button
      onClick={() => setFilter(id)}
      className={`my-tickets__tab ${filter === id ? 'my-tickets__tab--active' : 'my-tickets__tab--inactive'}`}
    >
      {label}
      <span className="my-tickets__tab-count">{count}</span>
    </button>
  );

  return (
    <div className="my-tickets">

      <div className="my-tickets__header">
        <div>
          <h1 className="my-tickets__heading">Vé của tôi</h1>
          <p className="my-tickets__subheading">Quản lý tất cả vé đã mua</p>
        </div>
        <div className="my-tickets__search-wrap">
          <input
            className="my-tickets__search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm vé..."
          />
          <span className="my-tickets__search-icon">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>
          </span>
        </div>
      </div>

      <div className="my-tickets__filters">
        <FilterTab id="all" label="Tất cả" count={bookings.length} />
        <FilterTab id="upcoming" label="Sắp diễn ra" count={upcomingCount} />
        <FilterTab id="past" label="Đã diễn ra" count={pastCount} />
      </div>

      <div className="my-tickets__content">
        {loading ? (
          <div className="my-tickets__empty">
            <div className="my-tickets__empty-title">Đang tải vé...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="my-tickets__empty">
            <div className="my-tickets__empty-icon">🎟️</div>
            <div className="my-tickets__empty-title">Bạn chưa có vé nào</div>
            <p className="my-tickets__empty-sub">Khám phá các sự kiện hấp dẫn và đặt vé ngay hôm nay!</p>
            <button className="my-tickets__empty-btn" onClick={() => navigate('/')}>
              Khám phá sự kiện →
            </button>
          </div>
        ) : (
          <div className="my-tickets__grid">
            {filtered.map((b, i) => (
              <TicketCard key={b.id} booking={b} idx={i} onViewQR={setModalBooking} />
            ))}
          </div>
        )}
      </div>

      {modalBooking && <QRModal booking={modalBooking} onClose={() => setModalBooking(null)} />}
    </div>
  );
}
