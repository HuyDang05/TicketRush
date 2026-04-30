import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Header.css';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleSearch = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <>
      <header className="header">
        <Link to="/" className="header__logo">
          <span className="header__logo-icon">⚡</span>
          <span className="header__logo-text">TicketRush</span>
        </Link>

        <div className="header__search">
          <input
            type="text"
            placeholder="Tìm kiếm sự kiện, nghệ sĩ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            className="header__search-input"
          />
          <button
            onClick={() => search.trim() && navigate(`/?search=${encodeURIComponent(search.trim())}`)}
            className="header__search-btn"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>
            </svg>
          </button>
        </div>

        <div className="header__actions">
          {!user ? (
            <>
              <Link to="/login" className="header__btn header__btn--outline">Đăng nhập</Link>
              <Link to="/register" className="header__btn header__btn--accent">Đăng ký</Link>
            </>
          ) : (
            <>
              <span className="header__avatar">
                <span className="header__avatar-circle">
                  {user.fullName?.charAt(0).toUpperCase()}
                </span>
                <span className="header__avatar-name">{user.fullName}</span>
              </span>
              {user.role === 'CUSTOMER' && (
                <Link to="/my-tickets" className="header__btn header__btn--ghost">Vé của tôi</Link>
              )}
              {user.role === 'ADMIN' && (
                <Link to="/admin" className="header__btn header__btn--admin">
                  <span className="header__admin-badge">ADMIN</span>
                  Dashboard
                </Link>
              )}
              <button onClick={logout} className="header__btn header__btn--outline">Đăng xuất</button>
            </>
          )}
        </div>
      </header>

      <nav className="header-nav">
        {[
          { label: 'Nhạc sống', path: '/?cat=music' },
          { label: 'Sân khấu & Nghệ thuật', path: '/?cat=theater' },
          { label: 'Thể Thao', path: '/?cat=sports' },
          { label: 'Hội thảo', path: '/?cat=conference' },
          { label: 'Khác', path: '/?cat=other' },
        ].map(({ label, path }) => (
          <Link key={label} to={path} className="header-nav__link">{label}</Link>
        ))}
      </nav>
    </>
  );
}
