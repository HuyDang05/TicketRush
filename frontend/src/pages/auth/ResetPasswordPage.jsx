// Purpose: Trang xac thuc nguoi dung va cac luong lien quan den tai khoan.
import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { validatePassword } from '../../utils/inputValidation';
import './auth.css';
import { css, cx } from "../../lib/runtimeCss";
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        password
      });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Link không hợp lệ hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };
  if (!token) {
    return <div className="auth-page auth-page--center">
        <div className="auth-form-wrap auth-form-wrap--card">
          <div className="auth-error">Link không hợp lệ.</div>
          <Link to="/login" className="auth-footer-link">Quay lại đăng nhập</Link>
        </div>
      </div>;
  }
  return <div className="auth-page auth-page--center">
      <div className="auth-form-wrap auth-form-wrap--card">
        <div className="auth-brand">
          <span className="auth-brand__icon">⚡</span>
          <span className="auth-brand__text">TicketRush</span>
        </div>

        {done ? <div className="auth-success-box">
            <div className="auth-success-box__icon">✅</div>
            <h3>Đặt lại thành công!</h3>
            <p>Mật khẩu của bạn đã được cập nhật. Đang chuyển về trang đăng nhập...</p>
          </div> : <>
            <h2>Đặt lại mật khẩu</h2>
            <p className="auth-form-wrap__sub">Nhập mật khẩu mới cho tài khoản của bạn.</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">Mật khẩu mới</label>
                <div className="auth-field__pw-wrap">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Tối thiểu 8 ký tự" required className="auth-input auth-input--password" />
                  <button type="button" onClick={() => setShowPw(s => !s)} className="auth-field__pw-toggle">
                    {showPw ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Xác nhận mật khẩu</label>
                <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Nhập lại mật khẩu" required className="auth-input" />
              </div>

              <button type="submit" disabled={isLoading} className="auth-submit">
                {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </button>
            </form>

            <p className={cx("auth-footer-link", css({
          marginTop: 16
        }, "ResetPasswordPage"))}>
              <Link to="/login">← Quay lại đăng nhập</Link>
            </p>
          </>}
      </div>
    </div>;
}
