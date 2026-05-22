import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/shared/AdminLayout';
import api from '../../services/api';
import { css, cx } from "../../lib/runtimeCss";
export default function AdminTicketManagerPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const formatMoney = value => {
    return Number(value || 0).toLocaleString('vi-VN') + 'đ';
  };
  const loadRevenue = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/tickets/events');
      setEvents(res.data.data || []);
    } catch (error) {
      console.error(error);
      alert('Không tải được dữ liệu doanh thu');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadRevenue();
  }, []);
  const filteredEvents = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return events;
    return events.filter(event => event.title?.toLowerCase().includes(q));
  }, [events, keyword]);
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedEvents = filteredEvents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  useEffect(() => {
    setPage(1);
  }, [keyword]);
  const totalSold = filteredEvents.reduce((sum, event) => sum + Number(event.soldTickets || 0), 0);
  const totalRevenue = filteredEvents.reduce((sum, event) => sum + Number(event.totalRevenue || 0), 0);
  return <AdminLayout>
      <div className={css({
      padding: 32,
      color: 'var(--text)',
      height: '100vh',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }, "AdminTicketManagerPage")}>
        <div className={css({
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        alignItems: 'center',
        marginBottom: 24
      }, "AdminTicketManagerPage")}>
          <div>
            <h1 className={css({
            margin: 0,
            fontSize: 28
          }, "AdminTicketManagerPage")}>Doanh thu</h1>
            <p className={css({
            marginTop: 8,
            color: 'var(--muted)'
          }, "AdminTicketManagerPage")}>
              Theo dõi số vé đã bán, vé còn lại và tổng doanh thu của từng sự kiện.
            </p>
          </div>

          <button onClick={loadRevenue} className={css({
          background: 'var(--accent)',
          border: 'none',
          color: 'var(--text)',
          padding: '10px 16px',
          borderRadius: 10,
          fontWeight: 700,
          cursor: 'pointer'
        }, "AdminTicketManagerPage")}>
            Làm mới
          </button>
        </div>

        <div className={css({
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 16,
        marginBottom: 24
      }, "AdminTicketManagerPage")}>
          <div className={css(statCardStyle, "AdminTicketManagerPage")}>
            <div className={css(statLabelStyle, "AdminTicketManagerPage")}>Vé đã bán</div>
            <div className={css(statValueStyle, "AdminTicketManagerPage")}>{totalSold}</div>
          </div>

          <div className={css(statCardStyle, "AdminTicketManagerPage")}>
            <div className={css(statLabelStyle, "AdminTicketManagerPage")}>Tổng doanh thu</div>
            <div className={css({
            ...statValueStyle,
            color: 'var(--accent)'
          }, "AdminTicketManagerPage")}>
              {formatMoney(totalRevenue)}
            </div>
          </div>
        </div>

        <div className={css({
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        overflow: 'hidden'
      }, "AdminTicketManagerPage")}>
          <div className={css({
          padding: 20,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'center',
          borderBottom: '1px solid var(--border)'
        }, "AdminTicketManagerPage")}>
            <h2 className={css({
            margin: 0,
            fontSize: 20
          }, "AdminTicketManagerPage")}>
              Bảng doanh thu sự kiện
            </h2>

            <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Tìm sự kiện..." className={css({
            width: 280,
            background: 'var(--nav)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '10px 12px',
            borderRadius: 10,
            outline: 'none'
          }, "AdminTicketManagerPage")} />
          </div>

          <div className={css({
          overflowX: 'auto'
        }, "AdminTicketManagerPage")}>
            <table className={css({
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 14
          }, "AdminTicketManagerPage")}>
              <thead>
                <tr className={css({
                background: 'var(--bg-strong)'
              }, "AdminTicketManagerPage")}>
                  <th className={css(thStyle, "AdminTicketManagerPage")}>Tên sự kiện</th>
                  <th className={css(thStyle, "AdminTicketManagerPage")}>Tổng số vé</th>
                  <th className={css(thStyle, "AdminTicketManagerPage")}>Số vé đã bán</th>
                  <th className={css(thStyle, "AdminTicketManagerPage")}>Số vé còn lại</th>
                  <th className={css(thStyle, "AdminTicketManagerPage")}>Tổng doanh thu</th>
                </tr>
              </thead>

              <tbody>
                {loading ? <tr>
                    <td colSpan="5" className={css(emptyStyle, "AdminTicketManagerPage")}>
                      Đang tải dữ liệu...
                    </td>
                  </tr> : filteredEvents.length === 0 ? <tr>
                    <td colSpan="5" className={css(emptyStyle, "AdminTicketManagerPage")}>
                      Không có dữ liệu doanh thu
                    </td>
                  </tr> : paginatedEvents.map(event => <tr key={event.id} className={css({
                borderBottom: '1px solid var(--border)'
              }, "AdminTicketManagerPage")}>
                      <td className={css(tdStyle, "AdminTicketManagerPage")}>
                        <div className={css({
                    fontWeight: 700
                  }, "AdminTicketManagerPage")}>
                          {event.title}
                        </div>
                        <div className={css({
                    color: 'var(--muted)',
                    fontSize: 13,
                    marginTop: 4
                  }, "AdminTicketManagerPage")}>
                          {event.venue || 'TBD'}
                        </div>
                      </td>

                      <td className={css(tdStyle, "AdminTicketManagerPage")}>
                        {Number(event.totalTickets || 0).toLocaleString('vi-VN')}
                      </td>

                      <td className={css({
                  ...tdStyle,
                  color: 'var(--success)',
                  fontWeight: 700
                }, "AdminTicketManagerPage")}>
                        {Number(event.soldTickets || 0).toLocaleString('vi-VN')}
                      </td>

                      <td className={css({
                  ...tdStyle,
                  color: 'var(--accent)',
                  fontWeight: 700
                }, "AdminTicketManagerPage")}>
                        {Number(event.availableTickets || 0).toLocaleString('vi-VN')}
                      </td>

                      <td className={css({
                  ...tdStyle,
                  fontWeight: 800
                }, "AdminTicketManagerPage")}>
                        {formatMoney(event.totalRevenue)}
                      </td>
                    </tr>)}
              </tbody>
            </table>

            <div className={css({
            padding: '14px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }, "AdminTicketManagerPage")}>
              <div className={css({
              fontSize: 12,
              color: 'var(--muted)'
            }, "AdminTicketManagerPage")}>
                Hiển thị {filteredEvents.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}
                –
                {Math.min(safePage * PAGE_SIZE, filteredEvents.length)}
                {' '}trong {filteredEvents.length} sự kiện
              </div>

              <div className={css({
              display: 'flex',
              gap: 6,
              alignItems: 'center'
            }, "AdminTicketManagerPage")}>
                <button className={css(pageBtnStyle, "AdminTicketManagerPage")} disabled={safePage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  ‹
                </button>

                {(() => {
                const pages = [];
                const delta = 1;
                const left = Math.max(1, safePage - delta);
                const right = Math.min(totalPages, safePage + delta);
                if (left > 1) {
                  pages.push(1);
                  if (left > 2) pages.push('...');
                }
                for (let p = left; p <= right; p++) pages.push(p);
                if (right < totalPages) {
                  if (right < totalPages - 1) pages.push('...');
                  pages.push(totalPages);
                }
                return pages.map((p, index) => p === '...' ? <span key={index} className={css({
                  color: 'var(--muted-2)',
                  padding: '0 4px'
                }, "AdminTicketManagerPage")}>
                        ...
                      </span> : <button key={p} onClick={() => setPage(p)} className={css({
                  ...pageBtnStyle,
                  background: p === safePage ? 'var(--accent)' : 'var(--bg-strong)',
                  color: p === safePage ? 'var(--text)' : 'var(--muted)',
                  borderColor: p === safePage ? 'var(--accent)' : 'var(--border)'
                }, "AdminTicketManagerPage")}>
                        {p}
                      </button>);
              })()}

                <button className={css(pageBtnStyle, "AdminTicketManagerPage")} disabled={safePage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>;
}
const statCardStyle = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 18,
  padding: 20
};
const statLabelStyle = {
  color: 'var(--muted)',
  fontSize: 13,
  textTransform: 'uppercase',
  fontWeight: 700
};
const statValueStyle = {
  marginTop: 10,
  color: 'var(--text)',
  fontSize: 32,
  fontWeight: 800
};
const thStyle = {
  textAlign: 'left',
  padding: '14px 12px',
  color: 'var(--muted)',
  fontSize: 12,
  textTransform: 'uppercase'
};
const tdStyle = {
  padding: '16px 12px',
  color: 'var(--text)'
};
const emptyStyle = {
  padding: 28,
  color: 'var(--muted)',
  textAlign: 'center'
};
const pageBtnStyle = {
  minWidth: 34,
  height: 34,
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-strong)',
  color: 'var(--muted)',
  cursor: 'pointer'
};
