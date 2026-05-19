import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/shared/AdminLayout';
import api from '../../services/api';

export default function AdminTicketManagerPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const formatMoney = (value) => {
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

    return events.filter((event) =>
      event.title?.toLowerCase().includes(q)
    );
  }, [events, keyword]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));

  const safePage = Math.min(page, totalPages);

  const paginatedEvents = filteredEvents.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const totalSold = filteredEvents.reduce(
    (sum, event) => sum + Number(event.soldTickets || 0),
    0
  );

  const totalRevenue = filteredEvents.reduce(
    (sum, event) => sum + Number(event.totalRevenue || 0),
    0
  );

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
            <h1 style={{ margin: 0, fontSize: 28 }}>Doanh thu</h1>
            <p style={{ marginTop: 8, color: '#aaa' }}>
              Theo dõi số vé đã bán, vé còn lại và tổng doanh thu của từng sự kiện.
            </p>
          </div>

          <button
            onClick={loadRevenue}
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
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Vé đã bán</div>
            <div style={statValueStyle}>{totalSold}</div>
          </div>

          <div style={statCardStyle}>
            <div style={statLabelStyle}>Tổng doanh thu</div>
            <div style={{ ...statValueStyle, color: '#ff6b35' }}>
              {formatMoney(totalRevenue)}
            </div>
          </div>
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
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'center',
              borderBottom: '1px solid #333',
            }}
          >
            <h2 style={{ margin: 0, fontSize: 20 }}>
              Bảng doanh thu sự kiện
            </h2>

            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm sự kiện..."
              style={{
                width: 280,
                background: '#111',
                border: '1px solid #333',
                color: '#fff',
                padding: '10px 12px',
                borderRadius: 10,
                outline: 'none',
              }}
            />
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
                  <th style={thStyle}>Tên sự kiện</th>
                  <th style={thStyle}>Tổng số vé</th>
                  <th style={thStyle}>Số vé đã bán</th>
                  <th style={thStyle}>Số vé còn lại</th>
                  <th style={thStyle}>Tổng doanh thu</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={emptyStyle}>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={emptyStyle}>
                      Không có dữ liệu doanh thu
                    </td>
                  </tr>
                ) : (
                  paginatedEvents.map((event) => (
                    <tr
                      key={event.id}
                      style={{ borderBottom: '1px solid #333' }}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700 }}>
                          {event.title}
                        </div>
                        <div style={{ color: '#aaa', fontSize: 13, marginTop: 4 }}>
                          {event.venue || 'TBD'}
                        </div>
                      </td>

                      <td style={tdStyle}>
                        {Number(event.totalTickets || 0).toLocaleString('vi-VN')}
                      </td>

                      <td style={{ ...tdStyle, color: '#4ade80', fontWeight: 700 }}>
                        {Number(event.soldTickets || 0).toLocaleString('vi-VN')}
                      </td>

                      <td style={{ ...tdStyle, color: '#ff6b35', fontWeight: 700 }}>
                        {Number(event.availableTickets || 0).toLocaleString('vi-VN')}
                      </td>

                      <td style={{ ...tdStyle, fontWeight: 800 }}>
                        {formatMoney(event.totalRevenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div
              style={{
                padding: '14px 16px',
                borderTop: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 12, color: '#aaa' }}>
                Hiển thị {filteredEvents.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}
                –
                {Math.min(safePage * PAGE_SIZE, filteredEvents.length)}
                {' '}trong {filteredEvents.length} sự kiện
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  style={pageBtnStyle}
                  disabled={safePage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
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

                  return pages.map((p, index) =>
                    p === '...' ? (
                      <span key={index} style={{ color: '#777', padding: '0 4px' }}>
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        style={{
                          ...pageBtnStyle,
                          background: p === safePage ? '#ff6b35' : '#151515',
                          color: p === safePage ? '#fff' : '#aaa',
                          borderColor: p === safePage ? '#ff6b35' : '#333',
                        }}
                      >
                        {p}
                      </button>
                    )
                  );
                })()}

                <button
                  style={pageBtnStyle}
                  disabled={safePage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

const statCardStyle = {
  background: '#202020',
  border: '1px solid #333',
  borderRadius: 18,
  padding: 20,
};

const statLabelStyle = {
  color: '#aaa',
  fontSize: 13,
  textTransform: 'uppercase',
  fontWeight: 700,
};

const statValueStyle = {
  marginTop: 10,
  color: '#fff',
  fontSize: 32,
  fontWeight: 800,
};

const thStyle = {
  textAlign: 'left',
  padding: '14px 12px',
  color: '#aaa',
  fontSize: 12,
  textTransform: 'uppercase',
};

const tdStyle = {
  padding: '16px 12px',
  color: '#fff',
};

const emptyStyle = {
  padding: 28,
  color: '#aaa',
  textAlign: 'center',
};

const pageBtnStyle = {
  minWidth: 34,
  height: 34,
  borderRadius: 8,
  border: '1px solid #333',
  background: '#151515',
  color: '#aaa',
  cursor: 'pointer',
};