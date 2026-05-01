import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import eventService from '../../services/event.service';
import bookingService from '../../services/booking.service';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import './seat-selection.css';

// ── Arc geometry constants ────────────────────────────────────────────────────
const ARC_SPAN_DEG = 138;
const INNER_R      = 88;
const ROW_SPACING  = 44;
const SEAT_R       = 11;
const LOCK_SECONDS = 10 * 60;

const STATIC_ROWS = [
  { label:'A', zone:'vip', rowInZone:0, seats:9,  color:'#8a5c00', hov:'#c8860a' },
  { label:'B', zone:'vip', rowInZone:1, seats:11, color:'#8a5c00', hov:'#c8860a' },
  { label:'C', zone:'a',   rowInZone:0, seats:13, color:'#2D4A1E', hov:'#3d6828' },
  { label:'D', zone:'a',   rowInZone:1, seats:15, color:'#2D4A1E', hov:'#3d6828' },
  { label:'E', zone:'b',   rowInZone:0, seats:17, color:'#0f2d4a', hov:'#1a4a7a' },
  { label:'F', zone:'b',   rowInZone:1, seats:19, color:'#0f2d4a', hov:'#1a4a7a' },
  { label:'G', zone:'b',   rowInZone:2, seats:21, color:'#0f2d4a', hov:'#1a4a7a' },
];

const ZONE_META = {
  vip: { name:'VIP',   color:'#c8860a', borderColor:'#c8860a' },
  a:   { name:'Khu A', color:'#3d6828', borderColor:'#3d6828' },
  b:   { name:'Khu B', color:'#1a4a7a', borderColor:'#1a4a7a' },
};

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
  const [filterActive, setFilter]    = useState({ vip:true, a:true, b:true });
  const [rows,         setRows]      = useState(STATIC_ROWS.map(r => ({ ...r, price:0, zoneId: null, soldSet: new Set(), lockedSet: new Set(), seatByRowCol: {} })));

  const canvasRef  = useRef(null);
  const wrapRef    = useRef(null);
  const seatHitRef = useRef([]);
  const tooltipRef = useRef(null);
  const DEV_RATIO  = window.devicePixelRatio || 1;

  // ── Load event + zones + seats ───────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    eventService.getEventById(eventId)
      .then(evRes => {
        const evData = evRes.data?.event ?? evRes.data;
        setEvent(evData);
        const fetchedZones = evData?.zones || [];
        setZones(fetchedZones);

        const sorted = [...fetchedZones].sort((a, b) => b.price - a.price);
        if (sorted.length > 0) {
          const newRows = STATIC_ROWS.map((staticRow, ri) => {
            const zoneKeys = ['vip','vip','a','a','b','b','b'];
            const zKey = zoneKeys[ri];
            const samePriceZones = sorted.filter(z => {
              if (zKey === 'vip') return z.price === sorted[0].price;
              if (zKey === 'a')   return z.price < sorted[0].price && z.price > sorted[sorted.length-1].price;
              return z.price === sorted[sorted.length - 1].price;
            });
            const zone = samePriceZones[0] || sorted[Math.min(ri, sorted.length - 1)];
            const zoneSeatList = zone?.seats || [];
            // key = "rowInZone-col(0-based)" → seat UUID
            const seatByRowCol = Object.fromEntries(
              zoneSeatList.map(s => [`${s.row}-${s.col}`, s.id])
            );
            // sold/locked dùng cùng key để canvas kiểm tra
            const soldSet   = new Set(zoneSeatList.filter(s => s.status === 'SOLD').map(s => `${s.row}-${s.col}`));
            const lockedSet = new Set(zoneSeatList.filter(s => s.status === 'LOCKED').map(s => `${s.row}-${s.col}`));
            return {
              ...staticRow,
              price:        toNumberPrice(zone?.price ?? staticRow.price),
              zoneId:       zone?.id,
              soldSet,
              lockedSet,
              seatByRowCol,
            };
          });
          setRows(newRows);
        }
      })
      .catch(err => console.error('SeatSelection load error:', err))
      .finally(() => setLoading(false));
  }, [eventId]);

  // ── Canvas render ────────────────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');

    const halfRad  = (ARC_SPAN_DEG / 2) * Math.PI / 180;
    const lastR    = INNER_R + (rows.length - 1) * ROW_SPACING;
    const PAD_X    = SEAT_R + 10;
    const PAD_B    = SEAT_R + 16;
    const cyOff    = -16;
    const naturalW = 2 * (lastR * Math.sin(halfRad) + PAD_X);
    const naturalH = cyOff + lastR + PAD_B;

    const W     = wrap.clientWidth || 600;
    const scale = Math.min(1, W / naturalW);
    const drawW = naturalW * scale;
    const drawH = naturalH * scale;

    canvas.width  = drawW * DEV_RATIO;
    canvas.height = drawH * DEV_RATIO;
    canvas.style.width  = drawW + 'px';
    canvas.style.height = drawH + 'px';
    ctx.scale(DEV_RATIO * scale, DEV_RATIO * scale);

    const cx = naturalW / 2;
    ctx.clearRect(0, 0, naturalW, naturalH);
    seatHitRef.current = [];

    // Zone separator arcs
    [2, 4].forEach(afterIdx => {
      const midR = INNER_R + afterIdx * ROW_SPACING - ROW_SPACING / 2;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t   = i / 60;
        const ang = -halfRad + t * ARC_SPAN_DEG * Math.PI / 180;
        const sx  = cx + midR * Math.sin(ang);
        const sy  = cyOff + midR * Math.cos(ang);
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Rows
    rows.forEach((row, ri) => {
      const r      = INNER_R + ri * ROW_SPACING;
      const n      = row.seats;
      const dimmed = !filterActive[row.zone];

      // Guide arc
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t   = i / 60;
        const ang = -halfRad + t * ARC_SPAN_DEG * Math.PI / 180;
        const sx  = cx + r * Math.sin(ang);
        const sy  = cyOff + r * Math.cos(ang);
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = dimmed ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Row label
      const lblAng = -halfRad - 0.07;
      const lx     = cx + r * Math.sin(lblAng) - (ri === 0 ? 20 : ri === rows.length - 1 ? 4 : 10);
      const ly     = cyOff + r * Math.cos(lblAng);
      ctx.font      = `bold 11px 'Be Vietnam Pro', sans-serif`;
      ctx.fillStyle = dimmed ? 'rgba(170,170,170,0.2)' : 'rgba(200,200,200,0.85)';
      ctx.textAlign = 'center';
      ctx.fillText(row.label, lx, ly + (ri === 0 ? 5 : -8));

      // Seats
      for (let si = 0; si < n; si++) {
        const t    = n === 1 ? 0 : si / (n - 1);
        const ang  = -halfRad + t * ARC_SPAN_DEG * Math.PI / 180;
        const sx   = cx + r * Math.sin(ang);
        const sy   = cyOff + r * Math.cos(ang);
        const rcKey = `${row.rowInZone}-${si}`;
        const key  = `${row.label}-${si + 1}`;
        const isSold   = row.soldSet?.has(rcKey);
        const isLocked = row.lockedSet?.has(rcKey);
        const isSel    = !!selected[key];

        let fillColor;
        if      (isSel)    fillColor = '#FF6B35';
        else if (isSold)   fillColor = '#4A1A1A';
        else if (isLocked) fillColor = '#2a2a2a';
        else               fillColor = dimmed ? row.color + '55' : row.color;

        if (isSel) { ctx.shadowColor = '#FF6B35'; ctx.shadowBlur = 12; }
        ctx.beginPath();
        ctx.roundRect(sx - SEAT_R, sy - SEAT_R, SEAT_R * 2, SEAT_R * 2, 4);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isSel) {
          ctx.font = `bold 11px sans-serif`;
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.fillText('✓', sx, sy + 4);
        }

        const state = isSel ? 'selected' : isSold ? 'sold' : isLocked ? 'locked' : 'avail';
        seatHitRef.current.push({ cx: sx, cy: sy, key, rowIdx: ri, col: si + 1, state, dimmed });
      }
    });

    // Zone labels (right side)
    [
      { zone:'vip', rowIndices:[0,1], text:'VIP' },
      { zone:'a',   rowIndices:[2,3], text:'KHU A' },
      { zone:'b',   rowIndices:[4,6], text:'KHU B' },
    ].forEach(({ zone, rowIndices, text }) => {
      const r1   = INNER_R + rowIndices[0] * ROW_SPACING;
      const r2   = INNER_R + rowIndices[1] * ROW_SPACING;
      const midR = (r1 + r2) / 2;
      const ang  = halfRad + 0.1;
      const tx   = cx + midR * Math.sin(ang) + 6;
      const ty   = cyOff + midR * Math.cos(ang);
      ctx.font      = `bold 10px 'Be Vietnam Pro', sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillStyle = filterActive[zone] ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)';
      ctx.fillText(text, tx, ty + 4);
    });
  }, [rows, selected, filterActive, DEV_RATIO]);

  useEffect(() => { render(); }, [render]);
  useEffect(() => {
    const onResize = () => render();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [render]);

  // ── Hit testing ──────────────────────────────────────────────────────────
  function getSeatAt(mx, my) {
    const hits = seatHitRef.current;
    for (let i = hits.length - 1; i >= 0; i--) {
      const s = hits[i];
      if (Math.abs(mx - s.cx) <= SEAT_R + 2 && Math.abs(my - s.cy) <= SEAT_R + 2) return s;
    }
    return null;
  }

  function getCanvasMouse(e) {
    const canvas = canvasRef.current;
    if (!canvas) return { mx: 0, my: 0 };
    const rect   = canvas.getBoundingClientRect();
    const scaleX = parseFloat(canvas.style.width) / canvas.width * DEV_RATIO;
    return {
      mx: (e.clientX - rect.left) / scaleX,
      my: (e.clientY - rect.top)  / scaleX,
    };
  }

  function handleMouseMove(e) {
    const { mx, my } = getCanvasMouse(e);
    const s = getSeatAt(mx, my);
    const tip = tooltipRef.current;
    if (!tip) return;
    if (s && (s.state === 'avail' || s.state === 'selected') && !s.dimmed) {
      canvasRef.current.style.cursor = 'pointer';
      const row = rows[s.rowIdx];
      tip.style.display = 'block';
      tip.style.left = e.clientX + 'px';
      tip.style.top  = e.clientY + 'px';
      tip.textContent = `${row.label}${s.col} · ${ZONE_META[row.zone]?.name} · ${fmt(row.price)}`;
    } else {
      canvasRef.current.style.cursor = (s && (s.state === 'sold' || s.state === 'locked')) ? 'not-allowed' : 'default';
      tip.style.display = 'none';
    }
  }

  function handleMouseLeave() {
    if (tooltipRef.current) tooltipRef.current.style.display = 'none';
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  }

  function handleClick(e) {
    const { mx, my } = getCanvasMouse(e);
    const s = getSeatAt(mx, my);
    if (!s || s.dimmed) return;
    if (s.state === 'selected') {
      setSelected(prev => { const next = { ...prev }; delete next[s.key]; return next; });
    } else if (s.state === 'avail') {
      if (Object.keys(selected).length >= 4) { showToast('Tối đa 4 ghế mỗi lần đặt'); return; }
      const row = rows[s.rowIdx];
      // s.col là 1-based từ canvas, DB col là 0-based
      const seatDbId = row.seatByRowCol?.[`${row.rowInZone}-${s.col - 1}`];
      setSelected(prev => ({
        ...prev,
        [s.key]: { rowIdx: s.rowIdx, col: s.col, seatDbId, zoneKey: row.zone, zoneId: row.zoneId, price: row.price },
      }));
    }
  }

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  }

  async function handlePay() {
    const keys = Object.keys(selected);
    if (keys.length === 0) return;

    const missingId = keys.find(k => !selected[k].seatDbId);
    if (missingId) { showToast('Không tìm thấy thông tin ghế. Vui lòng thử lại.'); return; }

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

  const subtotal = selKeys.reduce(
    (acc, k) => acc + toNumberPrice(selected[k].price),
    0
  );
  const fee      = Math.round(subtotal * 0.05);
  const total    = subtotal + fee;

  const firstRow = selKeys.length > 0 ? rows[selected[selKeys[0]].rowIdx] : null;

  const dateStr = event?.date
    ? new Date(event.date).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })
    : '';
  const timeStr = event?.date
    ? new Date(event.date).toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' })
    : '';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="ss">

      {/* Tooltip */}
      <div ref={tooltipRef} className="ss-tooltip" />

      {/* Toast */}
      {toastMsg && <div className="ss-toast">{toastMsg}</div>}

      {/* ── HEADER ── */}
      <header className="ss-header">
        <Link to="/" className="ss-logo">
          <span className="ss-logo__icon">⚡</span>
          <span className="ss-logo__text">TicketRush</span>
        </Link>
        <div className="ss-search">
          <input className="ss-search__input" type="text" placeholder="Tìm kiếm sự kiện, nghệ sĩ..." />
          <button className="ss-search__btn">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" />
            </svg>
          </button>
        </div>
        <div className="ss-header__actions">
          <button className="ss-btn-ghost">Đăng nhập</button>
          <button className="ss-btn-accent">Đăng ký</button>
        </div>
      </header>

      {/* ── EVENT INFO BAR ── */}
      <div className="ss-event-bar">
        <div className="ss-event-bar__left">
          <span className="ss-event-bar__name">{event?.title || 'Sự kiện'}</span>
          {dateStr && (
            <>
              <div className="ss-bar-sep" />
              <span className="ss-bar-detail">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                {dateStr}{timeStr && ` · ${timeStr}`}
              </span>
            </>
          )}
          {event?.venue && (
            <>
              <div className="ss-bar-sep" />
              <span className="ss-bar-detail">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                {event.venue}
              </span>
            </>
          )}
        </div>
        <div className="ss-countdown">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
          </svg>
          Phiên giữ chỗ còn:&nbsp;<Countdown seconds={LOCK_SECONDS} />
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="ss-main">

        {/* LEFT — stage + canvas */}
        <div className="ss-left">

          {/* Stage */}
          <div className="ss-stage-wrap">
            <div className="ss-stage-glow" />
            <div className="ss-stage-box">
              <div className="ss-stage-box__line" />
              SÂN KHẤU &nbsp;/&nbsp; STAGE
            </div>
          </div>

          {/* Zone legend tabs */}
          <div className="ss-zone-legend">
            {(['vip','a','b']).map(zKey => {
              const meta   = ZONE_META[zKey];
              const active = filterActive[zKey];
              const zoneRows = rows.filter(r => r.zone === zKey);
              const price = zoneRows[0]?.price;
              return (
                <button
                  key={zKey}
                  className={`ss-legend-item${active ? ' ss-legend-item--active' : ''}`}
                  style={{ borderColor: active ? meta.borderColor : '#333333' }}
                  onClick={() => setFilter(prev => ({ ...prev, [zKey]: !prev[zKey] }))}
                >
                  <div className="ss-legend-dot" style={{ background: active ? meta.color : '#555' }} />
                  <span className="ss-legend-name">{meta.name}</span>
                  {price > 0 && <span className="ss-legend-price">· {fmt(price)}</span>}
                </button>
              );
            })}
          </div>

          {/* Seat canvas */}
          <div className="ss-seat-area">
            <div ref={wrapRef} className="ss-canvas-wrap">
              <canvas
                ref={canvasRef}
                style={{ display:'block', width:'100%', cursor:'default' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
              />
            </div>

            {/* Legend */}
            <div className="ss-legend-bar">
              {[
                { color:'#c8860a', label:'VIP còn trống' },
                { color:'#3d6828', label:'Khu A còn trống' },
                { color:'#1a4a7a', label:'Khu B còn trống' },
                { color:'#2e2e2e', label:'Đang giữ', opacity:0.6 },
                { color:'#4A1A1A', label:'Đã bán' },
                { color:'#FF6B35', label:'Đang chọn' },
              ].map(item => (
                <div key={item.label} className="ss-legend-bar__item">
                  <div className="ss-legend-bar__sq" style={{ background: item.color, opacity: item.opacity ?? 1 }} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — order panel */}
        <div className="ss-right">
          <div className="ss-panel">
            <div className="ss-panel__title">Ghế đang chọn</div>

            {/* Seat list */}
            <div className="ss-seat-list">
              {selKeys.length === 0 ? (
                <div className="ss-seat-list__empty">Chưa chọn ghế nào</div>
              ) : (
                selKeys.map(key => {
                  const s   = selected[key];
                  const row = rows[s.rowIdx];
                  return (
                    <div key={key} className="ss-seat-item">
                      <div className="ss-seat-item__pill">
                        {ZONE_META[row.zone]?.name} · {row.label}{s.col}
                      </div>
                      <span className="ss-seat-item__name">Hàng {row.label} · Ghế {s.col}</span>
                      <span className="ss-seat-item__price">{fmt(row.price)}</span>
                      <button
                        className="ss-seat-item__remove"
                        onClick={() => setSelected(prev => { const next = { ...prev }; delete next[key]; return next; })}
                      >×</button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Timer */}
            <div className="ss-timer-box">
              <div className="ss-timer-box__top">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
                </svg>
                Vui lòng thanh toán trong&nbsp;<Countdown seconds={LOCK_SECONDS} />
              </div>
              <div className="ss-timer-box__note">Ghế sẽ được nhả nếu không thanh toán đúng hạn</div>
            </div>

            {/* Price rows */}
            <div className="ss-price-rows">
              <div className="ss-price-row">
                <span className="ss-price-row__label">Số ghế đã chọn</span>
                <span className="ss-price-row__val">{selKeys.length} ghế</span>
              </div>
              <div className="ss-price-row">
                <span className="ss-price-row__label">Đơn giá</span>
                <span className="ss-price-row__val">{firstRow ? fmt(firstRow.price) : '—'}</span>
              </div>
              <div className="ss-price-row">
                <span className="ss-price-row__label">Phí dịch vụ (5%)</span>
                <span className="ss-price-row__val">{selKeys.length > 0 ? fmt(fee) : '—'}</span>
              </div>
            </div>

            <div className="ss-price-divider" />

            <div className="ss-total-row">
              <span className="ss-total-row__label">Tổng cộng</span>
              <span className="ss-total-row__val">{selKeys.length > 0 ? fmt(total) : '0đ'}</span>
            </div>

            <button
              className="ss-pay-btn"
              onClick={handlePay}
              disabled={selKeys.length === 0 || booking}
            >
              {booking ? 'Đang xử lý...' : 'Tiến hành thanh toán'}
              {!booking && (
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
