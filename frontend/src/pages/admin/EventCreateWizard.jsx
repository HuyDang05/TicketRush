import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/shared/AdminLayout';
import './admin.css';
import provinces from '../../data/vietnam.json';
import eventService from '../../services/event.service';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const ZONE_COLORS = ['#FF6B35', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];

function newZone() {
  return { name: '', price: '' };
}

/* ── Step indicator ── */
function StepBar({ step }) {
  const steps = ['Thông tin sự kiện', 'Cấu hình chỗ ngồi'];
  const displayStep = step === 3 ? 2 : step;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < displayStep;
        const active = idx === displayStep;
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
                background: done ? '#22c55e' : active ? '#FF6B35' : '#333',
                color: '#fff', transition: 'background 0.3s',
              }}>
                {done ? '✓' : idx}
              </div>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? '#fff' : '#777', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? '#22c55e' : '#333', margin: '0 12px', transition: 'background 0.3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function EventCreateWizard() {
  const navigate = useNavigate();
  const { id: editId } = useParams(); // có giá trị khi đang edit
  const isEdit = Boolean(editId);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(isEdit); // loading khi fetch data edit
  const [toast, setToast] = useState(null);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState(null);

  const [cardImageFile, setCardImageFile] = useState(null);
  const [cardImagePreview, setCardImagePreview] = useState(null);
  const [cardImageError, setCardImageError] = useState(null);

  /* ── validate 1280×720 khi chọn ảnh ── */
  const handleImageChange = (file) => {
    if (!file) { setImageFile(null); setImagePreview(null); setImageError(null); return; }
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      if (img.width !== 1280 || img.height !== 720) {
        setImageError(`Ảnh phải có kích thước 1280×720px (hiện tại: ${img.width}×${img.height}px)`);
        setImageFile(null);
        setImagePreview(null);
      } else {
        setImageError(null);
        setImageFile(file);
      }
    };
    img.src = objUrl;
  };

  /* ── validate 720×958 cho ảnh card ── */
  const handleCardImageChange = (file) => {
    if (!file) { setCardImageFile(null); setCardImagePreview(null); setCardImageError(null); return; }
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      if (img.width !== 720 || img.height !== 958) {
        setCardImageError(`Ảnh card phải có kích thước 720×958px (hiện tại: ${img.width}×${img.height}px)`);
        setCardImageFile(null);
        setCardImagePreview(null);
      } else {
        setCardImageError(null);
        setCardImageFile(file);
      }
    };
    img.src = objUrl;
  };

  // Step 1 form
  const [form, setForm] = useState({
    name: '',
    venue: '',
    province: '',
    district: '',
    ward: '',
    houseNumber: '',
    street: '',
    category: 'Âm nhạc',
    shortDescription: '',
  });

  // Step 2 form
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(20);
  const [zones, setZones] = useState([newZone()]);

  useEffect(() => {
    if (!imageFile) { setImagePreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    if (!cardImageFile) { setCardImagePreview(null); return; }
    const url = URL.createObjectURL(cardImageFile);
    setCardImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cardImageFile]);

  /* ── Fetch để pre-fill khi edit ── */
  useEffect(() => {
    if (!isEdit) return;
    setLoadingEvent(true);
    eventService.getAdminEventById(editId)
      .then(res => {
        const ev = res.data.event;
        // Parse venue string ngược lại
        const venueParts = ev.venue?.split(' — ');
        const venueMain = venueParts?.[0] || ev.venue || '';
        // Step 1
        setForm(f => ({
          ...f,
          name: ev.title || '',
          venue: venueMain,
          category: ev.category || 'Âm nhạc',
          shortDescription: ev.description || '',
        }));
        // Step 2 — dates
        if (ev.date) setStartDate(new Date(ev.date).toISOString().slice(0, 16));
        if (ev.endDate) setEndDate(new Date(ev.endDate).toISOString().slice(0, 16));
        // Zones — lấy rows/cols từ zone đầu tiên
        if (ev.zones?.length > 0) {
          setRows(ev.zones[0].rows);
          setCols(ev.zones[0].cols);
          setZones(ev.zones.map(z => ({ name: z.name, price: String(z.price) })));
        }
        // Preview ảnh hiện tại nếu có
        if (ev.imageUrl) setImagePreview(ev.imageUrl);
        if (ev.cardImageUrl) setCardImagePreview(ev.cardImageUrl);
      })
      .catch(() => showToast('Không tải được dữ liệu sự kiện', 'error'))
      .finally(() => setLoadingEvent(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const currentProvince = provinces.find(p => p.name === form.province);

  // Validation
  const canNext = form.name.trim() && form.venue.trim();
  const canSubmit = !!startDate;

  /* ── Zone helpers ── */
  const setZone = (i, key, val) =>
    setZones(prev => prev.map((z, idx) => idx === i ? { ...z, [key]: val } : z));
  const addZone = () => setZones(prev => [...prev, newZone()]);
  const removeZone = (i) => setZones(prev => prev.filter((_, idx) => idx !== i));

  /* ── Go to step 3 with validation ── */
  const handleNextStep = () => {
    if (!form.name.trim() || !form.venue.trim()) { showToast('Vui lòng điền tên và địa điểm sự kiện', 'error'); return; }
    if (!startDate) { showToast('Vui lòng chọn ngày giờ bắt đầu', 'error'); return; }
    if (endDate && new Date(endDate) <= new Date(startDate)) { showToast('Thời gian kết thúc phải sau bắt đầu', 'error'); return; }
    setStep(3);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (submitting) return;
    if (!startDate) { showToast('Vui lòng chọn ngày giờ bắt đầu', 'error'); return; }
    setSubmitting(true);
    try {
      // 1. Upload ảnh banner và card lên Cloudinary nếu có file mới
      let imageUrl = undefined;
      if (imageFile) {
        showToast('Đang tải ảnh banner lên...', 'info');
        const uploadRes = await eventService.uploadEventImage(imageFile);
        imageUrl = uploadRes.data?.url;
      }
      let cardImageUrl = undefined;
      if (cardImageFile) {
        showToast('Đang tải ảnh card lên...', 'info');
        const uploadRes = await eventService.uploadCardImage(cardImageFile);
        cardImageUrl = uploadRes.data?.url;
      }

      // 2. Build full venue string
      const addressParts = [form.houseNumber, form.street, form.ward, form.district, form.province]
        .filter(Boolean).join(', ');
      const venueStr = form.venue + (addressParts ? ` — ${addressParts}` : '');

      const payload = {
        title: form.name,
        description: form.shortDescription || undefined,
        venue: venueStr,
        startDate,
        endDate: endDate || undefined,
        ...(imageUrl ? { imageUrl } : {}),
        ...(cardImageUrl ? { cardImageUrl } : {}),
        rows: Number(rows),
        cols: Number(cols),
        zones: zones.filter(z => z.name.trim() && Number(z.price) > 0).map(z => ({
          name: z.name,
          price: Number(z.price),
        })),
      };

      if (isEdit) {
        await eventService.updateEvent(editId, payload);
        showToast('Cập nhật sự kiện thành công!', 'success');
      } else {
        payload.imageUrl = imageUrl;
        await eventService.createEvent(payload);
        showToast('Tạo sự kiện thành công!', 'success');
      }
      setTimeout(() => navigate('/admin/events'), 1200);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Có lỗi xảy ra';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const totalSeats = (Number(rows) || 0) * (Number(cols) || 0);
  const totalSeatsAll = totalSeats * zones.length;

  return (
    <AdminLayout>
      <div className="dash-topbar">
        <div className="dash-topbar__breadcrumb">
          Admin <span style={{ opacity: .4 }}>/</span>{' '}
          <span
            style={{ color: '#AAAAAA', cursor: 'pointer', fontWeight: 400 }}
            onClick={() => navigate('/admin/events')}
          >Sự kiện</span>
          {' '}<span style={{ opacity: .4 }}>/</span>{' '}
          <span style={{ color: '#fff', fontWeight: 600 }}>
            {isEdit ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
          </span>
        </div>
      </div>

      {loadingEvent ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#AAAAAA', fontSize: 14 }}>
          ⏳ Đang tải dữ liệu sự kiện...
        </div>
      ) : (
        <div style={{ padding: 20 }}>
          <StepBar step={step} />

          {/* ══════════ STEP 1 ══════════ */}
          {step === 1 && (
            <div className="event-form-card">
              <div style={{ display: 'flex', gap: 20 }}>
                {/* Image aside */}
                <aside style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* Banner image */}
                  <div>
                    <div style={{ marginBottom: 8, color: '#AAAAAA', fontSize: 13, fontWeight: 600 }}>🖼 Ảnh banner</div>
                    <div style={{ width: 240, height: 135, borderRadius: 8, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: imageError ? '1.5px solid #f87171' : '1px solid #222' }}>
                      {imagePreview
                        ? <img src={imagePreview} alt="banner preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (
                          <div style={{ textAlign: 'center', padding: 12 }}>
                            <div style={{ fontSize: 24, marginBottom: 4 }}>🖼️</div>
                            <div style={{ color: '#555', fontSize: 11, lineHeight: 1.5 }}>Chưa có ảnh</div>
                          </div>
                        )}
                    </div>
                    {imageError && (
                      <div style={{ fontSize: 11, color: '#f87171', marginTop: 6, lineHeight: 1.5 }}>⚠ {imageError}</div>
                    )}
                    <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Yêu cầu: 1280×720px</div>
                    <label style={{ display: 'block', marginTop: 6, cursor: 'pointer' }}>
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => handleImageChange(e.target.files?.[0] || null)} />
                      <span className="btn-ghost" style={{ display: 'inline-block', cursor: 'pointer', fontSize: 12 }}>Tải ảnh lên</span>
                    </label>
                  </div>

                  {/* Card image */}
                  <div>
                    <div style={{ marginBottom: 8, color: '#AAAAAA', fontSize: 13, fontWeight: 600 }}>🃏 Ảnh card</div>
                    <div style={{ width: 120, height: 160, borderRadius: 8, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: cardImageError ? '1.5px solid #f87171' : '1px solid #222' }}>
                      {cardImagePreview
                        ? <img src={cardImagePreview} alt="card preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (
                          <div style={{ textAlign: 'center', padding: 8 }}>
                            <div style={{ fontSize: 20, marginBottom: 4 }}>🃏</div>
                            <div style={{ color: '#555', fontSize: 10, lineHeight: 1.5 }}>Chưa có ảnh</div>
                          </div>
                        )}
                    </div>
                    {cardImageError && (
                      <div style={{ fontSize: 11, color: '#f87171', marginTop: 6, lineHeight: 1.5 }}>⚠ {cardImageError}</div>
                    )}
                    <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Yêu cầu: 720×958px</div>
                    <label style={{ display: 'block', marginTop: 6, cursor: 'pointer' }}>
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => handleCardImageChange(e.target.files?.[0] || null)} />
                      <span className="btn-ghost" style={{ display: 'inline-block', cursor: 'pointer', fontSize: 12 }}>Tải ảnh lên</span>
                    </label>
                  </div>
                </aside>

                {/* Main fields */}
                <main style={{ flex: 1 }}>
                  <div className="event-form-field">
                    <label className="event-form-label">Tên sự kiện</label>
                    <input className="event-form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Vd: Đêm nhạc..." />
                  </div>

                  <div className="event-form-field">
                    <label className="event-form-label">Tên địa điểm</label>
                    <input className="event-form-input" value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="Vd: SVĐ Mỹ Đình" />
                  </div>

                  {/* Province / District / Ward */}
                  <div className="event-form-grid">
                    <div className="event-form-field">
                      <label className="event-form-label">Tỉnh/Thành</label>
                      <select className="event-form-input event-form-select" value={form.province}
                        onChange={e => { set('province', e.target.value); set('district', ''); set('ward', ''); set('street', ''); }}>
                        <option value="">Chọn tỉnh/thành</option>
                        {provinces.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>

                    <div className="event-form-field">
                      <label className="event-form-label">Quận/Huyện</label>
                      <select className="event-form-input event-form-select" value={form.district}
                        onChange={e => { set('district', e.target.value); set('ward', ''); }}>
                        <option value="">Chọn quận/huyện</option>
                        {currentProvince?.districts?.[0]?.wards?.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div className="event-form-field">
                      <label className="event-form-label">Phường/Xã</label>
                      <input className="event-form-input" value={form.ward} onChange={e => set('ward', e.target.value)} placeholder="Vd: Phường Bến Nghé" />
                    </div>
                  </div>

                  {/* House / Street */}
                  <div className="event-form-grid">
                    <div className="event-form-field">
                      <label className="event-form-label">Số nhà</label>
                      <input className="event-form-input" value={form.houseNumber} onChange={e => set('houseNumber', e.target.value)} placeholder="Vd: 12" />
                    </div>
                    <div className="event-form-field">
                      <label className="event-form-label">Đường</label>
                      <input className="event-form-input" value={form.street} onChange={e => set('street', e.target.value)} placeholder="Vd: Lê Duẩn" />
                    </div>
                  </div>

                  {/* Category / Short desc */}
                  <div className="event-form-grid">
                    <div className="event-form-field">
                      <label className="event-form-label">Thể loại</label>
                      <select className="event-form-input event-form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                        {['Âm nhạc', 'Thể thao', 'Sân khấu', 'Hội thảo', 'Lễ hội'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="event-form-field">
                      <label className="event-form-label">Mô tả ngắn</label>
                      <input className="event-form-input" value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} placeholder="Một câu tóm tắt..." />
                    </div>
                  </div>

                  {/* Time section */}
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #222' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#AAAAAA', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🗓 Thời gian sự kiện</div>
                    <div className="event-form-grid">
                      <div className="event-form-field">
                        <label className="event-form-label">Ngày &amp; giờ bắt đầu <span style={{ color: '#FF6B35' }}>*</span></label>
                        <input
                          type="datetime-local"
                          className="event-form-input"
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                          min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                        />
                      </div>
                      <div className="event-form-field">
                        <label className="event-form-label">Ngày &amp; giờ kết thúc <span style={{ color: '#AAAAAA', fontWeight: 400 }}>(tuỳ chọn)</span></label>
                        <input
                          type="datetime-local"
                          className="event-form-input"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          min={startDate || new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                        />
                      </div>
                    </div>
                    {startDate && endDate && new Date(endDate) <= new Date(startDate) && (
                      <div style={{ color: '#f87171', fontSize: 12, marginTop: -8, marginBottom: 8 }}>
                        ⚠ Thời gian kết thúc phải sau thời gian bắt đầu
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button className="btn-ghost" onClick={() => navigate('/admin/events')}>Hủy</button>
                    <button className="btn-primary" onClick={handleNextStep} disabled={!canNext}>
                      Tiếp theo →
                    </button>
                  </div>
                </main>
              </div>
            </div>
          )}

          {/* ══════════ STEP 2 removed ══════════ */}
          {false && (
            <div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

                {/* Left: datetime + zones */}
                <div style={{ flex: 1 }}>

                  {/* Time section */}
                  <div className="event-form-card" style={{ marginBottom: 16 }}>
                    <div className="event-form-section-title">🗓 Thời gian sự kiện</div>
                    <div className="event-form-grid">
                      <div className="event-form-field">
                        <label className="event-form-label">Ngày &amp; giờ bắt đầu <span style={{ color: '#FF6B35' }}>*</span></label>
                        <input
                          type="datetime-local"
                          className="event-form-input"
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                          min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                        />
                      </div>
                      <div className="event-form-field">
                        <label className="event-form-label">Ngày &amp; giờ kết thúc <span style={{ color: '#AAAAAA', fontWeight: 400 }}>(tuỳ chọn)</span></label>
                        <input
                          type="datetime-local"
                          className="event-form-input"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          min={startDate || new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                        />
                      </div>
                    </div>

                    {startDate && endDate && new Date(endDate) <= new Date(startDate) && (
                      <div style={{ color: '#f87171', fontSize: 12, marginTop: -8, marginBottom: 8 }}>
                        ⚠ Thời gian kết thúc phải sau thời gian bắt đầu
                      </div>
                    )}
                  </div>

                  {/* Seat layout section */}
                  <div className="event-form-card" style={{ marginBottom: 16 }}>
                    <div className="event-form-section-title">💺 Sơ đồ ghế ngồi</div>
                    <div style={{ color: '#AAAAAA', fontSize: 12, marginBottom: 14 }}>
                      Thiết lập số hàng và số cột ghế áp dụng chung cho toàn bộ sự kiện.
                    </div>
                    <div className="event-form-grid">
                      <div className="event-form-field">
                        <label className="event-form-label">Số hàng ghế <span style={{ color: '#FF6B35' }}>*</span></label>
                        <input
                          type="number"
                          min={1}
                          className="event-form-input"
                          value={rows}
                          onChange={e => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>
                      <div className="event-form-field">
                        <label className="event-form-label">Số cột ghế <span style={{ color: '#FF6B35' }}>*</span></label>
                        <input
                          type="number"
                          min={1}
                          className="event-form-input"
                          value={cols}
                          onChange={e => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>
                    </div>
                    <div style={{
                      marginTop: 8, padding: '8px 12px', background: 'rgba(255,107,53,0.08)',
                      borderRadius: 8, fontSize: 13, color: '#FF6B35', fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}>
                      <span>📐</span>
                      <span>Tổng: {totalSeats.toLocaleString('vi-VN')} ghế / loại vé</span>
                      {zones.length > 1 && (
                        <span style={{ color: '#AAAAAA', fontWeight: 400, fontSize: 12 }}>
                          &nbsp;({totalSeatsAll.toLocaleString('vi-VN')} ghế tổng cộng)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Zones / Ticket types section */}
                  <div className="event-form-card">
                    <div className="event-form-section-title">🎟 Loại vé</div>
                    <div style={{ color: '#AAAAAA', fontSize: 12, marginBottom: 14 }}>
                      Mỗi loại vé sẽ dùng chung sơ đồ ghế ({rows} hàng × {cols} cột).
                    </div>

                    {zones.map((z, i) => (
                      <div key={i} className="zone-row" style={{ borderLeft: `3px solid ${ZONE_COLORS[i % ZONE_COLORS.length]}` }}>
                        <div className="zone-row__top">
                          <div style={{
                            width: 28, height: 28, borderRadius: 6, background: ZONE_COLORS[i % ZONE_COLORS.length],
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0,
                          }}>
                            {String.fromCharCode(65 + i)}
                          </div>
                          <input
                            className="zone-row__name-input"
                            value={z.name}
                            onChange={e => setZone(i, 'name', e.target.value)}
                            placeholder={`Tên loại vé (vd: VIP, Thường...)`}
                          />
                          {zones.length > 1 && (
                            <button className="zone-row__remove-btn" onClick={() => removeZone(i)} title="Xoá loại vé">
                              ✕
                            </button>
                          )}
                        </div>

                        {/* price only */}
                        <div className="zone-row__bottom">
                          <div className="zone-row__field" style={{ flex: 2 }}>
                            <div className="zone-row__field-label">GIÁ VÉ (VNĐ)</div>
                            <input
                              type="number"
                              min={0}
                              className="zone-row__mini-input"
                              value={z.price}
                              onChange={e => setZone(i, 'price', e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button className="zone-add-btn" onClick={addZone}>
                      + Thêm loại vé
                    </button>
                  </div>
                </div>

                {/* Right: summary sidebar */}
                <div style={{ width: 260, flexShrink: 0, position: 'sticky', top: 0 }}>
                  <div className="event-form-seat-summary">
                    <div className="event-form-seat-summary__title">📋 Tóm tắt sự kiện</div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: '#AAAAAA', marginBottom: 4, fontWeight: 700 }}>TÊN SỰ KIỆN</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{form.name || '—'}</div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: '#AAAAAA', marginBottom: 4, fontWeight: 700 }}>ĐỊA ĐIỂM</div>
                      <div style={{ fontSize: 12, color: '#ccc' }}>
                        {[form.venue, form.district, form.province].filter(Boolean).join(', ') || '—'}
                      </div>
                    </div>
                    {startDate && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: '#AAAAAA', marginBottom: 4, fontWeight: 700 }}>THỜI GIAN</div>
                        <div style={{ fontSize: 12, color: '#ccc' }}>
                          {new Date(startDate).toLocaleString('vi-VN')}
                          {endDate && <> → {new Date(endDate).toLocaleString('vi-VN')}</>}
                        </div>
                      </div>
                    )}

                    <div className="event-form-divider" />

                    <div className="event-form-seat-summary__title" style={{ fontSize: 13, marginBottom: 10 }}>Các loại vé</div>
                    {zones.map((z, i) => (
                      <div key={i} className="event-form-seat-row">
                        <div className="event-form-seat-name">
                          <div className="event-form-seat-dot" style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }} />
                          {z.name || `Loại ${i + 1}`}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="event-form-seat-count">
                            {totalSeats.toLocaleString('vi-VN')} ghế
                          </div>
                          {z.price && (
                            <div style={{ fontSize: 11, color: '#FF6B35', fontWeight: 700 }}>
                              {Number(z.price).toLocaleString('vi-VN')}đ
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="event-form-divider" />
                    <div className="event-form-totals-row">
                      <span className="event-form-totals-label">Sơ đồ ghế</span>
                      <span className="event-form-totals-value">{rows} × {cols}</span>
                    </div>
                    <div className="event-form-totals-row">
                      <span className="event-form-totals-label">Ghế / loại vé</span>
                      <span className="event-form-totals-value">{totalSeats.toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="event-form-totals-row">
                      <span className="event-form-totals-label">Số loại vé</span>
                      <span className="event-form-totals-value">{zones.length}</span>
                    </div>
                    <div className="event-form-totals-row">
                      <span className="event-form-totals-label">Tổng ghế</span>
                      <span className="event-form-totals-value">{totalSeatsAll.toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button className="btn-ghost" onClick={() => setStep(1)}>← Quay lại</button>
                <button className="btn-primary" onClick={handleNextStep}>
                  Tiếp theo →
                </button>
              </div>
            </div>
          )}

          {/* ══════════ STEP 3 ══════════ */}
          {step === 3 && (
            <div className="event-form-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>🚧</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
                Cấu hình chỗ ngồi
              </div>
              <div style={{
                fontSize: 14, color: '#AAAAAA', maxWidth: 420, margin: '0 auto 32px',
                lineHeight: 1.7,
              }}>
                Tính năng này đang được phát triển. Vui lòng quay lại sau.
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.25)',
                borderRadius: 10, padding: '10px 18px', fontSize: 13, color: '#FF6B35',
                marginBottom: 36,
              }}>
                ⏳ Sắp ra mắt
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                <button className="btn-ghost" onClick={() => setStep(1)}>← Quay lại</button>
                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu...' : isEdit ? '✓ Cập nhật sự kiện' : '✓ Tạo sự kiện'}
                </button>
              </div>
            </div>
          )}

          {/* Navigation bottom bar – Step 3 */}
          {step === 3 && null}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="admin-toast" style={{
          borderColor: toast.type === 'error' ? '#f87171' : '#FF6B35',
          color: toast.type === 'error' ? '#f87171' : '#fff',
        }}>
          {toast.msg}
        </div>
      )}
    </AdminLayout>
  );
}
