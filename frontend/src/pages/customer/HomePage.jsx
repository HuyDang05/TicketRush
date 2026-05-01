import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EventList from '../../components/event/EventList';
import eventService from '../../services/event.service';
import './home.css';

const CATEGORIES = [
  { icon: '🎵', label: 'Âm nhạc', count: '124 sự kiện' },
  { icon: '🎭', label: 'Sân khấu', count: '58 sự kiện' },
  { icon: '⚽', label: 'Thể thao', count: '36 sự kiện' },
  { icon: '🎤', label: 'Hội thảo', count: '47 sự kiện' },
  { icon: '🎪', label: 'Lễ hội', count: '21 sự kiện' },
];

const NAV_LINKS = ['Nhạc sống', 'Sân khấu & Nghệ thuật', 'Thể Thao', 'Hội thảo', 'Khác'];

function CategoryPill({ icon, label, count }) {
  return (
    <a
      href="#"
      className="category-pill"
      onClick={e => e.preventDefault()}
    >
      <span className="category-pill__icon">{icon}</span>
      <span className="category-pill__label">{label}</span>
      <span className="category-pill__count">{count}</span>
    </a>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeNav, setActiveNav] = useState(0);
  const debounceTimer = useRef(null);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), 300);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') setDebouncedQuery(searchQuery);
  };

  useEffect(() => {
    fetchEvents(debouncedQuery);
  }, [debouncedQuery]);

  const fetchEvents = async (search = '') => {
    try {
      setIsLoading(true);
      const params = {};
      if (search) params.search = search;
      const response = await eventService.getEvents(params);
      setEvents(response.data.events || []);
    } catch {
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, []);

  const featuredEvent = events[0] || null;

  return (
    <div className="home-page">

      {/* ── HERO ── */}
      <section className="home-hero">
        <div className="home-hero__bg" />

        {[
          { left: '25%', rot: '-15deg', color: '#FF6B35' },
          { left: '40%', rot: '0deg',   color: '#ffffff' },
          { left: '55%', rot: '15deg',  color: '#FF6B35' },
        ].map((l, i) => (
          <div key={i} style={{
            position: 'absolute', top: 0, left: l.left, width: 200, height: 300,
            opacity: .18, transformOrigin: 'top center', transform: `rotate(${l.rot})`,
            background: `linear-gradient(to bottom, ${l.color}, transparent)`, zIndex: 0,
          }} />
        ))}

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, zIndex: 0, overflow: 'hidden' }}>
          <svg viewBox="0 0 1440 220" preserveAspectRatio="none" width="100%" height="100%">
            <path d="M0,180 Q30,140 60,160 Q80,150 100,165 Q120,145 145,155 Q165,140 190,158 Q210,148 240,160 Q265,142 290,155 Q315,145 345,158 Q370,148 400,162 Q420,150 445,160 Q465,145 490,158 Q515,148 540,160 Q565,145 595,155 Q620,145 650,158 Q675,150 700,163 Q720,150 745,160 Q765,148 790,158 Q815,148 845,155 Q870,145 895,158 Q918,150 945,162 Q965,152 990,160 Q1015,148 1042,158 Q1065,148 1090,155 Q1115,145 1140,158 Q1162,148 1190,160 Q1215,150 1240,162 Q1262,152 1288,158 Q1312,148 1340,155 Q1365,145 1390,158 Q1415,148 1440,160 L1440,220 L0,220 Z" fill="rgba(20,8,2,0.9)" />
            <path d="M0,200 Q40,185 80,192 Q120,182 160,190 Q200,182 240,190 Q280,184 320,192 Q360,184 400,192 Q440,184 480,190 Q520,184 560,192 Q600,184 640,190 Q680,185 720,192 Q760,185 800,190 Q840,184 880,192 Q920,185 960,190 Q1000,184 1040,192 Q1080,185 1120,190 Q1160,184 1200,192 Q1240,185 1280,190 Q1320,184 1360,192 Q1400,185 1440,190 L1440,220 L0,220 Z" fill="rgba(10,4,0,0.95)" />
          </svg>
        </div>

        <div className="home-hero__overlay" />

        <div className="home-hero__content">
          <div className="home-hero__badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>
            Sự kiện nổi bật
          </div>
          <h1 className="home-hero__title">
            {featuredEvent ? featuredEvent.title : 'Đêm nhạc Sơn Tùng MTP\n— Sky Tour 2026'}
          </h1>
          <div className="home-hero__meta">
            {featuredEvent?.date && (
              <span className="home-hero__meta-item">
                <svg width="15" height="15" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                {new Date(featuredEvent.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            )}
            {featuredEvent?.venue && (
              <span className="home-hero__meta-item">
                <svg width="15" height="15" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
                {featuredEvent.venue}
              </span>
            )}
            {!featuredEvent && (
              <>
                <span className="home-hero__meta-item">
                  <svg width="15" height="15" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                  15/06/2026
                </span>
                <span className="home-hero__meta-item">
                  <svg width="15" height="15" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
                  Sân vận động Mỹ Đình, Hà Nội
                </span>
              </>
            )}
          </div>
          <button
            className="home-hero__cta"
            onClick={() => featuredEvent && navigate(`/event/${featuredEvent.id}`)}
          >
            Đặt vé ngay
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>

        {featuredEvent && (
          <div className="home-hero__card">
            <div className="home-hero__card-thumb">🎤</div>
            <div className="home-hero__card-body">
              <div className="home-hero__card-title">{featuredEvent.title}</div>
              <div className="home-hero__card-date">
                📅 {new Date(featuredEvent.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
              {featuredEvent.minPrice != null && (
                <div className="home-hero__card-price">
                  Từ {featuredEvent.minPrice.toLocaleString('vi-VN')}đ
                </div>
              )}
              <button
                className="home-hero__card-btn"
                onClick={() => navigate(`/event/${featuredEvent.id}`)}
              >
                Chọn vé →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── CATEGORIES ── */}
      <section className="home-categories">
        <div className="home-section-header">
          <h2 className="home-section-title">Khám phá theo thể loại</h2>
        </div>
        <div className="home-categories__grid">
          {CATEGORIES.map((cat) => (
            <CategoryPill key={cat.label} {...cat} />
          ))}
        </div>
      </section>

      {/* ── SEARCH + EVENTS ── */}
      <section className="home-events">

        <div className="home-section-header">
          <h2 className="home-section-title">
            {debouncedQuery ? 'Kết quả tìm kiếm' : 'Sự kiện nổi bật'}
          </h2>
          {!debouncedQuery && (
            <a href="#" className="home-section-link" onClick={e => e.preventDefault()}>
              Xem tất cả →
            </a>
          )}
        </div>

        <EventList events={events} isLoading={isLoading} searchQuery={debouncedQuery} />
      </section>

      {/* ── PROMO BANNER ── */}
      <div className="home-promo">
        <div>
          <h2 className="home-promo__title">Tổ chức sự kiện của bạn?</h2>
          <p className="home-promo__desc">
            Đăng ký làm đối tác với <span className="home-promo__accent">TicketRush</span> — tiếp cận hàng triệu khán giả trên toàn quốc.
          </p>
        </div>
        <button className="home-promo__btn">Liên hệ ngay →</button>
      </div>
    </div>
  );
}
