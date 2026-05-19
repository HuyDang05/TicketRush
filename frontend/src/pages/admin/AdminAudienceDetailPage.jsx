import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/shared/AdminLayout';
import api from '../../services/api';

export default function AdminAudienceDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [buyers, setBuyers] = useState([]);
  const [eventTitle, setEventTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const formatDate = (value) => {
    if (!value) return 'Chưa có';
    return new Date(value).toLocaleString('vi-VN');
  };

  const loadBuyers = async () => {
    try {
      setLoading(true);

      const res = await api.get(`/admin/tickets/events/${eventId}/buyers`, {
        params: { sortBy: 'time' },
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
      const currentEvent = events.find((e) => String(e.id) === String(eventId));

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

    buyers.forEach((buyer) => {
      const key = buyer.bookingId || `${buyer.buyerEmail}-${buyer.buyTime}`;

      if (!map.has(key)) {
        map.set(key, {
          bookingId: key,
          buyerName: buyer.buyerName || 'Khách hàng',
          buyerEmail: buyer.buyerEmail || '',
          buyTime: buyer.buyTime,
          seats: [],
        });
      }

      const current = map.get(key);

      if (buyer.seatLabel) {
        current.seats.push(buyer.seatLabel);
      }
    });

    return Array.from(map.values());
  }, [buyers]);

  return (
    <AdminLayout>
      <div
        style={{
          padding: 32,
          color: '#fff',
          height: '100vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <button
            onClick={() => navigate('/admin/users')}
            onMouseEnter={(e) => {
                e.currentTarget.style.border = '1px solid #ff6b35';
                e.currentTarget.style.boxShadow = '0 0 14px rgba(255,107,53,0.35)';
                e.currentTarget.style.color = '#ff6b35';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.border = '1px solid #333';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.color = '#fff';
            }}
            style={{
                background: '#151515',
                border: '1px solid #333',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: 12,
                cursor: 'pointer',
                marginBottom: 22,
                transition: 'all 0.25s ease',
                fontWeight: 600,
            }}
            >
            ← Quay lại
            </button>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>
              Danh sách khán giả
            </h1>

            <p style={{ marginTop: 8, color: '#aaa' }}>
              {eventTitle || 'Chi tiết khán giả theo sự kiện'}
            </p>
          </div>

          <button
            onClick={loadBuyers}
            style={{
              background: '#ff6b35',
              border: 'none',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Làm mới
          </button>
        </div>

        <div
          style={{
            background: '#202020',
            border: '1px solid #333',
            borderRadius: 18,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: 20,
              borderBottom: '1px solid #333',
            }}
          >
            <h2 style={{ margin: 0, fontSize: 20 }}>
              Bảng thông tin khán giả
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ background: '#151515' }}>
                  <th style={thStyle}>Tên tài khoản</th>
                  <th style={thStyle}>Ngày giờ mua vé</th>
                  <th style={thStyle}>Các ghế đã mua</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" style={emptyStyle}>
                      Đang tải danh sách khán giả...
                    </td>
                  </tr>
                ) : groupedBuyers.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={emptyStyle}>
                      Chưa có khán giả mua vé sự kiện này
                    </td>
                  </tr>
                ) : (
                  groupedBuyers.map((buyer) => (
                    <tr
                      key={buyer.bookingId}
                      style={{ borderBottom: '1px solid #333' }}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700 }}>
                          {buyer.buyerName}
                        </div>

                        {buyer.buyerEmail && (
                          <div
                            style={{
                              color: '#aaa',
                              fontSize: 12,
                              marginTop: 4,
                            }}
                          >
                            {buyer.buyerEmail}
                          </div>
                        )}
                      </td>

                      <td style={tdStyle}>
                        {formatDate(buyer.buyTime)}
                      </td>

                      <td style={tdStyle}>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            alignItems: 'flex-start',
                          }}
                        >
                          {buyer.seats.length > 0 ? (
                            buyer.seats.map((seat, index) => (
                              <span
                                key={`${seat}-${index}`}
                                style={{
                                  background: 'rgba(255,107,53,.12)',
                                  color: '#ff6b35',
                                  border: '1px solid rgba(255,107,53,.25)',
                                  padding: '6px 10px',
                                  borderRadius: 999,
                                  fontWeight: 700,
                                  minWidth: 60,
                                  textAlign: 'center',
                                }}
                              >
                                {seat}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: '#aaa' }}>Chưa có ghế</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

const thStyle = {
  textAlign: 'left',
  padding: '14px 16px',
  color: '#aaa',
  fontSize: 12,
  textTransform: 'uppercase',
};

const tdStyle = {
  padding: '16px',
  color: '#fff',
  verticalAlign: 'top',
};

const emptyStyle = {
  padding: 28,
  color: '#aaa',
  textAlign: 'center',
};