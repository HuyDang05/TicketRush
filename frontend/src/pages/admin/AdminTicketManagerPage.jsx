import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/shared/AdminLayout';
import api from '../../services/api';

export default function AdminTicketManagerPage() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [buyers, setBuyers] = useState([]);
  const [sortBy, setSortBy] = useState('time');
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [keyword, setKeyword] = useState('');

  const formatDate = (value) => {
    if (!value) return 'Chưa có';
    return new Date(value).toLocaleString('vi-VN');
  };

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString('vi-VN') + 'đ';
  };

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const res = await api.get('/admin/tickets/events');
      setEvents(res.data.data || []);
    } catch (error) {
      console.error(error);
      alert('Không tải được danh sách sự kiện');
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadBuyers = async (eventId, sort = sortBy) => {
    if (!eventId) return;

    try {
      setLoadingBuyers(true);
      const res = await api.get(`/admin/tickets/events/${eventId}/buyers`, {
        params: { sortBy: sort },
      });
      setBuyers(res.data.data || []);
    } catch (error) {
      console.error(error);
      alert('Không tải được danh sách người mua vé');
    } finally {
      setLoadingBuyers(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent?.id) {
      loadBuyers(selectedEvent.id, sortBy);
    }
  }, [selectedEvent, sortBy]);

  const filteredBuyers = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    if (!q) return buyers;

    return buyers.filter((b) => {
      return (
        b.buyerName?.toLowerCase().includes(q) ||
        b.buyerEmail?.toLowerCase().includes(q) ||
        b.seatLabel?.toLowerCase().includes(q)
      );
    });
  }, [buyers, keyword]);

  return (
    <AdminLayout>
      <div style={{ padding: 32, color: '#fff' }}>
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
            <h1 style={{ margin: 0, fontSize: 28 }}>Quản lý vé</h1>
            <p style={{ marginTop: 8, color: '#aaa' }}>
              Theo dõi số lượng vé của từng sự kiện và danh sách người mua vé.
            </p>
          </div>

          <button
            onClick={() => {
              loadEvents();
              if (selectedEvent?.id) loadBuyers(selectedEvent.id, sortBy);
            }}
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

        <h2 style={{ fontSize: 18, marginBottom: 14 }}>Danh sách sự kiện</h2>

        {loadingEvents ? (
          <div style={{ color: '#aaa' }}>Đang tải sự kiện...</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 18,
              marginBottom: 32,
            }}
          >
            {events.map((event) => {
              const active = selectedEvent?.id === event.id;
              const percent =
                event.totalTickets > 0
                  ? Math.round((event.soldTickets / event.totalTickets) * 100)
                  : 0;

              return (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  style={{
                    background: active ? '#2a211f' : '#202020',
                    border: active
                      ? '1px solid #ff6b35'
                      : '1px solid #333',
                    borderRadius: 18,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: active
                      ? '0 0 0 3px rgba(255,107,53,.15)'
                      : 'none',
                  }}
                >
                  <div
                    style={{
                      height: 140,
                      background: '#111',
                      overflow: 'hidden',
                    }}
                  >
                    {event.imageUrl ? (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#777',
                        }}
                      >
                        Chưa có ảnh
                      </div>
                    )}
                  </div>

                  <div style={{ padding: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>
                      {event.title}
                    </h3>

                    <p style={{ color: '#aaa', fontSize: 13, marginTop: 8 }}>
                      {event.venue || 'Chưa có địa điểm'}
                    </p>

                    <p style={{ color: '#aaa', fontSize: 13 }}>
                      {formatDate(event.date)}
                    </p>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: 8,
                        marginTop: 14,
                      }}
                    >
                      <div>
                        <div style={{ color: '#aaa', fontSize: 12 }}>
                          Tổng vé
                        </div>
                        <strong>{event.totalTickets}</strong>
                      </div>

                      <div>
                        <div style={{ color: '#aaa', fontSize: 12 }}>
                          Đã bán
                        </div>
                        <strong style={{ color: '#4ade80' }}>
                          {event.soldTickets}
                        </strong>
                      </div>

                      <div>
                        <div style={{ color: '#aaa', fontSize: 12 }}>
                          Còn lại
                        </div>
                        <strong style={{ color: '#ff6b35' }}>
                          {event.availableTickets}
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        height: 6,
                        background: '#333',
                        borderRadius: 999,
                        marginTop: 16,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${percent}%`,
                          background: '#ff6b35',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        color: '#aaa',
                        fontSize: 12,
                        marginTop: 6,
                      }}
                    >
                      Đã bán {percent}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div
          style={{
            background: '#202020',
            border: '1px solid #333',
            borderRadius: 18,
            padding: 20,
          }}
        >
          {!selectedEvent ? (
            <div style={{ color: '#aaa' }}>
              Click vào một card sự kiện để xem danh sách người mua vé.
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  alignItems: 'center',
                  marginBottom: 18,
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>
                    Người mua vé · {selectedEvent.title}
                  </h2>
                  <p style={{ marginTop: 6, color: '#aaa' }}>
                    Tổng {buyers.length} vé đã bán
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Tìm tên, email, ghế..."
                    style={{
                      background: '#111',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '10px 12px',
                      borderRadius: 10,
                      outline: 'none',
                    }}
                  />

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{
                      background: '#111',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '10px 12px',
                      borderRadius: 10,
                      outline: 'none',
                    }}
                  >
                    <option value="time">Sắp xếp theo thời gian</option>
                    <option value="name">Sắp xếp theo tên</option>
                  </select>
                </div>
              </div>

              {loadingBuyers ? (
                <div style={{ color: '#aaa' }}>Đang tải người mua vé...</div>
              ) : filteredBuyers.length === 0 ? (
                <div style={{ color: '#aaa' }}>
                  Chưa có người mua vé hoặc không có kết quả phù hợp.
                </div>
              ) : (
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
                        <th style={thStyle}>Người mua</th>
                        <th style={thStyle}>Email</th>
                        <th style={thStyle}>Vị trí ghế</th>
                        <th style={thStyle}>Thời gian mua</th>
                        <th style={thStyle}>Số lượng vé</th>
                        <th style={thStyle}>Tổng tiền</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredBuyers.map((buyer) => (
                        <tr
                          key={buyer.bookingId}
                          style={{ borderBottom: '1px solid #333' }}
                        >
                          <td style={tdStyle}>{buyer.buyerName}</td>
                          <td style={tdStyle}>{buyer.buyerEmail}</td>
                          <td style={tdStyle}>
                            <span
                              style={{
                                background: 'rgba(255,107,53,.12)',
                                color: '#ff6b35',
                                padding: '5px 9px',
                                borderRadius: 999,
                                fontWeight: 700,
                              }}
                            >
                              {buyer.seatLabel}
                            </span>
                          </td>
                          <td style={tdStyle}>{formatDate(buyer.buyTime)}</td>
                          <td style={tdStyle}>{buyer.quantity}</td>
                          <td style={tdStyle}>
                            {formatMoney(buyer.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

const thStyle = {
  textAlign: 'left',
  padding: '14px 12px',
  color: '#aaa',
  fontSize: 12,
  textTransform: 'uppercase',
};

const tdStyle = {
  padding: '14px 12px',
  color: '#fff',
};