import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/shared/AdminLayout';
import api from '../../services/api';
import eventService from '../../services/event.service';
import { io } from 'socket.io-client';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import './admin.css';

// ── canvas helpers ────────────────────────────────────────────────────────────
import { css, cx, setNodeCss } from "../../lib/runtimeCss";
import './admin-dashboard-inline.css';
const REV_DATA = [20, 35, 28, 52, 45, 68, 60, 85, 78, 105, 95, 130, 120, 155, 148, 175, 168, 200, 190, 230, 218, 255, 240, 270, 260, 290, 278, 310, 295, 320];
function drawSparkline(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const data = [180, 210, 195, 240, 230, 270, 260, 290, 280, 310, 300, 320];
  const w = canvas.width,
    h = canvas.height;
  const min = Math.min(...data),
    max = Math.max(...data);
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i / (data.length - 1) * w;
    const y = h - (v - min) / (max - min) * (h - 4) - 2;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = 'var(--success)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
function drawRevenue(canvas, offset = 0) {
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;
  const W = parent.clientWidth - 40;
  canvas.width = W;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  const pad = {
    t: 8,
    r: 16,
    b: 28,
    l: 44
  };
  const cw = W - pad.l - pad.r,
    ch = 140 - pad.t - pad.b;
  const data = REV_DATA.slice(offset, offset + 20);
  const max = Math.max(...data) * 1.15;
  ctx.clearRect(0, 0, W, 140);
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.t + ch / gridLines * i;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + cw, y);
    ctx.strokeStyle = 'rgba(120,120,120,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const val = Math.round(max - max / gridLines * i);
    ctx.font = '10px Be Vietnam Pro,sans-serif';
    ctx.fillStyle = 'rgba(170,170,170,0.7)';
    ctx.textAlign = 'right';
    ctx.fillText(val + 'tr', pad.l - 6, y + 3);
  }
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = pad.l + i / (data.length - 1) * cw;
    const y = pad.t + ch - v / max * ch;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.l + cw, pad.t + ch);
  ctx.lineTo(pad.l, pad.t + ch);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
  grad.addColorStop(0, 'rgba(255,107,53,0.25)');
  grad.addColorStop(1, 'rgba(255,107,53,0)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = pad.l + i / (data.length - 1) * cw;
    const y = pad.t + ch - v / max * ch;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = 'var(--accent)';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  const lx = pad.l + cw,
    ly = pad.t + ch - data[data.length - 1] / max * ch;
  ctx.beginPath();
  ctx.arc(lx, ly, 4, 0, Math.PI * 2);
  ctx.fillStyle = 'var(--accent)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(lx, ly, 7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,107,53,0.25)';
  ctx.fill();
  const timeLabels = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00'];
  const step = Math.floor(data.length / 5);
  ctx.font = '10px Be Vietnam Pro,sans-serif';
  ctx.fillStyle = 'rgba(170,170,170,0.7)';
  ctx.textAlign = 'center';
  for (let i = 0; i < data.length; i += step) {
    const x = pad.l + i / (data.length - 1) * cw;
    ctx.fillText(timeLabels[i] || '', x, pad.t + ch + 16);
  }
}
function DonutChart({
  sold,
  held,
  total
}) {
  const r = 58,
    sw = 18,
    cx = 75,
    cy = 75;
  const avail = Math.max(0, total - sold - held);
  const segs = [{
    val: sold,
    color: 'var(--accent)'
  }, {
    val: held,
    color: 'var(--muted)'
  }, {
    val: avail,
    color: 'var(--border)'
  }];
  let angle = -Math.PI / 2;
  const paths = [];
  segs.forEach((seg, idx) => {
    if (!seg.val || !total) return;
    const sweep = seg.val / total * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle),
      y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + sweep),
      y2 = cy + r * Math.sin(angle + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    paths.push(<path key={idx} d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={seg.color} strokeWidth={sw} strokeLinecap="butt" />);
    angle += sweep;
  });
  const pct = total > 0 ? Math.round(sold / total * 100) : 0;
  return <div className={css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16
  }, "AdminDashboardPage")}>
      <div className={css({
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }, "AdminDashboardPage")}>
        <svg width="150" height="150" viewBox="0 0 150 150">{paths}</svg>
        <div className={css({
        position: 'absolute',
        textAlign: 'center',
        pointerEvents: 'none'
      }, "AdminDashboardPage")}>
          <div className={css({
          fontSize: 28,
          fontWeight: 800,
          lineHeight: 1
        }, "AdminDashboardPage")}>{pct}%</div>
          <div className={css({
          fontSize: 11,
          color: 'var(--muted)',
          marginTop: 2
        }, "AdminDashboardPage")}>Lấp đầy</div>
        </div>
      </div>
      <div className={css({
      display: 'flex',
      gap: 14,
      flexWrap: 'wrap',
      justifyContent: 'center'
    }, "AdminDashboardPage")}>
        {[['var(--accent)', 'Đã bán'], ['var(--muted)', 'Đang giữ'], ['var(--border)', 'Còn trống']].map(([color, label]) => <div key={label} className={css({
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: 'var(--muted)'
      }, "AdminDashboardPage")}>
            <div className={css({
          width: 10,
          height: 10,
          borderRadius: 2,
          background: color,
          flexShrink: 0
        }, "AdminDashboardPage")} />
            {label}
          </div>)}
      </div>
    </div>;
}
function AgeBarChart({
  data
}) {
  if (!data) return null;
  const labels = {
    UNDER_18: '<18',
    '18_25': '18-25',
    '26_35': '26-35',
    '36_45': '36-45',
    OVER_45: '>45',
    UNKNOWN: '?'
  };
  const entries = Object.entries(labels).map(([key, label]) => ({
    label,
    val: data[key] || 0
  }));
  const maxVal = Math.max(...entries.map(e => e.val), 1);
  return <div className={css({
    display: 'flex',
    alignItems: 'flex-end',
    gap: 6,
    height: 120,
    paddingTop: 8
  }, "AdminDashboardPage")}>
      {entries.filter(e => e.val > 0 || e.label !== '?').map(({
      label,
      val
    }) => {
      const pct = Math.round(val / maxVal * 100);
      return <div key={label} className={css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        flex: 1
      }, "AdminDashboardPage")}>
            <span className={css({
          fontSize: 10,
          color: 'var(--muted)',
          fontWeight: 600
        }, "AdminDashboardPage")}>{val}</span>
            <div className={css({
          width: '100%',
          height: `${pct}%`,
          borderRadius: '4px 4px 0 0',
          background: 'var(--accent)',
          opacity: 0.5 + pct / 200
        }, "AdminDashboardPage")} />
            <span className={css({
          fontSize: 10,
          color: 'var(--muted)',
          textAlign: 'center',
          whiteSpace: 'nowrap'
        }, "AdminDashboardPage")}>{label}</span>
          </div>;
    })}
    </div>;
}

// ── zone table ────────────────────────────────────────────────────────────────
const ZONE_COLORS = ['#c8860a', '#3d6828', '#1a4a7a', '#7a1a3a', '#1a5a5a', '#5a1a7a'];
function zoneStatus(soldPct) {
  if (soldPct >= 90) return {
    label: 'Sắp hết',
    color: 'var(--success)',
    bg: 'rgba(74,222,128,.1)',
    border: 'rgba(74,222,128,.25)'
  };
  if (soldPct >= 40) return {
    label: 'Còn vé',
    color: 'var(--accent)',
    bg: 'rgba(255,107,53,.1)',
    border: 'rgba(255,107,53,.25)'
  };
  return {
    label: 'Còn nhiều',
    color: 'var(--muted)',
    bg: 'var(--bg)',
    border: 'var(--border)'
  };
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
  const sparkRef = useRef(null);
  const revRef = useRef(null);

  // load event list
  useEffect(() => {
    eventService.getEvents({
      limit: 50
    }).then(res => {
      const list = res.data?.events || res.data?.data || res.data || [];
      const eventList = Array.isArray(list) ? list : [];
      setEvents(eventList);
      if (eventIdFromUrl) {
        setSelectedId(eventIdFromUrl);
      } else if (eventList.length > 0) {
        setSelectedId(eventList[0].id);
      }
    }).catch(() => {});
  }, [eventIdFromUrl]);
  const fetchDash = useCallback(id => {
    if (!id) return;
    setLoading(true);
    Promise.all([api.get(`/admin/dashboard/${id}`), api.get('/admin/analytics/audience', {
      params: {
        eventId: id
      }
    })]).then(([d, a]) => {
      setDash(d.data.data);
      setAudience(a.data.data);
      setLastUpdate('vừa xong');
      setRevOffset(prev => Math.min(prev + 1, REV_DATA.length - 20));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    fetchDash(selectedId);
  }, [selectedId, fetchDash]);

  // realtime refresh when customer locks / buys / releases seats
  useEffect(() => {
    if (!selectedId) return;
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      withCredentials: true
    });
    socket.emit('join_event', selectedId);
    const refreshDashboard = () => {
      fetchDash(selectedId);
    };
    socket.on('seat_locked', refreshDashboard);
    socket.on('seat_sold', refreshDashboard);
    socket.on('seat_released', refreshDashboard);
    return () => {
      socket.emit('leave_event', selectedId);
      socket.off('seat_locked', refreshDashboard);
      socket.off('seat_sold', refreshDashboard);
      socket.off('seat_released', refreshDashboard);
      socket.disconnect();
    };
  }, [selectedId, fetchDash]);

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
  useEffect(() => {
    drawSparkline(sparkRef.current);
  }, [dash]);
  useEffect(() => {
    drawRevenue(revRef.current, revOffset);
  }, [dash, revOffset]);
  useEffect(() => {
    const handleResize = () => drawRevenue(revRef.current, revOffset);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [revOffset]);
  const summary = dash?.summary || {};
  const {
    totalSeats = 0,
    soldSeats = 0,
    lockedSeats = 0,
    revenue = 0,
    occupancyRate = 0
  } = summary;
  const eventTitle = dash?.event?.title || dash?.event?.name || events.find(e => String(e.id) === String(selectedId))?.title || events.find(e => String(e.id) === String(selectedId))?.name || 'Dashboard';
  const genderMap = audience?.genderDistribution || {};
  const totalGender = (genderMap.MALE || 0) + (genderMap.FEMALE || 0) + (genderMap.OTHER || 0);
  const genderBars = [{
    label: 'Nam',
    count: genderMap.MALE || 0,
    color: '#60a5fa'
  }, {
    label: 'Nữ',
    count: genderMap.FEMALE || 0,
    color: '#f472b6'
  }, {
    label: 'Khác',
    count: genderMap.OTHER || 0,
    color: 'var(--muted)'
  }];
  const seatPieData = [{
    name: 'SOLD',
    value: soldSeats
  }, {
    name: 'LOCKED',
    value: lockedSeats
  }, {
    name: 'AVAILABLE',
    value: summary.availableSeats || Math.max(0, totalSeats - soldSeats - lockedSeats)
  }];
  const zoneRevenueData = (dash?.zones || []).map(zone => ({
    name: zone.zoneName,
    revenue: zone.revenue
  }));
  const genderPieData = [{
    name: 'MALE',
    value: genderMap.MALE || 0
  }, {
    name: 'FEMALE',
    value: genderMap.FEMALE || 0
  }, {
    name: 'OTHER',
    value: genderMap.OTHER || 0
  }];
  const ageBarData = audience?.ageDistribution ? Object.entries(audience.ageDistribution).map(([key, value]) => ({
    name: key,
    value
  })) : [];
  const PIE_COLORS = ['var(--success)', 'var(--accent)', 'var(--muted)'];
  const GENDER_COLORS = ['#60A5FA', '#F472B6', 'var(--muted)'];
  const formatRevenue = n => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + 'tr đ';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k đ';
    return n.toLocaleString('vi') + 'đ';
  };
  return <AdminLayout>
      {/* TOP BAR */}
      <div className={css({
      background: 'var(--nav)',
      borderBottom: '1px solid var(--border)',
      padding: '16px 28px',
      flexShrink: 0
    }, "AdminDashboardPage")}>
        <div className={css({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8
      }, "AdminDashboardPage")}>
          <div className={css({
          fontSize: 16,
          fontWeight: 800
        }, "AdminDashboardPage")}>Dashboard · {eventTitle}</div>
          <div className={css({
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }, "AdminDashboardPage")}>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className={css({
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '7px 28px 7px 12px',
            color: 'var(--text)',
            fontFamily: 'inherit',
            fontSize: 12,
            outline: 'none',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23AAAAAA' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 9px center'
          }, "AdminDashboardPage")}>
              {events.map(e => <option key={e.id} value={e.id}>{e.title || e.name}</option>)}
              {events.length === 0 && <option value="">Chưa có sự kiện</option>}
            </select>
            <button onClick={() => fetchDash(selectedId)} className={css({
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'transparent',
            color: 'var(--muted)',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all .2s'
          }, "AdminDashboardPage")} onMouseEnter={e => {
setNodeCss(e.currentTarget, { borderColor: 'rgba(120,120,120,0.3)' }, 'borderColor');
setNodeCss(e.currentTarget, { color: 'var(--text)' }, 'color');
          }} onMouseLeave={e => {
setNodeCss(e.currentTarget, { borderColor: 'var(--border)' }, 'borderColor');
setNodeCss(e.currentTarget, { color: 'var(--muted)' }, 'color');
          }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" className={css({
              transition: 'transform .6s'
            }, "AdminDashboardPage")}><path d="M3 12a9 9 0 109 9" /><path d="M3 12V7h5" /></svg>
              Làm mới
            </button>
          </div>
        </div>
        <div className={css({
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }, "AdminDashboardPage")}>
          <div className={css({
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'var(--accent)',
          flexShrink: 0,
          animation: 'live-pulse 1.5s ease-in-out infinite'
        }, "AdminDashboardPage")} />
          <span className={css({
          fontSize: 12,
          color: 'var(--muted)'
        }, "AdminDashboardPage")}>
            Đang cập nhật theo thời gian thực · Cập nhật lần cuối: <span>{lastUpdate}</span>
          </span>
          {loading && <span className={css({
          fontSize: 11,
          color: 'var(--accent)',
          marginLeft: 4
        }, "AdminDashboardPage")}>Đang tải...</span>}
        </div>
      </div>

      {/* SCROLL */}
      <div className={css({
      flex: 1,
      overflowY: 'auto',
      padding: '20px 28px 32px'
    }, "AdminDashboardPage")}>

        {/* STAT CARDS */}
        <div className={css({
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 16,
        marginBottom: 20
      }, "AdminDashboardPage")}>
          {/* Total seats */}
          <div className={css({
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '18px 20px',
          position: 'relative',
          overflow: 'hidden'
        }, "AdminDashboardPage")}>
            <div className={css({
            fontSize: 11,
            color: 'var(--muted)',
            fontWeight: 700,
            letterSpacing: .5,
            textTransform: 'uppercase',
            marginBottom: 10
          }, "AdminDashboardPage")}>Tổng ghế</div>
            <div className={css({
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1,
            marginBottom: 8
          }, "AdminDashboardPage")}>{totalSeats}</div>
            <div className={css({
            height: 4,
            background: 'var(--border)',
            borderRadius: 2,
            marginBottom: 8,
            overflow: 'hidden'
          }, "AdminDashboardPage")}><div className={css({
              height: '100%',
              width: '100%',
              background: 'var(--border)',
              borderRadius: 2
            }, "AdminDashboardPage")} /></div>
            <div className={css({
            fontSize: 11,
            color: 'var(--muted)'
          }, "AdminDashboardPage")}>Sức chứa tối đa</div>
          </div>
          {/* Sold */}
          <div className={css({
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '18px 20px',
          position: 'relative',
          overflow: 'hidden'
        }, "AdminDashboardPage")}>
            <div className={css({
            fontSize: 11,
            color: 'var(--muted)',
            fontWeight: 700,
            letterSpacing: .5,
            textTransform: 'uppercase',
            marginBottom: 10
          }, "AdminDashboardPage")}>Đã bán</div>
            <div className={css({
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1,
            marginBottom: 8,
            color: 'var(--success)'
          }, "AdminDashboardPage")}>{soldSeats}</div>
            <div className={css({
            height: 4,
            background: 'var(--border)',
            borderRadius: 2,
            marginBottom: 8,
            overflow: 'hidden'
          }, "AdminDashboardPage")}>
              <div className={css({
              height: '100%',
              width: `${totalSeats > 0 ? soldSeats / totalSeats * 100 : 0}%`,
              background: 'var(--success)',
              borderRadius: 2,
              transition: 'width .8s ease'
            }, "AdminDashboardPage")} />
            </div>
            <div className={css({
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            color: 'var(--success)'
          }, "AdminDashboardPage")}>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6" /></svg>
              {occupancyRate}% tổng ghế
            </div>
            <div className={css({
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)'
          }, "AdminDashboardPage")}>
              <canvas ref={sparkRef} width="64" height="32" />
            </div>
          </div>
          {/* Locked */}
          <div className={css({
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '18px 20px',
          position: 'relative',
          overflow: 'hidden'
        }, "AdminDashboardPage")}>
            <div className={css({
            fontSize: 11,
            color: 'var(--muted)',
            fontWeight: 700,
            letterSpacing: .5,
            textTransform: 'uppercase',
            marginBottom: 10
          }, "AdminDashboardPage")}>Đang giữ</div>
            <div className={css({
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1,
            marginBottom: 8,
            color: 'var(--accent)'
          }, "AdminDashboardPage")}>{lockedSeats}</div>
            <div className={css({
            height: 4,
            background: 'var(--border)',
            borderRadius: 2,
            marginBottom: 8,
            overflow: 'hidden'
          }, "AdminDashboardPage")}>
              <div className={css({
              height: '100%',
              width: `${totalSeats > 0 ? lockedSeats / totalSeats * 100 : 0}%`,
              background: 'var(--accent)',
              borderRadius: 2,
              transition: 'width .8s ease'
            }, "AdminDashboardPage")} />
            </div>
            <div className={css({
            fontSize: 11,
            color: 'var(--accent)'
          }, "AdminDashboardPage")}>Sẽ nhả trong vài phút</div>
          </div>
          {/* Revenue */}
          <div className={css({
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '18px 20px',
          position: 'relative',
          overflow: 'hidden'
        }, "AdminDashboardPage")}>
            <div className={css({
            fontSize: 11,
            color: 'var(--muted)',
            fontWeight: 700,
            letterSpacing: .5,
            textTransform: 'uppercase',
            marginBottom: 10
          }, "AdminDashboardPage")}>Doanh thu</div>
            <div className={css({
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1,
            marginBottom: 8,
            color: 'var(--accent)'
          }, "AdminDashboardPage")}>{formatRevenue(revenue)}</div>
            <div className={css({
            height: 4,
            background: 'var(--border)',
            borderRadius: 2,
            marginBottom: 8,
            overflow: 'hidden'
          }, "AdminDashboardPage")}>
              <div className={css({
              height: '100%',
              width: `${occupancyRate}%`,
              background: 'var(--accent)',
              borderRadius: 2,
              transition: 'width .8s ease'
            }, "AdminDashboardPage")} />
            </div>
            <div className={css({
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            color: 'var(--success)'
          }, "AdminDashboardPage")}>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6" /></svg>
              +12% so với hôm qua
            </div>
          </div>
        </div>

        {/* CHARTS */}
        <div className={css({
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        marginBottom: 20
      }, "AdminDashboardPage")}>
          <div className={css({
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20
        }, "AdminDashboardPage")}>
            <div className={css({
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 16
          }, "AdminDashboardPage")}>
              Tỷ lệ trạng thái ghế
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={seatPieData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {seatPieData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className={css({
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20
        }, "AdminDashboardPage")}>
            <div className={css({
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 16
          }, "AdminDashboardPage")}>
              Doanh thu theo Zone
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={zoneRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={value => `${Number(value).toLocaleString('vi-VN')} đ`} />
                <Bar dataKey="revenue" fill="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ZONE TABLE */}
        <div className={css({
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20
      }, "AdminDashboardPage")}>
          <div className={css({
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 16
        }, "AdminDashboardPage")}>Chi tiết theo khu vực</div>
          <table className={css({
          width: '100%',
          borderCollapse: 'collapse'
        }, "AdminDashboardPage")}>
            <thead>
              <tr className={css({
              background: 'var(--bg)',
              borderRadius: 8
            }, "AdminDashboardPage")}>
                {['Khu vực', 'Tổng ghế', 'Đã bán', 'Tỷ lệ', 'Doanh thu', 'Trạng thái'].map(h => <th key={h} className={css({
                padding: '10px 14px',
                textAlign: 'left',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--muted)',
                letterSpacing: .8,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }, "AdminDashboardPage")}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {(dash?.zones || []).map((zone, idx) => {
              const pct = zone.totalSeats > 0 ? Math.round(zone.soldSeats / zone.totalSeats * 100) : 0;
              const st = zoneStatus(pct);
              const color = ZONE_COLORS[idx % ZONE_COLORS.length];
              const fillColor = pct >= 90 ? 'var(--success)' : pct >= 40 ? 'var(--accent)' : 'var(--muted)';
              return <tr key={zone.zoneId} className={cx("dash-tr", css({
                borderTop: '1px solid rgba(120,120,120,0.1)'
              }, "AdminDashboardPage"))}>
                    <td className={css({
                  padding: '12px 14px',
                  fontSize: 12,
                  verticalAlign: 'middle'
                }, "AdminDashboardPage")}>
                      <span className={css({
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: color,
                    marginRight: 7,
                    verticalAlign: 'middle'
                  }, "AdminDashboardPage")} />
                      {zone.zoneName}
                    </td>
                    <td className={css({
                  padding: '12px 14px',
                  fontSize: 12,
                  verticalAlign: 'middle'
                }, "AdminDashboardPage")}>{zone.totalSeats}</td>
                    <td className={css({
                  padding: '12px 14px',
                  fontSize: 12,
                  verticalAlign: 'middle'
                }, "AdminDashboardPage")}>{zone.soldSeats}</td>
                    <td className={css({
                  padding: '12px 14px',
                  fontSize: 12,
                  verticalAlign: 'middle'
                }, "AdminDashboardPage")}>
                      <div className={css({
                    minWidth: 80
                  }, "AdminDashboardPage")}>
                        <div className={css({
                      fontSize: 11,
                      fontWeight: 700,
                      color: fillColor
                    }, "AdminDashboardPage")}>{pct}%</div>
                        <div className={css({
                      height: 4,
                      background: 'var(--border)',
                      borderRadius: 2,
                      overflow: 'hidden',
                      marginTop: 4
                    }, "AdminDashboardPage")}>
                          <div className={css({
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: 2,
                        background: fillColor
                      }, "AdminDashboardPage")} />
                        </div>
                      </div>
                    </td>
                    <td className={css({
                  padding: '12px 14px',
                  fontSize: 12,
                  verticalAlign: 'middle',
                  color: 'var(--accent)',
                  fontWeight: 700
                }, "AdminDashboardPage")}>
                      {zone.revenue.toLocaleString('vi')}đ
                    </td>
                    <td className={css({
                  padding: '12px 14px',
                  fontSize: 12,
                  verticalAlign: 'middle'
                }, "AdminDashboardPage")}>
                      <span className={css({
                    fontSize: 11,
                    fontWeight: 700,
                    color: st.color,
                    background: st.bg,
                    border: `1px solid ${st.border}`,
                    padding: '3px 8px',
                    borderRadius: 4
                  }, "AdminDashboardPage")}>
                        {st.label}
                      </span>
                    </td>
                  </tr>;
            })}
              {(!dash?.zones || dash.zones.length === 0) && <tr><td colSpan={6} className={css({
                padding: '20px 14px',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 12
              }, "AdminDashboardPage")}>Chọn sự kiện để xem dữ liệu</td></tr>}
            </tbody>
          </table>
        </div>

        {/* GENDER + AGE */}
        <div className={css({
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16
      }, "AdminDashboardPage")}>
          <div className={css({
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20
        }, "AdminDashboardPage")}>
            <div className={css({
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 16
          }, "AdminDashboardPage")}>
              Phân bổ giới tính
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={genderPieData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {genderPieData.map((_, index) => <Cell key={index} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className={css({
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20
        }, "AdminDashboardPage")}>
            <div className={css({
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 16
          }, "AdminDashboardPage")}>
              Phân bổ độ tuổi
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ageBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="var(--success)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </AdminLayout>;
}
