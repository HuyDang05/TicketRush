import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { emailRegex, MAX_EMAIL_LENGTH } from '../../utils/inputValidation';
import './auth.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > MAX_EMAIL_LENGTH) {
      setError('Email không hợp lệ');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: normalizedEmail });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Đã có lỗi xảy ra, thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page--center">
      <div className="auth-form-wrap auth-form-wrap--card">
        <div className="auth-brand">
          <span className="auth-brand__icon">⚡</span>
          <span className="auth-brand__text">TicketRush</span>
        </div>

        {sent ? (
          <div className="auth-success-box">
            <div className="auth-success-box__icon">✉️</div>
            <h3>Kiểm tra hộp thư!</h3>
            <p>Chúng tôi đã gửi link đặt lại mật khẩu đến <strong>{email}</strong>. Link có hiệu lực trong 15 phút.</p>
            <Link to="/login" className="auth-submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginTop: 16 }}>
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <>
            <h2>Quên mật khẩu?</h2>
            <p className="auth-form-wrap__sub">Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  className="auth-input"
                />
              </div>
              <button type="submit" disabled={isLoading} className="auth-submit">
                {isLoading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
              </button>
            </form>

            <p className="auth-footer-link" style={{ marginTop: 16 }}>
              <Link to="/login">← Quay lại đăng nhập</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
