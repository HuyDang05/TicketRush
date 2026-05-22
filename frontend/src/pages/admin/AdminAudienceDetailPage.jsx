import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/shared/AdminLayout';
import api from '../../services/api';
import { css, cx, setNodeCss } from "../../lib/runtimeCss";
export default function AdminAudienceDetailPage() {
  const {
    eventId
  } = useParams();
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState([]);
  const [eventTitle, setEventTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const formatDate = value => {
    if (!value) return 'Chưa có';
    return new Date(value).toLocaleString('vi-VN');
  };
  const loadBuyers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/tickets/events/${eventId}/buyers`, {
        params: {
          sortBy: 'time'
        }
      });
      setBuyers(res.data.data || []);
    } catch (error) {
      console.error(error);
      alert('Không tải được danh sách khán giả');
    } finally {
      setLoading(false);
    }
  };
  const loadEventInfo = async () => {
    try {
      const res = await api.get('/admin/tickets/events');
      const events = res.data.data || [];
      const currentEvent = events.find(e => String(e.id) === String(eventId));
      if (currentEvent) {
        setEventTitle(currentEvent.title);
      }
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    loadBuyers();
    loadEventInfo();
  }, [eventId]);
  const groupedBuyers = useMemo(() => {
    const map = new Map();
    buyers.forEach(buyer => {
      const key = buyer.bookingId || `${buyer.buyerEmail}-${buyer.buyTime}`;
      if (!map.has(key)) {
        map.set(key, {
          bookingId: key,
          buyerName: buyer.buyerName || 'Khách hàng',
          buyerEmail: buyer.buyerEmail || '',
          buyTime: buyer.buyTime,
          seats: []
        });
      }
      const current = map.get(key);
      if (buyer.seatLabel) {
        current.seats.push(buyer.seatLabel);
      }
    });
    return Array.from(map.values());
  }, [buyers]);
  return <AdminLayout>
      <div className={css({
      padding: 32,
      color: 'var(--text)',
      height: '100vh',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }, "AdminAudienceDetailPage")}>
        <button onClick={() => navigate('/admin/users')} onMouseEnter={e => {
setNodeCss(e.currentTarget, { border: '1px solid var(--accent)' }, 'border');
setNodeCss(e.currentTarget, { boxShadow: '0 0 14px rgba(255,107,53,0.35)' }, 'boxShadow');
setNodeCss(e.currentTarget, { color: 'var(--accent)' }, 'color');
      }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { border: '1px solid var(--border)' }, 'border');
setNodeCss(e.currentTarget, { boxShadow: 'none' }, 'boxShadow');
setNodeCss(e.currentTarget, { color: 'var(--text)' }, 'color');
      }} className={css({
        background: 'var(--bg-strong)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
        padding: '10px 16px',
        borderRadius: 12,
        cursor: 'pointer',
        marginBottom: 22,
        transition: 'all 0.25s ease',
        fontWeight: 600
      }, "AdminAudienceDetailPage")}>
            ← Quay lại
            </button>

        <div className={css({
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        alignItems: 'center',
        marginBottom: 24
      }, "AdminAudienceDetailPage")}>
          <div>
            <h1 className={css({
            margin: 0,
            fontSize: 28
          }, "AdminAudienceDetailPage")}>
              Danh sách khán giả
            </h1>

            <p className={css({
            marginTop: 8,
            color: 'var(--muted)'
          }, "AdminAudienceDetailPage")}>
              {eventTitle || 'Chi tiết khán giả theo sự kiện'}
            </p>
          </div>

          <button onClick={loadBuyers} className={css({
          background: 'var(--accent)',
          border: 'none',
          color: 'var(--text)',
          padding: '10px 16px',
          borderRadius: 10,
          fontWeight: 700,
          cursor: 'pointer'
        }, "AdminAudienceDetailPage")}>
            Làm mới
          </button>
        </div>

        <div className={css({
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        overflow: 'hidden'
      }, "AdminAudienceDetailPage")}>
          <div className={css({
          padding: 20,
          borderBottom: '1px solid var(--border)'
        }, "AdminAudienceDetailPage")}>
            <h2 className={css({
            margin: 0,
            fontSize: 20
          }, "AdminAudienceDetailPage")}>
              Bảng thông tin khán giả
            </h2>
          </div>

          <div className={css({
          overflowX: 'auto'
        }, "AdminAudienceDetailPage")}>
            <table className={css({
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 14
          }, "AdminAudienceDetailPage")}>
              <thead>
                <tr className={css({
                background: 'var(--bg-strong)'
              }, "AdminAudienceDetailPage")}>
                  <th className={css(thStyle, "AdminAudienceDetailPage")}>Tên tài khoản</th>
                  <th className={css(thStyle, "AdminAudienceDetailPage")}>Ngày giờ mua vé</th>
                  <th className={css(thStyle, "AdminAudienceDetailPage")}>Các ghế đã mua</th>
                </tr>
              </thead>

              <tbody>
                {loading ? <tr>
                    <td colSpan="3" className={css(emptyStyle, "AdminAudienceDetailPage")}>
                      Đang tải danh sách khán giả...
                    </td>
                  </tr> : groupedBuyers.length === 0 ? <tr>
                    <td colSpan="3" className={css(emptyStyle, "AdminAudienceDetailPage")}>
                      Chưa có khán giả mua vé sự kiện này
                    </td>
                  </tr> : groupedBuyers.map(buyer => <tr key={buyer.bookingId} className={css({
                borderBottom: '1px solid var(--border)'
              }, "AdminAudienceDetailPage")}>
                      <td className={css(tdStyle, "AdminAudienceDetailPage")}>
                        <div className={css({
                    fontWeight: 700
                  }, "AdminAudienceDetailPage")}>
                          {buyer.buyerName}
                        </div>

                        {buyer.buyerEmail && <div className={css({
                    color: 'var(--muted)',
                    fontSize: 12,
                    marginTop: 4
                  }, "AdminAudienceDetailPage")}>
                            {buyer.buyerEmail}
                          </div>}
                      </td>

                      <td className={css(tdStyle, "AdminAudienceDetailPage")}>
                        {formatDate(buyer.buyTime)}
                      </td>

                      <td className={css(tdStyle, "AdminAudienceDetailPage")}>
                        <div className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    alignItems: 'flex-start'
                  }, "AdminAudienceDetailPage")}>
                          {buyer.seats.length > 0 ? buyer.seats.map((seat, index) => <span key={`${seat}-${index}`} className={css({
                      background: 'rgba(255,107,53,.12)',
                      color: 'var(--accent)',
                      border: '1px solid rgba(255,107,53,.25)',
                      padding: '6px 10px',
                      borderRadius: 999,
                      fontWeight: 700,
                      minWidth: 60,
                      textAlign: 'center'
                    }, "AdminAudienceDetailPage")}>
                                {seat}
                              </span>) : <span className={css({
                      color: 'var(--muted)'
                    }, "AdminAudienceDetailPage")}>Chưa có ghế</span>}
                        </div>
                      </td>
                    </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>;
}
const thStyle = {
  textAlign: 'left',
  padding: '14px 16px',
  color: 'var(--muted)',
  fontSize: 12,
  textTransform: 'uppercase'
};
const tdStyle = {
  padding: '16px',
  color: 'var(--text)',
  verticalAlign: 'top'
};
const emptyStyle = {
  padding: 28,
  color: 'var(--muted)',
  textAlign: 'center'
};
