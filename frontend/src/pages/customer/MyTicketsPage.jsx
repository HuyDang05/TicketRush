import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import bookingService from '../../services/booking.service';
import { useAuth } from '../../hooks/useAuth';

// ─── QR canvas renderer ───────────────────────────────────────────────────────
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

// ─── QR Modal ─────────────────────────────────────────────────────────────────
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
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: '#242424', border: '1px solid #FF6B35', borderRadius: 16,
        width: 360, padding: '28px 24px', position: 'relative',
        boxShadow: '0 20px 60px rgba(0,0,0,.6)',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14, width: 30, height: 30,
            background: 'transparent', border: 'none', color: '#AAAAAA',
            cursor: 'pointer', fontSize: 18, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#AAAAAA'; e.currentTarget.style.background = 'transparent'; }}
        >✕</button>

        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, paddingRight: 24 }}>
          {event?.name || 'Sự kiện'}
        </div>
        <div style={{ fontSize: 12, color: '#AAAAAA', lineHeight: 1.6, marginBottom: 20 }}>
          {event?.date ? new Date(event.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
          {event?.location ? ` — ${event.location}` : ''}
        </div>

        <div style={{
          background: '#fff', borderRadius: 10, padding: 14,
          width: 200, height: 200, margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {booking?.qrCode
            ? <img src={booking.qrCode} alt="QR" style={{ width: 172, height: 172, objectFit: 'contain' }} />
            : <QRCanvas seed={seed} size={172} />
          }
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: '#AAAAAA', fontFamily: 'monospace', letterSpacing: .5, marginBottom: 10 }}>
          Mã vé: {ticketCode}
        </div>
        <div style={{
          textAlign: 'center', fontSize: 12, color: '#AAAAAA',
          background: 'rgba(255,255,255,.03)', borderRadius: 8, padding: 10,
          border: '1px solid #333333', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
          Xuất trình mã QR này tại cổng vào sự kiện
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────
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
  const seed = booking.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const fmtVND = n => (n || 0).toLocaleString('vi-VN') + 'đ';
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#242424',
        border: `1px solid ${hovered ? 'rgba(255,107,53,.3)' : '#333333'}`,
        borderRadius: 12, overflow: 'hidden',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'border-color .2s, transform .2s',
        opacity: isPast ? 0.75 : 1,
        position: 'relative',
      }}
    >
      {/* Status badge */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 2,
        fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 5, letterSpacing: .3,
        ...(isUpcoming
          ? { background: '#0F2A1A', color: '#4ade80' }
          : { background: 'rgba(170,170,170,.08)', color: '#AAAAAA' }),
      }}>
        {isUpcoming ? '● Sắp diễn ra' : 'Đã diễn ra'}
      </div>

      {/* Top half */}
      <div style={{ display: 'flex', minHeight: 110 }}>
        <div style={{
          width: 110, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, position: 'relative',
          background: THUMB_GRADIENTS[idx % THUMB_GRADIENTS.length],
          borderRight: '1px solid #333333',
        }}>
          {THUMB_EMOJIS[idx % THUMB_EMOJIS.length]}
        </div>
        <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
          <span style={{
            display: 'inline-flex', width: 'fit-content',
            background: isUpcoming ? 'rgba(255,107,53,.12)' : 'rgba(170,170,170,.08)',
            border: `1px solid ${isUpcoming ? 'rgba(255,107,53,.3)' : 'rgba(170,170,170,.2)'}`,
            color: isUpcoming ? '#FF6B35' : '#AAAAAA',
            fontSize: 10, fontWeight: 700, padding: '2px 9px',
            borderRadius: 100, letterSpacing: .5,
          }}>
            {event?.category || booking.seat?.zone?.name || 'Vé'}
          </span>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {event?.name || 'Sự kiện'}
          </div>
          {event?.date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#AAAAAA' }}>
              <svg width="12" height="12" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              {new Date(event.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
          )}
          {event?.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#AAAAAA' }}>
              <svg width="12" height="12" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              {event.location}
            </div>
          )}
        </div>
      </div>

      {/* Dashed tear line */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', borderTop: '1.5px dashed #333333' }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#1A1A1A', flexShrink: 0, border: '1px solid #333333', marginLeft: -8 }} />
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#1A1A1A', flexShrink: 0, border: '1px solid #333333', marginLeft: 'auto', marginRight: -8 }} />
      </div>

      {/* Bottom half */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', gap: 20, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10, color: '#AAAAAA', fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase' }}>Khu vực</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{booking.seat?.zone?.name || '—'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10, color: '#AAAAAA', fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase' }}>Ghế</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{booking.seat?.label || '—'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10, color: '#AAAAAA', fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase' }}>Giá vé</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: isPast ? '#AAAAAA' : '#FF6B35' }}>{fmtVND(booking.totalPrice)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div
            onClick={() => !isPast && onViewQR(booking)}
            style={{
              width: 72, height: 72, background: '#fff', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              cursor: isPast ? 'default' : 'pointer',
              opacity: isPast ? 0.4 : 1,
              transition: 'transform .2s',
            }}
            onMouseEnter={e => { if (!isPast) e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {booking.qrCode
              ? <img src={booking.qrCode} alt="QR" style={{ width: 68, height: 68, objectFit: 'contain' }} />
              : <QRCanvas seed={seed} size={68} />
            }
          </div>
          {isPast ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#AAAAAA', border: '1px solid #333333', borderRadius: 5, padding: '4px 10px' }}>Đã sử dụng</span>
          ) : (
            <button
              onClick={() => onViewQR(booking)}
              style={{
                fontSize: 11, fontWeight: 700, color: '#FF6B35',
                background: 'transparent', border: '1px solid rgba(255,107,53,.35)',
                borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FF6B35'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#FF6B35'; }}
            >Xem chi tiết</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyTicketsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modalBooking, setModalBooking] = useState(null);

  useEffect(() => {
    bookingService.getMyBookings()
      .then(res => setBookings(res.data || []))
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

  const initials = (user?.fullName || user?.name || 'U').slice(0, 1).toUpperCase();

  const FilterTab = ({ id, label, count }) => (
    <button
      onClick={() => setFilter(id)}
      style={{
        padding: '8px 20px', borderRadius: 100, fontSize: 13, fontWeight: 600,
        cursor: 'pointer', border: 'none', fontFamily: 'inherit',
        background: filter === id ? '#FF6B35' : '#242424',
        color: filter === id ? '#fff' : '#AAAAAA',
        boxShadow: filter === id ? '0 2px 12px rgba(255,107,53,.3)' : 'none',
        transition: 'all .2s',
        display: 'flex', alignItems: 'center', gap: 0,
      }}
    >
      {label}
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 18, height: 18, borderRadius: '50%', fontSize: 10, fontWeight: 700, marginLeft: 5,
        background: filter === id ? 'rgba(255,255,255,.25)' : '#333333',
        color: filter === id ? '#fff' : '#AAAAAA',
      }}>{count}</span>
    </button>
  );

  return (
    <div style={{ background: '#1A1A1A', minHeight: 'calc(100vh - 64px)', color: '#fff', fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* Page header */}
      <div style={{ padding: '36px 60px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Vé của tôi</h1>
          <p style={{ fontSize: 14, color: '#AAAAAA' }}>Quản lý tất cả vé đã mua</p>
        </div>
        <div style={{ position: 'relative', width: 260, flexShrink: 0 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm vé..."
            style={{
              width: '100%', background: '#242424', border: '1px solid #333333',
              borderRadius: 8, padding: '10px 40px 10px 16px',
              color: '#fff', fontFamily: 'inherit', fontSize: 13, outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = '#FF6B35'}
            onBlur={e => e.target.style.borderColor = '#333333'}
          />
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#AAAAAA', pointerEvents: 'none' }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '0 60px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <FilterTab id="all" label="Tất cả" count={bookings.length} />
        <FilterTab id="upcoming" label="Sắp diễn ra" count={upcomingCount} />
        <FilterTab id="past" label="Đã diễn ra" count={pastCount} />
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, padding: '0 60px 60px' }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 0', color: '#AAAAAA' }}>
            Đang tải vé...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            gridColumn: '1/-1', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: '80px 20px',
            gap: 16, textAlign: 'center',
          }}>
            <div style={{ color: '#333333', marginBottom: 8 }}>
              <svg width="80" height="80" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M2 9V7a2 2 0 012-2h16a2 2 0 012 2v2M2 9a2 2 0 000 4v2a2 2 0 002 2h16a2 2 0 002-2v-2a2 2 0 000-4M2 9h20M9 9v6"/><circle cx="17" cy="12" r="1" fill="currentColor"/></svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Bạn chưa có vé nào</div>
            <p style={{ fontSize: 14, color: '#AAAAAA' }}>Khám phá các sự kiện hấp dẫn và đặt vé ngay hôm nay!</p>
            <button
              onClick={() => navigate('/')}
              style={{
                marginTop: 8, padding: '12px 28px', background: '#FF6B35',
                border: 'none', borderRadius: 8, color: '#fff',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e85a24'}
              onMouseLeave={e => e.currentTarget.style.background = '#FF6B35'}
            >Khám phá sự kiện →</button>
          </div>
        ) : (
          filtered.map((b, i) => (
            <TicketCard key={b.id} booking={b} idx={i} onViewQR={setModalBooking} />
          ))
        )}
      </div>

      {/* QR Modal */}
      {modalBooking && <QRModal booking={modalBooking} onClose={() => setModalBooking(null)} />}
    </div>
  );
}
