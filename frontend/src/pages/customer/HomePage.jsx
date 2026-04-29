import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import EventList from '../../components/event/EventList';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimer = useRef(null);

  // Handle search input with debounce
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for debounced search (300ms)
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
  };

  // Fetch events whenever debounced query changes
  useEffect(() => {
    fetchEvents(debouncedQuery);
  }, [debouncedQuery]);

  const fetchEvents = async (search = '') => {
    try {
      setIsLoading(true);
      const params = { status: 'PUBLISHED' };
      if (search) {
        params.search = search;
      }
      const response = await eventService.getEvents(params);
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className="w-full">
      {/* Hero Banner */}
      <div className="relative w-full h-72 bg-gradient-to-r from-primary to-gray-900 overflow-hidden">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=400&fit=crop)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative h-full flex flex-col items-center justify-center text-white px-4">
          <h1 className="text-5xl font-bold mb-2 text-center">🎫 TicketRush</h1>
          <p className="text-xl text-gray-100 text-center">
            Khám phá và đặt vé cho những sự kiện hấp dẫn
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-12">
          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-center bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
              <Search className="w-5 h-5 text-gray-400 ml-4" />
              <input
                type="text"
                placeholder="Tìm kiếm sự kiện..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="flex-1 px-4 py-3 outline-none text-gray-700 placeholder-gray-400"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                Tìm kiếm: "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* Events Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-8 text-gray-900">
            {searchQuery ? 'Kết quả tìm kiếm' : 'Sự kiện sắp tới'}
          </h2>
          <EventList events={events} isLoading={isLoading} searchQuery={searchQuery} />
        </div>
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
