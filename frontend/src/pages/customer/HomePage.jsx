import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EventCard from '../../components/event/EventCard';
import eventService from '../../services/event.service';

const CATEGORIES = [
  { icon: '🎵', label: 'Âm nhạc', count: '124 sự kiện' },
  { icon: '🎭', label: 'Sân khấu', count: '58 sự kiện' },
  { icon: '⚽', label: 'Thể thao', count: '36 sự kiện' },
  { icon: '🎤', label: 'Hội thảo', count: '47 sự kiện' },
  { icon: '🎪', label: 'Lễ hội', count: '21 sự kiện' },
];

function CategoryPill({ icon, label, count }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="#"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,107,53,.06)' : 'var(--card)',
        border: `1px solid ${hovered ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 12, padding: '24px 16px', textAlign: 'center',
        cursor: 'pointer', textDecoration: 'none', color: 'var(--text)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        transition: 'border-color .2s, background .2s',
      }}
    >
      <span style={{ fontSize: 28 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{count}</span>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ aspectRatio: '16/9', background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ height: 14, background: 'var(--border)', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 12, background: 'var(--border)', borderRadius: 4, width: '70%', marginBottom: 5 }} />
        <div style={{ height: 12, background: 'var(--border)', borderRadius: 4, width: '55%' }} />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    eventService.getEvents({ status: 'PUBLISHED' })
      .then((res) => {
        const data = res.data?.data || res.data || [];
        setEvents(Array.isArray(data) ? data : []);
      })
      .catch(() => setEvents([]))
      .finally(() => setIsLoading(false));
  }, []);

  const safeEvents = Array.isArray(events) ? events : [];

  const featured = safeEvents.slice(0, 4);
  const upcoming = safeEvents.slice(4, 8);

  return (
    <div>
      {/* ── HERO ── */}
      <section style={{ position: 'relative', width: '100%', height: 440, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {/* Background */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse at 60% 40%, #3a1a0a 0%, #1a0a00 40%, #0a0a0a 100%)',
        }} />

        {/* Stage lights */}
        {[
          { left: '25%', transform: 'rotate(-15deg)', color: '#FF6B35' },
          { left: '40%', transform: 'rotate(0deg)', color: '#ffffff' },
          { left: '55%', transform: 'rotate(15deg)', color: '#FF6B35' },
        ].map((l, i) => (
          <div key={i} style={{
            position: 'absolute', top: 0, left: l.left,
            width: 200, height: 300, opacity: .18,
            transformOrigin: 'top center', transform: l.transform,
            background: `linear-gradient(to bottom, ${l.color}, transparent)`,
            zIndex: 0,
          }} />
        ))}

        {/* Crowd silhouette */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, zIndex: 0, overflow: 'hidden' }}>
          <svg viewBox="0 0 1440 220" preserveAspectRatio="none" width="100%" height="100%">
            <path d="M0,180 Q30,140 60,160 Q80,150 100,165 Q120,145 145,155 Q165,140 190,158 Q210,148 240,160 Q265,142 290,155 Q315,145 345,158 Q370,148 400,162 Q420,150 445,160 Q465,145 490,158 Q515,148 540,160 Q565,145 595,155 Q620,145 650,158 Q675,150 700,163 Q720,150 745,160 Q765,148 790,158 Q815,148 845,155 Q870,145 895,158 Q918,150 945,162 Q965,152 990,160 Q1015,148 1042,158 Q1065,148 1090,155 Q1115,145 1140,158 Q1162,148 1190,160 Q1215,150 1240,162 Q1262,152 1288,158 Q1312,148 1340,155 Q1365,145 1390,158 Q1415,148 1440,160 L1440,220 L0,220 Z" fill="rgba(20,8,2,0.9)"/>
            <path d="M0,200 Q40,185 80,192 Q120,182 160,190 Q200,182 240,190 Q280,184 320,192 Q360,184 400,192 Q440,184 480,190 Q520,184 560,192 Q600,184 640,190 Q680,185 720,192 Q760,185 800,190 Q840,184 880,192 Q920,185 960,190 Q1000,184 1040,192 Q1080,185 1120,190 Q1160,184 1200,192 Q1240,185 1280,190 Q1320,184 1360,192 Q1400,185 1440,190 L1440,220 L0,220 Z" fill="rgba(10,4,0,0.95)"/>
          </svg>
        </div>

        {/* Overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(to right, rgba(0,0,0,.85) 50%, rgba(0,0,0,.3) 100%)',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, paddingLeft: 80, maxWidth: 600 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,107,53,.15)', border: '1px solid rgba(255,107,53,.4)',
            color: 'var(--accent)', fontSize: 11, fontWeight: 700,
            letterSpacing: '1.5px', padding: '4px 12px', borderRadius: 100,
            marginBottom: 16, textTransform: 'uppercase',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
            Sự kiện nổi bật
          </div>

          <h1 style={{
            fontSize: 52, fontWeight: 800, lineHeight: 1.1, marginBottom: 20,
            textShadow: '0 2px 20px rgba(0,0,0,.5)',
          }}>
            Đêm nhạc Sơn Tùng MTP<br />— Sky Tour 2026
          </h1>

          <div style={{ display: 'flex', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'rgba(255,255,255,.85)' }}>
              <svg width="15" height="15" fill="none" stroke="var(--accent)" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              15/06/2026
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'rgba(255,255,255,.85)' }}>
              <svg width="15" height="15" fill="none" stroke="var(--accent)" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              Sân vận động Mỹ Đình, Hà Nội
            </span>
          </div>

          <button
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--accent)', color: '#fff', fontFamily: 'inherit',
              fontSize: 16, fontWeight: 700, padding: '14px 28px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(255,107,53,.35)',
              transition: 'background .2s',
            }}
          >
            Đặt vé ngay
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        {/* Floating card */}
        <div style={{
          position: 'absolute', right: 80, top: '50%', transform: 'translateY(-50%)',
          zIndex: 2, background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, width: 240, overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,.6)',
        }}>
          <div style={{
            width: '100%', height: 130,
            background: 'linear-gradient(135deg, #2a1200, #FF6B35 120%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
          }}>🎤</div>
          <div style={{ padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>Sky Tour 2026 — Golden Pass</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>📅 15/06/2026 · 🕖 19:00</div>
            <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, marginBottom: 10 }}>Từ 1.200.000đ</div>
            <button style={{
              width: '100%', background: 'var(--accent)', border: 'none',
              borderRadius: 6, color: '#fff', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 600, padding: 8, cursor: 'pointer',
            }}>Chọn vé →</button>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section style={{ padding: '60px 40px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>Khám phá theo thể loại</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          {CATEGORIES.map((cat) => <CategoryPill key={cat.label} {...cat} />)}
        </div>
      </section>

      {/* ── FEATURED EVENTS ── */}
      <section style={{ padding: '60px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>Sự kiện nổi bật</h2>
          <Link to="/" style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Xem tất cả →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : featured.length > 0
              ? featured.map((ev) => <EventCard key={ev.id} event={ev} />)
              : STATIC_FEATURED.map((ev) => <EventCard key={ev.id} event={ev} />)
          }
        </div>
      </section>

      {/* ── UPCOMING EVENTS ── */}
      {(isLoading || upcoming.length > 0 || events.length === 0) && (
        <section style={{ padding: '0 40px 60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700 }}>Sắp diễn ra</h2>
            <Link to="/" style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Xem tất cả →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : upcoming.length > 0
                ? upcoming.map((ev) => <EventCard key={ev.id} event={ev} />)
                : STATIC_UPCOMING.map((ev) => <EventCard key={ev.id} event={ev} />)
            }
          </div>
        </section>
      )}

      {/* ── PROMO BANNER ── */}
      <div style={{
        margin: '0 40px 60px',
        background: 'linear-gradient(135deg, #1f0e05 0%, #3d1a08 50%, #1a1a1a 100%)',
        border: '1px solid rgba(255,107,53,.25)', borderRadius: 16,
        padding: '40px 60px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', right: -60, top: -60,
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,53,.15), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Tổ chức sự kiện của bạn?</h2>
          <p style={{ fontSize: 15, color: 'var(--muted)' }}>
            Đăng ký làm đối tác với <span style={{ color: 'var(--accent)' }}>TicketRush</span> — tiếp cận hàng triệu khán giả trên toàn quốc.
          </p>
        </div>
        <button style={{
          padding: '12px 28px', border: '1px solid var(--accent)',
          borderRadius: 8, background: 'var(--accent)', color: '#fff',
          fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          flexShrink: 0,
        }}>Liên hệ ngay →</button>
      </div>
    </div>
  );
}

// Static fallback data shown when API has no events yet
const STATIC_FEATURED = [
  { id: 's1', title: 'Đêm nhạc Sơn Tùng MTP — Sky Tour 2026', venue: 'SVĐ Mỹ Đình, Hà Nội', date: '2026-06-15T19:00:00', category: 'Âm nhạc', zones: [{ price: 1200000 }] },
  { id: 's2', title: 'Hoà nhạc Giao hưởng Quốc gia — Mùa hè 2026', venue: 'Nhà hát Lớn, Hà Nội', date: '2026-06-22T20:00:00', category: 'Nghệ thuật', zones: [{ price: 500000 }] },
  { id: 's3', title: 'AFF Cup 2026 — Việt Nam vs Thái Lan', venue: 'SVĐ Quốc gia Mỹ Đình', date: '2026-06-28T18:30:00', category: 'Thể thao', zones: [{ price: 200000 }] },
  { id: 's4', title: 'Lễ hội âm nhạc điện tử EDM Sài Gòn Fest 2026', venue: 'Landmark 81, TP.HCM', date: '2026-07-05T20:00:00', category: 'Lễ hội', zones: [{ price: 350000 }] },
];

const STATIC_UPCOMING = [
  { id: 's5', title: 'Hanoi Jazz Festival — Đêm cuối hè', venue: 'Hồ Tây, Hà Nội', date: '2026-07-12T18:00:00', category: 'Jazz', zones: [{ price: 300000 }] },
  { id: 's6', title: 'SEA Games Bơi lội Quốc tế — Hà Nội 2026', venue: 'Cung TDTT Quần Ngựa', date: '2026-07-19T08:00:00', category: 'Thể thao', zones: [{ price: 150000 }] },
  { id: 's7', title: 'Vở kịch "Người Mẹ" — Kịch Thái Hòa', venue: 'Nhà hát Kịch TP.HCM', date: '2026-07-26T20:00:00', category: 'Sân khấu', zones: [{ price: 250000 }] },
  { id: 's8', title: 'Live Concert — Mỹ Tâm "Chạm" Tour 2026', venue: 'Phú Mỹ Hưng Arena, TP.HCM', date: '2026-08-02T19:30:00', category: 'Âm nhạc', zones: [{ price: 800000 }] },
];
