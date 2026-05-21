import { useEffect, useState } from 'react';
import AdminLayout from '../../components/shared/AdminLayout';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function AdminAudiencePage() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const formatDate = (value) => {
    if (!value) return 'Chưa có thời gian';
    return new Date(value).toLocaleString('vi-VN');
  };

  const loadEvents = async () => {
    try {
        setLoading(true);
        const res = await api.get('/admin/tickets/events');

        console.log('AUDIENCE EVENTS:', res.data.data);

        setEvents(res.data.data || []);
    } catch (error) {
        console.error(error);
        alert('Không tải được dữ liệu khán giả');
    } finally {
        setLoading(false);
    }
 };

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <AdminLayout>
      <div
        style={{
          padding: 32,
          color: 'var(--text)',
          height: '100vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
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
            <h1 style={{ margin: 0, fontSize: 28 }}>Quản lý khán giả</h1>
            <p style={{ marginTop: 8, color: 'var(--muted)' }}>
              Theo dõi số lượng khán giả đã mua vé theo từng sự kiện.
            </p>
          </div>

          <button
            onClick={loadEvents}
            style={{
              background: 'var(--accent)',
              border: 'none',
              color: 'var(--text)',
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

        {loading ? (
          <div style={{ color: 'var(--muted)' }}>Đang tải dữ liệu...</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 18,
              paddingBottom: 40,
            }}
          >
            {events.map((event) => {
                const audienceCount = Number(event.soldTickets || 0);

                const imageSrc =
                    event.imageUrl ||
                    event.cardImageUrl ||
                    event.image ||
                    event.bannerUrl ||
                    event.posterUrl ||
                    event.thumbnail;

                return (
                <div
                    key={event.id}
                    onClick={() => navigate(`/admin/users/${event.id}`)}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.border = '1px solid var(--accent)';
                        e.currentTarget.style.boxShadow = '0 0 18px rgba(255,107,53,0.35)';
                        e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.border = '1px solid var(--border)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 18,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                    }}
                    >
                  <div
                    style={{
                      height: 140,
                      background: 'var(--nav)',
                      overflow: 'hidden',
                    }}
                  >
                    {imageSrc ? (
                        <img
                            src={imageSrc}
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
                          color: 'var(--muted-2)',
                        }}
                      >
                        Chưa có ảnh
                      </div>
                    )}
                  </div>

                  <div style={{ padding: 16 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 16,
                        lineHeight: 1.4,
                      }}
                    >
                      {event.title}
                    </h3>

                    <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
                      {event.venue || 'TBD'}
                    </p>

                    <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                      {formatDate(event.date)}
                    </p>

                    <div
                      style={{
                        marginTop: 18,
                        padding: 14,
                        borderRadius: 14,
                        background: 'var(--bg-strong)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                        Khán giả đã mua vé
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          color: 'var(--accent)',
                          fontSize: 30,
                          fontWeight: 800,
                        }}
                      >
                        {audienceCount}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}