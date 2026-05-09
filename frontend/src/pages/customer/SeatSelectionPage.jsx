import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import eventService from '../../services/event.service';
import bookingService from '../../services/booking.service';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import CustomerSeatmapCanvas from '../../components/seatmap/CustomerSeatmapCanvas';
import './seat-selection.css';

const LOCK_SECONDS = 10 * 60;

function toNumberPrice(value) {
  if (value === null || value === undefined) return 0;
  return Number(String(value).replace(/[^\d]/g, '')) || 0;
}

function fmt(n) {
  return toNumberPrice(n).toLocaleString('vi-VN') + 'đ';
}

function Countdown({ seconds }) {
  const [secs, setSecs] = useState(seconds);
  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return <span>{mm}:{ss}</span>;
}

export default function SeatSelectionPage() {
  const { id: eventId } = useParams();
  const location        = useLocation();
  const navigate        = useNavigate();

  void location.state;

  const [event,        setEvent]     = useState(null);
  const [zones,        setZones]     = useState([]);
  const [loading,      setLoading]   = useState(true);
  const [booking,      setBooking]   = useState(false);
  const [toastMsg,     setToastMsg]  = useState('');
  const [selected,     setSelected]  = useState({});

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    eventService.getEventById(eventId)
      .then(evRes => {
        const evData = evRes.data?.event ?? evRes.data;
        setEvent(evData);
        setZones(evData?.zones || []);
      })
      .catch(err => console.error('SeatSelection load error:', err))
      .finally(() => setLoading(false));
  }, [eventId]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  }

  const handleSeatClick = useCallback((dbSeat, layoutZone, dbZone) => {
    setSelected(prev => {
      const isSel = prev[dbSeat.id];
      if (isSel) {
        const next = { ...prev };
        delete next[dbSeat.id];
        return next;
      } else {
        if (Object.keys(prev).length >= 4) {
          showToast('Tối đa 4 ghế mỗi lần đặt');
          return prev;
        }
        return {
          ...prev,
          [dbSeat.id]: {
            seatDbId: dbSeat.id,
            label: dbSeat.label,
            row: dbSeat.row,
            col: dbSeat.col,
            zoneKey: dbZone.name,
            zoneId: dbZone.id,
            price: Number(dbZone.price || 0),
            color: layoutZone.color
          }
        };
      }
    });
  }, []);

  async function handlePay() {
    const keys = Object.keys(selected);
    if (keys.length === 0) return;

    setBooking(true);
    try {
      const lockResults = await Promise.all(
        keys.map(k => bookingService.lockSeat(selected[k].seatDbId))
      );
      const bookings = lockResults.map(r => r.data).filter(Boolean);
      if (bookings.length === 0) {
        showToast('Không thể giữ ghế. Vui lòng thử lại.');
        return;
      }
      navigate('/checkout', {
        state: {
          bookings,
          eventId,
          eventTitle: event?.title,
          eventVenue: event?.venue,
          eventDate:  event?.date,
        },
      });
    } catch (err) {
      showToast(err.response?.data?.message || 'Đặt vé thất bại. Vui lòng thử lại.');
    } finally {
      setBooking(false);
    }
  }

  const selKeys  = Object.keys(selected);
  const subtotal = selKeys.reduce((acc, k) => acc + toNumberPrice(selected[k].price), 0);
  const fee      = Math.round(subtotal * 0.05);
  const total    = subtotal + fee;

  const firstSeat = selKeys.length > 0 ? selected[selKeys[0]] : null;

  const dateStr = event?.date
    ? new Date(event.date).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })
    : '';
  const timeStr = event?.date
    ? new Date(event.date).toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' })
    : '';

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#111111', overflow: 'hidden' }}>
      {toastMsg && <div className="ss-toast">{toastMsg}</div>}

      {/* ── TOP HEADER (Like Admin) ── */}
      <header style={{
        height: 60, flexShrink: 0,
        background: '#161616', borderBottom: '1px solid #222',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 20
      }}>
        <button onClick={() => navigate(-1)} style={{
          background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 8
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>
          {event?.title || 'Sự kiện'}
          <span style={{
            marginLeft: 12, padding: '4px 10px', fontSize: 12,
            background: 'rgba(255,107,53,0.1)', color: '#FF6B35',
            borderRadius: 4, border: '1px solid rgba(255,107,53,0.2)'
          }}>Chọn ghế</span>
        </div>
        <div style={{ flex: 1 }} />
        {dateStr && (
          <div style={{ color: '#aaa', fontSize: 13 }}>
            {dateStr} {timeStr && ` · ${timeStr}`}
          </div>
        )}
      </header>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        
        {/* Canvas Area (Fills remaining space) */}
        <div style={{ flex: 1, position: 'relative' }}>
          <CustomerSeatmapCanvas
            layoutZones={event?.seatmapJson?.layout || event?.seatmapJson?.zones || []}
            dbZones={zones}
            selectedSeats={selected}
            onSeatClick={handleSeatClick}
          />
          
          {/* Legend Overlay */}
          <div style={{
            position: 'absolute', bottom: 20, left: 20,
            background: 'rgba(26,26,26,0.9)', backdropFilter: 'blur(10px)',
            border: '1px solid #333', borderRadius: 8, padding: '12px 16px',
            display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none'
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Chú thích các loại ghế</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', maxWidth: 400 }}>
              {event?.seatmapJson?.zones?.filter(z => z.blockType !== 'floor').map(z => (
                <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ccc' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: z.color }} />
                  {z.name} còn trống
                </div>
              ))}
              {[
                { color:'#2a2a2a', label:'Ghế đang bị khóa / đang giữ', stroke: '#2a2a2a' },
                { color:'#4A1A1A', label:'Ghế đã được bán', stroke: '#4A1A1A' },
                { color:'#FF6B35', label:'Ghế bạn đang chọn', stroke: '#FF6B35' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ccc' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color, border: `1px solid ${item.stroke}` }} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Order Panel on the right */}
        <div style={{
          width: 320, background: '#1a1a1a', borderLeft: '1px solid #222',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.5)', zIndex: 50
        }}>
          {/* Panel Header */}
          <div style={{ padding: '20px 20px 10px', borderBottom: '1px solid #2a2a2a' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Ghế đang chọn</div>
            <div className="ss-timer-box" style={{ margin: 0, padding: '10px 12px', background: '#2D1F0A', borderLeft: '3px solid #FF6B35', borderRadius: '0 6px 6px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FF6B35', fontSize: 13, fontWeight: 700 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                Giữ chỗ: <Countdown seconds={LOCK_SECONDS} />
              </div>
            </div>
          </div>

          {/* Seat list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selKeys.length === 0 ? (
              <div style={{ color: '#888', fontSize: 13, textAlign: 'center', marginTop: 40 }}>Chưa chọn ghế nào</div>
            ) : (
              selKeys.map(key => {
                const s = selected[key];
                return (
                  <div key={key} style={{ background: '#222', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 2 }}>{s.zoneKey}</div>
                      <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{s.label || `Hàng ${s.row} · Ghế ${s.col}`}</div>
                    </div>
                    <div style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{fmt(s.price)}</div>
                    <button
                      onClick={() => setSelected(prev => { const next = { ...prev }; delete next[key]; return next; })}
                      style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                    >×</button>
                  </div>
                );
              })
            )}
          </div>

          {/* Checkout Footer */}
          <div style={{ padding: 20, borderTop: '1px solid #2a2a2a', background: '#161616' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#aaa' }}>
              <span>Đơn giá</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{firstSeat ? fmt(firstSeat.price) : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13, color: '#aaa' }}>
              <span>Phí dịch vụ (5%)</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{selKeys.length > 0 ? fmt(fee) : '—'}</span>
            </div>
            <div style={{ height: 1, background: '#2a2a2a', margin: '0 0 16px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Tổng cộng</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#FF6B35' }}>{selKeys.length > 0 ? fmt(total) : '0đ'}</span>
            </div>

            <button
              onClick={handlePay}
              disabled={selKeys.length === 0 || booking}
              style={{
                width: '100%', height: 48, background: selKeys.length === 0 ? '#333' : '#FF6B35',
                color: selKeys.length === 0 ? '#666' : '#fff', border: 'none', borderRadius: 8,
                fontSize: 15, fontWeight: 700, cursor: selKeys.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background .2s'
              }}
            >
              {booking ? 'Đang xử lý...' : 'Tiến hành thanh toán'}
              {!booking && selKeys.length > 0 && (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
