import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const initials = (user?.fullName || user?.name || 'A').slice(0, 2).toUpperCase();

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = () => { logout(); navigate('/login'); };

  const NavItem = ({ to, icon, label, badge }) => {
    const active = location.pathname === to || (to !== '/admin/dashboard' && isActive(to));
    return (
      <Link to={to} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        borderRadius: 8, marginBottom: 2, fontSize: 13, fontWeight: 600,
        textDecoration: 'none', transition: 'background .2s, color .2s',
        background: active ? '#FF6B35' : 'transparent',
        color: active ? '#fff' : '#AAAAAA',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#242424'; e.currentTarget.style.color = '#fff'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#AAAAAA'; } }}
      >
        <span style={{ flexShrink: 0, opacity: active ? 1 : 0.85 }}>{icon}</span>
        {label}
        {badge != null && (
          <span style={{
            marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100,
            background: active ? 'rgba(255,255,255,.2)' : '#333333',
            color: active ? '#fff' : '#AAAAAA',
          }}>{badge}</span>
        )}
      </Link>
    );
  };

  const SectionLabel = ({ label }) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#333333', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '12px 8px 6px' }}>
      {label}
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Be Vietnam Pro', sans-serif", background: '#1A1A1A' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 240, flexShrink: 0, background: '#111111',
        borderRight: '1px solid #333333',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>

        {/* Logo */}
        <Link to="/admin/dashboard" style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '24px 20px 20px',
          textDecoration: 'none', borderBottom: '1px solid #333333',
        }}>
          <span style={{ color: '#FF6B35', fontSize: 20 }}>⚡</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>TicketRush</span>
        </Link>

        {/* Admin profile */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #333333', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: '#FF6B35',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0,
            border: '2px solid rgba(255,107,53,.3)',
          }}>{initials}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, color: '#fff' }}>{user?.fullName || user?.name || 'Admin'}</div>
            <div style={{
              fontSize: 10, color: '#FF6B35', fontWeight: 700,
              background: 'rgba(255,107,53,.12)', border: '1px solid rgba(255,107,53,.25)',
              padding: '1px 7px', borderRadius: 100, display: 'inline-block', marginTop: 3, letterSpacing: .3,
            }}>Quản trị viên</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 12px' }}>
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

        {/* Logout */}
        <div style={{ padding: '12px 12px', borderTop: '1px solid #333333' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: '#AAAAAA', background: 'transparent', border: 'none',
              fontFamily: 'inherit', width: '100%', transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.1)'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#AAAAAA'; }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1A1A1A' }}>
        {children}
      </div>
    </div>
  );
}
