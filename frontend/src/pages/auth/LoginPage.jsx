import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { markLatestEventBannerForLogin } from '../../components/event/LatestEventLoginBanner';
import { emailRegex, MAX_EMAIL_LENGTH } from '../../utils/inputValidation';
import './auth.css';
import { css, cx } from "../../lib/runtimeCss";
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const MINI_EVENTS = [{
  emoji: '🎤',
  title: 'Sky Tour 2026',
  date: '15/06/2026',
  bg: 'linear-gradient(135deg,#2d1000,#8b3500)'
}, {
  emoji: '🎹',
  title: 'Giao hưởng HN',
  date: '22/06/2026',
  bg: 'linear-gradient(135deg,#001a2d,#004d8b)'
}, {
  emoji: '🎪',
  title: 'Sài Gòn Fest',
  date: '05/07/2026',
  bg: 'linear-gradient(135deg,#1a001a,#6a006a)'
}];
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
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    login,
    isLoading,
    error
  } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async e => {
    e.preventDefault();
    setLocalError('');
    const email = formData.email.trim().toLowerCase();
    if (!emailRegex.test(email) || email.length > MAX_EMAIL_LENGTH || !formData.password) {
      setLocalError('Email hoặc mật khẩu không hợp lệ');
      return;
    }
    try {
      const data = await login(email, formData.password);
      const role = data?.user?.role || data?.role || 'CUSTOMER';
      if (role === 'ADMIN') {
        navigate('/admin/dashboard', {
          replace: true
        });
        return;
      }
      markLatestEventBannerForLogin();
      const from = location.state?.from?.pathname || '/';
      navigate(from, {
        replace: true
      });
    } catch (err) {
      console.error('Login failed:', err);
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
        opacity: 0.12,
        transformOrigin: 'top center',
        transform: `rotate(${l.rot})`,
        background: `linear-gradient(to bottom, ${l.color}, transparent)`,
        zIndex: 0
      }, "LoginPage")} />)}
        <svg className={css({
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 0,
        opacity: .9
      }, "LoginPage")} viewBox="0 0 800 200" preserveAspectRatio="none">
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
            Hàng ngàn sự kiện<br />đang chờ bạn
          </h1>
          <p className="auth-panel--left__subtitle">
            Đặt vé nhanh chóng, an toàn, tiện lợi<br />— mọi lúc, mọi nơi.
          </p>
          <div className="auth-panel--left__cards">
            {MINI_EVENTS.map((ev, i) => <MiniCard key={i} ev={ev} />)}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-panel--right">
        <div className="auth-form-wrap">
          <h2>Đăng nhập</h2>
          <p className="auth-form-wrap__sub">
            Chưa có tài khoản?{' '}
            <Link to="/register">Đăng ký ngay</Link>
          </p>

          {(localError || error) && <div className="auth-error">{localError || error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="example@email.com" autoComplete="email" required className="auth-input" />
            </div>

            <div className="auth-field">
              <label className="auth-label">Mật khẩu</label>
              <div className="auth-field__pw-wrap">
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="Tối thiểu 6 ký tự" autoComplete="current-password" required className="auth-input auth-input--password" />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="auth-field__pw-toggle">
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
              <Link to="/forgot-password" className={cx("auth-forgot-link", css({
              alignSelf: 'flex-end',
              marginTop: '8px'
            }, "LoginPage"))}>Quên mật khẩu?</Link>
            </div>

            <button type="submit" disabled={isLoading} className={cx("auth-submit", css({
            marginTop: '16px'
          }, "LoginPage"))}>
              {isLoading && <svg className={cx("animate-spin", css({
              width: 20,
              height: 20
            }, "LoginPage"))} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className={css({
                opacity: .25
              }, "LoginPage")} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className={css({
                opacity: .75
              }, "LoginPage")} fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>}
              {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="auth-divider"><span>hoặc</span></div>

          <div className="auth-social-row">
            <a href={`${API_BASE}/auth/google`} className="auth-social-btn auth-social-btn--google">
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              Google
            </a>
            <a href={`${API_BASE}/auth/facebook`} className="auth-social-btn auth-social-btn--facebook">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.696 4.533-4.696 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
              </svg>
              Facebook
            </a>
          </div>

          <p className="auth-terms">
            Bằng cách đăng nhập, bạn đồng ý với{' '}
            <a href="#">Điều khoản dịch vụ</a> và{' '}
            <a href="#">Chính sách bảo mật</a> của TicketRush.
          </p>

          <p className="auth-footer-link">
            Chưa có tài khoản?{' '}
            <Link to="/register">Đăng ký ngay</Link>
          </p>
        </div>
      </div>
    </div>;
}
function MiniCard({
  ev
}) {
  return <div className="mini-card">
      <div className={cx("mini-card__img", css({
      background: ev.bg
    }, "LoginPage"))}>
        {ev.emoji}
      </div>
      <div className="mini-card__body">
        <div className="mini-card__title">{ev.title}</div>
        <div className="mini-card__date">{ev.date}</div>
      </div>
    </div>;
}
