import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import bookingService from '../../services/booking.service';
import { useAuth } from '../../hooks/useAuth';
import { useCountdown } from '../../hooks/useCountdown';
import { MAX_CHECKOUT_BOOKINGS } from '../../utils/inputValidation';
import './checkout.css';
import { useCart } from '../../context/CartContext';
import { useSocket } from '../../hooks/useSocket';

function fmtVND(n) {
  const value = Number(n) || 0;
  return value.toLocaleString('vi-VN') + ' đ';
}

function CheckoutCountdown({ expiresAt }) {
  const { minutes, seconds, isExpired } = useCountdown(expiresAt);
  const urgent = minutes < 3;
  return (
    <span style={{
      fontSize: 26, fontWeight: 800, letterSpacing: 1,
      fontVariantNumeric: 'tabular-nums',
      color: isExpired ? '#ef4444' : urgent ? '#f59e0b' : '#FF6B35',
    }}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

function PayOption({ name, logo, logoBg, title, subtitle, selected, onSelect }) {
  return (
    <label className={`checkout-pay-option ${selected ? 'checkout-pay-option--selected' : 'checkout-pay-option--unselected'}`}>
      <input
        type="radio" name="pay" checked={selected} onChange={onSelect}
        style={{ accentColor: '#FF6B35', width: 16, height: 16, flexShrink: 0 }}
      />
      <div className="checkout-pay-logo" style={{ background: logoBg }}>{logo}</div>
      <div>
        <div className="checkout-pay-title">{title}</div>
        <div className="checkout-pay-sub">{subtitle}</div>
      </div>
      {selected && <div className="checkout-pay-selected-badge">Đang chọn</div>}
    </label>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { refreshCart } = useCart();

  const { bookings, eventId, eventTitle, eventVenue, eventDate } = location.state || {};

  const [payMethod, setPayMethod] = useState('card');
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);

  const [currentBookings, setCurrentBookings] = useState(bookings || []);
  const { on } = useSocket(eventId);

  useEffect(() => {
    if (!on) return;
    const offReleased = on('seat_released', ({ seatId, label }) => {
      setCurrentBookings((prev) => {
        const next = prev.filter((b) => b.seatId !== seatId);
        if (next.length !== prev.length) {
          toast.error(`Ghế ${label || ''} đã hết thời gian giữ chỗ!`);
        }
        return next;
      });
    });
    return () => offReleased();
  }, [on]);

  useEffect(() => {
    if (currentBookings.length === 0) {
      toast.error('Tất cả đơn hàng đã hết hạn hoặc không tồn tại');
      navigate(eventId ? `/events/${eventId}/seats` : '/', { replace: true });
    }
  }, [currentBookings, navigate, eventId]);

  if (currentBookings.length === 0) return null;

  const subtotal = currentBookings.reduce(
    (sum, b) => sum + Number(b.totalPrice || 0),
    0
  );

  const serviceFee = Math.round(Number(subtotal) * 0.05);

  const grandTotal = Number(subtotal) + Number(serviceFee);

  const dateStr = eventDate
    ? new Date(eventDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';
  const timeStr = eventDate
    ? new Date(eventDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';

  async function handleConfirm() {
    if (confirming || success) return;
    const bookingIds = bookings.map((b) => b.bookingId).filter(Boolean);
    if (bookingIds.length === 0 || bookingIds.length > MAX_CHECKOUT_BOOKINGS) {
      toast.error(`Chỉ được thanh toán 1-${MAX_CHECKOUT_BOOKINGS} vé mỗi lần`);
      return;
    }
    setConfirming(true);
    try {
      await bookingService.checkout(bookingIds);
      setSuccess(true);
      refreshCart(); // Refresh cart to clear checked out items globally
      toast.success('Mua vé thành công!', { description: 'Vé điện tử đã được gửi vào email của bạn.' });
      setTimeout(() => navigate('/my-tickets', { replace: true }), 1800);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Thanh toán thất bại. Vui lòng thử lại.';
      if (status === 410 || status === 409) {
        toast.error('Phiên giữ chỗ đã hết hạn', { description: 'Vui lòng chọn lại ghế.' });
        refreshCart();
        setTimeout(() => navigate(eventId ? `/events/${eventId}` : '/', { replace: true }), 1800);
      } else {
        toast.error(msg);
      }
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="checkout-page">

      {/* STEPPER */}
      <div className="checkout-stepper">
        <div className="checkout-stepper__inner">
          <div className="checkout-stepper__circle checkout-stepper__circle--done">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <span className="checkout-stepper__label">1. Chọn ghế</span>
        </div>
        <div className="checkout-stepper__line checkout-stepper__line--done" />
        <div className="checkout-stepper__inner">
          <div className="checkout-stepper__circle checkout-stepper__circle--active">2</div>
          <span className="checkout-stepper__label checkout-stepper__label--active">2. Xác nhận</span>
        </div>
        <div className="checkout-stepper__line checkout-stepper__line--pending" />
        <div className="checkout-stepper__inner">
          <div className="checkout-stepper__circle checkout-stepper__circle--pending">3</div>
          <span className="checkout-stepper__label">3. Hoàn tất</span>
        </div>
      </div>

      {/* BREADCRUMB */}
      <div className="checkout-breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span className="checkout-breadcrumb__sep">/</span>
        {eventId && (
          <>
            <Link to={`/events/${eventId}`}>{eventTitle || 'Sự kiện'}</Link>
            <span className="checkout-breadcrumb__sep">/</span>
          </>
        )}
        <span className="checkout-breadcrumb__current">Xác nhận thanh toán</span>
      </div>

      {/* MAIN */}
      <div className="checkout-layout">

        {/* LEFT */}
        <div className="checkout-left">

          {/* Event info */}
          <div className="checkout-card">
            <div className="checkout-card__label">Sự kiện</div>
            <div className="checkout-event">
              <div className="checkout-event__thumb">🎤</div>
              <div className="checkout-event__meta">
                <div className="checkout-event__name">{eventTitle || 'Sự kiện'}</div>
                {dateStr && (
                  <div className="checkout-event__meta-item">
                    <svg width="12" height="12" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    {dateStr}{timeStr && ` · ${timeStr}`}
                  </div>
                )}
                {eventVenue && (
                  <div className="checkout-event__meta-item">
                    <svg width="12" height="12" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                    {eventVenue}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seat list */}
          <div className="checkout-card">
            <div className="checkout-card__title">Chi tiết vé ({currentBookings.length} vé)</div>
            <div className="checkout-ticket-list">
              {currentBookings.map((b) => (
                <div key={b.bookingId} className="checkout-ticket">
                  <div className="checkout-ticket__badge">{b.zoneName} · {b.seatLabel}</div>
                  <span className="checkout-ticket__desc">{b.zoneName} — Ghế {b.seatLabel}</span>
                  <span className="checkout-ticket__price">{fmtVND(b.totalPrice)}</span>
                </div>
              ))}
            </div>
            <div className="checkout-ticket-footer">
              <span className="checkout-ticket-footer__count">{bookings.length} vé</span>
              <span className="checkout-ticket-footer__total">{fmtVND(subtotal)}</span>
            </div>
          </div>

          {/* Buyer info */}
          <div className="checkout-card">
            <div className="checkout-card__title">Thông tin người mua</div>
            {[
              { label: 'Họ và tên', val: user?.name || user?.fullName || '—' },
              { label: 'Email', val: user?.email || '—' },
              { label: 'Phương thức nhận vé', val: 'Vé điện tử (Email & App)' },
            ].map(({ label, val }) => (
              <div key={label} className="checkout-info-row">
                <span className="checkout-info-row__label">{label}</span>
                <span className="checkout-info-row__value">{val}</span>
              </div>
            ))}
            <div className="checkout-info-notice">
              <svg width="15" height="15" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
              <div>
                Vé điện tử sẽ được gửi đến email <strong style={{ color: '#fff' }}>{user?.email || '—'}</strong> sau khi thanh toán thành công.
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="checkout-card">
            <div className="checkout-card__title">Phương thức thanh toán</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PayOption name="card" logo="VISA" logoBg="#1a3d6e" title="Thẻ tín dụng / Ghi nợ" subtitle="Visa, Mastercard, JCB" selected={payMethod === 'card'} onSelect={() => setPayMethod('card')} />
              <PayOption name="bank" logo="MB" logoBg="#0068b7" title="Chuyển khoản ngân hàng" subtitle="MoMo, ZaloPay, VNPay" selected={payMethod === 'bank'} onSelect={() => setPayMethod('bank')} />
              <PayOption name="momo" logo="MM" logoBg="#a50064" title="Ví MoMo" subtitle="Thanh toán qua ví điện tử" selected={payMethod === 'momo'} onSelect={() => setPayMethod('momo')} />
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="checkout-sidebar">
          <div className="checkout-summary">
            <div className="checkout-summary__title">Tóm tắt đơn hàng</div>

            <div className="checkout-countdown-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {currentBookings.map((b) => (
                <div key={b.bookingId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 107, 53, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 107, 53, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF6B35' }}></div>
                    <span className="checkout-summary-seat-label">
                      {b.seatLabel}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" fill="none" stroke="#FF6B35" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                    <CheckoutCountdown expiresAt={b.expiresAt} />
                  </div>
                </div>
              ))}
            </div>

            <div className="checkout-price-rows">
              <div className="checkout-price-row">
                <span className="checkout-price-row__label">Tạm tính</span>
                <span className="checkout-price-row__value">{fmtVND(subtotal)}</span>
              </div>
              <div className="checkout-price-row">
                <span className="checkout-price-row__label">Phí dịch vụ (5%)</span>
                <span className="checkout-price-row__value">{fmtVND(serviceFee)}</span>
              </div>
            </div>

            <div className="checkout-divider" />

            <button
              className={`checkout-confirm-btn${success ? ' checkout-confirm-btn--success' : ''}`}
              onClick={handleConfirm}
              disabled={confirming || success}
            >
              {success ? (
                <>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                  Thanh toán thành công!
                </>
              ) : confirming ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin .7s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  XÁC NHẬN THANH TOÁN
                </>
              )}
            </button>

            <div className="checkout-trust-badges">
              {[
                { icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, label: 'Bảo mật SSL' },
                { icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>, label: 'Vé chính hãng' },
                { icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 12a9 9 0 109 9"/><path d="M3 12V7h5"/></svg>, label: 'Hoàn tiền' },
              ].map(({ icon, label }, i) => (
                <div key={i} className="checkout-trust-badge">{icon}{label}</div>
              ))}
            </div>

            <p className="checkout-legal">
              Bằng cách xác nhận, bạn đồng ý với{' '}
              <a href="#">Điều khoản dịch vụ</a>{' '}
              và{' '}
              <a href="#">Chính sách hoàn tiền</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
