import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import bookingService from '../../services/booking.service';
import QRCode from 'qrcode';
import { useLang } from '../../context/LangContext';
import './my-tickets.css';
import { css, cx, setNodeCss, clearNodeCss } from "../../lib/runtimeCss";
function removeVietnameseTones(str = '') {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
function QRCanvas({
  value,
  size,
  style
}) {
  const ref = useRef(null);
  const {
    lang
  } = useLang();
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, value, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  }, [value, size]);
  return <canvas ref={ref} className={css(style, "MyTicketsPage")} />;
}
function QRModal({
  booking,
  onClose
}) {
  const {
    lang
  } = useLang();
  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
setNodeCss(document.body, { overflow: 'hidden' }, 'overflow');
    return () => {
      document.removeEventListener('keydown', handler);
clearNodeCss(document.body, 'overflow');
    };
  }, [onClose]);
  const eventName = booking.eventName || booking.eventTitle || booking.seat?.zone?.event?.name || (lang === 'en' ? 'Event' : 'Sự kiện');
  const seatName = booking.seatName || booking.seat?.label || '—';
  const zoneName = booking.zoneName || booking.seat?.zone?.name || '—';
  const price = Number(booking.price ?? booking.totalPrice ?? 0);
  const ticketCode = `TICKET-${seatName}-${booking?.id?.slice(0, 8)?.toUpperCase() || ''}`;
  const qrText = `${lang === 'en' ? 'Ticket code' : 'Mã vé'}: ${ticketCode}
  ${lang === 'en' ? 'Event' : 'Sự kiện'}: ${eventName}
  ${lang === 'en' ? 'Zone' : 'Khu'}: ${zoneName}
  ${lang === 'en' ? 'Seat' : 'Ghế'}: ${seatName}
  ${lang === 'en' ? 'Ticket price' : 'Giá vé'}: ${price.toLocaleString('vi-VN')}đ`;
  return <div className="qr-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="qr-modal">
        <div className="qr-modal__header">
          <div className="qr-modal__title">{eventName}</div>
          <button className="qr-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="qr-modal__body">
          <div className="qr-modal__qr-wrap">
            <QRCanvas size={172} value={qrText} />
          </div>
          <div className="qr-modal__info">
            {[{
            label: 'Mã vé',
            value: ticketCode
          }].map(({
            label,
            value
          }) => <div key={label} className="qr-modal__info-row">
                <span className="qr-modal__info-label">{label}</span>
                <span className="qr-modal__info-value">{value}</span>
              </div>)}
          </div>
        </div>
      </div>
    </div>;
}
const THUMB_GRADIENTS = ['linear-gradient(160deg,#2d1000,#8b3500)', 'linear-gradient(160deg,#0d2200,#1a4400)', 'linear-gradient(160deg,#0a1a2d,#0a3d6b)', 'linear-gradient(160deg,#1a1000,#5a3a00)', 'linear-gradient(160deg,#1a001a,#5a005a)'];
const THUMB_EMOJIS = ['🎤', '⚽', '🎹', '🎷', '🎭', '🎪'];
function TicketCard({
  booking,
  idx,
  onViewQR
}) {
  const eventName = booking.eventName || booking.eventTitle || (lang === 'en' ? 'Event' : 'Sự kiện');
  const seatName = booking.seatName || booking.seat?.label || '—';
  const rawZoneName = booking.zoneName || booking.seat?.zone?.name || '—';
  const zoneName = lang === 'en' ? rawZoneName.replace('Khu', 'Zone') : rawZoneName;
  const price = Number(booking.price ?? booking.totalPrice ?? 0);
  const startDate = booking.eventDate || booking.seat?.zone?.event?.date;
  const endDate = booking.eventEndDate || booking.seat?.zone?.event?.endDate;
  const location = booking.location || booking.seat?.zone?.event?.venue || '—';
  const {
    lang
  } = useLang();
  const imageUrl = booking.imageUrl || booking.cardImageUrl || booking.seat?.zone?.event?.imageUrl || booking.seat?.zone?.event?.cardImageUrl || '';
  const isPast = booking.status === 'PAID' && startDate && new Date(startDate) < new Date();
  const isUpcoming = booking.status === 'PAID' && startDate && new Date(startDate) >= new Date();
  const fmtVND = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';
  const fmtDateTime = date => {
    if (!date) return '—';
    return new Date(date).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  return <div className={cx("booking-card", css({
    opacity: isPast ? 0.75 : 1
  }, "MyTicketsPage"))}>
      <div className="booking-card__header">
        <div className={cx("booking-card__thumb", css({
        background: imageUrl ? `url(${imageUrl}) center/cover` : THUMB_GRADIENTS[idx % THUMB_GRADIENTS.length]
      }, "MyTicketsPage"))}>
          {!imageUrl && THUMB_EMOJIS[idx % THUMB_EMOJIS.length]}
        </div>
        <div className="booking-card__info">
          <div className="booking-card__title">{eventName}</div>
          <div className="booking-card__meta">
            <div className="booking-card__meta-item">
              <svg width="12" height="12" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {fmtDateTime(startDate)} - {fmtDateTime(endDate)}
            </div>

            <div className="booking-card__meta-item">
              <svg width="12" height="12" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              {lang === 'en' ? removeVietnameseTones(location) : location}
            </div>
          </div>
        </div>
        <div className="booking-card__status">
          <span className={cx("booking-card__status-badge", css(isUpcoming ? {
          background: '#0F2A1A',
          color: '#4ade80'
        } : {
          background: 'rgba(170,170,170,.08)',
          color: '#AAAAAA'
        }, "MyTicketsPage"))}>
            {isUpcoming ? `● ${lang === 'en' ? 'Upcoming' : 'Sắp diễn ra'}` : lang === 'en' ? 'Past' : 'Đã diễn ra'}
          </span>
        </div>
      </div>

      <div className="booking-card__body">
        <div className="booking-card__seat-row">
          <div className="booking-card__seat-badge">
            <div className={cx("booking-card__seat-dot", css({
            background: isUpcoming ? '#FF6B35' : '#AAAAAA'
          }, "MyTicketsPage"))} />
            <span className="booking-card__seat-label">
              {zoneName} · {lang === 'en' ? 'Seat' : 'Ghế'} {seatName}
            </span>
          </div>
          <span className="booking-card__seat-price">{fmtVND(price)}</span>
        </div>
      </div>

      <div className="booking-card__footer">
        <span className="booking-card__total">
          {fmtDateTime(startDate)} - {fmtDateTime(endDate)}
        </span>
        {isPast ? <span className={css({
        fontSize: 11,
        fontWeight: 700,
        color: '#AAAAAA',
        border: '1px solid #333333',
        borderRadius: 5,
        padding: '4px 10px'
      }, "MyTicketsPage")}>
            {lang === 'en' ? 'Used' : 'Đã sử dụng'}
          </span> : <button className="booking-card__qr-btn" onClick={() => onViewQR(booking)}>
            {lang === 'en' ? 'View QR' : 'Xem QR'}
          </button>}
      </div>
    </div>;
}
export default function MyTicketsPage() {
  const navigate = useNavigate();
  const {
    lang
  } = useLang();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modalBooking, setModalBooking] = useState(null);
  useEffect(() => {
    bookingService.getMyBookings().then(res => setBookings(res.data?.data || [])).catch(() => setBookings([])).finally(() => setLoading(false));
  }, []);
  const getEventDate = b => b.eventDate || b.seat?.zone?.event?.date;
  const isUpcoming = b => b.status === 'PAID' && getEventDate(b) && new Date(getEventDate(b)) >= new Date();
  const isPast = b => b.status === 'PAID' && getEventDate(b) && new Date(getEventDate(b)) < new Date();
  const filtered = bookings.filter(b => {
    const matchFilter = filter === 'all' || filter === 'upcoming' && isUpcoming(b) || filter === 'past' && isPast(b);
    const eventName = b.eventName || b.eventTitle || b.seat?.zone?.event?.name || '';
    const matchSearch = search === '' || eventName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });
  const upcomingCount = bookings.filter(isUpcoming).length;
  const pastCount = bookings.filter(isPast).length;
  const FilterTab = ({
    id,
    label,
    count
  }) => <button onClick={() => setFilter(id)} className={`my-tickets__tab ${filter === id ? 'my-tickets__tab--active' : 'my-tickets__tab--inactive'}`}>
      {label}
      <span className="my-tickets__tab-count">{count}</span>
    </button>;
  return <div className="my-tickets">

      <div className="my-tickets__header">
        <div>
          <h1 className="my-tickets__heading">{lang === 'en' ? 'My tickets' : 'Vé của tôi'}</h1>
          <p className="my-tickets__subheading">{lang === 'en' ? 'Manage all your purchased tickets' : 'Quản lý tất cả vé đã mua'}</p>
        </div>
        <div className="my-tickets__search-wrap">
          <input className="my-tickets__search" value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === 'en' ? 'Search tickets...' : 'Tìm kiếm vé...'} />
          <span className="my-tickets__search-icon">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></svg>
          </span>
        </div>
      </div>

      <div className="my-tickets__filters">
        <FilterTab id="all" label={lang === 'en' ? 'All' : 'Tất cả'} count={bookings.length} />
        <FilterTab id="upcoming" label={lang === 'en' ? 'Upcoming' : 'Sắp diễn ra'} count={upcomingCount} />
        <FilterTab id="past" label={lang === 'en' ? 'Past' : 'Đã diễn ra'} count={pastCount} />
      </div>

      <div className="my-tickets__content">
        {loading ? <div className="my-tickets__empty">
            <div className="my-tickets__empty-title">
              {lang === 'en' ? 'Loading tickets...' : 'Đang tải vé...'}
            </div>
          </div> : filtered.length === 0 ? <div className="my-tickets__empty">
            <div className="my-tickets__empty-icon">🎟️</div>
            <div className="my-tickets__empty-title">
              {lang === 'en' ? 'You do not have any tickets yet' : 'Bạn chưa có vé nào'}
            </div>
            <p className="my-tickets__empty-sub">
              {lang === 'en' ? 'Discover exciting events and book your tickets today!' : 'Khám phá các sự kiện hấp dẫn và đặt vé ngay hôm nay!'}
            </p>
            <button className="my-tickets__empty-btn" onClick={() => navigate('/')}>
              {lang === 'en' ? 'Discover Events →' : 'Khám phá sự kiện →'}
            </button>
          </div> : <div className="my-tickets__grid">
            {filtered.map((b, i) => <TicketCard key={b.id} booking={b} idx={i} onViewQR={setModalBooking} />)}
          </div>}
      </div>

      {modalBooking && <QRModal booking={modalBooking} onClose={() => setModalBooking(null)} />}
    </div>;
}
