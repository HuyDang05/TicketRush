import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const MINI_EVENTS = [
  { emoji: '🎤', title: 'Sky Tour 2026',   date: '15/06/2026', bg: 'linear-gradient(135deg,#2d1000,#8b3500)' },
  { emoji: '🎹', title: 'Giao hưởng HN',   date: '22/06/2026', bg: 'linear-gradient(135deg,#001a2d,#004d8b)' },
  { emoji: '🎪', title: 'Sài Gòn Fest',    date: '05/07/2026', bg: 'linear-gradient(135deg,#1a001a,#6a006a)' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = { email: '', password: '' };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = 'Vui lòng nhập email hợp lệ';
    if (password.length < 6)
      errs.password = 'Mật khẩu phải có ít nhất 6 ký tự';

    if (errs.email || errs.password) { setFieldErr(errs); return; }

    try {
      const data = await login(formData.email, formData.password);
      const role = data?.user?.role || data?.role || 'CUSTOMER';

      if (role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
        return;
      }

      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login failed:', err);
      // error is displayed from auth hook
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

          <div>
            <label className="block text-sm font-semibold mb-2">Mật khẩu</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-2 text-sm text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Đăng ký ngay
          </Link>
        </p>
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
