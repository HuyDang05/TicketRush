import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import bookingService from '../../services/booking.service';
import { useAuth } from '../../hooks/useAuth';
import { useCountdown } from '../../hooks/useCountdown';

function fmtVND(n) {
  return (n ?? 0).toLocaleString('vi-VN') + 'đ';
}

// Uses the earliest expiresAt among all bookings so the timer is always safe
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
    <label style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: '#1A1A1A',
      border: `1.5px solid ${selected ? '#FF6B35' : '#333333'}`,
      borderRadius: 8, padding: 14, cursor: 'pointer',
    }}>
      <input
        type="radio" name="pay" checked={selected} onChange={onSelect}
        style={{ accentColor: '#FF6B35', width: 16, height: 16, flexShrink: 0 }}
      />
      <div style={{
        width: 36, height: 24, background: logoBg, borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: .5, flexShrink: 0,
      }}>{logo}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11, color: '#AAAAAA' }}>{subtitle}</div>
      </div>
      {selected && (
        <div style={{
          marginLeft: 'auto', fontSize: 11, color: '#FF6B35', fontWeight: 600,
          background: 'rgba(255,107,53,.1)', padding: '3px 8px', borderRadius: 4,
        }}>Đang chọn</div>
      )}
    </label>
  );
}

const stepCircleBase = {
  width: 32, height: 32, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13, fontWeight: 700, flexShrink: 0,
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // bookings: array of { bookingId, seatId, seatLabel, zoneName, totalPrice, status, expiresAt }
  // passed via navigate('/checkout', { state: { bookings, eventId, eventTitle, eventVenue, eventDate } })
  const { bookings, eventId, eventTitle, eventVenue, eventDate } = location.state || {};

  const [payMethod, setPayMethod] = useState('card');
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect if no pending bookings in state
  useEffect(() => {
    if (!bookings || bookings.length === 0) {
      toast.error('Không có đơn hàng nào để thanh toán');
      navigate('/', { replace: true });
    }
  }, [bookings, navigate]);

  if (!bookings || bookings.length === 0) return null;

  // Use the earliest expiry so the countdown is always conservative
  const earliestExpiry = Math.min(
    ...bookings.map((b) => new Date(b.expiresAt).getTime())
  );

  const subtotal = bookings.reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);
  const serviceFee = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + serviceFee;

  const dateStr = eventDate
    ? new Date(eventDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';
  const timeStr = eventDate
    ? new Date(eventDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';

  async function handleConfirm() {
    if (confirming || success) return;
    setConfirming(true);
    try {
      const bookingIds = bookings.map((b) => b.bookingId);
      await bookingService.checkout(bookingIds);
      setSuccess(true);
      toast.success('Mua vé thành công!', { description: 'Vé điện tử đã được gửi vào email của bạn.' });
      setTimeout(() => navigate('/my-tickets', { replace: true }), 1800);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Thanh toán thất bại. Vui lòng thử lại.';
      if (status === 410 || status === 409) {
        // Expired or already processed — send back to event
        toast.error('Phiên giữ chỗ đã hết hạn', { description: 'Vui lòng chọn lại ghế.' });
        setTimeout(() => navigate(eventId ? `/events/${eventId}` : '/', { replace: true }), 1800);
      } else {
        toast.error(msg);
      }
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div style={{ background: '#0D0D0D', minHeight: 'calc(100vh - 64px)', color: '#fff', fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* ── STEPPER ── */}
      <div style={{
        background: '#111111', borderBottom: '1px solid #333333',
        padding: '16px 60px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...stepCircleBase, background: 'rgba(255,107,53,.15)', color: '#FF6B35', border: '1.5px solid rgba(255,107,53,.4)' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#AAAAAA' }}>1. Chọn ghế</span>
        </div>
        <div style={{ width: 60, height: 1, background: 'rgba(255,107,53,.3)', margin: '0 8px', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...stepCircleBase, background: '#FF6B35', color: '#fff', boxShadow: '0 0 16px rgba(255,107,53,.4)' }}>2</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#FF6B35' }}>2. Xác nhận</span>
        </div>
        <div style={{ width: 60, height: 1, background: '#333333', margin: '0 8px', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...stepCircleBase, background: '#242424', color: '#AAAAAA', border: '1.5px solid #333333' }}>3</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#AAAAAA' }}>3. Hoàn tất</span>
        </div>
      </div>

      {/* ── BREADCRUMB ── */}
      <div style={{
        background: '#1A1A1A', padding: '10px 60px',
        borderBottom: '1px solid #333333',
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 13, color: '#AAAAAA',
      }}>
        <Link to="/" style={{ color: '#AAAAAA', textDecoration: 'none' }}>Trang chủ</Link>
        <span style={{ opacity: 0.4 }}>/</span>
        {eventId && (
          <>
            <Link to={`/events/${eventId}`} style={{ color: '#AAAAAA', textDecoration: 'none' }}>{eventTitle || 'Sự kiện'}</Link>
            <span style={{ opacity: 0.4 }}>/</span>
          </>
        )}
        <span style={{ color: '#FF6B35', fontWeight: 600 }}>Xác nhận thanh toán</span>
      </div>

      {/* ── MAIN ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 400px', gap: 28,
        padding: '36px 60px', maxWidth: 1400, margin: '0 auto', alignItems: 'start',
      }}>

        {/* ── LEFT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Event info */}
          <div style={{ background: '#1A1A1A', border: '1px solid #333333', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#FF6B35', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 12 }}>Sự kiện</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 64, height: 48, borderRadius: 8, flexShrink: 0,
                background: 'linear-gradient(135deg,#2d1000,#8b3500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>🎤</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{eventTitle || 'Sự kiện'}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {dateStr && (
                    <div style={{ fontSize: 12, color: '#AAAAAA', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="12" height="12" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                      {dateStr}{timeStr && ` · ${timeStr}`}
                    </div>
                  )}
                  {eventVenue && (
                    <div style={{ fontSize: 12, color: '#AAAAAA', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="12" height="12" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                      {eventVenue}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seat list */}
          <div style={{ background: '#1A1A1A', border: '1px solid #333333', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, paddingLeft: 12, borderLeft: '3px solid #FF6B35' }}>
              Chi tiết vé ({bookings.length} vé)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bookings.map((b) => (
                <div key={b.bookingId} style={{
                  background: '#242424', borderRadius: 8, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  border: '1px solid #333333',
                }}>
                  <div style={{
                    background: 'rgba(255,107,53,.15)', border: '1px solid rgba(255,107,53,.3)',
                    color: '#FF6B35', fontSize: 11, fontWeight: 700, padding: '4px 10px',
                    borderRadius: 5, flexShrink: 0, whiteSpace: 'nowrap',
                  }}>
                    {b.zoneName} · {b.seatLabel}
                  </div>
                  <span style={{ fontSize: 13, color: '#AAAAAA', flex: 1 }}>
                    {b.zoneName} — Ghế {b.seatLabel}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', color: '#fff' }}>
                    {fmtVND(b.totalPrice)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 0', borderTop: '1px solid #333333', marginTop: 12 }}>
              <span style={{ fontSize: 13, color: '#AAAAAA' }}>{bookings.length} vé</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{fmtVND(subtotal)}</span>
            </div>
          </div>

          {/* Buyer info */}
          <div style={{ background: '#1A1A1A', border: '1px solid #333333', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, paddingLeft: 12, borderLeft: '3px solid #FF6B35' }}>Thông tin người mua</div>
            {[
              { label: 'Họ và tên', val: user?.name || user?.fullName || '—' },
              { label: 'Email', val: user?.email || '—' },
              { label: 'Phương thức nhận vé', val: 'Vé điện tử (Email & App)' },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                <span style={{ fontSize: 13, color: '#AAAAAA' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{val}</span>
              </div>
            ))}
            <div style={{
              background: 'rgba(255,107,53,.06)', borderLeft: '3px solid #FF6B35', borderRadius: '0 8px 8px 0',
              padding: '12px 14px', marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <svg width="15" height="15" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
              <div style={{ fontSize: 12, color: '#AAAAAA', lineHeight: 1.7 }}>
                Vé điện tử sẽ được gửi đến email <strong style={{ color: '#fff' }}>{user?.email || '—'}</strong> sau khi thanh toán thành công.
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div style={{ background: '#1A1A1A', border: '1px solid #333333', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, paddingLeft: 12, borderLeft: '3px solid #FF6B35' }}>Phương thức thanh toán</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PayOption name="card" logo="VISA" logoBg="#1a3d6e" title="Thẻ tín dụng / Ghi nợ" subtitle="Visa, Mastercard, JCB" selected={payMethod === 'card'} onSelect={() => setPayMethod('card')} />
              <PayOption name="bank" logo="MB" logoBg="#0068b7" title="Chuyển khoản ngân hàng" subtitle="MoMo, ZaloPay, VNPay" selected={payMethod === 'bank'} onSelect={() => setPayMethod('bank')} />
              <PayOption name="momo" logo="MM" logoBg="#a50064" title="Ví MoMo" subtitle="Thanh toán qua ví điện tử" selected={payMethod === 'momo'} onSelect={() => setPayMethod('momo')} />
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div style={{ position: 'sticky', top: 100 }}>
          <div style={{ background: '#1A1A1A', border: '1px solid #333333', borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Tóm tắt đơn hàng</div>

            {/* Countdown */}
            <div style={{
              background: '#1e1408', border: '1px solid #FF6B35', borderRadius: 8,
              padding: '14px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="20" height="20" fill="none" stroke="#FF6B35" strokeWidth="2.2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#FF6B35' }}>Đơn hàng hết hạn sau</div>
                  <div style={{ fontSize: 11, color: '#AAAAAA' }}>Hoàn tất trước khi hết giờ</div>
                </div>
              </div>
              <CheckoutCountdown expiresAt={earliestExpiry} />
            </div>

            {/* Price breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#AAAAAA' }}>Tạm tính ({bookings.length} vé)</span>
                <span style={{ fontWeight: 600 }}>{fmtVND(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#AAAAAA' }}>Phí dịch vụ (5%)</span>
                <span style={{ fontWeight: 600 }}>{fmtVND(serviceFee)}</span>
              </div>
            </div>

            <div style={{ height: 1, background: '#333333', margin: '14px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Tổng thanh toán</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#FF6B35' }}>{fmtVND(grandTotal)}</span>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={confirming || success}
              style={{
                width: '100%', height: 54,
                background: success ? '#22c55e' : '#FF6B35',
                border: 'none', borderRadius: 8,
                color: '#fff', fontFamily: 'inherit', fontSize: 16, fontWeight: 700,
                cursor: (confirming || success) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 4px 24px rgba(255,107,53,.35)',
                marginBottom: 20, letterSpacing: .5,
                transition: 'background .2s',
              }}
              onMouseEnter={e => { if (!confirming && !success) e.currentTarget.style.background = success ? '#16a34a' : '#e85a24'; }}
              onMouseLeave={e => { if (!confirming && !success) e.currentTarget.style.background = success ? '#22c55e' : '#FF6B35'; }}
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

            {/* Trust badges */}
            <div style={{ display: 'flex', border: '1px solid #333333', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
              {[
                { icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, label: 'Bảo mật SSL' },
                { icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>, label: 'Vé chính hãng' },
                { icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 12a9 9 0 109 9"/><path d="M3 12V7h5"/></svg>, label: 'Hoàn tiền' },
              ].map(({ icon, label }, i) => (
                <div key={i} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 5, padding: '11px 6px', borderRight: i < 2 ? '1px solid #333333' : 'none',
                  fontSize: 11, fontWeight: 600, color: '#AAAAAA',
                }}>
                  {icon}{label}
                </div>
              ))}
            </div>

            <p style={{ fontSize: 11, color: '#666', textAlign: 'center', lineHeight: 1.7, margin: 0 }}>
              Bằng cách xác nhận, bạn đồng ý với{' '}
              <a href="#" style={{ color: '#888', textDecoration: 'underline' }}>Điều khoản dịch vụ</a>{' '}
              và{' '}
              <a href="#" style={{ color: '#888', textDecoration: 'underline' }}>Chính sách hoàn tiền</a>.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
