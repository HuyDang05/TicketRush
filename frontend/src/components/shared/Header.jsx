import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

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
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--nav)',
        borderBottom: '1px solid var(--border)',
        height: 64, display: 'flex', alignItems: 'center',
        padding: '0 40px', gap: 24,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ color: 'var(--accent)', fontSize: 22, lineHeight: 1 }}>⚡</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>TicketRush</span>
        </Link>

        <div style={{ flex: 1, maxWidth: 480, margin: '0 auto', position: 'relative' }}>
          <input
            type="text"
            placeholder="Tìm kiếm sự kiện, nghệ sĩ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            style={{
              width: '100%',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 48px 10px 16px',
              color: 'var(--text)',
              fontFamily: 'inherit',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            onClick={() => search.trim() && navigate(`/?search=${encodeURIComponent(search.trim())}`)}
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 44,
              background: 'var(--accent)', border: 'none', borderRadius: '0 8px 8px 0',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
          {!user ? (
            <>
              <Link to="/login" style={{
                padding: '8px 18px', border: '1px solid #fff', borderRadius: 8,
                background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 500,
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
              }}>Đăng nhập</Link>
              <Link to="/register" style={{
                padding: '8px 18px', border: '1px solid var(--accent)', borderRadius: 8,
                background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600,
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
              }}>Đăng ký</Link>
            </>
          ) : (
            <>
              <span style={{ color: 'var(--muted)', fontSize: 14, display: 'flex', alignItems: 'center' }}>
                {user.fullName}
              </span>
              {user.role === 'CUSTOMER' && (
                <Link to="/my-tickets" style={{
                  padding: '8px 18px', border: '1px solid var(--border)', borderRadius: 8,
                  background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 500,
                  textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                }}>Vé của tôi</Link>
              )}
              {user.role === 'ADMIN' && (
                <Link to="/admin/dashboard" style={{
                  padding: '8px 18px', border: '1px solid var(--border)', borderRadius: 8,
                  background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 500,
                  textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                }}>Admin</Link>
              )}
              <button onClick={logout} style={{
                padding: '8px 18px', border: '1px solid #fff', borderRadius: 8,
                background: 'transparent', color: '#fff', fontFamily: 'inherit',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
              }}>Đăng xuất</button>
            </>
          )}
        </div>
      </header>

      <nav style={{
        background: 'var(--nav)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 40px', height: 44, gap: 4,
      }}>
        {[
          { label: 'Nhạc sống', path: '/?cat=music' },
          { label: 'Sân khấu & Nghệ thuật', path: '/?cat=theater' },
          { label: 'Thể Thao', path: '/?cat=sports' },
          { label: 'Hội thảo', path: '/?cat=conference' },
          { label: 'Khác', path: '/?cat=other' },
        ].map(({ label, path }) => (
          <Link key={label} to={path} style={{
            color: 'var(--text)', fontSize: 14, fontWeight: 500,
            textDecoration: 'none', padding: '0 16px', height: 44,
            display: 'flex', alignItems: 'center',
            borderBottom: '2px solid transparent',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderBottomColor = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderBottomColor = 'transparent'; }}
          >{label}</Link>
        ))}
      </nav>
    </>
  );
}
