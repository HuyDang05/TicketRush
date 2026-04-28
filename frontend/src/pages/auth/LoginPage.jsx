import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const MINI_EVENTS = [
  { emoji: '🎤', title: 'Sky Tour 2026',   date: '15/06/2026', bg: 'linear-gradient(135deg,#2d1000,#8b3500)' },
  { emoji: '🎹', title: 'Giao hưởng HN',   date: '22/06/2026', bg: 'linear-gradient(135deg,#001a2d,#004d8b)' },
  { emoji: '🎪', title: 'Sài Gòn Fest',    date: '05/07/2026', bg: 'linear-gradient(135deg,#1a001a,#6a006a)' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [fieldErr, setFieldErr] = useState({ email: '', password: '' });
  const [success,  setSuccess]  = useState(false);

  const clearFieldErr = (field) =>
    setFieldErr(prev => ({ ...prev, [field]: '' }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = { email: '', password: '' };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = 'Vui lòng nhập email hợp lệ';
    if (password.length < 6)
      errs.password = 'Mật khẩu phải có ít nhất 6 ký tự';

    if (errs.email || errs.password) { setFieldErr(errs); return; }

    try {
      await login(email, password);
      setSuccess(true);
      setTimeout(() => navigate('/'), 1200);
    } catch {
      // error shown via useAuth error state
    }
  };

  return (
    <div style={{ display:'flex', minHeight:'calc(100vh - 64px)' }}>

      {/* ── LEFT PANEL ── */}
      <div style={{
        width:'50%', position:'relative', background:'#111111',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        overflow:'hidden', padding:'60px 48px',
      }}>
        {/* Concert bg */}
        <div style={{
          position:'absolute', inset:0, zIndex:0,
          background:'radial-gradient(ellipse at 55% 35%, #3a1500 0%, #1a0800 40%, #080808 100%)',
        }} />
        {/* Stage lights */}
        {[
          { left:'15%', transform:'rotate(-20deg)', color:'#FF6B35' },
          { left:'35%', transform:'rotate(-6deg)',  color:'#fff' },
          { left:'56%', transform:'rotate(10deg)',  color:'#FF6B35' },
          { left:'72%', transform:'rotate(24deg)',  color:'#fff' },
        ].map((l, i) => (
          <div key={i} style={{
            position:'absolute', top:0, left:l.left, width: i===3?150:i===1?200:180,
            height:'100%', opacity:.12, transformOrigin:'top center', transform:l.transform,
            background:`linear-gradient(to bottom, ${l.color}, transparent)`, zIndex:0,
          }} />
        ))}
        {/* Crowd */}
        <svg style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:0, opacity:.9 }}
          viewBox="0 0 800 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,150 Q30,120 60,138 Q90,118 120,135 Q155,115 185,130 Q215,115 245,132 Q278,115 308,130 Q340,116 370,132 Q400,118 430,132 Q462,116 492,130 Q522,116 552,130 Q582,118 612,132 Q643,117 673,130 Q703,118 733,132 Q763,118 800,125 L800,200 L0,200Z" fill="rgba(12,4,0,0.9)"/>
          <path d="M0,172 Q50,158 100,165 Q150,156 200,164 Q250,156 300,164 Q350,157 400,165 Q450,157 500,164 Q550,157 600,165 Q650,158 700,164 Q750,157 800,163 L800,200 L0,200Z" fill="rgba(6,2,0,0.97)"/>
        </svg>
        {/* Overlay */}
        <div style={{
          position:'absolute', inset:0, zIndex:1,
          background:'linear-gradient(to top, rgba(0,0,0,.7) 0%, rgba(0,0,0,.35) 100%)',
        }} />

        {/* Content */}
        <div style={{ position:'relative', zIndex:2, textAlign:'center', maxWidth:420 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:32 }}>
            <span style={{ fontSize:32, color:'#FF6B35', filter:'drop-shadow(0 0 12px rgba(255,107,53,.5))' }}>⚡</span>
            <span style={{ fontSize:28, fontWeight:800, color:'#fff', letterSpacing:'-.5px' }}>TicketRush</span>
          </div>
          <h1 style={{ fontSize:28, fontWeight:800, lineHeight:1.2, marginBottom:12 }}>
            Hàng ngàn sự kiện<br />đang chờ bạn
          </h1>
          <p style={{ fontSize:15, color:'#AAAAAA', lineHeight:1.6, marginBottom:40 }}>
            Đặt vé nhanh chóng, an toàn, tiện lợi<br />— mọi lúc, mọi nơi.
          </p>

          {/* Mini event cards */}
          <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
            {MINI_EVENTS.map((ev, i) => (
              <MiniCard key={i} ev={ev} />
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{
        width:'50%', background:'#1A1A1A',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'60px 48px',
      }}>
        <div style={{ width:'100%', maxWidth:400 }}>
          <h2 style={{ fontSize:28, fontWeight:800, marginBottom:8 }}>Đăng nhập</h2>
          <p style={{ fontSize:14, color:'#AAAAAA', marginBottom:28 }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color:'#FF6B35', textDecoration:'none', fontWeight:600 }}>
              Đăng ký ngay
            </Link>
          </p>

          {/* Success */}
          {success && (
            <div style={{
              background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.3)',
              borderRadius:8, padding:'12px 16px', fontSize:13, fontWeight:600,
              color:'#4ade80', marginBottom:16,
            }}>
              ✓ &nbsp;Đăng nhập thành công! Đang chuyển hướng...
            </div>
          )}

          {/* API error */}
          {error && !success && (
            <div style={{
              background:'rgba(248,113,113,.12)', border:'1px solid rgba(248,113,113,.3)',
              borderRadius:8, padding:'12px 16px', fontSize:13, fontWeight:600,
              color:'#f87171', marginBottom:16,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:13, color:'#AAAAAA', fontWeight:600, marginBottom:7, letterSpacing:'.2px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); clearFieldErr('email'); }}
                placeholder="ten@email.com"
                autoComplete="email"
                style={{
                  width:'100%', background:'#242424',
                  border:`1px solid ${fieldErr.email ? '#f87171' : '#333333'}`,
                  borderRadius:8, padding:'12px 16px', color:'#FFFFFF',
                  fontFamily:"'Be Vietnam Pro', sans-serif", fontSize:14, outline:'none',
                  transition:'border-color .2s, box-shadow .2s',
                  boxSizing:'border-box',
                }}
                onFocus={e => { e.target.style.borderColor='#FF6B35'; e.target.style.boxShadow='0 0 0 3px rgba(255,107,53,.1)'; }}
                onBlur={e => { e.target.style.borderColor = fieldErr.email ? '#f87171' : '#333333'; e.target.style.boxShadow='none'; }}
              />
              {fieldErr.email && (
                <div style={{ fontSize:12, color:'#f87171', marginTop:6 }}>{fieldErr.email}</div>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:13, color:'#AAAAAA', fontWeight:600, marginBottom:7, letterSpacing:'.2px' }}>
                Mật khẩu
              </label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearFieldErr('password'); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width:'100%', background:'#242424',
                    border:`1px solid ${fieldErr.password ? '#f87171' : '#333333'}`,
                    borderRadius:8, padding:'12px 44px 12px 16px', color:'#FFFFFF',
                    fontFamily:"'Be Vietnam Pro', sans-serif", fontSize:14, outline:'none',
                    transition:'border-color .2s, box-shadow .2s',
                    boxSizing:'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor='#FF6B35'; e.target.style.boxShadow='0 0 0 3px rgba(255,107,53,.1)'; }}
                  onBlur={e => { e.target.style.borderColor = fieldErr.password ? '#f87171' : '#333333'; e.target.style.boxShadow='none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position:'absolute', right:0, top:0, bottom:0, width:44,
                    background:'transparent', border:'none', cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'#AAAAAA',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color='#FFFFFF'}
                  onMouseLeave={e => e.currentTarget.style.color='#AAAAAA'}
                >
                  {showPw ? (
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:7 }}>
                <a href="#" style={{ fontSize:13, color:'#FF6B35', textDecoration:'none', fontWeight:600 }}>
                  Quên mật khẩu?
                </a>
              </div>
              {fieldErr.password && (
                <div style={{ fontSize:12, color:'#f87171', marginTop:6 }}>{fieldErr.password}</div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || success}
              style={{
                width:'100%', height:48, background: isLoading || success ? '#e85a24' : '#FF6B35',
                border:'none', borderRadius:8, color:'#fff',
                fontFamily:"'Be Vietnam Pro', sans-serif", fontSize:15, fontWeight:700,
                cursor: isLoading || success ? 'not-allowed' : 'pointer',
                transition:'background .2s, transform .15s',
                boxShadow:'0 4px 20px rgba(255,107,53,.3)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                marginBottom:24, opacity: isLoading || success ? .75 : 1,
              }}
              onMouseEnter={e => { if (!isLoading && !success) e.currentTarget.style.background='#e85a24'; }}
              onMouseLeave={e => { if (!isLoading && !success) e.currentTarget.style.background='#FF6B35'; }}
            >
              {isLoading && (
                <svg style={{ animation:'spin .7s linear infinite', flexShrink:0 }} width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,.3)" strokeWidth="2"/>
                  <path d="M9 2a7 7 0 017 7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </svg>
              )}
              {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ flex:1, height:1, background:'#333333' }} />
            <span style={{ fontSize:12, color:'#AAAAAA', fontWeight:500, flexShrink:0 }}>hoặc</span>
            <div style={{ flex:1, height:1, background:'#333333' }} />
          </div>

          {/* Social */}
          <div style={{ display:'flex', gap:12, marginBottom:24 }}>
            <SocialBtn icon={<GoogleIcon />} label="Google" />
            <SocialBtn icon={<FacebookIcon />} label="Facebook" />
          </div>

          {/* Note */}
          <p style={{ fontSize:12, color:'#AAAAAA', textAlign:'center', lineHeight:1.7 }}>
            Bằng cách đăng nhập, bạn đồng ý với{' '}
            <a href="#" style={{ color:'#AAAAAA', textDecoration:'underline' }}>Điều khoản dịch vụ</a>
            {' '}và{' '}
            <a href="#" style={{ color:'#AAAAAA', textDecoration:'underline' }}>Chính sách bảo mật</a>
            {' '}của TicketRush.
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ ev }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width:110, borderRadius:10, overflow:'hidden',
        border:`1px solid ${hovered ? '#FF6B35' : 'rgba(255,255,255,.1)'}`,
        transition:'transform .2s, border-color .2s', cursor:'pointer',
        flexShrink:0, transform: hovered ? 'translateY(-4px)' : 'none',
      }}
    >
      <div style={{ height:64, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, background:ev.bg }}>
        {ev.emoji}
      </div>
      <div style={{ background:'rgba(0,0,0,.6)', backdropFilter:'blur(6px)', padding:'6px 8px' }}>
        <div style={{ fontSize:10, fontWeight:700, lineHeight:1.3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {ev.title}
        </div>
        <div style={{ fontSize:9, color:'#FF6B35', marginTop:2, fontWeight:600 }}>{ev.date}</div>
      </div>
    </div>
  );
}

function SocialBtn({ icon, label }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex:1, height:44, background: hovered ? '#2a2a2a' : '#242424',
        border:`1px solid ${hovered ? 'rgba(255,255,255,.2)' : '#333333'}`,
        borderRadius:8, color:'#FFFFFF',
        fontFamily:"'Be Vietnam Pro', sans-serif", fontSize:13, fontWeight:600,
        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
        gap:8, transition:'border-color .2s, background .2s',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
