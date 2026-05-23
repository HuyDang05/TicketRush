// Purpose: Trang admin quan ly du lieu va thao tac van hanh cua TicketRush.
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import eventService from '../../services/event.service';
import AdminLayout from '../../components/shared/AdminLayout';
import { MAX_DESCRIPTION_LENGTH, MAX_EVENT_TITLE_LENGTH, MAX_PRICE, MAX_VENUE_LENGTH } from '../../utils/inputValidation';
import './admin.css';

// ─── Constants ────────────────────────────────────────────────────────────────
import { css, cx, setNodeCss } from "../../lib/runtimeCss";
import './event-form-inline.css';
const ZONE_COLORS = ['#c8860a', '#3d6828', '#1a4a7a', '#7a1a3a', '#1a5a5a', '#5a1a7a'];
const CAT_EMOJIS = {
  'Âm nhạc': '🎤',
  'Thể thao': '⚽',
  'Sân khấu': '🎭',
  'Hội thảo': '🎙',
  'Lễ hội': '🎪'
};
const CAT_COLORS = {
  'Âm nhạc': 'linear-gradient(135deg,#2d1000,#8b3500)',
  'Thể thao': 'linear-gradient(135deg,#0d2200,#1a4400)',
  'Sân khấu': 'linear-gradient(135deg,#1a0010,#6a0040)',
  'Hội thảo': 'linear-gradient(135deg,#001a2d,#004d8b)',
  'Lễ hội': 'linear-gradient(135deg,#1a001a,#6a006a)'
};
const CATEGORIES = ['Âm nhạc', 'Thể thao', 'Sân khấu', 'Hội thảo', 'Lễ hội'];

// ─── Shared input styles ──────────────────────────────────────────────────────
const INPUT = {
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '11px 16px',
  color: 'var(--text)',
  fontFamily: 'inherit',
  fontSize: 13,
  outline: 'none',
  transition: 'border-color .2s, box-shadow .2s'
};
const LABEL = {
  display: 'block',
  fontSize: 12,
  color: 'var(--muted)',
  fontWeight: 700,
  marginBottom: 7,
  letterSpacing: 0.3
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({
  msg,
  onDone
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className="admin-toast">{msg}</div>;
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({
  label,
  children,
  style
}) {
  return <div className={css({
    marginBottom: 16,
    ...style
  }, "EventFormPage")}>
      <label className={css(LABEL, "EventFormPage")}>{label}</label>
      {children}
    </div>;
}

// ─── Focusable input helpers ──────────────────────────────────────────────────
const focusOn = e => {
setNodeCss(e.target, { borderColor: 'var(--accent)' }, 'borderColor');
setNodeCss(e.target, { boxShadow: '0 0 0 3px rgba(255,107,53,.08)' }, 'boxShadow');
};
const focusOff = e => {
setNodeCss(e.target, { borderColor: 'var(--border)' }, 'borderColor');
setNodeCss(e.target, { boxShadow: 'none' }, 'boxShadow');
};

// ─── Zone Row ─────────────────────────────────────────────────────────────────
function ZoneRow({
  zone,
  onChange,
  onRemove
}) {
  const seats = (zone.rows || 0) * (zone.cols || 0);
  const rev = seats * (zone.price || 0);
  const revStr = rev >= 1e9 ? (rev / 1e9).toFixed(1) + 'tỷ' : rev >= 1e6 ? Math.round(rev / 1e6) + 'tr' : rev.toLocaleString();
  const pillTxt = `= ${seats} ghế · ${revStr}`;
  const miniInput = {
    flex: 1,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '8px 10px',
    color: 'var(--text)',
    fontFamily: 'inherit',
    fontSize: 12,
    outline: 'none',
    transition: 'border-color .2s',
    minWidth: 0
  };
  return <div className={css({
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '14px 16px',
    marginBottom: 10,
    transition: 'border-color .2s'
  }, "EventFormPage")} onMouseEnter={e => setNodeCss(e.currentTarget, { borderColor: 'rgba(120,120,120,0.2)' }, 'borderColor')} onMouseLeave={e => setNodeCss(e.currentTarget, { borderColor: 'var(--border)' }, 'borderColor')}>
      {/* Top row: drag handle, color dot, name, trash */}
      <div className={css({
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12
    }, "EventFormPage")}>
        <svg className={css({
        color: 'var(--border)',
        flexShrink: 0,
        cursor: 'grab'
      }, "EventFormPage")} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01" />
        </svg>
        <div className={css({
        width: 16,
        height: 16,
        borderRadius: 4,
        flexShrink: 0,
        cursor: 'pointer',
        background: zone.color,
        border: '2px solid rgba(120,120,120,0.2)'
      }, "EventFormPage")} />
        <input value={zone.name} onChange={e => onChange('name', e.target.value)} className={css({
        flex: 1,
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        color: 'var(--text)',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 700,
        padding: '4px 0',
        outline: 'none',
        transition: 'border-color .2s'
      }, "EventFormPage")} onFocus={e => setNodeCss(e.target, { borderColor: 'var(--accent)' }, 'borderColor')} onBlur={e => setNodeCss(e.target, { borderColor: 'var(--border)' }, 'borderColor')} />
        <button onClick={onRemove} className={css({
        background: 'transparent',
        border: 'none',
        color: 'var(--muted)',
        cursor: 'pointer',
        padding: 4,
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        transition: 'color .2s, background .2s'
      }, "EventFormPage")} onMouseEnter={e => {
setNodeCss(e.currentTarget, { color: 'var(--danger)' }, 'color');
setNodeCss(e.currentTarget, { background: 'rgba(239,68,68,.08)' }, 'background');
      }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { color: 'var(--muted)' }, 'color');
setNodeCss(e.currentTarget, { background: 'transparent' }, 'background');
      }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
        </button>
      </div>

      {/* Bottom row: rows, cols, price, pill */}
      <div className={css({
      display: 'flex',
      alignItems: 'flex-end',
      gap: 10
    }, "EventFormPage")}>
        {[{
        label: 'Số hàng',
        key: 'rows',
        val: zone.rows,
        min: 1,
        max: 30
      }, {
        label: 'Số ghế/hàng',
        key: 'cols',
        val: zone.cols,
        min: 1,
        max: 50
      }, {
        label: 'Giá vé (đ)',
        key: 'price',
        val: zone.price,
        min: 0,
        step: 50000
      }].map(({
        label,
        key,
        val,
        min,
        max,
        step
      }) => <div key={key} className={css({
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0
      }, "EventFormPage")}>
            <div className={css({
          fontSize: 10,
          color: 'var(--muted)',
          marginBottom: 3,
          fontWeight: 700,
          letterSpacing: 0.3
        }, "EventFormPage")}>{label}</div>
            <input type="number" value={val} min={min} max={max} step={step} onChange={e => onChange(key, Number(e.target.value))} className={css(miniInput, "EventFormPage")} onFocus={e => setNodeCss(e.target, { borderColor: 'var(--accent)' }, 'borderColor')} onBlur={e => setNodeCss(e.target, { borderColor: 'var(--border)' }, 'borderColor')} />
          </div>)}
        <div className={css({
        background: 'rgba(255,107,53,.12)',
        border: '1px solid rgba(255,107,53,.3)',
        color: 'var(--accent)',
        fontSize: 11,
        fontWeight: 700,
        padding: '5px 10px',
        borderRadius: 6,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        alignSelf: 'flex-end'
      }, "EventFormPage")}>{pillTxt}</div>
      </div>
    </div>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
let nextZoneId = 3;
export default function EventFormPage() {
  const navigate = useNavigate();
  const {
    id
  } = useParams();
  const isEdit = !!id;
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    date: '',
    time: '19:00',
    thumbnailUrl: '',
    category: 'Âm nhạc',
    organizer: ''
  });
  const [zones, setZones] = useState([{
    id: 0,
    name: 'Khu VIP',
    color: ZONE_COLORS[0],
    rows: 5,
    cols: 10,
    price: 2500000
  }, {
    id: 1,
    name: 'Khu A',
    color: ZONE_COLORS[1],
    rows: 8,
    cols: 14,
    price: 1500000
  }, {
    id: 2,
    name: 'Khu B',
    color: ZONE_COLORS[2],
    rows: 10,
    cols: 18,
    price: 800000
  }]);

  // Load existing event when editing
  useEffect(() => {
    if (!isEdit) return;
    eventService.getEventById(id).then(res => {
      const ev = res.data;
      const dt = ev.date ? new Date(ev.date) : null;
      setForm({
        name: ev.title || ev.name || '',
        description: ev.description || '',
        location: ev.venue || ev.location || '',
        date: dt ? dt.toISOString().slice(0, 10) : '',
        time: dt ? dt.toISOString().slice(11, 16) : '19:00',
        thumbnailUrl: ev.imageUrl || ''
      });
      if (ev.zones?.length) {
        setZones(ev.zones.map((z, i) => ({
          id: i,
          name: z.name,
          color: ZONE_COLORS[i % ZONE_COLORS.length],
          rows: z.rows || 5,
          cols: z.cols || 10,
          price: z.price || 0
        })));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id, isEdit]);
  const set = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  const addZone = () => {
    const idx = nextZoneId++;
    setZones(z => [...z, {
      id: idx,
      name: 'Khu mới',
      color: ZONE_COLORS[idx % ZONE_COLORS.length],
      rows: 6,
      cols: 12,
      price: 500000
    }]);
  };
  const updateZone = (zoneId, key, val) => setZones(z => z.map(z => z.id === zoneId ? {
    ...z,
    [key]: val
  } : z));
  const removeZone = zoneId => setZones(z => z.filter(z => z.id !== zoneId));

  // Summary totals
  const totalSeats = zones.reduce((s, z) => s + z.rows * z.cols, 0);
  const totalRevenue = zones.reduce((s, z) => s + z.rows * z.cols * z.price, 0);
  const revStr = totalRevenue >= 1e9 ? (totalRevenue / 1e9).toFixed(2) + 'tỷ đ' : Math.round(totalRevenue / 1e6) + 'tr đ';
  const buildPayload = () => ({
    title: form.name.trim(),
    description: form.description.trim(),
    venue: form.location.trim(),
    startDate: form.date && form.time ? `${form.date}T${form.time}:00` : form.date,
    imageUrl: form.thumbnailUrl.trim(),
    zones: zones.map(z => ({
      name: z.name.trim(),
      rows: Number(z.rows),
      cols: Number(z.cols),
      price: Number(z.price)
    }))
  });
  const validateForm = () => {
    const title = form.name.trim();
    const description = form.description.trim();
    const venue = form.location.trim();
    if (title.length < 3) return 'Tên sự kiện cần ít nhất 3 ký tự';
    if (title.length > MAX_EVENT_TITLE_LENGTH) return `Tên sự kiện tối đa ${MAX_EVENT_TITLE_LENGTH} ký tự`;
    if (description.length > MAX_DESCRIPTION_LENGTH) return `Mô tả tối đa ${MAX_DESCRIPTION_LENGTH} ký tự`;
    if (venue.length < 3) return 'Địa điểm cần ít nhất 3 ký tự';
    if (venue.length > MAX_VENUE_LENGTH) return `Địa điểm tối đa ${MAX_VENUE_LENGTH} ký tự`;
    if (!form.date || !form.time) return 'Vui lòng chọn ngày và giờ diễn';
    if (!form.thumbnailUrl.trim()) return 'Vui lòng nhập URL ảnh thumbnail';
    const eventDate = new Date(`${form.date}T${form.time}:00`);
    if (eventDate <= new Date()) return 'Ngày diễn phải trong tương lai';
    if (zones.length < 1) return 'Phải có ít nhất 1 khu vực';
    for (const zone of zones) {
      if (!zone.name.trim() || zone.name.trim().length > 80) return 'Tên khu vực cần 1-80 ký tự';
      if (Number(zone.rows) < 1) return 'Số hàng phải >= 1';
      if (Number(zone.cols) < 1) return 'Số cột phải >= 1';
      if (Number(zone.price) <= 0) return 'Giá vé phải > 0';
      if (Number(zone.price) > MAX_PRICE) return `Giá vé tối đa ${MAX_PRICE.toLocaleString('vi-VN')} đ`;
    }
    return null;
  };
  const handleSave = useCallback(async () => {
    const error = validateForm();
    if (error) {
      setToast(`⚠ ${error}`);
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await eventService.updateEvent(id, payload);
        setToast('✓ Đã lưu thay đổi sự kiện');
      } else {
        await eventService.createEvent(payload);
        setToast('✓ Tạo sự kiện thành công');
      }
      setTimeout(() => navigate('/admin/events'), 1200);
    } catch (err) {
      setToast(err.response?.data?.message || 'Không thể lưu sự kiện');
    } finally {
      setSaving(false);
    }
  }, [form, zones, id, isEdit, navigate]);

  // ── Preview values ────────────────────────────────────────────────
  const prevDate = form.date ? new Date(form.date).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) : 'Chưa chọn ngày';

  // ── Section heading ───────────────────────────────────────────────
  const SectionHeading = ({
    children
  }) => <div className={css({
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 20,
    paddingLeft: 12,
    borderLeft: '3px solid var(--accent)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: 'var(--text)'
  }, "EventFormPage")}>
      {children}
    </div>;
  const SectionCard = ({
    children,
    style
  }) => <div className={css({
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    ...style
  }, "EventFormPage")}>
      {children}
    </div>;
  if (loading) {
    return <AdminLayout>
        <div className={css({
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)',
        fontSize: 13
      }, "EventFormPage")}>
          Đang tải...
        </div>
      </AdminLayout>;
  }
  return <AdminLayout>
      {/* ── Top Bar ── */}
      <div className="event-form-topbar">
        <div className="admin-breadcrumb">
          <Link to="/admin/dashboard">Admin</Link>
          <span className="admin-breadcrumb__sep">/</span>
          <Link to="/admin/events">Sự kiện</Link>
          <span className="admin-breadcrumb__sep">/</span>
          <span className="admin-breadcrumb__current">{isEdit ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}</span>
        </div>

        <div className="event-form-topbar__actions">
          <button className="btn-ghost" onClick={() => navigate('/admin/events')}>Hủy</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo sự kiện'}
          </button>
          <button className="btn-primary" onClick={() => handleSave('PUBLISHED')} disabled={saving}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            Xuất bản
          </button>
        </div>
      </div>

      {/* ── Scroll Area ── */}
      <div className={css({
      flex: 1,
      overflowY: 'auto',
      padding: '24px 32px'
    }, "EventFormPage")}>
        <div className={css({
        display: 'grid',
        gridTemplateColumns: '65% 1fr',
        gap: 24,
        alignItems: 'start'
      }, "EventFormPage")}>

          {/* ── LEFT COLUMN ── */}
          <div>

            {/* Basic Info */}
            <SectionCard>
              <SectionHeading>Thông tin cơ bản</SectionHeading>

              <Field label="Tên sự kiện">
                <input className={css(INPUT, "EventFormPage")} placeholder="Vd: Đêm nhạc Mỹ Tâm — Chạm Tour 2026" value={form.name} onChange={e => set('name', e.target.value)} onFocus={focusOn} onBlur={focusOff} />
              </Field>

              <div className={css({
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12
            }, "EventFormPage")}>
                <Field label="Ngày diễn">
                  <input className={css({
                  ...INPUT,
                  colorScheme: 'dark'
                }, "EventFormPage")} type="date" value={form.date} onChange={e => set('date', e.target.value)} onFocus={focusOn} onBlur={focusOff} />
                </Field>
                <Field label="Giờ bắt đầu">
                  <input className={css({
                  ...INPUT,
                  colorScheme: 'dark'
                }, "EventFormPage")} type="time" value={form.time} onChange={e => set('time', e.target.value)} onFocus={focusOn} onBlur={focusOff} />
                </Field>
              </div>

              <div className={css({
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12
            }, "EventFormPage")}>
                <Field label="Thể loại">
                  <select className={css({
                  ...INPUT,
                  appearance: 'none',
                  cursor: 'pointer',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23AAAAAA' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: 32
                }, "EventFormPage")} value={form.category} onChange={e => set('category', e.target.value)} onFocus={focusOn} onBlur={focusOff}>
                    {CATEGORIES.map(c => <option key={c} value={c} className={css({
                    background: 'var(--card)'
                  }, "EventFormPage")}>
                        {CAT_EMOJIS[c]} {c}
                      </option>)}
                  </select>
                </Field>
                <Field label="Đơn vị tổ chức">
                  <input className={css(INPUT, "EventFormPage")} placeholder="Tên công ty / BTC" value={form.organizer} onChange={e => set('organizer', e.target.value)} onFocus={focusOn} onBlur={focusOff} />
                </Field>
              </div>

              <Field label="Địa điểm">
                <div className={css({
                position: 'relative'
              }, "EventFormPage")}>
                  <svg className={css({
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted)',
                  pointerEvents: 'none'
                }, "EventFormPage")} width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" />
                  </svg>
                  <input className={css({
                  ...INPUT,
                  paddingLeft: 38
                }, "EventFormPage")} placeholder="Vd: Sân vận động Mỹ Đình, Hà Nội" value={form.location} onChange={e => set('location', e.target.value)} onFocus={focusOn} onBlur={focusOff} />
                </div>
              </Field>

              <Field label="URL ảnh thumbnail">
                <input className={css(INPUT, "EventFormPage")} placeholder="https://example.com/image.jpg" value={form.thumbnailUrl} onChange={e => set('thumbnailUrl', e.target.value)} onFocus={focusOn} onBlur={focusOff} />
              </Field>

              <Field label="Mô tả sự kiện">
                <textarea className={css({
                ...INPUT,
                resize: 'vertical',
                lineHeight: 1.7
              }, "EventFormPage")} rows={5} placeholder="Mô tả chi tiết về sự kiện, nghệ sĩ biểu diễn, chương trình..." value={form.description} onChange={e => set('description', e.target.value)} onFocus={focusOn} onBlur={focusOff} />
              </Field>
            </SectionCard>

            {/* Seat Config */}
            <SectionCard>
              <SectionHeading>Cấu hình sơ đồ ghế</SectionHeading>

              {zones.map(zone => <ZoneRow key={zone.id} zone={zone} onChange={(key, val) => updateZone(zone.id, key, val)} onRemove={() => removeZone(zone.id)} />)}

              <button onClick={addZone} className={css({
              width: '100%',
              padding: 12,
              border: '1.5px dashed rgba(255,107,53,.4)',
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--accent)',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all .2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7
            }, "EventFormPage")} onMouseEnter={e => {
setNodeCss(e.currentTarget, { borderColor: 'var(--accent)' }, 'borderColor');
setNodeCss(e.currentTarget, { background: 'rgba(255,107,53,.05)' }, 'background');
            }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { borderColor: 'rgba(255,107,53,.4)' }, 'borderColor');
setNodeCss(e.currentTarget, { background: 'transparent' }, 'background');
            }}>
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                Thêm khu vực mới
              </button>
            </SectionCard>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className={css({
          position: 'sticky',
          top: 0
        }, "EventFormPage")}>

            {/* Live Preview Card */}
            <div className={css({
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            marginBottom: 16
          }, "EventFormPage")}>
              <div className={css({
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 7
            }, "EventFormPage")}>
                <div className={css({
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--accent)',
                animation: 'blink 1.5s ease-in-out infinite'
              }, "EventFormPage")} />
                Xem trước
              </div>

              {/* Mini event card */}
              <div className={css({
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden'
            }, "EventFormPage")}>
                <div className={css({
                height: 90,
                background: CAT_COLORS[form.category] || CAT_COLORS['Âm nhạc'],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                position: 'relative'
              }, "EventFormPage")}>
                  {CAT_EMOJIS[form.category] || '🎤'}
                  <div className={css({
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,.5), transparent)'
                }, "EventFormPage")} />
                </div>
                <div className={css({
                padding: 12
              }, "EventFormPage")}>
                  <div className={css({
                  fontSize: 10,
                  color: 'var(--accent)',
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  marginBottom: 5
                }, "EventFormPage")}>
                    {form.category}
                  </div>
                  <div className={css({
                  fontSize: 13,
                  fontWeight: form.name ? 700 : 400,
                  lineHeight: 1.3,
                  marginBottom: 8,
                  color: form.name ? 'var(--text)' : 'var(--muted)',
                  fontStyle: form.name ? 'normal' : 'italic',
                  minHeight: 36
                }, "EventFormPage")}>
                    {form.name || 'Tên sự kiện...'}
                  </div>
                  <div className={css({
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }, "EventFormPage")}>
                    <div className={css({
                    fontSize: 11,
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }, "EventFormPage")}>
                      <svg className={css({
                      color: 'var(--accent)',
                      flexShrink: 0
                    }, "EventFormPage")} width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                      {prevDate}
                    </div>
                    <div className={css({
                    fontSize: 11,
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }, "EventFormPage")}>
                      <svg className={css({
                      color: 'var(--accent)',
                      flexShrink: 0
                    }, "EventFormPage")} width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
                      {form.location || 'Chưa có địa điểm'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seat Summary Card */}
            <div className={css({
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20
          }, "EventFormPage")}>
              <div className={css({
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 14
            }, "EventFormPage")}>Tổng quan ghế</div>

              {zones.map((zone, i) => <div key={zone.id} className={css({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: i < zones.length - 1 ? '1px solid rgba(120,120,120,0.1)' : 'none'
            }, "EventFormPage")}>
                  <div className={css({
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 600
              }, "EventFormPage")}>
                    <div className={css({
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  flexShrink: 0,
                  background: zone.color
                }, "EventFormPage")} />
                    {zone.name}
                  </div>
                  <span className={css({
                fontSize: 12,
                color: 'var(--muted)'
              }, "EventFormPage")}>{(zone.rows * zone.cols).toLocaleString()} ghế</span>
                </div>)}

              <div className={css({
              height: 1,
              background: 'var(--border)',
              margin: '14px 0'
            }, "EventFormPage")} />

              <div className={css({
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10
            }, "EventFormPage")}>
                <span className={css({
                fontSize: 13,
                color: 'var(--muted)'
              }, "EventFormPage")}>Tổng số ghế</span>
                <span className={css({
                fontSize: 14,
                fontWeight: 800
              }, "EventFormPage")}>{totalSeats.toLocaleString()} ghế</span>
              </div>
              <div className={css({
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }, "EventFormPage")}>
                <span className={css({
                fontSize: 13,
                color: 'var(--muted)'
              }, "EventFormPage")}>Doanh thu tối đa</span>
                <span className={css({
                fontSize: 14,
                fontWeight: 800,
                color: 'var(--accent)'
              }, "EventFormPage")}>{revStr}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      </AdminLayout>;
}
