import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import bookingService from '../../services/booking.service';
import { useAuth } from '../../hooks/useAuth';

// ─── Countdown ────────────────────────────────────────────────────────────────
function Countdown({ initialSeconds }) {
  const [secs, setSecs] = useState(initialSeconds);
  useEffect(() => {
    if (secs <= 0) return;
    const id = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secs]);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const urgent = secs < 120;
  return (
    <span style={{
      fontSize: 26, fontWeight: 800, letterSpacing: 1,
      fontVariantNumeric: 'tabular-nums',
      color: urgent ? '#ef4444' : '#FF6B35',
    }}>{mm}:{ss}</span>
  );
}

// ─── PayOption ────────────────────────────────────────────────────────────────
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

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      background: '#1e1e1e', border: `1px solid ${type === 'success' ? '#22c55e' : '#FF6B35'}`,
      borderRadius: 8, padding: '11px 22px', color: '#fff', fontSize: 13, fontWeight: 600,
      zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,.5)',
    }}>{msg}</div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const { seatId: bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [payMethod, setPayMethod] = useState('card');
  const [promoCode, setPromoCode] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [toast, setToast] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingBooking(true);
    bookingService.getBookingById(bookingId)
      .then(res => { if (!cancelled) setBooking(res.data); })
      .catch(err => { if (!cancelled) setFetchError(err.response?.data?.message || 'Không thể tải thông tin đặt vé'); })
      .finally(() => { if (!cancelled) setLoadingBooking(false); });
    return () => { cancelled = true; };
  }, [bookingId]);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);

  const handlePromo = () => {
    const PROMOS = { 'RUSH20': 20, 'VIP10': 10 };
    const code = promoCode.trim().toUpperCase();
    if (PROMOS[code]) {
      setDiscountPct(PROMOS[code]);
      showToast(`✓ Áp dụng mã ${code} — giảm ${PROMOS[code]}%`, 'success');
    } else {
      showToast('Mã giảm giá không hợp lệ hoặc đã hết hạn');
    }
  };

  const handleConfirm = async () => {
    if (confirming || success) return;
    setConfirming(true);
    try {
      await bookingService.payBooking(bookingId, { method: payMethod });
      setSuccess(true);
      showToast('Đặt vé thành công! Vé đã gửi vào email của bạn.', 'success');
      setTimeout(() => navigate('/my-tickets'), 2000);
    } catch (err) {
      showToast(err.response?.data?.message || 'Thanh toán thất bại. Vui lòng thử lại.');
    } finally {
      setConfirming(false);
    }
  };

  // ── derived numbers ──────────────────────────────────────────────────────
  const subtotal = booking?.totalPrice ?? 0;
  const serviceFee = Math.round(subtotal * 0.05);
  const discount = Math.round(subtotal * discountPct / 100);
  const grandTotal = subtotal + serviceFee - discount;

  const fmtVND = n => n.toLocaleString('vi-VN') + 'đ';

  // ── stepper ──────────────────────────────────────────────────────────────
  const stepCircleBase = {
    width: 32, height: 32, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  };

  return (
    <div style={{ background: '#1A1A1A', minHeight: 'calc(100vh - 64px)', color: '#fff', fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* ── STEPPER ──────────────────────────────────────────────────────── */}
      <div style={{
        background: '#111111', borderBottom: '1px solid #333333',
        padding: '16px 60px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
      }}>
        {/* Step 1 — done */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...stepCircleBase, background: 'rgba(255,107,53,.15)', color: '#FF6B35', border: '1.5px solid rgba(255,107,53,.4)' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#AAAAAA' }}>1. Chọn ghế</span>
        </div>
        <div style={{ width: 60, height: 1, background: 'rgba(255,107,53,.3)', margin: '0 8px', flexShrink: 0 }} />
        {/* Step 2 — active */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...stepCircleBase, background: '#FF6B35', color: '#fff', boxShadow: '0 0 16px rgba(255,107,53,.4)' }}>2</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#FF6B35' }}>2. Xác nhận</span>
        </div>
        <div style={{ width: 60, height: 1, background: '#333333', margin: '0 8px', flexShrink: 0 }} />
        {/* Step 3 — pending */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...stepCircleBase, background: '#242424', color: '#AAAAAA', border: '1.5px solid #333333' }}>3</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#AAAAAA' }}>3. Hoàn tất</span>
        </div>
      </div>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '60% 40%', gap: 28,
        padding: '36px 60px', maxWidth: 1400, margin: '0 auto', alignItems: 'start',
      }}>

        {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
        <div>

          {/* Loading / Error */}
          {loadingBooking && (
            <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, padding: 32, textAlign: 'center', color: '#AAAAAA', marginBottom: 18 }}>
              Đang tải thông tin đặt vé...
            </div>
          )}
          {fetchError && (
            <div style={{ background: '#2d1010', border: '1px solid #ef4444', borderRadius: 12, padding: 20, color: '#ef4444', marginBottom: 18 }}>
              {fetchError}
            </div>
          )}

          {/* Event Info Card */}
          {booking && (
            <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, padding: 20, marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#FF6B35', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 12 }}>Sự kiện</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 72, height: 52, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  background: 'linear-gradient(135deg,#2d1000,#8b3500)',
                }}>🎤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                    {booking.seat?.zone?.event?.name || 'Sự kiện'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {booking.seat?.zone?.event?.date && (
                      <div style={{ fontSize: 12, color: '#AAAAAA', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="12" height="12" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        {new Date(booking.seat.zone.event.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                    )}
                    {booking.seat?.zone?.event?.location && (
                      <div style={{ fontSize: 12, color: '#AAAAAA', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="12" height="12" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                        {booking.seat.zone.event.location}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Seat Detail Card */}
          {booking && (
            <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, padding: 20, marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, paddingLeft: 12, borderLeft: '3px solid #FF6B35' }}>Chi tiết vé</div>
              <div style={{ background: '#1A1A1A', borderRadius: 8, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  background: 'rgba(255,107,53,.15)', border: '1px solid rgba(255,107,53,.3)',
                  color: '#FF6B35', fontSize: 11, fontWeight: 700, padding: '4px 10px',
                  borderRadius: 5, flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                  {booking.seat?.zone?.name || 'Khu'} · {booking.seat?.label || ''}
                </div>
                <span style={{ fontSize: 13, color: '#AAAAAA', flex: 1 }}>
                  {booking.seat?.zone?.name} — Ghế {booking.seat?.label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {fmtVND(booking.seat?.zone?.price ?? subtotal)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 0', borderTop: '1px solid #333333', marginTop: 4 }}>
                <span style={{ fontSize: 13, color: '#AAAAAA' }}>1 vé · {booking.seat?.zone?.name || 'Khu'}</span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{fmtVND(subtotal)}</span>
              </div>
            </div>
          )}

          {/* Buyer Info Card */}
          <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, padding: 20, marginBottom: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, paddingLeft: 12, borderLeft: '3px solid #FF6B35' }}>Thông tin người mua</div>
            {[
              { label: 'Họ và tên', val: user?.fullName || user?.name || '—' },
              { label: 'Email', val: user?.email || '—' },
              { label: 'Phương thức nhận vé', val: 'Vé điện tử (Email & App)' },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                <span style={{ fontSize: 13, color: '#AAAAAA' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{val}</span>
              </div>
            ))}
            <div style={{
              background: '#0F2A1A', borderLeft: '3px solid #FF6B35', borderRadius: '0 8px 8px 0',
              padding: '12px 14px', marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <svg width="16" height="16" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
              <div style={{ fontSize: 12, color: '#FF6B35', lineHeight: 1.6 }}>
                Vé điện tử sẽ được gửi đến email <strong>{user?.email || '—'}</strong> sau khi thanh toán thành công. Vui lòng kiểm tra hộp thư đến và thư mục spam.
              </div>
            </div>
          </div>

          {/* Payment Method Card */}
          <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, padding: 20, marginBottom: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, paddingLeft: 12, borderLeft: '3px solid #FF6B35' }}>Phương thức thanh toán</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PayOption name="card" logo="VISA" logoBg="#1a3d6e" title="Thẻ tín dụng / Ghi nợ" subtitle="Visa, Mastercard, JCB" selected={payMethod === 'card'} onSelect={() => setPayMethod('card')} />
              <PayOption name="bank" logo="MB" logoBg="#0068b7" title="Chuyển khoản ngân hàng" subtitle="MoMo, ZaloPay, VNPay" selected={payMethod === 'bank'} onSelect={() => setPayMethod('bank')} />
              <PayOption name="momo" logo="MM" logoBg="#a50064" title="Ví MoMo" subtitle="Thanh toán qua ví điện tử" selected={payMethod === 'momo'} onSelect={() => setPayMethod('momo')} />
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN ───────────────────────────────────────────────── */}
        <div>
          <div style={{
            background: '#242424', border: '1px solid #333333', borderRadius: 12,
            padding: 24, position: 'sticky', top: 148,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Tóm tắt đơn hàng</div>

            {/* Countdown */}
            <div style={{
              background: '#2D1F0A', border: '1px solid #FF6B35', borderRadius: 8,
              padding: '14px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="20" height="20" fill="none" stroke="#FF6B35" strokeWidth="2.2" viewBox="0 0 24 24" style={{ flexShrink: 0, animation: 'tickPulse 1s ease-in-out infinite' }}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#FF6B35' }}>Đơn hàng hết hạn sau</div>
                  <div style={{ fontSize: 12, color: '#AAAAAA', lineHeight: 1.4 }}>Hoàn tất trước khi hết giờ</div>
                </div>
              </div>
              <Countdown initialSeconds={10 * 60} />
            </div>

            {/* Promo */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input
                value={promoCode}
                onChange={e => setPromoCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePromo()}
                placeholder="Nhập mã giảm giá..."
                style={{
                  flex: 1, background: '#1A1A1A', border: '1px solid #333333',
                  borderRadius: 8, padding: '10px 14px', color: '#fff',
                  fontFamily: 'inherit', fontSize: 13, outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#FF6B35'}
                onBlur={e => e.target.style.borderColor = '#333333'}
              />
              <button
                onClick={handlePromo}
                style={{
                  padding: '0 16px', background: 'transparent', border: '1px solid #FF6B35',
                  borderRadius: 8, color: '#FF6B35', fontFamily: 'inherit', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { e.target.style.background = '#FF6B35'; e.target.style.color = '#fff'; }}
                onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#FF6B35'; }}
              >Áp dụng</button>
            </div>

            {/* Price rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: '#AAAAAA' }}>Tạm tính (1 vé)</span>
                <span style={{ fontWeight: 600 }}>{fmtVND(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: '#AAAAAA' }}>Phí dịch vụ (5%)</span>
                <span style={{ fontWeight: 600 }}>{fmtVND(serviceFee)}</span>
              </div>
              {discountPct > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: '#AAAAAA' }}>Giảm giá</span>
                  <span style={{ fontWeight: 600, color: '#4ade80' }}>−{fmtVND(discount)}</span>
                </div>
              )}
            </div>

            <div style={{ height: 1, background: '#333333', margin: '14px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Tổng thanh toán</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#FF6B35' }}>{fmtVND(grandTotal)}</span>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={confirming || success || loadingBooking}
              style={{
                width: '100%', height: 52,
                background: success ? '#22c55e' : '#FF6B35',
                border: 'none', borderRadius: 8,
                color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
                cursor: (confirming || success || loadingBooking) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 24px rgba(255,107,53,.35)',
                marginBottom: 20, letterSpacing: .5,
                opacity: loadingBooking ? 0.6 : 1,
                transition: 'background .2s',
              }}
            >
              {success ? (
                '✓ Thanh toán thành công!'
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
            <div style={{ display: 'flex', border: '1px solid #333333', borderRadius: 8, overflow: 'hidden', marginBottom: 18 }}>
              {[
                {
                  icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                  label: 'Bảo mật SSL',
                },
                {
                  icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>,
                  label: 'Vé chính hãng',
                },
                {
                  icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 12a9 9 0 109 9"/><path d="M3 12V7h5"/></svg>,
                  label: 'Hoàn tiền',
                },
              ].map(({ icon, label }, i) => (
                <div key={i} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 5, padding: '12px 6px', borderRight: i < 2 ? '1px solid #333333' : 'none',
                  fontSize: 11, fontWeight: 600, color: '#AAAAAA',
                }}>
                  {icon}
                  {label}
                </div>
              ))}
            </div>

            {/* Terms */}
            <p style={{ fontSize: 12, color: '#AAAAAA', textAlign: 'center', lineHeight: 1.7 }}>
              Bằng cách xác nhận, bạn đồng ý với{' '}
              <a href="#" style={{ color: '#AAAAAA', textDecoration: 'underline' }}>Điều khoản dịch vụ</a>{' '}
              và{' '}
              <a href="#" style={{ color: '#AAAAAA', textDecoration: 'underline' }}>Chính sách hoàn tiền</a>{' '}
              của TicketRush.
            </p>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes tickPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
    </div>
  );
}
