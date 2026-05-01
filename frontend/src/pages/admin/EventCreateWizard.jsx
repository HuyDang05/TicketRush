import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/shared/AdminLayout';
import './admin.css';
import provinces from '../../data/vietnam.json';

export default function EventCreateWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
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

  useEffect(() => {
    if (!imageFile) { setImagePreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const currentProvince = provinces.find(p => p.name === form.province);
  const currentDistrict = currentProvince?.districts?.find(d => d.name === form.district);

  // Basic validation before moving to next step
  const canNext = form.name.trim() && form.venue.trim();

  return (
    <AdminLayout>
      <div className="dash-topbar">
        <div className="dash-topbar__breadcrumb">Admin <span style={{ opacity: .4 }}>/</span> <span style={{ color: '#fff', fontWeight: 600 }}>Quy trình tạo sự kiện</span></div>
        <div />
      </div>

      <div style={{ padding: 20 }}>
        {step === 1 ? (
          <div className="event-form-card">
            <div style={{ display: 'flex', gap: 20 }}>
              <aside style={{ width: 240 }}>
                <div style={{ marginBottom: 8, color: '#AAAAAA', fontSize: 13 }}>Ảnh sự kiện</div>
                <div style={{ width: 240, height: 160, borderRadius: 8, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ color: '#777', fontSize: 13 }}>Chưa có ảnh</div>
                  )}
                </div>
                <label style={{ display: 'block', marginTop: 10 }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setImageFile(e.target.files?.[0] || null)} />
                  <button className="btn-ghost" type="button">Tải ảnh lên</button>
                </label>
              </aside>

              <main style={{ flex: 1 }}>
                <div className="event-form-field">
                  <label className="event-form-label">Tên sự kiện</label>
                  <input className="event-form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Vd: Đêm nhạc..." />
                </div>

                <div className="event-form-field">
                  <label className="event-form-label">Tên địa điểm</label>
                  <input className="event-form-input" value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="Vd: SVĐ Mỹ Đình" />
                </div>

                <div className="event-form-grid">
                  <div className="event-form-field">
                    <label className="event-form-label">Tỉnh/Thành</label>
                    <select className="event-form-input event-form-select" value={form.province} onChange={e => { set('province', e.target.value); set('district', ''); set('ward', ''); set('street', ''); }}>
                      <option value="">Chọn tỉnh/thành</option>
                      {provinces.map(p => <option key={p.Code} value={p.FullName}>{p.FullName}</option>)}
                    </select>
                  </div>

                  <div className="event-form-field">
                    <label className="event-form-label">Quận/Huyện</label>
                    <select className="event-form-input event-form-select" value={form.district} onChange={e => { set('district', e.target.value); set('ward', ''); }}>
                      <option value="">Chọn quận/huyện</option>
                      {currentProvince?.districts?.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>

                  <div className="event-form-field">
                    <label className="event-form-label">Phường/Xã</label>
                    <select className="event-form-input event-form-select" value={form.ward} onChange={e => set('ward', e.target.value)}>
                      <option value="">Chọn phường/xã</option>
                      {currentDistrict?.wards?.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </div>

                <div className="event-form-grid">
                  <div className="event-form-field">
                    <label className="event-form-label">Số nhà</label>
                    <input className="event-form-input" value={form.houseNumber} onChange={e => set('houseNumber', e.target.value)} placeholder="Vd: 12" />
                  </div>

                  <div className="event-form-field">
                    <label className="event-form-label">Đường</label>
                    <select className="event-form-input event-form-select" value={form.street} onChange={e => set('street', e.target.value)}>
                      <option value="">Chọn đường</option>
                      {currentProvince?.streets?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

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

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button className="btn-ghost" onClick={() => navigate('/admin/events')}>Hủy</button>
                  <button className="btn-primary" onClick={() => canNext && setStep(2)} disabled={!canNext}>Tiếp theo →</button>
                </div>
              </main>
            </div>
          </div>
        ) : (
          <div style={{ padding: 40, background: '#071018', borderRadius: 8 }}>
            <h3>Bước 2 (placeholder)</h3>
            <p style={{ color: '#AAAAAA' }}>Phần này là placeholder cho bước tiếp theo của wizard.</p>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn-ghost" onClick={() => setStep(1)}>Quay lại</button>
              <button className="btn-primary" onClick={() => navigate('/admin/events')}>Hoàn tất</button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
