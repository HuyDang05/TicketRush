import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import eventService from '../../services/event.service';
import AdminLayout from '../../components/shared/AdminLayout';

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => { const id = setTimeout(onDone, 2600); return () => clearTimeout(id); }, [onDone]);
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      background: '#1e1e1e', border: '1px solid #FF6B35', borderRadius: 8,
      padding: '11px 22px', color: '#fff', fontSize: 13, fontWeight: 600,
      zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,.5)',
    }}>{msg}</div>
  );
}

// ─── Create/Edit Modal ────────────────────────────────────────────────────────
function EventModal({ event, onClose, onSaved }) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    name: event?.name || '',
    date: event?.date ? event.date.slice(0, 10) : '',
    time: event?.date ? event.date.slice(11, 16) : '',
    location: event?.location || '',
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
        name: form.name.trim(),
        date: form.date && form.time ? `${form.date}T${form.time}:00` : form.date,
        location: form.location.trim(),
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

  const inputStyle = {
    width: '100%', background: '#1A1A1A', border: '1px solid #333333',
    borderRadius: 8, padding: '10px 14px', color: '#fff',
    fontFamily: 'inherit', fontSize: 13, outline: 'none',
  };
  const labelStyle = { display: 'block', fontSize: 12, color: '#AAAAAA', fontWeight: 700, marginBottom: 6, letterSpacing: .3 };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: '#242424', border: '1px solid #333333', borderRadius: 16,
        width: 520, maxHeight: '90vh', overflowY: 'auto', padding: '28px 28px 24px',
        position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,.6)',
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, width: 28, height: 28, background: 'transparent', border: 'none', cursor: 'pointer', color: '#AAAAAA', fontSize: 17, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = '#AAAAAA'}
        >✕</button>

        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, paddingRight: 24 }}>
          {isEdit ? '✦ Chỉnh sửa sự kiện' : '✦ Tạo sự kiện mới'}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Tên sự kiện</label>
          <input style={inputStyle} placeholder="Vd: Đêm nhạc Mỹ Tâm 2026" value={form.name} onChange={e => set('name', e.target.value)}
            onFocus={e => e.target.style.borderColor = '#FF6B35'} onBlur={e => e.target.style.borderColor = '#333333'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Ngày tổ chức</label>
            <input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={form.date} onChange={e => set('date', e.target.value)}
              onFocus={e => e.target.style.borderColor = '#FF6B35'} onBlur={e => e.target.style.borderColor = '#333333'} />
          </div>
          <div>
            <label style={labelStyle}>Giờ bắt đầu</label>
            <input style={{ ...inputStyle, colorScheme: 'dark' }} type="time" value={form.time} onChange={e => set('time', e.target.value)}
              onFocus={e => e.target.style.borderColor = '#FF6B35'} onBlur={e => e.target.style.borderColor = '#333333'} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Địa điểm</label>
          <input style={inputStyle} placeholder="Vd: SVĐ Mỹ Đình, Hà Nội" value={form.location} onChange={e => set('location', e.target.value)}
            onFocus={e => e.target.style.borderColor = '#FF6B35'} onBlur={e => e.target.style.borderColor = '#333333'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Thể loại</label>
            <select style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }} value={form.category} onChange={e => set('category', e.target.value)}
              onFocus={e => e.target.style.borderColor = '#FF6B35'} onBlur={e => e.target.style.borderColor = '#333333'}>
              {['Âm nhạc', 'Thể thao', 'Sân khấu', 'Hội thảo', 'Lễ hội'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Mô tả ngắn</label>
            <input style={inputStyle} placeholder="Mô tả sự kiện..." value={form.description} onChange={e => set('description', e.target.value)}
              onFocus={e => e.target.style.borderColor = '#FF6B35'} onBlur={e => e.target.style.borderColor = '#333333'} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: 11, background: 'transparent', border: '1px solid #333333', borderRadius: 8, color: '#AAAAAA', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#333333'; e.currentTarget.style.color = '#AAAAAA'; }}
          >Hủy</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 2, padding: 11, background: saving ? '#c45a2a' : '#FF6B35', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#e85a24'; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#FF6B35'; }}
          >{saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi →' : 'Tạo sự kiện →'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, valueColor, change, changeUp }) {
  return (
    <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, padding: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -30, right: -20, width: 80, height: 80, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,107,53,.08), transparent 70%)',
      }} />
      <div style={{ fontSize: 12, color: '#AAAAAA', fontWeight: 600, marginBottom: 10, letterSpacing: .3 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, marginBottom: 8, color: valueColor || '#fff' }}>{value}</div>
      {change && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: changeUp ? '#22c55e' : '#AAAAAA' }}>
          {changeUp && <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6"/></svg>}
          {change}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
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
  const [modal, setModal] = useState(null); // null | 'create' | event-object
  const [toast, setToast] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    eventService.getEvents()
      .then(res => setEvents(res.data || []))
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

  const filtered = events.filter(ev => {
    const matchSearch = !search || (ev.name || ev.title || '').toLowerCase().includes(search.toLowerCase());
    const evStatus = ev.status === 'PUBLISHED' ? 'pub' : ev.status === 'DRAFT' ? 'draft' : 'ended';
    const matchStatus = !statusFilter || evStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const pubCount = events.filter(e => e.status === 'PUBLISHED').length;
  const totalSold = events.reduce((s, e) => s + (e._count?.bookings ?? 0), 0);

  const getStatusBadge = (status) => {
    if (status === 'PUBLISHED') return { cls: { background: '#0F2A1A', color: '#22c55e' }, label: 'Đang mở bán' };
    if (status === 'DRAFT') return { cls: { background: 'rgba(170,170,170,.08)', color: '#AAAAAA', border: '1px solid #333333' }, label: 'Bản nháp' };
    return { cls: { background: 'rgba(80,80,80,.15)', color: '#555' }, label: 'Đã kết thúc' };
  };

  const ActBtn = ({ title, hoverStyle, onClick, children }) => (
    <button
      title={title}
      onClick={onClick}
      style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #333333', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#AAAAAA', transition: 'all .2s' }}
      onMouseEnter={e => Object.assign(e.currentTarget.style, hoverStyle)}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#333333'; e.currentTarget.style.color = '#AAAAAA'; e.currentTarget.style.background = 'transparent'; }}
    >{children}</button>
  );

  return (
    <AdminLayout>
      {/* Top bar */}
      <div style={{ background: '#111111', borderBottom: '1px solid #333333', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 13, color: '#AAAAAA', display: 'flex', alignItems: 'center', gap: 6 }}>
          Admin <span style={{ opacity: .4 }}>/</span> <span style={{ color: '#fff', fontWeight: 600 }}>Quản lý sự kiện</span>
        </div>
        <button
          onClick={() => setModal('create')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#FF6B35', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, padding: '9px 18px', cursor: 'pointer', boxShadow: '0 2px 12px rgba(255,107,53,.3)', transition: 'background .2s, transform .15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#e85a24'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FF6B35'; e.currentTarget.style.transform = 'none'; }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Tạo sự kiện mới
        </button>
      </div>

      {/* Scroll area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard label="Tổng sự kiện" value={events.length} change="+2 tháng này" changeUp />
          <StatCard label="Đang mở bán" value={pubCount} valueColor="#FF6B35" change="Đang hoạt động" />
          <StatCard label="Vé đã bán" value={totalSold.toLocaleString()} change="+18% so với tháng trước" changeUp />
          <StatCard label="Doanh thu tháng" value="624tr đ" valueColor="#FF6B35" change="+24% so với T5" changeUp />
        </div>

        {/* Table card */}
        <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #333333' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Danh sách sự kiện</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm sự kiện..."
                  style={{ background: '#1A1A1A', border: '1px solid #333333', borderRadius: 8, padding: '8px 36px 8px 14px', color: '#fff', fontFamily: 'inherit', fontSize: 13, outline: 'none', width: 200 }}
                  onFocus={e => e.target.style.borderColor = '#FF6B35'}
                  onBlur={e => e.target.style.borderColor = '#333333'}
                />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#AAAAAA', pointerEvents: 'none' }}>
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>
                </span>
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  background: '#1A1A1A', border: '1px solid #333333', borderRadius: 8,
                  padding: '8px 30px 8px 14px', color: '#fff', fontFamily: 'inherit', fontSize: 13,
                  outline: 'none', cursor: 'pointer', appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23AAAAAA' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                }}
              >
                <option value="">Tất cả</option>
                <option value="pub">Đang mở bán</option>
                <option value="draft">Bản nháp</option>
                <option value="ended">Đã kết thúc</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ background: '#1A1A1A' }}>
                  {['Sự kiện', 'Ngày', 'Địa điểm', 'Trạng thái', 'Vé bán', 'Doanh thu', 'Thao tác'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#AAAAAA', letterSpacing: .8, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: '#AAAAAA', fontSize: 13 }}>Đang tải...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: '#AAAAAA', fontSize: 13 }}>Không tìm thấy sự kiện nào</td></tr>
                ) : filtered.map((ev, i) => {
                  const name = ev.name || ev.title || 'Sự kiện';
                  const sold = ev._count?.bookings ?? 0;
                  const total = ev.capacity ?? 0;
                  const pct = total ? Math.round(sold / total * 100) : 0;
                  const revenue = (sold * (ev.zones?.[0]?.price ?? 0));
                  const badge = getStatusBadge(ev.status);
                  const isDeleting = deletingId === ev.id;

                  return (
                    <tr
                      key={ev.id}
                      style={{ borderTop: '1px solid rgba(255,255,255,.04)', cursor: 'pointer', transition: 'background .15s', opacity: isDeleting ? 0.4 : 1 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => navigate(`/admin/events/${ev.id}/edit`)}
                    >
                      <td style={{ padding: '14px 16px', fontSize: 13, verticalAlign: 'middle' }}>
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
                      <td style={{ padding: '14px 16px', color: '#AAAAAA', whiteSpace: 'nowrap', fontSize: 12, verticalAlign: 'middle' }}>
                        {ev.date ? new Date(ev.date).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#AAAAAA', fontSize: 12, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        {ev.location || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 5, letterSpacing: .3, whiteSpace: 'nowrap', ...badge.cls }}>{badge.label}</span>
                      </td>
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ minWidth: 100 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                            <span style={{ fontWeight: 700 }}>{sold.toLocaleString()}</span>
                            <span style={{ color: '#AAAAAA' }}>/ {total > 0 ? total.toLocaleString() : '—'}</span>
                          </div>
                          <div style={{ height: 4, background: '#333333', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? '#22c55e' : '#FF6B35', borderRadius: 2 }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700 }}>{revenue > 0 ? revenue.toLocaleString('vi-VN') + 'đ' : '—'}</div>
                        {ev.status !== 'DRAFT' && total > 0 && (
                          <div style={{ fontSize: 11, color: '#AAAAAA', marginTop: 2 }}>{pct}% đạt mục tiêu</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          <ActBtn title="Xem" hoverStyle={{ borderColor: 'rgba(255,255,255,.25)', color: '#fff', background: 'rgba(255,255,255,.05)' }} onClick={() => navigate(`/event/${ev.id}`)}>
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </ActBtn>
                          <ActBtn title="Chỉnh sửa" hoverStyle={{ borderColor: '#FF6B35', color: '#FF6B35', background: 'rgba(255,107,53,.08)' }} onClick={() => setModal(ev)}>
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </ActBtn>
                          <ActBtn title="Xóa" hoverStyle={{ borderColor: '#f87171', color: '#f87171', background: 'rgba(239,68,68,.08)' }} onClick={() => handleDelete(ev.id)}>
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                          </ActBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 24px', borderTop: '1px solid #333333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: '#AAAAAA' }}>Hiển thị {filtered.length} trong {events.length} sự kiện</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, '›'].map((p, i) => (
                <button key={i} style={{
                  width: 32, height: 32, borderRadius: 6, border: `1px solid ${i === 0 ? '#FF6B35' : '#333333'}`,
                  background: i === 0 ? '#FF6B35' : 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: i === 0 ? 700 : 400,
                  color: i === 0 ? '#fff' : '#AAAAAA',
                }}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <EventModal
          event={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={msg => { showToast(msg); fetchEvents(); }}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </AdminLayout>
  );
}
