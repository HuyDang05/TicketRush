import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useCart } from '../../context/CartContext';
import { useLang } from '../../context/LangContext';
import eventService from '../../services/event.service';
import { MAX_SEARCH_LENGTH } from '../../utils/inputValidation';
import './Header.css';

export default function Header() {
  const { lang, changeLang, t } = useLang();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { cartCount } = useCart();
  const avatarUrl = user?.avatarUrl;
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [allEvents, setAllEvents] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [currentLang, setCurrentLang] = useState('vi');
  const langMenuRef = useRef(null);

  useEffect(() => {
    eventService.getEvents({}).then(r => setAllEvents(r.data.events || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (location.pathname !== '/events') return;
    const params = new URLSearchParams(location.search);
    setSearch((params.get('search') || '').slice(0, MAX_SEARCH_LENGTH));
  }, [location.pathname, location.search]);



  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setOpenUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizedSearch = search.trim().slice(0, MAX_SEARCH_LENGTH);
  const suggestions = normalizedSearch.length > 0
    ? allEvents.filter(e =>
        e.title.toLowerCase().includes(normalizedSearch.toLowerCase()) ||
        (e.venue && e.venue.toLowerCase().includes(normalizedSearch.toLowerCase()))
      ).slice(0, 8)
    : [];

  const navigateToEventsSearch = (query) => {
    const params = new URLSearchParams(location.pathname === '/events' ? location.search : '');
    params.set('page', '1');

    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }

    const queryString = params.toString();
    navigate(`/events${queryString ? `?${queryString}` : ''}`);
  };

  const handleSearchChange = (e) => {
    const nextSearch = e.target.value.slice(0, MAX_SEARCH_LENGTH);
    setSearch(nextSearch);
    setShowDropdown(true);

    if (location.pathname === '/events' && !nextSearch.trim()) {
      const params = new URLSearchParams(location.search);
      if (params.has('search')) {
        navigateToEventsSearch('');
      }
    }
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && normalizedSearch) {
      setShowDropdown(false);
      navigateToEventsSearch(normalizedSearch);
    }
    if (e.key === 'Escape') setShowDropdown(false);
  };

  const handleSuggestionClick = (event) => {
    setSearch('');
    setShowDropdown(false);
    navigate(`/events/${event.id}`);
  };

  const handleLogout = () => {
    setOpenUserMenu(false);
    logout();
  };

  const handleLangChange = (newLang) => {
    changeLang(newLang);
    setShowLangDropdown(false);
  };

  const langIconVi = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#DA251D"/>
      <path d="M12 5.5L13.7849 10.9934H19.5635L14.8893 14.3882L16.6742 19.8816L12 16.4868L7.32582 19.8816L9.1107 14.3882L4.43653 10.9934H10.2151L12 5.5Z" fill="#FFFF00"/>
    </svg>
  );

  const langIconEn = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#012169"/>
      <path d="M22.39 6H1.61L12 12L22.39 6Z" fill="#C8102E"/>
      <path d="M22.39 18H1.61L12 12L22.39 18Z" fill="#C8102E"/>
      <path d="M6 1.61V22.39L12 12L6 1.61Z" fill="#C8102E"/>
      <path d="M18 1.61V22.39L12 12L18 1.61Z" fill="#C8102E"/>
      <path d="M10 0V24H14V0H10Z" fill="#FFF"/>
      <path d="M0 10H24V14H0V10Z" fill="#FFF"/>
      <path d="M11 0V24H13V0H11Z" fill="#C8102E"/>
      <path d="M0 11H24V13H0V11Z" fill="#C8102E"/>
    </svg>
  );

  function removeVietnameseTones(str = '') {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  return (
    <>
      <header className="header">
        <Link to="/" className="header__logo">
          <span className="header__logo-icon">⚡</span>
          <span className="header__logo-text">TicketRush</span>
        </Link>

        <div className="header__search" ref={searchRef}>
          <input
            type="text"
            placeholder={t("Tìm kiếm sự kiện, nghệ sĩ...")}
            value={search}
            maxLength={MAX_SEARCH_LENGTH}
            onChange={handleSearchChange}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleSearch}
            className="header__search-input"
          />
          <button
            onClick={() => {
              if (normalizedSearch) {
                setShowDropdown(false);
                navigateToEventsSearch(normalizedSearch);
              } else if (location.pathname === '/events') {
                navigateToEventsSearch('');
              }
            }}
            className="header__search-btn"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
          </button>

          {showDropdown && suggestions.length > 0 && (
            <div className="search-dropdown">
              {suggestions.map((event) => (
                <button
                  key={event.id}
                  className="search-dropdown__item"
                  onMouseDown={() => handleSuggestionClick(event)}
                >
                  <div className="search-dropdown__thumb">
                    {event.imageUrl
                      ? <img src={event.imageUrl} alt="" />
                      : <span>🎤</span>
                    }
                  </div>
                  <div className="search-dropdown__info">
                    <div className="search-dropdown__title">{event.title}</div>
                    <div className="search-dropdown__venue">{event.venue}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="header__actions">
          <div className="header__lang-menu" ref={langMenuRef}>
            <button
              type="button"
              className="header__theme-toggle header__lang-btn"
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              title={t("Ngôn ngữ")}
            >
              {lang === 'vi' ? langIconVi : langIconEn}
              <span className="header__account-arrow" style={{ marginLeft: 4, marginRight: -4 }}>▾</span>
            </button>
            {showLangDropdown && (
              <div className="header__dropdown">
                <button
                  className="header__dropdown-item"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: lang === 'vi' ? 600 : 400 }}
                  onClick={() => handleLangChange('vi')}
                >
                  {langIconVi} {t("Tiếng Việt")}
                </button>
                <button
                  className="header__dropdown-item"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: lang === 'en' ? 600 : 400 }}
                  onClick={() => handleLangChange('en')}
                >
                  {langIconEn} {t("English")}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="header__theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Chuyen sang theme sang' : 'Chuyen sang theme toi'}
            title={theme === 'dark' ? 'Theme sang' : 'Theme toi'}
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 4.75a1 1 0 0 1 1 1V7a1 1 0 1 1-2 0V5.75a1 1 0 0 1 1-1zM12 17a1 1 0 0 1 1 1v1.25a1 1 0 1 1-2 0V18a1 1 0 0 1 1-1zm7.25-5a1 1 0 0 1 1 1 1 1 0 0 1-1 1H18a1 1 0 1 1 0-2h1.25zM6 12a1 1 0 0 1-1 1H3.75a1 1 0 1 1 0-2H5a1 1 0 0 1 1 1zm10.35-5.6a1 1 0 0 1 1.42 0l.9.9a1 1 0 1 1-1.42 1.42l-.9-.9a1 1 0 0 1 0-1.42zm-9.9 9.9a1 1 0 0 1 1.42 0l.9.9a1 1 0 1 1-1.42 1.42l-.9-.9a1 1 0 0 1 0-1.42zm11.32 1.32a1 1 0 0 1 1.42-1.42l.9.9a1 1 0 0 1-1.42 1.42l-.9-.9zM6.54 6.54a1 1 0 0 1 1.42 0l.9.9a1 1 0 1 1-1.42 1.42l-.9-.9a1 1 0 0 1 0-1.42zM12 8.25A3.75 3.75 0 1 1 8.25 12 3.75 3.75 0 0 1 12 8.25z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3a.75.75 0 0 0-.86.97A6.5 6.5 0 0 0 17 15.36a.75.75 0 0 0 .97-.86A8.46 8.46 0 0 1 21 14.5z" />
              </svg>
            )}
          </button>
          
          {user && (
            <button
              onClick={() => navigate('/cart')}
              className="header__cart-btn"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40 }}
              title={lang === 'en' ? 'Cart' : 'Giỏ hàng'}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {!user ? (
            <>
              <Link to="/login" className="header__btn header__btn--outline">
                {t("Đăng nhập")}
              </Link>
              <Link to="/register" className="header__btn header__btn--accent">
                {t("Đăng ký")}
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
                  {lang === 'en' ? 'Account' : 'Tài khoản'}
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
                      {lang === 'en' ? 'My tickets' : 'Vé của tôi'}
                    </button>
                  )}

                  <button
                    type="button"
                    className="header__dropdown-item"
                    onClick={() => {
                      setOpenUserMenu(false);
                      navigate('/account');
                    }}
                  >
                    {lang === 'en' ? 'Personal account' : 'Tài khoản cá nhân'}
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
                    {lang === 'en' ? 'Log out' : 'Đăng xuất'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
