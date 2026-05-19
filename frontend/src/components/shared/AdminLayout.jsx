import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import '../../pages/admin/admin.css';


export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const initials = (user?.fullName || user?.name || 'A').slice(0, 2).toUpperCase();

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = () => { logout(); navigate('/login'); };

  const NavItem = ({ to, icon, label, badge }) => {
    const active = location.pathname === to || (to !== '/admin/dashboard' && isActive(to));
    return (
      <Link to={to} className={`admin-nav-item${active ? ' admin-nav-item--active' : ''}`}>
        <span style={{ flexShrink: 0, opacity: active ? 1 : 0.85 }}>{icon}</span>
        {label}
        {badge != null && (
          <span className={`admin-nav-badge${active ? ' admin-nav-badge--active' : ''}`}>{badge}</span>
        )}
      </Link>
    );
  };

  const SectionLabel = ({ label }) => (
    <div className="admin-nav-section-label">{label}</div>
  );

  return (
    <div className="admin-layout">

      {/* ── SIDEBAR ── */}
      <aside className="admin-sidebar">

        {/* Logo */}
        <Link to="/admin/dashboard" className="admin-sidebar__logo">
          <span className="admin-sidebar__logo-icon">⚡</span>
          <span className="admin-sidebar__logo-text">TicketRush</span>
        </Link>

        {/* Admin profile */}
        <div className="admin-sidebar__profile">
          <div className="admin-sidebar__avatar">{initials}</div>
          <div>
            <div className="admin-sidebar__profile-name">{user?.fullName || user?.name || 'Admin'}</div>
            <div className="admin-sidebar__profile-role">Quản trị viên</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="admin-sidebar__nav">
          <SectionLabel label="Tổng quan" />
          <NavItem to="/admin/dashboard" label="Tổng quan" icon={
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          } />

          <SectionLabel label="Quản lý" />
          <NavItem to="/admin/events" label="Sự kiện" badge={12} icon={
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          } />
          <NavItem to="/admin/revenue" label="Doanh thu" icon={
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          } />
          <NavItem to="/admin/users" label="Khán giả" icon={
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          } />
          <NavItem to="/admin/tickets" label="Quản lý vé" icon={
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 9V7a2 2 0 012-2h16a2 2 0 012 2v2M2 9a2 2 0 000 4v2a2 2 0 002 2h16a2 2 0 002-2v-2a2 2 0 000-4M2 9h20"/><circle cx="17" cy="12" r="1" fill="currentColor"/></svg>
          } />

          <SectionLabel label="Cài đặt" />
          <NavItem to="/admin/settings" label="Cài đặt" icon={
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          } />
        </nav>

        {/* Bottom: theme toggle + logout */}
        <div className="admin-sidebar__footer">
          <button
            className="admin-sidebar__theme-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang theme sáng' : 'Chuyển sang theme tối'}
          >
            {theme === 'dark' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.75a1 1 0 0 1 1 1V7a1 1 0 1 1-2 0V5.75a1 1 0 0 1 1-1zM12 17a1 1 0 0 1 1 1v1.25a1 1 0 1 1-2 0V18a1 1 0 0 1 1-1zm7.25-5a1 1 0 0 1 1 1 1 1 0 0 1-1 1H18a1 1 0 1 1 0-2h1.25zM6 12a1 1 0 0 1-1 1H3.75a1 1 0 1 1 0-2H5a1 1 0 0 1 1 1zm10.35-5.6a1 1 0 0 1 1.42 0l.9.9a1 1 0 1 1-1.42 1.42l-.9-.9a1 1 0 0 1 0-1.42zm-9.9 9.9a1 1 0 0 1 1.42 0l.9.9a1 1 0 1 1-1.42 1.42l-.9-.9a1 1 0 0 1 0-1.42zm11.32 1.32a1 1 0 0 1 1.42-1.42l.9.9a1 1 0 0 1-1.42 1.42l-.9-.9zM6.54 6.54a1 1 0 0 1 1.42 0l.9.9a1 1 0 1 1-1.42 1.42l-.9-.9a1 1 0 0 1 0-1.42zM12 8.25A3.75 3.75 0 1 1 8.25 12 3.75 3.75 0 0 1 12 8.25z" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3a.75.75 0 0 0-.86.97A6.5 6.5 0 0 0 17 15.36a.75.75 0 0 0 .97-.86A8.46 8.46 0 0 1 21 14.5z" />
              </svg>
            )}
            <span>{theme === 'dark' ? 'Theme sáng' : 'Theme tối'}</span>
          </button>

          <button onClick={handleLogout} className="admin-sidebar__logout-btn">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── CONTENT ── */}
      <div className="admin-content">
        {children}
      </div>
    </div>
  );
}
