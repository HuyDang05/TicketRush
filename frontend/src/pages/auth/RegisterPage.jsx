// Purpose: Trang xac thuc nguoi dung va cac luong lien quan den tai khoan.
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { emailRegex, MAX_EMAIL_LENGTH, validateFullName, validatePassword } from '../../utils/inputValidation';
import './auth.css';
import { css, cx } from "../../lib/runtimeCss";
const LIGHT_BEAMS = [{
  left: '15%',
  width: 180,
  rot: '-20deg',
  color: '#FF6B35'
}, {
  left: '35%',
  width: 200,
  rot: '-6deg',
  color: '#fff'
}, {
  left: '56%',
  width: 180,
  rot: '10deg',
  color: '#FF6B35'
}, {
  left: '72%',
  width: 150,
  rot: '24deg',
  color: '#fff'
}];
export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    register,
    isLoading,
    error
  } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    dob: '',
    gender: 'MALE'
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  };
  const validate = () => {
    const next = {};
    const fullNameError = validateFullName(formData.fullName);
    if (fullNameError) next.fullName = fullNameError;
    const email = formData.email.trim();
    if (!emailRegex.test(email) || email.length > MAX_EMAIL_LENGTH) next.email = 'Email không hợp lệ';
    const passwordError = validatePassword(formData.password);
    if (passwordError) next.password = passwordError;
    if (formData.password !== formData.confirmPassword) next.confirmPassword = 'Xác nhận mật khẩu không khớp';
    if (!formData.dob) {
      next.dob = 'Vui lòng chọn ngày sinh';
    } else {
      const dobDate = new Date(formData.dob);
      const today = new Date();
      if (isNaN(dobDate.getTime())) next.dob = 'Ngày sinh không hợp lệ';else if (dobDate > today) next.dob = 'Ngày sinh không được ở tương lai';else {
        const age = Math.abs(new Date(today - dobDate).getUTCFullYear() - 1970);
        if (age < 13) next.dob = 'Phải từ 13 tuổi trở lên';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await register({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        dob: formData.dob,
        gender: formData.gender
      });
      navigate('/');
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };
  return <div className="auth-page">
      {/* LEFT PANEL */}
      <div className="auth-panel--left">
        <div className="auth-panel--left__bg" />
        {LIGHT_BEAMS.map((l, i) => <div key={i} className={css({
        position: 'absolute',
        top: 0,
        left: l.left,
        width: l.width,
        height: '100%',
        opacity: .12,
        transformOrigin: 'top center',
        transform: `rotate(${l.rot})`,
        background: `linear-gradient(to bottom, ${l.color}, transparent)`,
        zIndex: 0
      }, "RegisterPage")} />)}
        <svg className={css({
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 0,
        opacity: .9
      }, "RegisterPage")} viewBox="0 0 800 200" preserveAspectRatio="none">
          <path d="M0,150 Q30,120 60,138 Q90,118 120,135 Q155,115 185,130 Q215,115 245,132 Q278,115 308,130 Q340,116 370,132 Q400,118 430,132 Q462,116 492,130 Q522,116 552,130 Q582,118 612,132 Q643,117 673,130 Q703,118 733,132 Q763,118 800,125 L800,200 L0,200Z" fill="rgba(12,4,0,0.9)" />
          <path d="M0,172 Q50,158 100,165 Q150,156 200,164 Q250,156 300,164 Q350,157 400,165 Q450,157 500,164 Q550,157 600,165 Q650,158 700,164 Q750,157 800,163 L800,200 L0,200Z" fill="rgba(6,2,0,0.97)" />
        </svg>
        <div className="auth-panel--left__overlay" />
        <div className="auth-panel--left__content">
          <div className="auth-panel--left__logo">
            <span className="auth-panel--left__logo-icon">⚡</span>
            <span className="auth-panel--left__logo-text">TicketRush</span>
          </div>
          <h1 className="auth-panel--left__title">
            Tham gia cộng đồng<br />hàng triệu người dùng
          </h1>
          <p className="auth-panel--left__subtitle">
            Đăng ký để đặt vé nhanh, theo dõi sự kiện<br />và nhận thông báo ưu tiên.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-panel--right">
        <div className="auth-form-wrap">
          <h2>Tạo tài khoản</h2>
          <p className="auth-form-wrap__sub">
            Đã có tài khoản?{' '}
            <Link to="/login">Đăng nhập</Link>
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Họ và tên</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Nguyễn Văn A" autoComplete="name" className={`auth-input${errors.fullName ? ' auth-input--error' : ''}`} />
              {errors.fullName && <p className="auth-field__error">{errors.fullName}</p>}
            </div>

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="example@email.com" autoComplete="email" className={`auth-input${errors.email ? ' auth-input--error' : ''}`} />
              {errors.email && <p className="auth-field__error">{errors.email}</p>}
            </div>

            <div className="auth-field">
              <label className="auth-label">Mật khẩu</label>
              <div className="auth-field__pw-wrap">
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="Tối thiểu 8 ký tự" autoComplete="new-password" className={`auth-input auth-input--password${errors.password ? ' auth-input--error' : ''}`} />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="auth-field__pw-toggle">
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
              {errors.password && <p className="auth-field__error">{errors.password}</p>}
            </div>

            <div className="auth-field">
              <label className="auth-label">Xác nhận mật khẩu</label>
              <div className="auth-field__pw-wrap">
                <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Nhập lại mật khẩu" autoComplete="new-password" className={`auth-input auth-input--password${errors.confirmPassword ? ' auth-input--error' : ''}`} />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="auth-field__pw-toggle">
                  {showConfirm ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
              {errors.confirmPassword && <p className="auth-field__error">{errors.confirmPassword}</p>}
            </div>

            <div className="auth-field">
              <label className="auth-label">Ngày sinh</label>
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} className={cx(`auth-input${errors.dob ? ' auth-input--error' : ''}`, css({
              colorScheme: 'dark'
            }, "RegisterPage"))} />
              {errors.dob && <p className="auth-field__error">{errors.dob}</p>}
            </div>

            <div className="auth-field">
              <label className="auth-label">Giới tính</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className={cx("auth-input", css({
              cursor: 'pointer'
            }, "RegisterPage"))}>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <button type="submit" disabled={isLoading} className="auth-submit">
              {isLoading && <svg className={css({
              width: 20,
              height: 20,
              animation: 'spin 1s linear infinite'
            }, "RegisterPage")} fill="none" viewBox="0 0 24 24">
                  <circle className={css({
                opacity: .25
              }, "RegisterPage")} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className={css({
                opacity: .75
              }, "RegisterPage")} fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>}
              {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </form>

          <p className="auth-footer-link">
            Đã có tài khoản?{' '}
            <Link to="/login">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>;
}
