import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import eventService from '../../services/event.service';
import AdminLayout from '../../components/shared/AdminLayout';
import './admin.css';
import useModalStore from '../../store/modalStore';


function Toast({ msg, onDone }) {
  useEffect(() => { const id = setTimeout(onDone, 2600); return () => clearTimeout(id); }, [onDone]);
  return <div className="admin-toast">{msg}</div>;
}

function EventModal({ event, onClose, onSaved, onCreated }) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    name: event?.title || event?.name || '',
    date: event?.date ? event.date.slice(0, 10) : '',
    time: event?.date ? event.date.slice(11, 16) : '',
    location: event?.venue || event?.location || '',
    category: event?.category || 'Âm nhạc',
    description: event?.description || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.name.trim(),
        date: form.date && form.time ? `${form.date}T${form.time}:00` : form.date,
        venue: form.location.trim(),
        category: form.category,
        description: form.description.trim(),
      };
      if (isEdit) {
        await eventService.updateEvent(event.id, payload);
        onSaved('✓ Đã cập nhật sự kiện!');
        onClose();
      } else {
        const res = await eventService.createEvent(payload);
        const newId = res.data?.event?.id || res.data?.id;
        onSaved('✓ Đã tạo sự kiện mới thành công!');
        onClose();
        if (newId && onCreated) onCreated(newId);
      }
    } catch {
      // keep modal open on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-title">
          {isEdit ? '✦ Chỉnh sửa sự kiện' : '✦ Tạo sự kiện mới'}
        </div>

        <div className="event-form-field">
          <label className="event-form-label">Tên sự kiện</label>
          <input className="event-form-input" placeholder="Vd: Đêm nhạc Mỹ Tâm 2026" value={form.name} onChange={e => set('name', e.target.value)}
            onFocus={e => e.target.style.borderColor = '#FF6B35'} onBlur={e => e.target.style.borderColor = '#333333'} />
        </div>

        <div className="event-form-grid">
          <div className="event-form-field">
            <label className="event-form-label">Ngày tổ chức</label>
            <input className="event-form-input" style={{ colorScheme: 'dark' }} type="date" value={form.date} onChange={e => set('date', e.target.value)}
              onFocus={e => e.target.style.borderColor = '#FF6B35'} onBlur={e => e.target.style.borderColor = '#333333'} />
          </div>
          <div className="event-form-field">
            <label className="event-form-label">Giờ bắt đầu</label>
            <input className="event-form-input" style={{ colorScheme: 'dark' }} type="time" value={form.time} onChange={e => set('time', e.target.value)}
              onFocus={e => e.target.style.borderColor = '#FF6B35'} onBlur={e => e.target.style.borderColor = '#333333'} />
          </div>
        </div>

        <div className="event-form-field">
          <label className="event-form-label">Địa điểm</label>
          <input className="event-form-input" placeholder="Vd: SVĐ Mỹ Đình, Hà Nội" value={form.location} onChange={e => set('location', e.target.value)}
            onFocus={e => e.target.style.borderColor = '#FF6B35'} onBlur={e => e.target.style.borderColor = '#333333'} />
        </div>

        <div className="event-form-grid">
          <div className="event-form-field">
            <label className="event-form-label">Thể loại</label>
            <select className="event-form-input event-form-select" value={form.category} onChange={e => set('category', e.target.value)}
              onFocus={e => e.target.style.borderColor = '#FF6B35'} onBlur={e => e.target.style.borderColor = '#333333'}>
              {['Âm nhạc', 'Thể thao', 'Sân khấu', 'Hội thảo', 'Lễ hội'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="event-form-field">
            <label className="event-form-label">Mô tả ngắn</label>
            <input className="event-form-input" placeholder="Mô tả sự kiện..." value={form.description} onChange={e => set('description', e.target.value)}
              onFocus={e => e.target.style.borderColor = '#FF6B35'} onBlur={e => e.target.style.borderColor = '#333333'} />
          </div>
        </div>

        <div className="event-form-actions">
          <button className="btn-ghost" onClick={onClose}>Hủy</button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 2, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi →' : 'Tạo sự kiện →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, valueColor, change, changeUp }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-card__glow" />
      <div className="admin-stat-card__label">{label}</div>
      <div className="admin-stat-card__value" style={{ color: valueColor || '#fff' }}>{value}</div>
      {change && (
        <div className="admin-stat-card__change" style={{ color: changeUp ? '#22c55e' : '#AAAAAA' }}>
          {changeUp && <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6"/></svg>}
          {change}
        </div>
      )}
    </div>
  );
}

export default function EventManagerPage() {
  const navigate = useNavigate();
  const { openModal } = useModalStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;

  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Reset về trang 1 khi search/filter thay đổi
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const fetchEvents = useCallback(async (overridePage) => {
    setLoading(true);
    try {
      const currentPage = overridePage ?? page;
      const res = await eventService.getAdminEvents({
        page: currentPage,
        limit: PAGE_SIZE,
        ...(search     && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const data = res.data;
      setEvents(data?.events || []);
      setTotal(data?.total ?? 0);
      setTotalPages(data?.totalPages ?? 1);
    } catch {
      setEvents([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);



  const showToast = msg => { setToast(msg); };

  const handleDelete = (id) => {
    openModal({
      title: 'Xóa sự kiện?',
      content: 'Bạn có chắc chắn muốn xóa sự kiện này không? Hành động này không thể hoàn tác.',
      type: 'error',
      confirmText: 'Xóa',
      onConfirm: async () => {
        setDeletingId(id);
        try {
          await eventService.deleteEvent(id);
          setEvents(prev => prev.filter(e => e.id !== id));
          showToast('✓ Đã xoá sự kiện');
        } catch {
          showToast('Không thể xoá sự kiện');
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const handlePublish = (id) => {
    openModal({
      title: 'Xuất bản sự kiện?',
      content: 'Bạn có chắc chắn muốn xuất bản sự kiện này để người dùng có thể thấy và mua vé không?',
      type: 'info',
      confirmText: 'Xuất bản',
      onConfirm: async () => {
        try {
          await eventService.publishEvent(id);
          showToast('✓ Đã xuất bản sự kiện');
          fetchEvents();
        } catch {
          showToast('Không thể xuất bản sự kiện');
        }
      }
    });
  };

  const handleEnd = (id) => {
    openModal({
      title: 'Kết thúc sự kiện?',
      content: 'Bạn có chắc chắn muốn kết thúc sự kiện này không? Người dùng sẽ không thể tiếp tục mua vé.',
      type: 'warning',
      confirmText: 'Kết thúc',
      onConfirm: async () => {
        try {
          await eventService.endEvent(id);
          showToast('✓ Đã kết thúc sự kiện');
          fetchEvents();
        } catch {
          showToast('Không thể kết thúc sự kiện');
        }
      }
    });
  };

  const pubCount = events.filter(e => e.status === 'PUBLISHED').length;
  const totalSold  = events.reduce((s, e) => s + Number(e.soldSeats || 0), 0);
  const safePage   = page;

  const formatRevenue = (n) => {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'tỷ đ';
    if (n >= 1_000_000) return Math.round(n / 1_000_000) + 'tr đ';
    if (n >= 1_000) return Math.round(n / 1_000) + 'k đ';
    return Number(n || 0).toLocaleString('vi-VN') + 'đ';
  };

  const getStatusBadge = (status) => {
    if (status === 'DRAFT') return { label: 'DRAFT', style: { background: 'rgba(156,163,175,.15)', color: '#9CA3AF', border: '1px solid rgba(156,163,175,.35)' } };
    if (status === 'PUBLISHED') return { label: 'PUBLISHED', style: { background: 'rgba(34,197,94,.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,.35)' } };
    return { label: 'ENDED', style: { background: 'rgba(239,68,68,.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,.35)' } };
  };

  const ActBtn = ({ title, hoverStyle, onClick, children }) => (
    <button
      title={title}
      onClick={onClick}
      className="act-btn"
      onMouseEnter={e => Object.assign(e.currentTarget.style, hoverStyle)}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#333333'; e.currentTarget.style.color = '#AAAAAA'; e.currentTarget.style.background = 'transparent'; }}
    >{children}</button>
  );

  return (
    <AdminLayout>
      <div className="dash-topbar">
        <div className="dash-topbar__breadcrumb">
          Admin <span style={{ opacity: .4 }}>/</span> <span style={{ color: '#fff', fontWeight: 600 }}>Quản lý sự kiện</span>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate('/admin/events/create')}
          style={{ display: 'flex', alignItems: 'center', gap: 7 }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Tạo sự kiện mới
        </button>
      </div>

      <div className="event-manager-scroll">

        <div className="event-manager-stats">
          <StatCard label="Tổng sự kiện" value={total} change="+2 tháng này" changeUp />
          <StatCard label="Đang mở bán" value={pubCount} valueColor="#FF6B35" change="Đang hoạt động" />
          <StatCard label="Vé đã bán" value={totalSold.toLocaleString('vi-VN')} change="+18% so với tháng trước" changeUp />
          <StatCard label="Trang hiện tại" value={`${safePage}/${totalPages}`} valueColor="#FF6B35" change="Server-side pagination" />
        </div>

        <div className="event-manager-table-card">
          <div className="event-manager-table-header">
            <div className="event-manager-table-title">Danh sách sự kiện</div>
            <div className="event-manager-table-controls">
              <div style={{ position: 'relative' }}>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm sự kiện..."
                  className="event-manager-search"
                  onFocus={e => e.target.style.borderColor = '#FF6B35'}
                  onBlur={e => e.target.style.borderColor = '#333333'}
                />
                <span className="event-manager-search-icon">
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>
                </span>
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="event-manager-filter"
              >
                <option value="">Tất cả</option>
                <option value="pub">Đang mở bán</option>
                <option value="draft">Bản nháp</option>
                <option value="ended">Đã kết thúc</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  {['Tên sự kiện', 'Địa điểm', 'Ngày diễn', 'Trạng thái', 'Tổng ghế', 'Số ghế đã bán', 'Thao tác'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="admin-table__empty">Đang tải...</td></tr>
                ) : events.length === 0 ? (
                  <tr><td colSpan="7" className="admin-table__empty">Không tìm thấy sự kiện nào</td></tr>
                ) : events.map((ev) => {
                  const name = ev.title || ev.name || 'Sự kiện';
                  const totalSeats = Number(ev.totalSeats || 0);
                  const soldSeats  = Number(ev.soldSeats  || 0);
                  const badge = getStatusBadge(ev.status);
                  const isDeleting = deletingId === ev.id;

                  return (
                    <tr
                      key={ev.id}
                      style={{ opacity: isDeleting ? 0.4 : 1 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td>
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 13,
                              lineHeight: 1.3,
                              marginBottom: 2,
                            }}
                          >
                            {name}
                          </div>

                          <div
                            style={{
                              fontSize: 11,
                              color: '#AAAAAA',
                            }}
                          >
                            {ev.category || 'Sự kiện'}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#AAAAAA', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {ev.venue || ev.location || '—'}
                      </td>
                      <td style={{ color: '#AAAAAA', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {ev.date ? new Date(ev.date).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td>
                        <span className="admin-status-badge" style={badge.style}>{badge.label}</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {totalSeats > 0 ? totalSeats.toLocaleString('vi-VN') : '—'}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {soldSeats.toLocaleString('vi-VN')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                          <ActBtn
                            title="Xem Dashboard"
                            hoverStyle={{ borderColor: 'rgba(255,255,255,.25)', color: '#fff', background: 'rgba(255,255,255,.05)' }}
                            onClick={() => navigate(`/admin?eventId=${ev.id}`)}
                          >📊</ActBtn>

                          {ev.status === 'DRAFT' && (
                            <ActBtn
                              title="Chỉnh sửa"
                              hoverStyle={{ borderColor: '#FF6B35', color: '#FF6B35', background: 'rgba(255,107,53,.08)' }}
                              onClick={() => navigate(`/admin/events/${ev.id}/edit`)}
                            >✏️</ActBtn>
                          )}

                          {ev.status === 'DRAFT' && (
                            <ActBtn
                              title="Xuất bản"
                              hoverStyle={{ borderColor: '#22C55E', color: '#22C55E', background: 'rgba(34,197,94,.08)' }}
                              onClick={() => handlePublish(ev.id)}
                            >🚀</ActBtn>
                          )}


                          {ev.status === 'PUBLISHED' && (
                            <ActBtn
                              title="Xem sơ đồ chỗ ngồi"
                              hoverStyle={{ borderColor: '#38bdf8', color: '#38bdf8', background: 'rgba(56,189,248,.08)' }}
                              onClick={() => navigate(`/admin/events/${ev.id}/seatmap?view=1`)}
                            >🗺️</ActBtn>
                          )}

                          {ev.status === 'PUBLISHED' && (
                            <ActBtn
                              title="Kết thúc"
                              hoverStyle={{ borderColor: '#EF4444', color: '#EF4444', background: 'rgba(239,68,68,.08)' }}
                              onClick={() => handleEnd(ev.id)}
                            >⛔</ActBtn>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="event-manager-table-footer">
            <div style={{ fontSize: 12, color: '#AAAAAA' }}>
              Hiển thị {total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, total)} trong {total} sự kiện
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* Prev */}
              <button
                className="page-btn"
                disabled={safePage === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{ opacity: safePage === 1 ? 0.35 : 1 }}
              >‹</button>

              {/* Page numbers */}
              {(() => {
                const pages = [];
                const delta = 1;
                const left = Math.max(1, safePage - delta);
                const right = Math.min(totalPages, safePage + delta);

                if (left > 1) {
                  pages.push(1);
                  if (left > 2) pages.push('…');
                }
                for (let p = left; p <= right; p++) pages.push(p);
                if (right < totalPages) {
                  if (right < totalPages - 1) pages.push('…');
                  pages.push(totalPages);
                }
                return pages.map((p, i) =>
                  p === '…'
                    ? <span key={`e${i}`} style={{ color: '#555', fontSize: 13, padding: '0 2px' }}>…</span>
                    : <button
                        key={p}
                        className={`page-btn${p === safePage ? ' page-btn--active' : ''}`}
                        onClick={() => setPage(p)}
                      >{p}</button>
                );
              })()}

              {/* Next */}
              <button
                className="page-btn"
                disabled={safePage === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={{ opacity: safePage === totalPages ? 0.35 : 1 }}
              >›</button>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <EventModal
          event={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={msg => { showToast(msg); fetchEvents(); }}
          onCreated={newId => navigate(`/admin/events/${newId}/seatmap`)}
        />
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </AdminLayout>
  );
}
