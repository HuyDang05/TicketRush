import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import eventService from '../../services/event.service';
import bookingService from '../../services/booking.service';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import SeatMap from '../../components/seat-map/SeatMap';
import { useSocket } from '../../hooks/useSocket';
import { useCountdown } from '../../hooks/useCountdown';

const TERMS = [
  'Vé đã mua không hoàn tiền trừ trường hợp sự kiện bị hủy hoặc dời lịch bởi Ban tổ chức.',
  'Mỗi tài khoản được mua tối đa 4 vé cho một sự kiện.',
  'Khán giả dưới 16 tuổi phải có người lớn đi kèm.',
  'Nghiêm cấm mang vật dụng nguy hiểm, thức ăn & đồ uống từ bên ngoài vào khu vực sự kiện.',
  'Vui lòng xuất trình vé điện tử (QR code) hoặc vé in tại cửa soát vé.',
  'Ban tổ chức có quyền từ chối phục vụ nếu khán giả có hành vi không phù hợp.',
];

function fmt(n) {
  return n.toLocaleString('vi-VN') + 'đ';
}

function CountdownBadge({ expiresAt, onExpired }) {
  const { minutes, seconds, isExpired } = useCountdown(expiresAt);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (isExpired && !expiredRef.current) {
      expiredRef.current = true;
      onExpired?.();
    }
  }, [isExpired, onExpired]);

  const color = isExpired ? '#ef4444' : minutes < 3 ? '#f59e0b' : '#FF6B35';

  return (
    <span style={{ color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

export default function EventDetailPage() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [zones, setZones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  // selectedSeats: array of { id, label, zoneId, zoneName, price, expiresAt }
  const [selectedSeats, setSelectedSeats] = useState([]);

  const { on } = useSocket(eventId);

  // ── Load event + zones + seats ─────────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    setIsLoading(true);
    Promise.all([
      eventService.getEventById(eventId),
      eventService.getEventZones(eventId),
    ])
      .then(async ([evRes, zoneRes]) => {
        setEvent(evRes.data);
        const fetchedZones = zoneRes.data || [];

        const zonesWithSeats = await Promise.all(
          fetchedZones.map(async (zone) => {
            try {
              const seatsRes = await eventService.getZoneSeats(zone.id);
              return { ...zone, seats: seatsRes.data || [] };
            } catch {
              return { ...zone, seats: [] };
            }
          })
        );
        setZones(zonesWithSeats);
      })
      .catch((err) => {
        console.error('EventDetailPage load error:', err);
        toast.error('Không thể tải thông tin sự kiện');
      })
      .finally(() => setIsLoading(false));
  }, [eventId]);

  // ── Real-time socket updates ───────────────────────────────────────────────
  const updateSeatStatus = useCallback((seatId, newStatus) => {
    setZones((prev) =>
      prev.map((zone) => ({
        ...zone,
        seats: zone.seats.map((seat) =>
          seat.id === seatId ? { ...seat, status: newStatus } : seat
        ),
      }))
    );
  }, []);

  useEffect(() => {
    const offLocked = on('seat_locked', ({ seatId }) => {
      updateSeatStatus(seatId, 'LOCKED');
    });

    const offReleased = on('seat_released', ({ seatId }) => {
      updateSeatStatus(seatId, 'AVAILABLE');
      // If this seat was selected by the user → warn and remove
      setSelectedSeats((prev) => {
        const wasMine = prev.some((s) => s.id === seatId);
        if (wasMine) {
          toast.warning('Phiên giữ chỗ đã hết hạn', { description: 'Một ghế bạn đang giữ đã được nhả về.' });
          return prev.filter((s) => s.id !== seatId);
        }
        return prev;
      });
    });

    const offSold = on('seat_sold', ({ seatId }) => {
      updateSeatStatus(seatId, 'SOLD');
      setSelectedSeats((prev) => prev.filter((s) => s.id !== seatId));
    });

    return () => {
      offLocked();
      offReleased();
      offSold();
    };
  }, [on, updateSeatStatus]);

  // ── Seat selection ─────────────────────────────────────────────────────────
  function handleSelectSeat(seat) {
    setSelectedSeats((prev) => {
      const alreadySelected = prev.some((s) => s.id === seat.id);
      if (alreadySelected) {
        return prev.filter((s) => s.id !== seat.id);
      }
      if (prev.length >= 4) {
        toast.error('Tối đa 4 ghế mỗi lần đặt');
        return prev;
      }
      const zone = zones.find((z) => z.seats.some((s) => s.id === seat.id));
      return [
        ...prev,
        {
          id: seat.id,
          label: seat.label,
          zoneId: zone?.id,
          zoneName: zone?.name,
          price: zone?.price ?? 0,
          expiresAt: Date.now() + 10 * 60 * 1000,
        },
      ];
    });
  }

  function handleRemoveSeat(seatId) {
    setSelectedSeats((prev) => prev.filter((s) => s.id !== seatId));
  }

  function handleSeatExpired(seatId) {
    toast.warning('Phiên giữ chỗ đã hết hạn', { description: `Ghế đã được nhả về do quá 10 phút.` });
    setSelectedSeats((prev) => prev.filter((s) => s.id !== seatId));
  }

  // ── Checkout ───────────────────────────────────────────────────────────────
  async function handleCheckout() {
    if (selectedSeats.length === 0) return;
    setBooking(true);
    try {
      // Lock each selected seat — backend returns bookingId + expiresAt per seat
      const lockResults = await Promise.all(
        selectedSeats.map((s) => bookingService.lockSeat(s.id))
      );
      const lockedBookings = lockResults.map((res) => res.data);
      navigate('/checkout', {
        state: {
          bookings: lockedBookings,
          eventId,
          eventTitle: event?.title,
          eventVenue: event?.venue,
          eventDate: event?.date,
        },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể giữ ghế. Ghế có thể đã được người khác chọn.');
    } finally {
      setBooking(false);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const total = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const fee = Math.round(total * 0.05);

  const dateStr = event?.date
    ? new Date(event.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';
  const timeStr = event?.date
    ? new Date(event.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';

  if (isLoading) return <LoadingSpinner />;
  if (!event) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#AAAAAA' }}>
      Không tìm thấy sự kiện
    </div>
  );

  return (
    <div style={{ background: '#0D0D0D', minHeight: '100vh' }}>
      {/* ── HERO ── */}
      <section style={{ position: 'relative', width: '100%', height: 300, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 60% 30%, #3a1200 0%, #1a0800 40%, #080808 100%)' }} />
        {event.imageUrl && (
          <img src={event.imageUrl} alt={event.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,13,13,1) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.2) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, padding: '0 60px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,107,53,.18)', border: '1px solid rgba(255,107,53,.45)',
            color: '#FF6B35', fontSize: 11, fontWeight: 700, letterSpacing: '1.4px',
            padding: '4px 12px', borderRadius: 100, width: 'fit-content', textTransform: 'uppercase',
          }}>Sự kiện âm nhạc</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, textShadow: '0 2px 20px rgba(0,0,0,.6)', maxWidth: 700 }}>
            {event.title}
          </h1>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {dateStr && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,.8)' }}>
                <svg width="13" height="13" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                {dateStr}{timeStr && ` · ${timeStr}`}
              </span>
            )}
            {event.venue && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,.8)' }}>
                <svg width="13" height="13" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                {event.venue}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── BREADCRUMB ── */}
      <div style={{
        background: '#1A1A1A', padding: '10px 60px',
        borderBottom: '1px solid #333333',
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 13, color: '#AAAAAA',
      }}>
        <Link to="/" style={{ color: '#AAAAAA', textDecoration: 'none' }}>Trang chủ</Link>
        <span style={{ opacity: 0.4 }}>/</span>
        <Link to="/" style={{ color: '#AAAAAA', textDecoration: 'none' }}>Sự kiện</Link>
        <span style={{ opacity: 0.4 }}>/</span>
        <span style={{ color: '#FF6B35', fontWeight: 600 }}>{event.title}</span>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 420px',
        gap: 28,
        padding: '32px 60px',
        maxWidth: 1400,
        margin: '0 auto',
        alignItems: 'start',
      }}>

        {/* ── LEFT — Event Info + Seat Map ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Event info card */}
          <div style={{ background: '#1A1A1A', border: '1px solid #333333', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, paddingLeft: 12, borderLeft: '3px solid #FF6B35' }}>
              Về sự kiện
            </h2>
            <p style={{ fontSize: 14, color: '#AAAAAA', lineHeight: 1.8, margin: 0 }}>
              {event.description || `${event.title} — sự kiện âm nhạc được mong chờ nhất năm, quy tụ hàng chục nghìn khán giả với sân khấu hoành tráng và màn trình diễn không thể bỏ lỡ.`}
            </p>
            {event.venue && (
              <div style={{ marginTop: 16, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#AAAAAA' }}>
                  <svg width="14" height="14" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                  {event.venue}
                </div>
                {dateStr && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#AAAAAA' }}>
                    <svg width="14" height="14" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    {dateStr}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seat Map */}
          <div style={{ background: '#1A1A1A', border: '1px solid #333333', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, paddingLeft: 12, borderLeft: '3px solid #FF6B35' }}>
              Sơ đồ ghế
            </h2>
            {zones.length > 0 ? (
              <SeatMap
                zones={zones}
                selectedSeats={selectedSeats}
                onSelectSeat={handleSelectSeat}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#AAAAAA', fontSize: 14 }}>
                Đang tải sơ đồ ghế...
              </div>
            )}
          </div>

          {/* Terms */}
          <div style={{ background: '#1A1A1A', border: '1px solid #333333', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, paddingLeft: 12, borderLeft: '3px solid #FF6B35' }}>
              Điều khoản & Lưu ý
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TERMS.map((t, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#AAAAAA', lineHeight: 1.7 }}>
                  <span style={{ color: '#FF6B35', fontSize: 16, lineHeight: 1.3, flexShrink: 0 }}>•</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── RIGHT — Selected Seats Panel ── */}
        <div style={{ position: 'sticky', top: 100 }}>
          <div style={{ background: '#1A1A1A', border: '1px solid #333333', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Ghế đã chọn</div>

            {/* Seat list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 48, marginBottom: 14 }}>
              {selectedSeats.length === 0 ? (
                <div style={{ color: '#AAAAAA', fontSize: 13, textAlign: 'center', padding: '20px 0', opacity: 0.6 }}>
                  Nhấn vào ghế xanh lá để chọn
                </div>
              ) : (
                selectedSeats.map((seat) => (
                  <SelectedSeatRow
                    key={seat.id}
                    seat={seat}
                    onRemove={() => handleRemoveSeat(seat.id)}
                    onExpired={() => handleSeatExpired(seat.id)}
                  />
                ))
              )}
            </div>

            {/* Summary */}
            {selectedSeats.length > 0 && (
              <>
                <div style={{ height: 1, background: '#333333', margin: '12px 0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#AAAAAA' }}>Số ghế</span>
                    <span style={{ fontWeight: 600 }}>{selectedSeats.length} ghế</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#AAAAAA' }}>Tạm tính</span>
                    <span style={{ fontWeight: 600 }}>{fmt(total)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#AAAAAA' }}>Phí dịch vụ (5%)</span>
                    <span style={{ fontWeight: 600 }}>{fmt(fee)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>Tổng cộng</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#FF6B35' }}>{fmt(total + fee)}</span>
                </div>
              </>
            )}

            <button
              onClick={handleCheckout}
              disabled={selectedSeats.length === 0 || booking}
              style={{
                width: '100%',
                height: 48,
                background: selectedSeats.length === 0 || booking ? '#333' : '#FF6B35',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 700,
                cursor: selectedSeats.length === 0 || booking ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.2s',
                boxShadow: selectedSeats.length > 0 && !booking ? '0 4px 20px rgba(255,107,53,.3)' : 'none',
              }}
              onMouseEnter={e => { if (selectedSeats.length > 0 && !booking) e.currentTarget.style.background = '#e85a24'; }}
              onMouseLeave={e => { if (selectedSeats.length > 0 && !booking) e.currentTarget.style.background = '#FF6B35'; }}
            >
              {booking ? 'Đang xử lý...' : 'Tiến hành thanh toán'}
              {!booking && (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              )}
            </button>

            <div style={{ textAlign: 'center', fontSize: 11, color: '#AAAAAA', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
              Mỗi ghế được giữ tối đa <strong style={{ color: '#fff', margin: '0 3px' }}>10 phút</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectedSeatRow({ seat, onRemove, onExpired }) {
  return (
    <div style={{
      background: '#242424',
      borderRadius: 8,
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      border: '1px solid #333333',
    }}>
      <div style={{
        background: 'rgba(59,130,246,.15)',
        border: '1px solid rgba(59,130,246,.3)',
        color: '#93c5fd',
        fontSize: 11,
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 4,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}>
        {seat.zoneName} · {seat.label}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: '#AAAAAA', marginBottom: 1 }}>Hết hạn sau</div>
        <CountdownBadge expiresAt={seat.expiresAt} onExpired={onExpired} />
      </div>

      <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', color: '#FF6B35' }}>
        {seat.price.toLocaleString('vi-VN')}đ
      </span>

      <button
        onClick={onRemove}
        style={{
          width: 24,
          height: 24,
          border: 'none',
          background: 'transparent',
          color: '#AAAAAA',
          cursor: 'pointer',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          flexShrink: 0,
          lineHeight: 1,
          padding: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = '#AAAAAA'}
        title="Bỏ chọn ghế"
      >×</button>
    </div>
  );
}
