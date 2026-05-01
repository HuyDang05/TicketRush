import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import eventService from '../../services/event.service';
import AdminLayout from '../../components/shared/AdminLayout';
import './admin.css';

function Toast({ msg, onDone }) {
  useEffect(() => { const id = setTimeout(onDone, 2600); return () => clearTimeout(id); }, [onDone]);
  return <div className="admin-toast">{msg}</div>;
}

function EventModal({ event, onClose, onSaved }) {
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
      } else {
        await eventService.createEvent(payload);
      }
      onSaved(isEdit ? '✓ Đã cập nhật sự kiện!' : '✓ Đã tạo sự kiện mới thành công!');
      onClose();
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

const THUMB_GRADIENTS = [
  'linear-gradient(135deg,#2d1000,#8b3500)',
  'linear-gradient(135deg,#0d2200,#1a4400)',
  'linear-gradient(135deg,#1a1000,#5a3a00)',
  'linear-gradient(135deg,#0a1a2d,#0a3d6b)',
  'linear-gradient(135deg,#1a001a,#6a006a)',
  'linear-gradient(135deg,#1a0010,#6a0040)',
];
const THUMB_EMOJIS = ['🎤', '⚽', '🎷', '🎹', '🎪', '🎭'];

export default function EventManagerPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    eventService.getAdminEvents()
      .then(res => setEvents(res.data?.events || res.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const showToast = msg => { setToast(msg); };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xoá sự kiện này?')) return;
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
  };

  const handlePublish = async (id) => {
    if (!confirm('Bạn có chắc muốn xuất bản sự kiện này?')) return;
    try {
      await eventService.publishEvent(id);
      showToast('✓ Đã xuất bản sự kiện');
      fetchEvents();
    } catch {
      showToast('Không thể xuất bản sự kiện');
    }
  };

  const handleEnd = async (id) => {
    if (!confirm('Bạn có chắc muốn kết thúc sự kiện này?')) return;
    try {
      await eventService.endEvent(id);
      showToast('✓ Đã kết thúc sự kiện');
      fetchEvents();
    } catch {
      showToast('Không thể kết thúc sự kiện');
    }
  };

  const filtered = events.filter(ev => {
    const matchSearch = !search || (ev.title || ev.name || '').toLowerCase().includes(search.toLowerCase());
    const evStatus = ev.status === 'PUBLISHED' ? 'pub' : ev.status === 'DRAFT' ? 'draft' : 'ended';
    const matchStatus = !statusFilter || evStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const pubCount = events.filter(e => e.status === 'PUBLISHED').length;
  const totalSold = events.reduce((s, e) => s + (e._count?.bookings ?? 0), 0);

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
          <StatCard label="Tổng sự kiện" value={events.length} change="+2 tháng này" changeUp />
          <StatCard label="Đang mở bán" value={pubCount} valueColor="#FF6B35" change="Đang hoạt động" />
          <StatCard label="Vé đã bán" value={totalSold.toLocaleString()} change="+18% so với tháng trước" changeUp />
          <StatCard label="Doanh thu tháng" value="624tr đ" valueColor="#FF6B35" change="+24% so với T5" changeUp />
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
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="7" className="admin-table__empty">Không tìm thấy sự kiện nào</td></tr>
                ) : filtered.map((ev, i) => {
                  const name = ev.title || ev.name || 'Sự kiện';
                  const totalSeats = ev.capacity ?? ev.totalSeats ?? 0;
                  const soldSeats = ev._count?.bookings ?? ev.soldSeats ?? 0;
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: THUMB_GRADIENTS[i % THUMB_GRADIENTS.length] }}>
                            {THUMB_EMOJIS[i % THUMB_EMOJIS.length]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, marginBottom: 2 }}>{name}</div>
                            <div style={{ fontSize: 11, color: '#AAAAAA' }}>{ev.category || 'Sự kiện'}</div>
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
            <div style={{ fontSize: 12, color: '#AAAAAA' }}>Hiển thị {filtered.length} trong {events.length} sự kiện</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, '›'].map((p, i) => (
                <button key={i} className={`page-btn${i === 0 ? ' page-btn--active' : ''}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <EventModal
          event={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={msg => { showToast(msg); fetchEvents(); }}
        />
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </AdminLayout>
  );
}
