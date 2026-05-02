import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Header.css';

export default function Header() {
  const { user, logout } = useAuth();
  const avatarUrl = user?.avatarUrl;
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setOpenUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/?search=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleLogout = () => {
    setOpenUserMenu(false);
    logout();
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
            onClick={() =>
              search.trim() &&
              navigate(`/?search=${encodeURIComponent(search.trim())}`)
            }
            className="header__search-btn"
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
          </button>
        </div>

        <div className="header__actions">
          {!user ? (
            <>
              <Link to="/login" className="header__btn header__btn--outline">
                Đăng nhập
              </Link>
              <Link to="/register" className="header__btn header__btn--accent">
                Đăng ký
              </Link>
            </>
          ) : (
            <div className="header__user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="header__account-btn"
                onClick={() => setOpenUserMenu((prev) => !prev)}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="header__avatar-img"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : (
                  <span className="header__avatar-circle">
                    {user.fullName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}

                <span className="header__account-name">
                  Tài khoản
                </span>

                <span className="header__account-arrow">▾</span>
              </button>

              {openUserMenu && (
                <div className="header__dropdown">
                  {user.role === 'CUSTOMER' && (
                    <button
                      type="button"
                      className="header__dropdown-item"
                      onClick={() => {
                        setOpenUserMenu(false);
                        navigate('/my-tickets');
                      }}
                    >
                      Vé của tôi
                    </button>
                  )}

                  <button
                    type="button"
                    className="header__dropdown-item"
                    onClick={() => {
                      setOpenUserMenu(false);
                      alert('Trang tài khoản cá nhân đang phát triển');
                    }}
                  >
                    Tài khoản cá nhân
                  </button>

                  {user.role === 'ADMIN' && (
                    <button
                      type="button"
                      className="header__dropdown-item"
                      onClick={() => {
                        setOpenUserMenu(false);
                        navigate('/admin');
                      }}
                    >
                      Admin Dashboard
                    </button>
                  )}

                  <button
                    type="button"
                    className="header__dropdown-item header__dropdown-item--danger"
                    onClick={handleLogout}
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
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
          <Link key={label} to={path} className="header-nav__link">
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}