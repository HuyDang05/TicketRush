import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import bookingService from '../../services/booking.service';
import { toast } from 'sonner';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useState, useEffect } from 'react';
import './CartPage.css';

function toNumberPrice(value) {
  if (value === null || value === undefined) return 0;
  return Number(String(value).replace(/[^\d]/g, '')) || 0;
}

function fmt(n) {
  return toNumberPrice(n).toLocaleString('vi-VN') + 'đ';
}

function CountdownText({ expiresAt, onExpire }) {
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
  return <span style={{ color: '#d9534f', fontWeight: 'bold' }}>{mm}:{ss}</span>;
}

export default function CartPage() {
  const { cartItems, refreshCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleDelete = async (bookingId) => {
    setLoading(true);
    try {
      await bookingService.releaseSeat(bookingId);
      toast.success('Đã xoá ghế khỏi giỏ hàng');
      refreshCart();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa ghế');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (eventId) => {
    navigate(`/events/${eventId}/seats`);
  };

  const handleCheckout = () => {
    navigate('/cart/checkout');
  };

  const total = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);

  // Group items by eventId
  const eventGroups = cartItems.reduce((acc, item) => {
    if (!acc[item.eventId]) {
      acc[item.eventId] = {
        eventId: item.eventId,
        eventTitle: item.eventTitle,
        items: []
      };
    }
    acc[item.eventId].items.push(item);
    return acc;
  }, {});
  
  const groupedCart = Object.values(eventGroups);

  return (
    <div className="cart-page">
      <h1 className="cart-title">Giỏ hàng</h1>
      
      {loading && <LoadingSpinner />}
      
      {cartItems.length === 0 ? (
        <div className="cart-empty">
          <h3>Giỏ hàng của bạn đang trống</h3>
          <button onClick={() => navigate('/')} className="cart-empty-btn">
            Tiếp tục xem sự kiện
          </button>
        </div>
      ) : (
        <>
          <div className="cart-table-wrapper">
            <table className="cart-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>Tên sự kiện</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>Số lượng ghế</th>
                  <th style={{ textAlign: 'center' }}>Khu/Tên ghế</th>
                  <th style={{ textAlign: 'center' }}>Thời gian còn lại để thanh toán</th>
                  <th style={{ textAlign: 'center' }}>Giá</th>
                  <th style={{ textAlign: 'center', width: '60px' }}></th>
                  <th style={{ textAlign: 'center', width: '120px' }}></th>
                </tr>
              </thead>
              <tbody>
                {groupedCart.map((group) => {
                  return group.items.map((item, index) => (
                    <tr key={item.bookingId}>
                      {index === 0 && (
                        <td rowSpan={group.items.length} style={{ verticalAlign: 'middle' }}>
                          <div className="cart-item-event">{group.eventTitle}</div>
                        </td>
                      )}
                      {index === 0 && (
                        <td rowSpan={group.items.length} style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{group.items.length}</span>
                        </td>
                      )}
                      <td>
                        <div className="cart-item-seat" style={{ color: 'var(--text)', fontWeight: '500' }}>
                          {item.zoneName}/{item.seatLabel}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <CountdownText expiresAt={item.expiresAt} onExpire={refreshCart} />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(item.totalPrice)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => handleDelete(item.bookingId)} className="cart-action-btn cart-btn-delete" title="Xóa ghế" style={{ padding: '6px 8px', background: 'transparent', color: 'var(--danger)' }}>
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </td>
                      {index === 0 && (
                        <td rowSpan={group.items.length} style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                          <button onClick={() => handleEdit(group.eventId)} className="cart-action-btn cart-btn-edit" style={{ width: '100%' }}>
                            Chỉnh sửa
                          </button>
                        </td>
                      )}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>

          <div className="cart-footer">
            <div className="cart-total">
              Tổng đơn hàng: <span className="cart-total-value">{fmt(total)}</span>
            </div>
            <button onClick={handleCheckout} className="cart-checkout-btn">
              Thanh toán
            </button>
          </div>
        </>
      )}
    </div>
  );
}
