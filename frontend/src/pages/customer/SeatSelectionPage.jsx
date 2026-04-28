import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import eventService from '../../services/event.service';
import bookingService from '../../services/booking.service';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

// ── Arc geometry constants ────────────────────────────────────────────────────
const ARC_SPAN_DEG = 138;
const INNER_R      = 88;
const ROW_SPACING  = 44;
const SEAT_R       = 11;
const LOCK_SECONDS = 10 * 60;

// Static zone/row config matching backend schema (VIP 2 rows, Khu A 2 rows, Khu B 3 rows)
const STATIC_ROWS = [
  { label:'A', zone:'vip', seats:9,  color:'#8a5c00', hov:'#c8860a' },
  { label:'B', zone:'vip', seats:11, color:'#8a5c00', hov:'#c8860a' },
  { label:'C', zone:'a',   seats:13, color:'#2D4A1E', hov:'#3d6828' },
  { label:'D', zone:'a',   seats:15, color:'#2D4A1E', hov:'#3d6828' },
  { label:'E', zone:'b',   seats:17, color:'#0f2d4a', hov:'#1a4a7a' },
  { label:'F', zone:'b',   seats:19, color:'#0f2d4a', hov:'#1a4a7a' },
  { label:'G', zone:'b',   seats:21, color:'#0f2d4a', hov:'#1a4a7a' },
];

const ZONE_META = {
  vip: { name:'VIP',   color:'#c8860a', borderColor:'#c8860a' },
  a:   { name:'Khu A', color:'#3d6828', borderColor:'#3d6828' },
  b:   { name:'Khu B', color:'#1a4a7a', borderColor:'#1a4a7a' },
};

function fmt(n) { return n.toLocaleString('vi-VN') + 'đ'; }

function Countdown({ seconds, id1, id2 }) {
  const [secs, setSecs] = useState(seconds);
  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const display = `${mm}:${ss}`;
  return (
    <>
      <span id={id1}>{display}</span>
      {id2 && <span id={id2} style={{ display:'none' }}>{display}</span>}
    </>
  );
}

export default function SeatSelectionPage() {
  const { id: eventId } = useParams();
  const location        = useLocation();
  const navigate        = useNavigate();

  const { zoneId: preselectedZoneId } = location.state || {};

  const [event,     setEvent]     = useState(null);
  const [zones,     setZones]     = useState([]);
  const [seats,     setSeats]     = useState({}); // zoneId → seat[]
  const [loading,   setLoading]   = useState(true);
  const [booking,   setBooking]   = useState(false);
  const [toast,     setToast]     = useState('');
  const [selected,  setSelected]  = useState({}); // key "LABEL-col" → { rowIdx, col, seatId, zoneKey, price }
  const [filterActive, setFilter] = useState({ vip:true, a:true, b:true });
  const [timerSecs] = useState(LOCK_SECONDS);

  // ── Build rows from API data ─────────────────────────────────────────────
  const [rows, setRows] = useState(STATIC_ROWS.map(r => ({ ...r, price: 0, sold:[], locked:[] })));

  const canvasRef  = useRef(null);
  const wrapRef    = useRef(null);
  const seatHitRef = useRef([]);
  const tooltipRef = useRef(null);
  const DEV_RATIO  = window.devicePixelRatio || 1;

  // ── Load event + zones + seats ───────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    Promise.all([
      eventService.getEventById(eventId),
      eventService.getEventZones(eventId),
    ])
      .then(async ([evRes, zoneRes]) => {
        setEvent(evRes.data);
        const fetchedZones = zoneRes.data || [];
        setZones(fetchedZones);

        // Fetch seats per zone
        const seatMap = {};
        await Promise.all(
          fetchedZones.map(z =>
            eventService.getZoneSeats(z.id)
              .then(r => { seatMap[z.id] = r.data || []; })
              .catch(() => { seatMap[z.id] = []; })
          )
        );
        setSeats(seatMap);

        // Map API zones to rows: sort by price desc (VIP first)
        const sorted = [...fetchedZones].sort((a, b) => b.price - a.price);
        if (sorted.length > 0) {
          const newRows = STATIC_ROWS.map((staticRow, ri) => {
            const zoneKeys = ['vip','vip','a','a','b','b','b'];
            const zKey = zoneKeys[ri];
            // find matching zone by index within its group
            const samePriceZones = sorted.filter(z => {
              const relPrice = sorted[0].price;
              if (zKey === 'vip') return z.price === relPrice;
              if (zKey === 'a')   return z.price < sorted[0].price && z.price > sorted[sorted.length-1].price;
              return z.price === sorted[sorted.length - 1].price;
            });
            const zone = samePriceZones[0] || sorted[Math.min(ri, sorted.length - 1)];
            const zoneSeatList = seatMap[zone?.id] || [];
            const sold   = zoneSeatList.filter(s => s.status === 'SOLD').map(s => s.label);
            const locked = zoneSeatList.filter(s => s.status === 'LOCKED').map(s => s.label);
            return {
              ...staticRow,
              price: zone?.price ?? staticRow.price,
              zoneId: zone?.id,
              sold,
              locked,
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
        const sid  = `${row.label}${si + 1}`;
        const key  = `${row.label}-${si + 1}`;
        const isSold   = row.sold?.includes(sid);
        const isLocked = row.locked?.includes(sid);
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
        seatHitRef.current.push({ cx: sx, cy: sy, key, rowIdx: ri, col: si + 1, seatId: sid, state, dimmed });
      }
    });

    // Zone labels (right side)
    [
      { zone:'vip', rowIndices:[0,1], text:'VIP' },
      { zone:'a',   rowIndices:[2,3], text:'KHU A' },
      { zone:'b',   rowIndices:[4,6], text:'KHU B' },
    ].forEach(({ zone, rowIndices, text }) => {
      const r1  = INNER_R + rowIndices[0] * ROW_SPACING;
      const r2  = INNER_R + rowIndices[1] * ROW_SPACING;
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
      if (Object.keys(selected).length >= 4) {
        showToast('Tối đa 4 ghế mỗi lần đặt');
        return;
      }
      const row = rows[s.rowIdx];
      setSelected(prev => ({
        ...prev,
        [s.key]: { rowIdx: s.rowIdx, col: s.col, seatId: s.seatId, zoneKey: row.zone, zoneId: row.zoneId, price: row.price },
      }));
    }
  }

  // ── Toast ────────────────────────────────────────────────────────────────
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  // ── Payment ──────────────────────────────────────────────────────────────
  async function handlePay() {
    const keys = Object.keys(selected);
    if (keys.length === 0) return;

    // Use the first selected seat's zoneId (all seats in same zone ideally)
    const firstSeat = selected[keys[0]];
    const zoneIdToBook = firstSeat.zoneId || preselectedZoneId;

    if (!zoneIdToBook) {
      showToast('Không tìm thấy khu vé. Vui lòng thử lại.');
      return;
    }

    setBooking(true);
    try {
      const res = await bookingService.createBooking({
        zoneId: zoneIdToBook,
        quantity: keys.length,
      });
      const bookingId = res.data?.booking?.id || res.data?.id;
      if (bookingId) {
        navigate(`/checkout/${bookingId}`);
      } else {
        showToast('Đặt vé thành công! Chuyển đến thanh toán...');
        navigate('/my-tickets');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Đặt vé thất bại. Vui lòng thử lại.');
    } finally {
      setBooking(false);
    }
  }

  // ── Derived totals ───────────────────────────────────────────────────────
  const selKeys  = Object.keys(selected);
  const subtotal = selKeys.reduce((acc, k) => acc + (selected[k].price || 0), 0);
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
    <div>
      {/* Tooltip */}
      <div ref={tooltipRef} style={{
        position:'fixed', pointerEvents:'none', zIndex:200,
        background:'#111', border:'1px solid #333333', borderRadius:7,
        padding:'5px 10px', fontSize:12, fontWeight:600, color:'#fff',
        whiteSpace:'nowrap', display:'none', transform:'translate(-50%,-120%)',
        fontFamily:"'Be Vietnam Pro', sans-serif",
      }} />

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:32, left:'50%', transform:'translateX(-50%)',
          background:'#1e1e1e', border:'1px solid #FF6B35', borderRadius:8,
          padding:'10px 20px', color:'#fff', fontSize:13, fontWeight:600,
          zIndex:9999, pointerEvents:'none',
        }}>{toast}</div>
      )}

      {/* Event info bar */}
      <div style={{
        background:'#111111', borderBottom:'1px solid #333333',
        padding:'12px 60px', display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ fontSize:14, fontWeight:700 }}>
            {event?.title || 'Sự kiện'}
          </span>
          {dateStr && (
            <>
              <div style={{ width:1, height:16, background:'#333333' }} />
              <span style={{ fontSize:13, color:'#AAAAAA', display:'flex', alignItems:'center', gap:5 }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                {dateStr}{timeStr && ` · ${timeStr}`}
              </span>
            </>
          )}
          {event?.venue && (
            <>
              <div style={{ width:1, height:16, background:'#333333' }} />
              <span style={{ fontSize:13, color:'#AAAAAA', display:'flex', alignItems:'center', gap:5 }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
                {event.venue}
              </span>
            </>
          )}
        </div>
        <div style={{
          display:'flex', alignItems:'center', gap:7, color:'#FF6B35',
          fontSize:14, fontWeight:700,
          background:'rgba(255,107,53,.1)', border:'1px solid rgba(255,107,53,.3)',
          padding:'6px 14px', borderRadius:8,
        }}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
          </svg>
          Phiên giữ chỗ còn:&nbsp;
          <Countdown seconds={timerSecs} id1="timer-bar" />
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ background:'#1A1A1A', padding:'10px 60px', fontSize:13, color:'#AAAAAA' }}>
        <Link to="/" style={{ color:'#AAAAAA', textDecoration:'none' }}>Trang chủ</Link>
        {' / '}
        <Link to={`/event/${eventId}`} style={{ color:'#AAAAAA', textDecoration:'none' }}>
          {event?.title || 'Sự kiện'}
        </Link>
        {' / '}
        <span style={{ color:'#FF6B35' }}>Chọn ghế</span>
      </div>

      {/* Main grid */}
      <div style={{ display:'grid', gridTemplateColumns:'68% 32%', gap:28, padding:'32px 60px', alignItems:'start', maxWidth:1400, margin:'0 auto' }}>

        {/* Left — stage + canvas */}
        <div>
          {/* Stage */}
          <div style={{ textAlign:'center', marginBottom:16, position:'relative' }}>
            <div style={{
              position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
              width:'70%', height:70,
              background:'radial-gradient(ellipse at 50% 0%, rgba(255,107,53,.3), transparent 70%)',
              pointerEvents:'none', borderRadius:'50%', filter:'blur(10px)',
            }} />
            <div style={{
              background:'#111111', border:'1px solid #333333', borderRadius:8,
              padding:'13px 0', fontSize:13, fontWeight:700, letterSpacing:2,
              color:'rgba(255,255,255,.7)', position:'relative', overflow:'hidden',
            }}>
              <div style={{
                position:'absolute', top:0, left:0, right:0, height:3,
                background:'linear-gradient(90deg, transparent, rgba(255,107,53,.6), transparent)',
              }} />
              SÂN KHẤU &nbsp;/&nbsp; STAGE
            </div>
          </div>

          {/* Zone legend tabs */}
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
            {(['vip','a','b']).map(zKey => {
              const meta  = ZONE_META[zKey];
              const active = filterActive[zKey];
              const zoneRows = rows.filter(r => r.zone === zKey);
              const price = zoneRows[0]?.price;
              return (
                <button
                  key={zKey}
                  onClick={() => setFilter(prev => ({ ...prev, [zKey]: !prev[zKey] }))}
                  style={{
                    display:'flex', alignItems:'center', gap:7, padding:'6px 14px',
                    borderRadius:100, border:`1.5px solid ${active ? meta.borderColor : '#333333'}`,
                    fontSize:12, fontWeight:700, cursor:'pointer',
                    background:'#242424', color:'#FFFFFF',
                    opacity: active ? 1 : 0.4,
                    transition:'opacity .2s, border-color .2s',
                  }}
                >
                  <div style={{ width:10, height:10, borderRadius:3, background: active ? meta.color : '#555', flexShrink:0 }} />
                  <span>{meta.name}</span>
                  {price > 0 && <span style={{ color:'#AAAAAA', fontWeight:500 }}>· {fmt(price)}</span>}
                </button>
              );
            })}
          </div>

          {/* Seat canvas area */}
          <div style={{ background:'#242424', border:'1px solid #333333', borderRadius:12, padding:'20px 16px 16px', overflow:'hidden' }}>
            <div ref={wrapRef} id="arc-canvas-wrap" style={{ width:'100%', position:'relative' }}>
              <canvas
                ref={canvasRef}
                style={{ display:'block', width:'100%', cursor:'default' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
              />
            </div>

            {/* Legend */}
            <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginTop:14, paddingTop:14, borderTop:'1px solid #333333', justifyContent:'center' }}>
              {[
                { color:'#c8860a', label:'VIP còn trống' },
                { color:'#3d6828', label:'Khu A còn trống' },
                { color:'#1a4a7a', label:'Khu B còn trống' },
                { color:'#2e2e2e', label:'Đang giữ', opacity:0.6 },
                { color:'#4A1A1A', label:'Đã bán' },
                { color:'#FF6B35', label:'Đang chọn' },
              ].map(item => (
                <div key={item.label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#AAAAAA' }}>
                  <div style={{ width:13, height:13, borderRadius:3, background:item.color, opacity: item.opacity ?? 1, flexShrink:0 }} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — order panel */}
        <div>
          <div style={{ background:'#242424', border:'1px solid #333333', borderRadius:12, padding:20, position:'sticky', top:130 }}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:14 }}>Ghế đang chọn</div>

            {/* Seat list */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, minHeight:48, marginBottom:14 }}>
              {selKeys.length === 0 ? (
                <div style={{ color:'#AAAAAA', fontSize:13, textAlign:'center', padding:'12px 0', opacity:.6 }}>
                  Chưa chọn ghế nào
                </div>
              ) : (
                selKeys.map(key => {
                  const s   = selected[key];
                  const row = rows[s.rowIdx];
                  return (
                    <div key={key} style={{ background:'#1A1A1A', borderRadius:8, padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{
                        background:'rgba(255,107,53,.15)', border:'1px solid rgba(255,107,53,.3)',
                        color:'#FF6B35', fontSize:11, fontWeight:700, padding:'3px 8px',
                        borderRadius:5, flexShrink:0,
                      }}>
                        {ZONE_META[row.zone]?.name} · {row.label}{s.col}
                      </div>
                      <span style={{ fontSize:13, fontWeight:600, flex:1 }}>Hàng {row.label} · Ghế {s.col}</span>
                      <span style={{ fontSize:13, fontWeight:700, whiteSpace:'nowrap' }}>{fmt(row.price)}</span>
                      <button
                        onClick={() => setSelected(prev => { const next = { ...prev }; delete next[key]; return next; })}
                        style={{ width:24, height:24, border:'none', background:'transparent', color:'#AAAAAA', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:4, transition:'color .2s' }}
                        onMouseEnter={e => e.currentTarget.style.color='#fff'}
                        onMouseLeave={e => e.currentTarget.style.color='#AAAAAA'}
                      >×</button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Timer box */}
            <div style={{ background:'#2D1F0A', borderLeft:'3px solid #FF6B35', borderRadius:'0 8px 8px 0', padding:'12px 14px', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, color:'#FF6B35', fontSize:13, fontWeight:700, marginBottom:4 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
                </svg>
                Vui lòng thanh toán trong&nbsp;
                <Countdown seconds={timerSecs} id1="timer-panel" />
              </div>
              <div style={{ fontSize:11, color:'#AAAAAA', lineHeight:1.5 }}>
                Ghế sẽ được nhả nếu không thanh toán đúng hạn
              </div>
            </div>

            {/* Price rows */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:'#AAAAAA' }}>Số ghế đã chọn</span>
                <span style={{ fontWeight:600 }}>{selKeys.length} ghế</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:'#AAAAAA' }}>Đơn giá</span>
                <span style={{ fontWeight:600 }}>{firstRow ? fmt(firstRow.price) : '—'}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:'#AAAAAA' }}>Phí dịch vụ (5%)</span>
                <span style={{ fontWeight:600 }}>{selKeys.length > 0 ? fmt(fee) : '—'}</span>
              </div>
            </div>
            <div style={{ height:1, background:'#333333', margin:'10px 0' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, fontWeight:700 }}>Tổng cộng</span>
              <span style={{ fontSize:22, fontWeight:800, color:'#FF6B35' }}>
                {selKeys.length > 0 ? fmt(total) : '0đ'}
              </span>
            </div>

            <button
              onClick={handlePay}
              disabled={selKeys.length === 0 || booking}
              style={{
                width:'100%', height:48, background: selKeys.length === 0 || booking ? '#444' : '#FF6B35',
                border:'none', borderRadius:8, color:'#fff', fontFamily:"'Be Vietnam Pro', sans-serif",
                fontSize:15, fontWeight:700, cursor: selKeys.length === 0 || booking ? 'not-allowed' : 'pointer',
                marginTop:16, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                transition:'background .2s, transform .15s',
                boxShadow: selKeys.length > 0 && !booking ? '0 4px 20px rgba(255,107,53,.3)' : 'none',
              }}
              onMouseEnter={e => { if (selKeys.length > 0 && !booking) e.currentTarget.style.background = '#e85a24'; }}
              onMouseLeave={e => { if (selKeys.length > 0 && !booking) e.currentTarget.style.background = '#FF6B35'; }}
            >
              {booking ? 'Đang xử lý...' : 'Tiến hành thanh toán'}
              {!booking && (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
