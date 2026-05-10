import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/shared/AdminLayout';
import './admin.css';
import provinces from '../../data/vietnam.json';
import eventService from '../../services/event.service';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';



/* ── Step indicator ── */
function StepBar({ step }) {
  const steps = ['Thông tin sự kiện', 'Cấu hình chỗ ngồi'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
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

  // Step 1 form
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
        // Step 1 — dates
        if (ev.date) setStartDate(new Date(ev.date).toISOString().slice(0, 16));
        if (ev.endDate) setEndDate(new Date(ev.endDate).toISOString().slice(0, 16));
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
  const canSubmit = form.name.trim() && form.venue.trim() && startDate;

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
      };

      if (isEdit) {
        await eventService.updateEvent(editId, payload);
        showToast('Cập nhật thông tin thành công!', 'success');
        setTimeout(() => navigate(`/admin/events/${editId}/seatmap`), 1200);
      } else {
        payload.imageUrl = imageUrl;
        const res = await eventService.createEvent(payload);
        showToast('Lưu thông tin thành công! Đang chuẩn bị bản đồ ghế...', 'success');
        setTimeout(() => navigate(`/admin/events/${res.data.event.id}/seatmap`), 1200);
      }
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

                <div className="event-form-card" style={{ marginTop: 24 }}>
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

                <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
                  <button className="btn-ghost" onClick={() => navigate('/admin/events')}>Hủy</button>
                  <button className="btn-primary" onClick={handleSubmit} disabled={!canSubmit || submitting}>
                    {submitting ? 'Đang xử lý...' : 'Lưu & Cấu hình chỗ ngồi →'}
                  </button>
                </div>
                
              </main>
            </div>
          </div>
          )}

        </div>
      )} {/* end loadingEvent ternary */}

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
