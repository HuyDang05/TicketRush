import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'sonner';
import eventService from '../../services/event.service';
import queueService from '../../services/queue.service';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EventReviews from './EventReviews';
import 'leaflet/dist/leaflet.css';
import './event-detail.css';

const TERMS = [
  'Vé đã mua không hoàn tiền trừ trường hợp sự kiện bị hủy hoặc dời lịch bởi Ban tổ chức.',
  'Mỗi tài khoản được mua tối đa 4 vé cho một sự kiện.',
  'Khán giả dưới 16 tuổi phải có người lớn đi kèm.',
  'Nghiêm cấm mang vật dụng nguy hiểm, thức ăn & đồ uống từ bên ngoài vào khu vực sự kiện.',
  'Vui lòng xuất trình vé điện tử (QR code) hoặc vé in tại cửa soát vé.',
  'Ban tổ chức có quyền từ chối phục vụ nếu khán giả có hành vi không phù hợp.',
];

function fmt(n) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

function getEventCoordinates(event) {
  try {
    if (event?.geoLat == null || event?.geoLong == null) {
      throw new Error('Missing event coordinates');
    }

    const lat = Number(event.geoLat);
    const lng = Number(event.geoLong);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Invalid event coordinates');
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Event coordinates out of range');
    }

    return [lat, lng];
  } catch {
    return null;
  }
}

const venueMarkerIcon = L.divIcon({
  className: 'ed-map-marker',
  html: '<span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

export default function EventDetailPage() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [zones, setZones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    setIsLoading(true);
    eventService.getEventById(eventId)
      .then((res) => {
        const raw = res.data?.event ?? res.data;
        setEvent(raw && raw.id ? raw : null);
        const fetchedZones = (raw?.zones || []).map(z => ({
          ...z,
          availableSeats: z.seats
            ? z.seats.filter(s => s.status === 'AVAILABLE').length
            : (z.availableSeats ?? z.rows * z.cols ?? 0),
        }));
        setZones(fetchedZones);
      })
      .catch(() => toast.error('Không thể tải thông tin sự kiện'))
      .finally(() => setIsLoading(false));
  }, [eventId]);

  async function handleBook() {
    if (isJoining) return;
    setIsJoining(true);
    try {
      const res = await queueService.join(eventId);
      if (res.admitted && res.token) {
        // Slot available — go straight to seat selection
        navigate(`/events/${eventId}/seats`, {
          state: { queueToken: res.token },
        });
      } else {
        // Queue is full — send to waiting room
        navigate(`/events/${eventId}/queue`, {
          state: {
            eventName: event?.title,
          },
        });
      }
    } catch {
      // On any error fall back to direct navigation
      navigate(`/events/${eventId}/seats`);
    } finally {
      setIsJoining(false);
    }
  }


  const dateStr = event?.date
    ? new Date(event.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';
  const timeStr = event?.date
    ? new Date(event.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';
  const eventCoordinates = getEventCoordinates(event);

  if (isLoading) return <LoadingSpinner />;
  if (!event) return (
    <div className="ed-not-found">Không tìm thấy sự kiện</div>
  );

  return (
    <div className="ed">

      {/* ── HERO ── */}
      <section className="ed-hero">
        <div className="ed-hero__bg" />
        <div className="ed-hero__sl ed-hero__sl--1" />
        <div className="ed-hero__sl ed-hero__sl--2" />
        <div className="ed-hero__sl ed-hero__sl--3" />
        <div className="ed-hero__sl ed-hero__sl--4" />
        <div className="ed-hero__crowd">
          <svg viewBox="0 0 1440 160" preserveAspectRatio="none" width="100%" height="100%">
            <path d="M0,130 Q50,100 100,118 Q150,100 200,115 Q250,100 300,115 Q350,102 400,116 Q450,102 500,116 Q550,104 600,115 Q650,104 700,116 Q750,104 800,116 Q850,104 900,115 Q950,104 1000,116 Q1050,104 1100,115 Q1150,104 1200,116 Q1250,104 1300,115 Q1350,104 1400,116 Q1420,110 1440,115 L1440,160 L0,160 Z" fill="rgba(15,5,0,0.92)" />
          </svg>
        </div>
        <div className="ed-hero__overlay" />
        {event.imageUrl && <img src={event.imageUrl} alt={event.title} className="ed-hero__img" />}
        <div className="ed-hero__content">
          <div className="ed-pill">🎵&nbsp; Âm nhạc</div>
          <h1 className="ed-hero__title">{event.title}</h1>
          <div className="ed-hero__meta">
            {dateStr && (
              <span className="ed-hero__meta-item">
                <svg width="15" height="15" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                {dateStr}{timeStr && ` · ${timeStr}`}
              </span>
            )}
            {event.venue && (
              <span className="ed-hero__meta-item">
                <svg width="15" height="15" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
                {event.venue}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── BREADCRUMB ── */}
      <div className="ed-breadcrumb">
        <Link to="/" className="ed-breadcrumb__link">Trang chủ</Link>
        <span className="ed-breadcrumb__sep">/</span>
        <Link to="/" className="ed-breadcrumb__link">Âm nhạc</Link>
        <span className="ed-breadcrumb__sep">/</span>
        <span className="ed-breadcrumb__current">{event.title}</span>
      </div>

      {/* ── MAIN ── */}
      <div className="ed-layout">

        {/* LEFT */}
        <div className="ed-left">

          {/* About */}
          <div className="ed-card">
            <h2 className="ed-card__title">Về sự kiện</h2>
            <p className="ed-card__body">
              {event.description || `${event.title} — sự kiện âm nhạc được mong chờ nhất năm, quy tụ hàng chục nghìn khán giả với sân khấu hoành tráng và màn trình diễn không thể bỏ lỡ.`}
            </p>
          </div>

          {/* Venue */}
          {event.venue && (
            <div className="ed-card">
              <h2 className="ed-card__title">Địa điểm</h2>
              <div className="ed-venue__name">{event.venue}</div>
              <div className="ed-venue__addr">Vui lòng kiểm tra thông tin địa điểm trước khi đến</div>
              {eventCoordinates ? (
                <MapContainer
                  key={eventCoordinates.join(',')}
                  center={eventCoordinates}
                  zoom={15}
                  scrollWheelZoom={false}
                  className="ed-map"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={eventCoordinates} icon={venueMarkerIcon}>
                    <Popup>{event.venue}</Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="ed-map ed-map--empty">
                  <span className="ed-map__label">Địa điểm hiện không được hỗ trợ map</span>
                </div>
              )}
            </div>
          )}

          {/* Terms */}
          <div className="ed-card">
            <h2 className="ed-card__title">Điều khoản & Lưu ý</h2>
            <ul className="ed-terms">
              {TERMS.map((t, i) => (
                <li key={i} className="ed-terms__item">
                  <span className="ed-terms__dot">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Reviews */}
          <EventReviews eventId={eventId} />

        </div>

        {/* RIGHT — ticket sidebar */}
        <div className="ed-sidebar">
          <div className="ed-ticket">
            <div className="ed-ticket__title">Loại vé</div>

            {zones.length === 0 ? (
              <div className="ed-ticket__empty">Chưa có thông tin vé</div>
            ) : (
              zones.map((zone) => {
                const avail = zone.availableSeats ?? zone.capacity ?? 0;
                const isSoldOut = avail === 0;
                return (
                  <div
                    key={zone.id}
                    className={`ed-zone${isSoldOut ? ' ed-zone--sold' : ''}`}
                    style={{ cursor: 'default' }}
                  >
                    <div className="ed-zone__info" style={{ paddingLeft: 0 }}>
                      <div className="ed-zone__name">{zone.name}</div>
                      <div className="ed-zone__desc">{avail > 0 ? `Còn ${avail} ghế` : 'Hết vé'}</div>
                    </div>
                    <div className="ed-zone__right">
                      <div className="ed-zone__price">{fmt(zone.price ?? 0)}</div>
                      {isSoldOut
                        ? <span className="ed-badge ed-badge--gray">Hết vé</span>
                        : avail < 20
                          ? <span className="ed-badge ed-badge--low">Sắp hết</span>
                          : <span className="ed-badge ed-badge--green">Còn vé</span>
                      }
                    </div>
                  </div>
                );
              })
            )}

            <div className="ed-ticket__divider" />

            <button
              className="ed-book-btn"
              disabled={zones.length === 0 || isJoining}
              onClick={handleBook}
            >
              {isJoining ? 'Đang kiểm tra...' : 'Chọn ghế & Đặt vé'}
              {!isJoining && <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
            </button>

            <div className="ed-share">
              <button className="ed-share__btn">🔗 Sao chép link</button>
              <button className="ed-share__btn">📤 Chia sẻ</button>
              <button className="ed-share__btn">❤️ Yêu thích</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
