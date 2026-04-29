import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import eventService from '../../services/event.service';
import bookingService from '../../services/booking.service';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import SeatMap from '../../components/seat-map/SeatMap';
import { useSocket } from '../../hooks/useSocket';
import { useCountdown } from '../../hooks/useCountdown';
import './event-detail.css';

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
  const [selectedSeats, setSelectedSeats] = useState([]);

  const { on } = useSocket(eventId);

  useEffect(() => {
    if (!eventId) return;
    setIsLoading(true);
    eventService.getEventById(eventId)
      .then((res) => {
        const raw = res.data?.event ?? res.data;
        setEvent(raw && raw.id ? raw : null);
        setZones(raw?.zones || []);
      })
      .catch((err) => {
        console.error('EventDetailPage load error:', err);
        toast.error('Không thể tải thông tin sự kiện');
      })
      .finally(() => setIsLoading(false));
  }, [eventId]);

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

  function handleSelectSeat(seat) {
    setSelectedSeats((prev) => {
      const alreadySelected = prev.some((s) => s.id === seat.id);
      if (alreadySelected) return prev.filter((s) => s.id !== seat.id);
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
    toast.warning('Phiên giữ chỗ đã hết hạn', { description: 'Ghế đã được nhả về do quá 10 phút.' });
    setSelectedSeats((prev) => prev.filter((s) => s.id !== seatId));
  }

  async function handleCheckout() {
    if (selectedSeats.length === 0) return;
    setBooking(true);
    try {
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
    <div className="event-detail">
      {/* HERO */}
      <section className="event-detail__hero">
        <div className="event-detail__hero-bg" />

        {[
          { left: '20%', transform: 'rotate(-18deg)', color: '#FF6B35' },
          { left: '38%', transform: 'rotate(-5deg)', color: '#fff' },
          { left: '54%', transform: 'rotate(10deg)', color: '#FF6B35' },
          { left: '70%', transform: 'rotate(22deg)', color: '#fff' },
        ].map((l, i) => (
          <div key={i} style={{
            position: 'absolute', top: 0, left: l.left, width: 180, height: 260,
            opacity: .14, transformOrigin: 'top center', transform: l.transform,
            background: `linear-gradient(to bottom, ${l.color}, transparent)`, zIndex: 0,
          }} />
        ))}

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, zIndex: 1, overflow: 'hidden' }}>
          <svg viewBox="0 0 1440 160" preserveAspectRatio="none" width="100%" height="100%">
            <path d="M0,130 Q50,100 100,118 Q150,100 200,115 Q250,100 300,115 Q350,102 400,116 Q450,102 500,116 Q550,104 600,115 Q650,104 700,116 Q750,104 800,116 Q850,104 900,115 Q950,104 1000,116 Q1050,104 1100,115 Q1150,104 1200,116 Q1250,104 1300,115 Q1350,104 1400,116 Q1420,110 1440,115 L1440,160 L0,160 Z" fill="rgba(15,5,0,0.92)" />
          </svg>
        </div>

        {event.imageUrl && (
          <img src={event.imageUrl} alt={event.title} className="event-detail__hero-img" />
        )}
        <div className="event-detail__hero-overlay" />

        <div className="event-detail__hero-content">
          <div className="event-detail__hero-tag">Sự kiện âm nhạc</div>
          <h1 className="event-detail__hero-title">{event.title}</h1>
          <div className="event-detail__hero-meta">
            {dateStr && (
              <span className="event-detail__hero-meta-item">
                <svg width="13" height="13" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                {dateStr}{timeStr && ` · ${timeStr}`}
              </span>
            )}
            {event.venue && (
              <span className="event-detail__hero-meta-item">
                <svg width="13" height="13" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
                {event.venue}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* BREADCRUMB */}
      <div className="event-detail__breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span className="event-detail__breadcrumb-sep">/</span>
        <Link to="/">Sự kiện</Link>
        <span className="event-detail__breadcrumb-sep">/</span>
        <span className="event-detail__breadcrumb-current">{event.title}</span>
      </div>

      {/* MAIN LAYOUT */}
      <div className="event-detail__layout">

        {/* LEFT */}
        <div className="event-detail__left">

          <div className="event-detail__card">
            <h2 className="event-detail__card-title">Về sự kiện</h2>
            <p className="event-detail__desc">
              {event.description || `${event.title} — sự kiện âm nhạc được mong chờ nhất năm, quy tụ hàng chục nghìn khán giả với sân khấu hoành tráng và màn trình diễn không thể bỏ lỡ.`}
            </p>
            {event.venue && (
              <div className="event-detail__meta-row">
                <div className="event-detail__meta-item">
                  <svg width="14" height="14" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
                  {event.venue}
                </div>
                {dateStr && (
                  <div className="event-detail__meta-item">
                    <svg width="14" height="14" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                    {dateStr}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="event-detail__card">
            <h2 className="event-detail__card-title">Sơ đồ ghế</h2>
            {zones.length > 0 ? (
              <SeatMap
                zones={zones}
                selectedSeats={selectedSeats}
                onSelectSeat={handleSelectSeat}
                onRemoveSeat={handleRemoveSeat}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#AAAAAA', fontSize: 14 }}>
                Đang tải sơ đồ ghế...
              </div>
            )}
          </div>

          <div className="event-detail__card">
            <h2 className="event-detail__card-title">Điều khoản & Lưu ý</h2>
            <ul className="event-detail__terms">
              {TERMS.map((t, i) => (
                <li key={i}>
                  <span className="event-detail__terms-dot">•</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* RIGHT */}
        <div className="event-detail__sidebar">
          <div className="event-detail__sidebar-card">
            <div className="event-detail__sidebar-title">Ghế đã chọn</div>

            <div className="event-detail__seat-list">
              {selectedSeats.length === 0 ? (
                <div className="event-detail__seat-empty">
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

            {selectedSeats.length > 0 && (
              <>
                <div className="event-detail__divider" />
                <div className="event-detail__price-row">
                  <div className="event-detail__price-line">
                    <span className="event-detail__price-label">Số ghế</span>
                    <span className="event-detail__price-value">{selectedSeats.length} ghế</span>
                  </div>
                  <div className="event-detail__price-line">
                    <span className="event-detail__price-label">Tạm tính</span>
                    <span className="event-detail__price-value">{fmt(total)}</span>
                  </div>
                  <div className="event-detail__price-line">
                    <span className="event-detail__price-label">Phí dịch vụ (5%)</span>
                    <span className="event-detail__price-value">{fmt(fee)}</span>
                  </div>
                </div>
                <div className="event-detail__total-row">
                  <span className="event-detail__total-label">Tổng cộng</span>
                  <span className="event-detail__total-value">{fmt(total + fee)}</span>
                </div>
              </>
            )}

            <button
              className="event-detail__checkout-btn"
              onClick={handleCheckout}
              disabled={selectedSeats.length === 0 || booking}
            >
              {booking ? 'Đang xử lý...' : 'Tiến hành thanh toán'}
              {!booking && (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>

            <div className="event-detail__timer-note">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
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
    <div className="selected-seat-row">
      <div className="selected-seat-row__badge">
        {seat.zoneName} · {seat.label}
      </div>

      <div className="selected-seat-row__timer">
        <div className="selected-seat-row__timer-label">Hết hạn sau</div>
        <CountdownBadge expiresAt={seat.expiresAt} onExpired={onExpired} />
      </div>

      <span className="selected-seat-row__price">
        {seat.price.toLocaleString('vi-VN')}đ
      </span>

      <button
        className="selected-seat-row__remove"
        onClick={onRemove}
        title="Bỏ chọn ghế"
      >×</button>
    </div>
  );
}
