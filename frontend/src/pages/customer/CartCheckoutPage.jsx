// Purpose: Trang customer hien thi workflow mua ve, xem su kien, chon ghe hoac thanh toan.
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import bookingService from '../../services/booking.service';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../context/CartContext';
import { useCountdown } from '../../hooks/useCountdown';
import './checkout.css';
import { css, cx } from "../../lib/runtimeCss";
function fmtVND(n) {
  const value = Number(n) || 0;
  return value.toLocaleString('vi-VN') + ' đ';
}
function CheckoutCountdown({
  expiresAt,
  onExpire
}) {
  const {
    minutes,
    seconds,
    isExpired
  } = useCountdown(expiresAt);
  const urgent = minutes < 3;
  useEffect(() => {
    if (isExpired && onExpire) {
      onExpire();
    }
  }, [isExpired, onExpire]);
  return <span className={css({
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: 1,
    fontVariantNumeric: 'tabular-nums',
    color: isExpired ? '#ef4444' : urgent ? '#f59e0b' : '#FF6B35'
  }, "CartCheckoutPage")}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>;
}
function PayOption({
  name,
  logo,
  logoBg,
  title,
  subtitle,
  selected,
  onSelect
}) {
  return <label className={`checkout-pay-option ${selected ? 'checkout-pay-option--selected' : 'checkout-pay-option--unselected'}`}>
      <input type="radio" name="pay" checked={selected} onChange={onSelect} className={css({
      accentColor: '#FF6B35',
      width: 16,
      height: 16,
      flexShrink: 0
    }, "CartCheckoutPage")} />
      <div className={cx("checkout-pay-logo", css({
      background: logoBg
    }, "CartCheckoutPage"))}>{logo}</div>
      <div>
        <div className="checkout-pay-title">{title}</div>
        <div className="checkout-pay-sub">{subtitle}</div>
      </div>
      {selected && <div className="checkout-pay-selected-badge">Đang chọn</div>}
    </label>;
}
export default function CartCheckoutPage() {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    cartItems,
    refreshCart
  } = useCart();
  const [payMethod, setPayMethod] = useState('card');
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    if (cartItems.length === 0 && !success) {
      toast.error('Giỏ hàng trống hoặc các vé đã hết hạn');
      navigate('/cart', {
        replace: true
      });
    }
  }, [cartItems, navigate, success]);
  if (cartItems.length === 0 && !success) return null;
  const subtotal = cartItems.reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);
  const serviceFee = Math.round(Number(subtotal) * 0.05);
  const grandTotal = Number(subtotal) + Number(serviceFee);

  // Group items by event for display
  const eventGroups = cartItems.reduce((acc, item) => {
    if (!acc[item.eventId]) {
      acc[item.eventId] = {
        eventId: item.eventId,
        title: item.eventTitle,
        expiresAt: item.sessionExpiresAt || item.expiresAt,
        items: []
      };
    }
    const itemExpiresAt = item.sessionExpiresAt || item.expiresAt;
    if (itemExpiresAt && new Date(itemExpiresAt).getTime() < new Date(acc[item.eventId].expiresAt).getTime()) {
      acc[item.eventId].expiresAt = itemExpiresAt;
    }
    acc[item.eventId].items.push(item);
    return acc;
  }, {});
  async function handleConfirm() {
    if (confirming || success) return;
    setConfirming(true);
    try {
      const bookingIds = cartItems.map(b => b.bookingId);
      await bookingService.checkout(bookingIds);
      setSuccess(true);
      refreshCart(); // clear cart locally
      toast.success('Mua vé thành công!', {
        description: 'Vé điện tử đã được gửi vào email của bạn.'
      });
      setTimeout(() => navigate('/my-tickets', {
        replace: true
      }), 1800);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Thanh toán thất bại. Vui lòng thử lại.';
      if (status === 410 || status === 409) {
        toast.error('Phiên giữ chỗ đã hết hạn', {
          description: 'Một số ghế trong giỏ hàng đã hết thời gian giữ chỗ.'
        });
        refreshCart();
        setTimeout(() => navigate('/cart', {
          replace: true
        }), 1800);
      } else {
        toast.error(msg);
      }
    } finally {
      setConfirming(false);
    }
  }
  return <div className="checkout-page">

      {/* STEPPER */}
      <div className="checkout-stepper">
        <div className="checkout-stepper__inner">
          <div className="checkout-stepper__circle checkout-stepper__circle--done">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <span className="checkout-stepper__label">1. Giỏ hàng</span>
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
        <Link to="/cart">Giỏ hàng</Link>
        <span className="checkout-breadcrumb__sep">/</span>
        <span className="checkout-breadcrumb__current">Xác nhận thanh toán toàn bộ</span>
      </div>

      {/* MAIN */}
      <div className="checkout-layout">

        {/* LEFT */}
        <div className="checkout-left">

          {/* Seat list grouped by event */}
          <div className="checkout-card">
            <div className="checkout-card__title">Chi tiết đơn hàng ({cartItems.length} vé)</div>
            
            {Object.keys(eventGroups).map(eventId => {
            const group = eventGroups[eventId];
            return <div key={eventId} className={css({
              marginBottom: '20px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px'
            }, "CartCheckoutPage")}>
                  <div className={css({
                fontWeight: 'bold',
                fontSize: '16px',
                color: 'var(--accent)',
                marginBottom: '12px'
              }, "CartCheckoutPage")}>
                    {group.title}
                  </div>
                  <div className="checkout-ticket-list">
                    {group.items.map(b => <div key={b.bookingId} className="checkout-ticket">
                        <div className="checkout-ticket__badge">{b.zoneName} · {b.seatLabel}</div>
                        <span className="checkout-ticket__desc">{b.zoneName} — Ghế {b.seatLabel}</span>
                        <span className="checkout-ticket__price">{fmtVND(b.totalPrice)}</span>
                      </div>)}
                  </div>
                </div>;
          })}
            
            <div className="checkout-ticket-footer">
              <span className="checkout-ticket-footer__count">Tổng số {cartItems.length} vé</span>
              <span className="checkout-ticket-footer__total">{fmtVND(subtotal)}</span>
            </div>
          </div>

          {/* Buyer info */}
          <div className="checkout-card">
            <div className="checkout-card__title">Thông tin người mua</div>
            {[{
            label: 'Họ và tên',
            val: user?.name || user?.fullName || '—'
          }, {
            label: 'Email',
            val: user?.email || '—'
          }, {
            label: 'Phương thức nhận vé',
            val: 'Vé điện tử (Email & App)'
          }].map(({
            label,
            val
          }) => <div key={label} className="checkout-info-row">
                <span className="checkout-info-row__label">{label}</span>
                <span className="checkout-info-row__value">{val}</span>
              </div>)}
            <div className="checkout-info-notice">
              <svg width="15" height="15" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24" className={css({
              flexShrink: 0,
              marginTop: 1
            }, "CartCheckoutPage")}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
              <div>
                Vé điện tử sẽ được gửi đến email <strong className={css({
                color: '#fff'
              }, "CartCheckoutPage")}>{user?.email || '—'}</strong> sau khi thanh toán thành công.
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="checkout-card">
            <div className="checkout-card__title">Phương thức thanh toán</div>
            <div className={css({
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }, "CartCheckoutPage")}>
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

            <div className={cx("checkout-countdown-list", css({
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '24px',
            maxHeight: '300px',
            overflowY: 'auto',
            paddingRight: '8px'
          }, "CartCheckoutPage"))}>
              {Object.values(eventGroups).map(group => <div key={group.eventId} className="checkout-countdown-item">
                  <div className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }, "CartCheckoutPage")}>
                    <div className={css({
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#FF6B35'
                }, "CartCheckoutPage")}></div>
                    <span className="checkout-countdown-item__title checkout-countdown-item__title--sm">
                      {group.title.length > 15 ? group.title.substring(0, 15) + '...' : group.title}
                      <br />
                      <span className="checkout-countdown-item__subtitle">{group.items.length} ghế trong phiên</span>
                    </span>
                  </div>
                  <div className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }, "CartCheckoutPage")}>
                    <svg width="14" height="14" fill="none" stroke="#FF6B35" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                    <CheckoutCountdown expiresAt={group.expiresAt} onExpire={refreshCart} />
                  </div>
                </div>)}
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

            <div className="checkout-price-rows">
              <div className={cx("checkout-price-row", css({
              marginTop: '12px'
            }, "CartCheckoutPage"))}>
                <span className="checkout-price-row__label checkout-price-row__label--total">Tổng cộng</span>
                <span className={cx("checkout-price-row__value", css({
                fontWeight: 'bold',
                fontSize: '20px',
                color: '#10b981'
              }, "CartCheckoutPage"))}>{fmtVND(grandTotal)}</span>
              </div>
            </div>

            <button className={cx(`checkout-confirm-btn${success ? ' checkout-confirm-btn--success' : ''}`, css({
            marginTop: '24px'
          }, "CartCheckoutPage"))} onClick={handleConfirm} disabled={confirming || success}>
              {success ? <>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                  Thanh toán thành công!
                </> : confirming ? <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={css({
                animation: 'spin .7s linear infinite'
              }, "CartCheckoutPage")}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                  Đang xử lý...
                </> : <>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  XÁC NHẬN THANH TOÁN
                </>}
            </button>

            <div className="checkout-trust-badges">
              {[{
              icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
              label: 'Bảo mật SSL'
            }, {
              icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>,
              label: 'Vé chính hãng'
            }, {
              icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 12a9 9 0 109 9" /><path d="M3 12V7h5" /></svg>,
              label: 'Hoàn tiền'
            }].map(({
              icon,
              label
            }, i) => <div key={i} className="checkout-trust-badge">{icon}{label}</div>)}
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
    </div>;
}
