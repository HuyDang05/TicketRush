import { useEffect, useState } from 'react';
import AdminLayout from '../../components/shared/AdminLayout';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { css, cx, setNodeCss } from "../../lib/runtimeCss";
export default function AdminAudiencePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const formatDate = value => {
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
  return <AdminLayout>
      <div className={css({
      padding: 32,
      color: 'var(--text)',
      height: '100vh',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }, "AdminAudiencePage")}>
        <div className={css({
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        alignItems: 'center',
        marginBottom: 24
      }, "AdminAudiencePage")}>
          <div>
            <h1 className={css({
            margin: 0,
            fontSize: 28
          }, "AdminAudiencePage")}>Quản lý khán giả</h1>
            <p className={css({
            marginTop: 8,
            color: 'var(--muted)'
          }, "AdminAudiencePage")}>
              Theo dõi số lượng khán giả đã mua vé theo từng sự kiện.
            </p>
          </div>

          <button onClick={loadEvents} className={css({
          background: 'var(--accent)',
          border: 'none',
          color: 'var(--text)',
          padding: '10px 16px',
          borderRadius: 10,
          fontWeight: 700,
          cursor: 'pointer'
        }, "AdminAudiencePage")}>
            Làm mới
          </button>
        </div>

        <h2 className={css({
        fontSize: 18,
        marginBottom: 14
      }, "AdminAudiencePage")}>Danh sách sự kiện</h2>

        {loading ? <div className={css({
        color: 'var(--muted)'
      }, "AdminAudiencePage")}>Đang tải dữ liệu...</div> : <div className={css({
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 18,
        paddingBottom: 40
      }, "AdminAudiencePage")}>
            {events.map(event => {
          const audienceCount = Number(event.soldTickets || 0);
          const imageSrc = event.imageUrl || event.cardImageUrl || event.image || event.bannerUrl || event.posterUrl || event.thumbnail;
          return <div key={event.id} onClick={() => navigate(`/admin/users/${event.id}`)} onMouseEnter={e => {
setNodeCss(e.currentTarget, { border: '1px solid var(--accent)' }, 'border');
setNodeCss(e.currentTarget, { boxShadow: '0 0 18px rgba(255,107,53,0.35)' }, 'boxShadow');
setNodeCss(e.currentTarget, { transform: 'translateY(-4px)' }, 'transform');
          }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { border: '1px solid var(--border)' }, 'border');
setNodeCss(e.currentTarget, { boxShadow: 'none' }, 'boxShadow');
setNodeCss(e.currentTarget, { transform: 'translateY(0)' }, 'transform');
          }} className={css({
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'all 0.25s ease'
          }, "AdminAudiencePage")}>
                  <div className={css({
              height: 140,
              background: 'var(--nav)',
              overflow: 'hidden'
            }, "AdminAudiencePage")}>
                    {imageSrc ? <img src={imageSrc} alt={event.title} className={css({
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }, "AdminAudiencePage")} /> : <div className={css({
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted-2)'
              }, "AdminAudiencePage")}>
                        Chưa có ảnh
                      </div>}
                  </div>

                  <div className={css({
              padding: 16
            }, "AdminAudiencePage")}>
                    <h3 className={css({
                margin: 0,
                fontSize: 16,
                lineHeight: 1.4
              }, "AdminAudiencePage")}>
                      {event.title}
                    </h3>

                    <p className={css({
                color: 'var(--muted)',
                fontSize: 13,
                marginTop: 8
              }, "AdminAudiencePage")}>
                      {event.venue || 'TBD'}
                    </p>

                    <p className={css({
                color: 'var(--muted)',
                fontSize: 13
              }, "AdminAudiencePage")}>
                      {formatDate(event.date)}
                    </p>

                    <div className={css({
                marginTop: 18,
                padding: 14,
                borderRadius: 14,
                background: 'var(--bg-strong)',
                border: '1px solid var(--border)'
              }, "AdminAudiencePage")}>
                      <div className={css({
                  color: 'var(--muted)',
                  fontSize: 12
                }, "AdminAudiencePage")}>
                        Khán giả đã mua vé
                      </div>

                      <div className={css({
                  marginTop: 6,
                  color: 'var(--accent)',
                  fontSize: 30,
                  fontWeight: 800
                }, "AdminAudiencePage")}>
                        {audienceCount}
                      </div>
                    </div>
                  </div>
                </div>;
        })}
          </div>}
      </div>
    </AdminLayout>;
}
