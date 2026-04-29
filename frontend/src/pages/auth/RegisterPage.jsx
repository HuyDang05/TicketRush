import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    dob: '',
    gender: 'MALE',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // clear field error on change
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const next = {};

    if (!formData.fullName.trim()) next.fullName = 'Họ tên không được để trống';
    if (!emailRegex.test(formData.email)) next.email = 'Email không hợp lệ';
    if (!formData.password || formData.password.length < 8) next.password = 'Mật khẩu cần ít nhất 8 ký tự';
    if (formData.password !== formData.confirmPassword) next.confirmPassword = 'Xác nhận mật khẩu không khớp';

    if (!formData.dob) {
      next.dob = 'Vui lòng chọn ngày sinh';
    } else {
      const dobDate = new Date(formData.dob);
      const today = new Date();
      if (isNaN(dobDate.getTime())) next.dob = 'Ngày sinh không hợp lệ';
      else if (dobDate > today) next.dob = 'Ngày sinh không được ở tương lai';
      else {
        const ageDifMs = today - dobDate;
        const ageDate = new Date(ageDifMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        if (age < 13) next.dob = 'Phải từ 13 tuổi trở lên';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        dob: formData.dob,
        gender: formData.gender,
      });
      // on success, user is auto-logged in by auth hook
      navigate('/');
    } catch (err) {
      console.error('Registration failed:', err);
      // server error shown by auth hook in `error`
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>

      {/* ── LEFT PANEL ── */}
      <div style={{
        width: '50%', position: 'relative', background: '#111111', flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', padding: '60px 48px',
      }}>
        {/* Bg */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse at 55% 35%, #3a1500 0%, #1a0800 40%, #080808 100%)' }} />
        {/* Stage lights */}
        {[
          { left: '15%', w: 180, rot: '-20deg', color: '#FF6B35' },
          { left: '35%', w: 200, rot: '-6deg',  color: '#fff' },
          { left: '56%', w: 180, rot: '10deg',  color: '#FF6B35' },
          { left: '72%', w: 150, rot: '24deg',  color: '#fff' },
        ].map((l, i) => (
          <div key={i} style={{
            position: 'absolute', top: 0, left: l.left, width: l.w, height: '100%',
            opacity: .12, transformOrigin: 'top center', transform: `rotate(${l.rot})`,
            background: `linear-gradient(to bottom, ${l.color}, transparent)`, zIndex: 0,
          }} />
        ))}
        {/* Crowd */}
        <svg style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 0, opacity: .9 }}
          viewBox="0 0 800 200" preserveAspectRatio="none">
          <path d="M0,150 Q30,120 60,138 Q90,118 120,135 Q155,115 185,130 Q215,115 245,132 Q278,115 308,130 Q340,116 370,132 Q400,118 430,132 Q462,116 492,130 Q522,116 552,130 Q582,118 612,132 Q643,117 673,130 Q703,118 733,132 Q763,118 800,125 L800,200 L0,200Z" fill="rgba(12,4,0,0.9)"/>
          <path d="M0,172 Q50,158 100,165 Q150,156 200,164 Q250,156 300,164 Q350,157 400,165 Q450,157 500,164 Q550,157 600,165 Q650,158 700,164 Q750,157 800,163 L800,200 L0,200Z" fill="rgba(6,2,0,0.97)"/>
        </svg>
        {/* Overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to top, rgba(0,0,0,.72) 0%, rgba(0,0,0,.35) 100%)' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 420 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
            <span style={{ fontSize: 32, color: '#FF6B35', filter: 'drop-shadow(0 0 12px rgba(255,107,53,.5))' }}>⚡</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-.5px' }}>TicketRush</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Họ tên</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.fullName && <p className="text-red-600 text-sm mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{
        width: '50%', background: '#1A1A1A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 48px', overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 420, padding: '8px 0' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Tạo tài khoản</h2>
          <p style={{ fontSize: 14, color: '#AAAAAA', marginBottom: 22 }}>
            Đã có tài khoản?{' '}
            <Link to="/login" style={{ color: '#FF6B35', textDecoration: 'none', fontWeight: 600 }}>Đăng nhập</Link>
          </p>

          {/* Success */}
          {success && (
            <div style={{
              background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)',
              borderRadius: 8, padding: '12px 16px', fontSize: 13, fontWeight: 600,
              color: '#4ade80', marginBottom: 16,
            }}>
              ✓ &nbsp;Tạo tài khoản thành công! Chào mừng bạn đến với TicketRush 🎉
            </div>
          )}

          {/* API error */}
          {error && !success && (
            <div style={{
              background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)',
              borderRadius: 8, padding: '12px 16px', fontSize: 13, fontWeight: 600,
              color: '#f87171', marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* Full name */}
            <Field label="Họ và tên" error={errs.fullName}>
              <TextInput
                type="text"
                value={fullName}
                onChange={e => { setFullName(e.target.value); clearErr('fullName'); }}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
                hasError={!!errs.fullName}
              />
            </Field>

            {/* Email */}
            <Field label="Email" error={errs.email}>
              <TextInput
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); clearErr('email'); }}
                placeholder="example@email.com"
                autoComplete="email"
                hasError={!!errs.email}
              />
            </Field>

            {/* Password */}
            <Field label="Mật khẩu" error={errs.password}>
              <div style={{ position: 'relative' }}>
                <TextInput
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearErr('password'); }}
                  placeholder="Tối thiểu 8 ký tự"
                  autoComplete="new-password"
                  hasError={!!errs.password}
                  withIcon
                />
                <EyeBtn show={showPw} onToggle={() => setShowPw(v => !v)} />
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: 7 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= strength ? STRENGTH_COLORS[strength - 1] : '#333333',
                        transition: 'background .3s',
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: strength > 0 ? STRENGTH_COLORS[strength - 1] : '#AAAAAA' }}>
                    {STRENGTH_LABELS[strength - 1] || ''}
                  </div>
                </div>
              )}
            </Field>

            {/* Confirm password */}
            <Field label="Xác nhận mật khẩu" error={errs.confirm}>
              <div style={{ position: 'relative' }}>
                <TextInput
                  type={showCfm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); clearErr('confirm'); }}
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                  hasError={!!errs.confirm}
                  withIcon
                />
                <EyeBtn show={showCfm} onToggle={() => setShowCfm(v => !v)} />
              </div>
            </Field>

          <div>
            <label className="block text-sm font-semibold mb-2">Mật khẩu</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Xác nhận mật khẩu</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.confirmPassword && <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Ngày sinh</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.dob && <p className="text-red-600 text-sm mt-1">{errors.dob}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Giới tính</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

function DateInput() {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="date"
      style={{
        ...inputBase,
        padding: '11px 16px',
        borderColor: focused ? '#FF6B35' : '#333333',
        boxShadow: focused ? '0 0 0 3px rgba(255,107,53,.1)' : 'none',
        colorScheme: 'dark',
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function GenderSelect() {
  const [focused, setFocused] = useState(false);
  return (
    <select
      defaultValue=""
      style={{
        ...inputBase,
        padding: '11px 36px 11px 16px',
        borderColor: focused ? '#FF6B35' : '#333333',
        boxShadow: focused ? '0 0 0 3px rgba(255,107,53,.1)' : 'none',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23AAAAAA' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
        cursor: 'pointer',
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <option value="" disabled style={{ color: '#555' }}>Chọn...</option>
      <option value="male">Nam</option>
      <option value="female">Nữ</option>
      <option value="other">Khác</option>
    </select>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(v => !v)}
      style={{
        width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
        border: `1.5px solid ${checked ? '#FF6B35' : '#333333'}`,
        background: checked ? '#FF6B35' : '#242424',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color .2s, background .2s',
      }}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}

function SocialBtn({ icon, label }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, height: 44, background: hovered ? '#2a2a2a' : '#242424',
        border: `1px solid ${hovered ? 'rgba(255,255,255,.2)' : '#333333'}`,
        borderRadius: 8, color: '#FFFFFF',
        fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 13, fontWeight: 600,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, transition: 'border-color .2s, background .2s',
      }}
    >
      {icon}{label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
