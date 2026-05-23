// Purpose: Trang customer hien thi workflow mua ve, xem su kien, chon ghe hoac thanh toan.
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import bookingService from '../../services/booking.service';
import { toast } from 'sonner';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useState, useEffect } from 'react';
import './CartPage.css';
import { useLang } from '../../context/LangContext';
import { css, cx } from "../../lib/runtimeCss";
function toNumberPrice(value) {
  if (value === null || value === undefined) return 0;
  return Number(String(value).replace(/[^\d]/g, '')) || 0;
}
function fmt(n) {
  return toNumberPrice(n).toLocaleString('vi-VN') + 'đ';
}
function CountdownText({
  expiresAt,
  onExpire
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const calculateTimeLeft = () => {
      const now = Date.now();
      const expiresTime = new Date(expiresAt).getTime();
      const diff = Math.floor((expiresTime - now) / 1000);
      return diff > 0 ? diff : 0;
    };
    setTimeLeft(calculateTimeLeft());
    const t = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(t);
        if (onExpire) onExpire();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt, onExpire]);
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');
  return <span className={css({
    color: '#d9534f',
    fontWeight: 'bold'
  }, "CartPage")}>{mm}:{ss}</span>;
}
export default function CartPage() {
  const {
    lang
  } = useLang();
  const {
    cartItems,
    refreshCart
  } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const handleDelete = async bookingId => {
    setLoading(true);
    try {
      await bookingService.releaseSeat(bookingId);
      toast.success(lang === 'en' ? 'Seat removed from cart' : 'Đã xoá ghế khỏi giỏ hàng');
      refreshCart();
    } catch (err) {
      toast.error(err.response?.data?.message || (lang === 'en' ? 'Unable to remove seat' : 'Không thể xóa ghế'));
    } finally {
      setLoading(false);
    }
  };
  const handleEdit = eventId => {
    navigate(`/events/${eventId}/seats`);
  };
  const handleCheckout = () => {
    navigate('/cart/checkout');
  };
  const subtotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const serviceFee = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + serviceFee;

  // Group items by eventId
  const eventGroups = cartItems.reduce((acc, item) => {
    if (!acc[item.eventId]) {
      acc[item.eventId] = {
        eventId: item.eventId,
        eventTitle: item.eventTitle,
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
  const groupedCart = Object.values(eventGroups);
  return <div className="cart-page">
      <h1 className="cart-title">{lang === 'en' ? 'Cart' : 'Giỏ hàng'}</h1>
      
      {loading && <LoadingSpinner />}
      
      {cartItems.length === 0 ? <div className="cart-empty">
          <h3>{lang === 'en' ? 'Your cart is empty' : 'Giỏ hàng của bạn đang trống'}</h3>
          <button onClick={() => navigate('/')} className="cart-empty-btn">
            {lang === 'en' ? 'Continue browsing events' : 'Tiếp tục xem sự kiện'}
          </button>
        </div> : <>
          <div className="cart-table-wrapper">
            <table className="cart-table">
              <thead>
                <tr>
                  <th className={css({
                textAlign: 'center'
              }, "CartPage")}>{lang === 'en' ? 'Event name' : 'Tên sự kiện'}</th>
                  <th className={css({
                textAlign: 'center',
                width: '100px'
              }, "CartPage")}>{lang === 'en' ? 'Quantity' : 'Số lượng ghế'}</th>
                  <th className={css({
                textAlign: 'center'
              }, "CartPage")}>{lang === 'en' ? 'Zone/Seat name' : 'Khu/Tên ghế'}</th>
                  <th className={css({
                textAlign: 'center'
              }, "CartPage")}>{lang === 'en' ? 'Time left to checkout' : 'Thời gian còn lại để thanh toán'}</th>
                  <th className={css({
                textAlign: 'center'
              }, "CartPage")}>{lang === 'en' ? 'Price' : 'Giá'}</th>
                  <th className={css({
                textAlign: 'center',
                width: '60px'
              }, "CartPage")}></th>
                  <th className={cx("col-actions", css({
                textAlign: 'center',
                width: '120px'
              }, "CartPage"))}></th>
                </tr>
              </thead>
              <tbody>
                {groupedCart.map(group => {
              return group.items.map((item, index) => <tr key={item.bookingId}>
                      {index === 0 && <td rowSpan={group.items.length} className={css({
                  verticalAlign: 'middle'
                }, "CartPage")}>
                          <div className="cart-item-event">{group.eventTitle}</div>
                        </td>}
                      {index === 0 && <td rowSpan={group.items.length} className={css({
                  verticalAlign: 'middle',
                  textAlign: 'center'
                }, "CartPage")}>
                          <span className={css({
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }, "CartPage")}>{group.items.length}</span>
                        </td>}
                      <td>
                        <div className={cx("cart-item-seat", css({
                    color: 'var(--text)',
                    fontWeight: '500'
                  }, "CartPage"))}>
                          {lang === 'en' ? item.zoneName.replace('Khu', 'Zone') : item.zoneName}/{item.seatLabel}
                        </div>
                      </td>
                      {index === 0 && <td rowSpan={group.items.length} className={css({
                  textAlign: 'center'
                }, "CartPage")}>
                        <CountdownText expiresAt={group.expiresAt} onExpire={refreshCart} />
                      </td>}
                      <td className={css({
                  textAlign: 'right',
                  fontWeight: 'bold'
                }, "CartPage")}>{fmt(item.totalPrice)}</td>
                      <td className={css({
                  textAlign: 'center'
                }, "CartPage")}>
                        <button onClick={() => handleDelete(item.bookingId)} className={cx("cart-action-btn cart-btn-delete", css({
                    padding: '6px 8px',
                    background: 'transparent',
                    color: 'var(--danger)'
                  }, "CartPage"))} title={lang === 'en' ? 'Remove seat' : 'Xóa ghế'}>
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </td>
                      {index === 0 && <td className={cx("col-actions", css({
                  verticalAlign: 'middle',
                  textAlign: 'center'
                }, "CartPage"))} rowSpan={group.items.length}>
                          <button onClick={() => handleEdit(group.eventId)} className={cx("cart-action-btn cart-btn-edit", css({
                    width: '100%'
                  }, "CartPage"))}>
                            {lang === 'en' ? 'Edit' : 'Chỉnh sửa'}
                          </button>
                        </td>}
                    </tr>);
            })}
              </tbody>
            </table>
          </div>

          <div className="cart-footer">
            <div className={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px',
          minWidth: '340px'
        }, "CartPage")}>
              <div className={css({
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            fontSize: '15px',
            color: 'var(--text-soft)'
          }, "CartPage")}>
                <span>{lang === 'en' ? 'Subtotal:' : 'Tổng đơn giá:'}</span>
                <span className={css({
              fontWeight: '500',
              color: 'var(--text)'
            }, "CartPage")}>{fmt(subtotal)}</span>
              </div>
              <div className={css({
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            fontSize: '15px',
            color: 'var(--text-soft)'
          }, "CartPage")}>
                <span>{lang === 'en' ? 'Service fee (5%):' : 'Phí dịch vụ (5%):'}</span>
                <span className={css({
              fontWeight: '500',
              color: 'var(--text)'
            }, "CartPage")}>{fmt(serviceFee)}</span>
              </div>
              <div className={css({
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            fontSize: '18px',
            borderTop: '1px solid var(--border)',
            paddingTop: '12px',
            marginTop: '4px'
          }, "CartPage")}>
                <span className={css({
              fontWeight: 'bold'
            }, "CartPage")}>{lang === 'en' ? 'Total to pay:' : 'Cần thanh toán:'}</span>
                <span className={cx("cart-total-value", css({
              fontSize: '22px'
            }, "CartPage"))}>{fmt(grandTotal)}</span>
              </div>
            </div>
            <button onClick={handleCheckout} className={cx("cart-checkout-btn", css({
          width: '100%',
          maxWidth: '340px',
          marginTop: '8px'
        }, "CartPage"))}>
              {lang === 'en' ? 'Checkout' : 'Thanh toán'}
            </button>
          </div>
        </>}
    </div>;
}
