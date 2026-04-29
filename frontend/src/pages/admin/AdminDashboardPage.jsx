import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/shared/AdminLayout';
import api from '../../services/api';
import eventService from '../../services/event.service';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

import { useSocket } from '../../hooks/useSocket';
import './admin.css';

// ── canvas helpers ────────────────────────────────────────────────────────────

const REV_DATA = [20,35,28,52,45,68,60,85,78,105,95,130,120,155,148,175,168,200,190,230,218,255,240,270,260,290,278,310,295,320];

function drawSparkline(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const data = [180,210,195,240,230,270,260,290,280,310,300,320];
  const w = canvas.width, h = canvas.height;
  const min = Math.min(...data), max = Math.max(...data);
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i / (data.length - 1) * w;
    const y = h - (v - min) / (max - min) * (h - 4) - 2;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#4ADE80'; ctx.lineWidth = 1.5; ctx.stroke();
}

function drawRevenue(canvas, offset = 0) {
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;
  const W = parent.clientWidth - 40;
  canvas.width = W; canvas.height = 140;
  const ctx = canvas.getContext('2d');
  const pad = { t: 8, r: 16, b: 28, l: 44 };
  const cw = W - pad.l - pad.r, ch = 140 - pad.t - pad.b;
  const data = REV_DATA.slice(offset, offset + 20);
  const max = Math.max(...data) * 1.15;
  ctx.clearRect(0, 0, W, 140);
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.t + (ch / gridLines) * i;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; ctx.stroke();
    const val = Math.round(max - (max / gridLines) * i);
    ctx.font = '10px Be Vietnam Pro,sans-serif'; ctx.fillStyle = 'rgba(170,170,170,0.7)';
    ctx.textAlign = 'right'; ctx.fillText(val + 'tr', pad.l - 6, y + 3);
  }
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = pad.l + i / (data.length - 1) * cw;
    const y = pad.t + ch - v / max * ch;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.l + cw, pad.t + ch); ctx.lineTo(pad.l, pad.t + ch); ctx.closePath();
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
  grad.addColorStop(0, 'rgba(255,107,53,0.25)');
  grad.addColorStop(1, 'rgba(255,107,53,0)');
  ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = pad.l + i / (data.length - 1) * cw;
    const y = pad.t + ch - v / max * ch;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#FF6B35'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  const lx = pad.l + cw, ly = pad.t + ch - data[data.length - 1] / max * ch;
  ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fillStyle = '#FF6B35'; ctx.fill();
  ctx.beginPath(); ctx.arc(lx, ly, 7, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,107,53,0.25)'; ctx.fill();
  const timeLabels = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00','00:00','01:00','02:00','03:00'];
  const step = Math.floor(data.length / 5);
  ctx.font = '10px Be Vietnam Pro,sans-serif'; ctx.fillStyle = 'rgba(170,170,170,0.7)'; ctx.textAlign = 'center';
  for (let i = 0; i < data.length; i += step) {
    const x = pad.l + i / (data.length - 1) * cw;
    ctx.fillText(timeLabels[i] || '', x, pad.t + ch + 16);
  }
}

function DonutChart({ sold, held, total }) {
  const r = 58, sw = 18, cx = 75, cy = 75;
  const avail = Math.max(0, total - sold - held);
  const segs = [
    { val: sold,  color: '#FF6B35' },
    { val: held,  color: '#AAAAAA' },
    { val: avail, color: '#333333' },
  ];
  let angle = -Math.PI / 2;
  const paths = [];
  segs.forEach((seg, idx) => {
    if (!seg.val || !total) return;
    const sweep = (seg.val / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + sweep), y2 = cy + r * Math.sin(angle + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    paths.push(
      <path key={idx}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
        fill="none" stroke={seg.color} strokeWidth={sw} strokeLinecap="butt"
      />
    );
    angle += sweep;
  });
  const pct = total > 0 ? Math.round(sold / total * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="150" height="150" viewBox="0 0 150 150">{paths}</svg>
        <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 11, color: '#AAAAAA', marginTop: 2 }}>Lấp đầy</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[['#FF6B35','Đã bán'],['#AAAAAA','Đang giữ'],['#333333','Còn trống']].map(([color,label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#AAAAAA' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function AgeBarChart({ data }) {
  if (!data) return null;
  const labels = { UNDER_18: '<18', '18_25': '18-25', '26_35': '26-35', '36_45': '36-45', OVER_45: '>45', UNKNOWN: '?' };
  const entries = Object.entries(labels).map(([key, label]) => ({ label, val: data[key] || 0 }));
  const maxVal = Math.max(...entries.map(e => e.val), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, paddingTop: 8 }}>
      {entries.filter(e => e.val > 0 || e.label !== '?').map(({ label, val }) => {
        const pct = Math.round(val / maxVal * 100);
        return (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
            <span style={{ fontSize: 10, color: '#AAAAAA', fontWeight: 600 }}>{val}</span>
            <div style={{ width: '100%', height: `${pct}%`, borderRadius: '4px 4px 0 0', background: '#FF6B35', opacity: 0.5 + pct / 200 }} />
            <span style={{ fontSize: 10, color: '#AAAAAA', textAlign: 'center', whiteSpace: 'nowrap' }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── zone table ────────────────────────────────────────────────────────────────
const ZONE_COLORS = ['#c8860a','#3d6828','#1a4a7a','#7a1a3a','#1a5a5a','#5a1a7a'];

function zoneStatus(soldPct) {
  if (soldPct >= 90) return { label: 'Sắp hết', color: '#4ADE80', bg: 'rgba(74,222,128,.1)', border: 'rgba(74,222,128,.25)' };
  if (soldPct >= 40) return { label: 'Còn vé',  color: '#FF6B35', bg: 'rgba(255,107,53,.1)', border: 'rgba(255,107,53,.25)' };
  return { label: 'Còn nhiều', color: '#AAAAAA', bg: 'rgba(170,170,170,.08)', border: '#333333' };
}

// ── main component ────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [searchParams] = useSearchParams();
  const eventIdFromUrl = searchParams.get('eventId');
  
  const [events, setEvents] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [dash, setDash] = useState(null);
  const [audience, setAudience] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('vừa xong');
  const [revOffset, setRevOffset] = useState(0);

  const { on } = useSocket(selectedId);

  const sparkRef = useRef(null);
  const revRef   = useRef(null);

  // load event list
  useEffect(() => {
    eventService.getEvents({ limit: 50 }).then(res => {
      const list = res.data?.data || res.data || [];
      const eventList = Array.isArray(list) ? list : [];

      setEvents(eventList);

      if (eventIdFromUrl) {
        setSelectedId(eventIdFromUrl);
      } else if (eventList.length > 0) {
        setSelectedId(eventList[0].id);
      }
    }).catch(() => {});
  }, [eventIdFromUrl]);

  const fetchDash = useCallback((id) => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get(`/admin/dashboard/${id}`),
      api.get('/admin/analytics/audience', { params: { eventId: id } }),
    ]).then(([d, a]) => {
      setDash(d.data.data);
      setAudience(a.data.data);
      setLastUpdate('vừa xong');
      setRevOffset(prev => Math.min(prev + 1, REV_DATA.length - 20));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDash(selectedId); }, [selectedId, fetchDash]);

  // realtime refresh when seat status changes
  useEffect(() => {
    if (!selectedId) return;

    const refreshDashboard = () => {
      fetchDash(selectedId);
    };

    const offSold = on('seat_sold', refreshDashboard);
    const offLocked = on('seat_locked', refreshDashboard);
    const offReleased = on('seat_released', refreshDashboard);

    return () => {
      if (offSold) offSold();
      if (offLocked) offLocked();
      if (offReleased) offReleased();
    };
  }, [selectedId, on, fetchDash]);

  // auto-refresh every 8s
  useEffect(() => {
    const t = setInterval(() => fetchDash(selectedId), 8000);
    return () => clearInterval(t);
  }, [selectedId, fetchDash]);

  // last-update ticker
  useEffect(() => {
    const t = setInterval(() => {
      setLastUpdate(prev => {
        if (prev === 'vừa xong') return '1 giây trước';
        const m = prev.match(/^(\d+) giây/);
        if (m) {
          const n = parseInt(m[1]) + 1;
          return n > 59 ? '1 phút trước' : `${n} giây trước`;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // draw canvases
  useEffect(() => { drawSparkline(sparkRef.current); }, [dash]);
  useEffect(() => { drawRevenue(revRef.current, revOffset); }, [dash, revOffset]);
  useEffect(() => {
    const handleResize = () => drawRevenue(revRef.current, revOffset);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [revOffset]);

  const summary = dash?.summary || {};
  const { totalSeats = 0, soldSeats = 0, lockedSeats = 0, revenue = 0, occupancyRate = 0 } = summary;
  const eventTitle =
    dash?.event?.title ||
    dash?.event?.name ||
    events.find(e => String(e.id) === String(selectedId))?.title ||
    events.find(e => String(e.id) === String(selectedId))?.name ||
    'Dashboard';

  const genderMap = audience?.genderDistribution || {};
  const totalGender = (genderMap.MALE || 0) + (genderMap.FEMALE || 0) + (genderMap.OTHER || 0);
  const genderBars = [
    { label: 'Nam',  count: genderMap.MALE   || 0, color: '#60a5fa' },
    { label: 'Nữ',   count: genderMap.FEMALE || 0, color: '#f472b6' },
    { label: 'Khác', count: genderMap.OTHER  || 0, color: '#AAAAAA' },
  ];
  
  const seatPieData = [
    { name: 'SOLD', value: soldSeats },
    { name: 'LOCKED', value: lockedSeats },
    { name: 'AVAILABLE', value: summary.availableSeats || Math.max(0, totalSeats - soldSeats - lockedSeats) },
  ];

  const zoneRevenueData = (dash?.zones || []).map((zone) => ({
    name: zone.zoneName,
    revenue: zone.revenue,
  }));

  const genderPieData = [
    { name: 'MALE', value: genderMap.MALE || 0 },
    { name: 'FEMALE', value: genderMap.FEMALE || 0 },
    { name: 'OTHER', value: genderMap.OTHER || 0 },
  ];

  const ageBarData = audience?.ageDistribution
    ? Object.entries(audience.ageDistribution).map(([key, value]) => ({
        name: key,
        value,
      }))
    : [];

  const PIE_COLORS = ['#4ADE80', '#FF6B35', '#AAAAAA'];
  const GENDER_COLORS = ['#60A5FA', '#F472B6', '#AAAAAA'];

  const formatRevenue = (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + 'tr đ';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k đ';
    return n.toLocaleString('vi') + 'đ';
  };

  return (
    <AdminLayout>
      <style>{`
        @keyframes live-pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(255,107,53,.4)}50%{opacity:.7;box-shadow:0 0 0 6px rgba(255,107,53,0)}}
        .dash-tr:hover td{background:rgba(255,255,255,.03)}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: '#111111', borderBottom: '1px solid #333333', padding: '16px 28px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Dashboard · {eventTitle}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{
                background: '#242424', border: '1px solid #333333', borderRadius: 8,
                padding: '7px 28px 7px 12px', color: '#fff', fontFamily: 'inherit',
                fontSize: 12, outline: 'none', cursor: 'pointer', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23AAAAAA' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
              }}
            >
              {events.map(e => <option key={e.id} value={e.id}>{e.title || e.name}</option>)}
              {events.length === 0 && <option value="">Chưa có sự kiện</option>}
            </select>
            <button
              onClick={() => fetchDash(selectedId)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                border: '1px solid #333333', borderRadius: 8, background: 'transparent',
                color: '#AAAAAA', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#333333'; e.currentTarget.style.color = '#AAAAAA'; }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" style={{ transition: 'transform .6s' }}><path d="M3 12a9 9 0 109 9"/><path d="M3 12V7h5"/></svg>
              Làm mới
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF6B35', flexShrink: 0, animation: 'live-pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: 12, color: '#AAAAAA' }}>
            Đang cập nhật theo thời gian thực · Cập nhật lần cuối: <span>{lastUpdate}</span>
          </span>
          {loading && <span style={{ fontSize: 11, color: '#FF6B35', marginLeft: 4 }}>Đang tải...</span>}
        </div>
      </div>

      {/* SCROLL */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 32px' }}>

        {/* STAT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
          {/* Total seats */}
          <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 11, color: '#AAAAAA', fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase', marginBottom: 10 }}>Tổng ghế</div>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, marginBottom: 8 }}>{totalSeats}</div>
            <div style={{ height: 4, background: '#333333', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}><div style={{ height: '100%', width: '100%', background: '#333333', borderRadius: 2 }} /></div>
            <div style={{ fontSize: 11, color: '#AAAAAA' }}>Sức chứa tối đa</div>
          </div>
          {/* Sold */}
          <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 11, color: '#AAAAAA', fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase', marginBottom: 10 }}>Đã bán</div>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, marginBottom: 8, color: '#4ADE80' }}>{soldSeats}</div>
            <div style={{ height: 4, background: '#333333', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${totalSeats > 0 ? (soldSeats / totalSeats * 100) : 0}%`, background: '#4ADE80', borderRadius: 2, transition: 'width .8s ease' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#4ADE80' }}>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6"/></svg>
              {occupancyRate}% tổng ghế
            </div>
            <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
              <canvas ref={sparkRef} width="64" height="32" />
            </div>
          </div>
          {/* Locked */}
          <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 11, color: '#AAAAAA', fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase', marginBottom: 10 }}>Đang giữ</div>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, marginBottom: 8, color: '#FF6B35' }}>{lockedSeats}</div>
            <div style={{ height: 4, background: '#333333', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${totalSeats > 0 ? (lockedSeats / totalSeats * 100) : 0}%`, background: '#FF6B35', borderRadius: 2, transition: 'width .8s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: '#FF6B35' }}>Sẽ nhả trong vài phút</div>
          </div>
          {/* Revenue */}
          <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 11, color: '#AAAAAA', fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase', marginBottom: 10 }}>Doanh thu</div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, marginBottom: 8, color: '#FF6B35' }}>{formatRevenue(revenue)}</div>
            <div style={{ height: 4, background: '#333333', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${occupancyRate}%`, background: '#FF6B35', borderRadius: 2, transition: 'width .8s ease' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#4ADE80' }}>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6"/></svg>
              +12% so với hôm qua
            </div>
          </div>
        </div>

        {/* CHARTS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
              Tỷ lệ trạng thái ghế
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={seatPieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {seatPieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
              Doanh thu theo Zone
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={zoneRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `${Number(value).toLocaleString('vi-VN')} đ`} />
                <Bar dataKey="revenue" fill="#FF6B35" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ZONE TABLE */}
        <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Chi tiết theo khu vực</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1A1A1A', borderRadius: 8 }}>
                {['Khu vực','Tổng ghế','Đã bán','Tỷ lệ','Doanh thu','Trạng thái'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#AAAAAA', letterSpacing: .8, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(dash?.zones || []).map((zone, idx) => {
                const pct = zone.totalSeats > 0 ? Math.round(zone.soldSeats / zone.totalSeats * 100) : 0;
                const st = zoneStatus(pct);
                const color = ZONE_COLORS[idx % ZONE_COLORS.length];
                const fillColor = pct >= 90 ? '#4ADE80' : pct >= 40 ? '#FF6B35' : '#AAAAAA';
                return (
                  <tr key={zone.zoneId} className="dash-tr" style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
                    <td style={{ padding: '12px 14px', fontSize: 12, verticalAlign: 'middle' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: color, marginRight: 7, verticalAlign: 'middle' }} />
                      {zone.zoneName}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, verticalAlign: 'middle' }}>{zone.totalSeats}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, verticalAlign: 'middle' }}>{zone.soldSeats}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, verticalAlign: 'middle' }}>
                      <div style={{ minWidth: 80 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: fillColor }}>{pct}%</div>
                        <div style={{ height: 4, background: '#333333', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
                          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: fillColor }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, verticalAlign: 'middle', color: '#FF6B35', fontWeight: 700 }}>
                      {zone.revenue.toLocaleString('vi')}đ
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, verticalAlign: 'middle' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border}`, padding: '3px 8px', borderRadius: 4 }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(!dash?.zones || dash.zones.length === 0) && (
                <tr><td colSpan={6} style={{ padding: '20px 14px', textAlign: 'center', color: '#AAAAAA', fontSize: 12 }}>Chọn sự kiện để xem dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* GENDER + AGE */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
              Phân bổ giới tính
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={genderPieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {genderPieData.map((_, index) => (
                    <Cell key={index} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: '#242424', border: '1px solid #333333', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
              Phân bổ độ tuổi
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ageBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#4ADE80" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
