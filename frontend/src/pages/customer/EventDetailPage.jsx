import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import eventService from '../../services/event.service';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const ARTIST_CHIPS = [
  { emoji: '🎤', name: 'Sơn Tùng M-TP', role: 'Nghệ sĩ chính', bg: 'linear-gradient(135deg,#2d1000,#8b3500)' },
  { emoji: '🎸', name: 'Galaxy Band', role: 'Ban nhạc', bg: 'linear-gradient(135deg,#001a2d,#004d8b)' },
  { emoji: '🎵', name: 'DJ Hoàng Anh', role: 'DJ mở màn', bg: 'linear-gradient(135deg,#1a001a,#6a006a)' },
  { emoji: '🎤', name: 'AMEE', role: 'Khách mời', bg: 'linear-gradient(135deg,#001a0a,#005a20)' },
];

const TERMS = [
  'Vé đã mua không hoàn tiền trừ trường hợp sự kiện bị hủy hoặc dời lịch bởi Ban tổ chức.',
  'Mỗi tài khoản được mua tối đa 4 vé cho một sự kiện.',
  'Khán giả dưới 16 tuổi phải có người lớn đi kèm.',
  'Nghiêm cấm mang vật dụng nguy hiểm, thức ăn & đồ uống từ bên ngoài vào khu vực sự kiện.',
  'Vui lòng xuất trình vé điện tử (QR code) hoặc vé in tại cửa soát vé.',
  'Ban tổ chức có quyền từ chối phục vụ nếu khán giả có hành vi không phù hợp.',
];

function ZoneBadge({ available }) {
  if (available === false)
    return <span style={{ display:'inline-block', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, letterSpacing:'.5px', background:'rgba(170,170,170,.1)', color:'#AAAAAA', border:'1px solid #333333' }}>Hết vé</span>;
  if (available === 'low')
    return <span style={{ display:'inline-block', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, letterSpacing:'.5px', background:'rgba(255,107,53,.15)', color:'#FF6B35', border:'1px solid rgba(255,107,53,.3)' }}>Sắp hết</span>;
  return <span style={{ display:'inline-block', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, letterSpacing:'.5px', background:'rgba(34,197,94,.15)', color:'#22c55e', border:'1px solid rgba(34,197,94,.3)' }}>Còn vé</span>;
}

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [zones, setZones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      eventService.getEventById(id),
      eventService.getEventZones(id),
    ])
      .then(([evRes, zoneRes]) => {
        setEvent(evRes.data);
        const z = zoneRes.data || [];
        setZones(z);
        if (z.length > 0) setSelectedZoneId(z[0].id);
      })
      .catch((err) => console.error('Failed to fetch event:', err))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpinner />;
  if (!event) return (
    <div style={{ textAlign:'center', padding:'60px 0', color:'#AAAAAA' }}>
      Không tìm thấy sự kiện
    </div>
  );

  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const total = selectedZone ? selectedZone.price * qty : 0;
  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';
  const timeStr = event.date
    ? new Date(event.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';

  const handleBook = () => {
    if (!selectedZone) return;
    navigate(`/event/${id}/seats`, { state: { zoneId: selectedZoneId, qty } });
  };

  return (
    <div>
      {/* ── HERO ── */}
      <section style={{ position:'relative', width:'100%', height:360, overflow:'hidden', display:'flex', alignItems:'flex-end' }}>
        {/* BG */}
        <div style={{ position:'absolute', inset:0, zIndex:0, background:'radial-gradient(ellipse at 60% 30%, #3a1200 0%, #1a0800 40%, #080808 100%)' }} />

        {/* Stage lights */}
        {[
          { left:'20%', transform:'rotate(-18deg)', color:'#FF6B35' },
          { left:'38%', transform:'rotate(-5deg)', color:'#fff' },
          { left:'54%', transform:'rotate(10deg)', color:'#FF6B35' },
          { left:'70%', transform:'rotate(22deg)', color:'#fff' },
        ].map((l, i) => (
          <div key={i} style={{
            position:'absolute', top:0, left:l.left, width:180, height:260,
            opacity:.14, transformOrigin:'top center', transform:l.transform,
            background:`linear-gradient(to bottom, ${l.color}, transparent)`, zIndex:0,
          }} />
        ))}

        {/* Crowd */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:160, zIndex:1, overflow:'hidden' }}>
          <svg viewBox="0 0 1440 160" preserveAspectRatio="none" width="100%" height="100%">
            <path d="M0,130 Q50,100 100,118 Q150,100 200,115 Q250,100 300,115 Q350,102 400,116 Q450,102 500,116 Q550,104 600,115 Q650,104 700,116 Q750,104 800,116 Q850,104 900,115 Q950,104 1000,116 Q1050,104 1100,115 Q1150,104 1200,116 Q1250,104 1300,115 Q1350,104 1400,116 Q1420,110 1440,115 L1440,160 L0,160 Z" fill="rgba(15,5,0,0.92)"/>
          </svg>
        </div>

        {/* Overlay */}
        <div style={{ position:'absolute', inset:0, zIndex:1, background:'linear-gradient(to top, rgba(0,0,0,.9) 0%, rgba(0,0,0,.4) 60%, rgba(0,0,0,.2) 100%)' }} />

        {/* Event image if available */}
        {event.imageUrl && (
          <img src={event.imageUrl} alt={event.title} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:0, opacity:.5 }} />
        )}

        {/* Content */}
        <div style={{ position:'relative', zIndex:2, padding:'0 60px 36px', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:6,
            background:'rgba(255,107,53,.18)', border:'1px solid rgba(255,107,53,.45)',
            color:'#FF6B35', fontSize:11, fontWeight:700, letterSpacing:'1.4px',
            padding:'4px 12px', borderRadius:100, width:'fit-content', textTransform:'uppercase',
          }}>🎵 &nbsp;Âm nhạc</div>

          <h1 style={{ fontSize:36, fontWeight:800, lineHeight:1.15, textShadow:'0 2px 20px rgba(0,0,0,.6)', maxWidth:700 }}>
            {event.title}
          </h1>

          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            {dateStr && (
              <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:14, color:'rgba(255,255,255,.85)' }}>
                <svg width="15" height="15" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                {dateStr}
              </span>
            )}
            {timeStr && (
              <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:14, color:'rgba(255,255,255,.85)' }}>
                <svg width="15" height="15" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                {timeStr}
              </span>
            )}
            {event.venue && (
              <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:14, color:'rgba(255,255,255,.85)' }}>
                <svg width="15" height="15" fill="none" stroke="#FF6B35" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                {event.venue}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── BREADCRUMB ── */}
      <div style={{
        background:'#1A1A1A', padding:'12px 60px',
        borderBottom:'1px solid #333333',
        display:'flex', alignItems:'center', gap:8,
        fontSize:13, color:'#AAAAAA',
      }}>
        <Link to="/" style={{ color:'#AAAAAA', textDecoration:'none' }}
          onMouseEnter={e => e.currentTarget.style.color='#fff'}
          onMouseLeave={e => e.currentTarget.style.color='#AAAAAA'}
        >Trang chủ</Link>
        <span style={{ opacity:.4 }}>/</span>
        <span>Âm nhạc</span>
        <span style={{ opacity:.4 }}>/</span>
        <span style={{ color:'#FF6B35', fontWeight:600 }}>{event.title}</span>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div style={{
        display:'grid', gridTemplateColumns:'65% 35%', gap:32,
        padding:'40px 60px', maxWidth:1400, margin:'0 auto', alignItems:'start',
      }}>

        {/* ── LEFT COLUMN ── */}
        <div>
          {/* About */}
          <InfoCard heading="Về sự kiện">
            <p style={{ fontSize:14, color:'#AAAAAA', lineHeight:1.8, marginBottom:12 }}>
              {event.description || (
                <>
                  <strong style={{ color:'#fff' }}>{event.title}</strong> — sự kiện âm nhạc được mong chờ nhất năm 2026, quy tụ hàng chục nghìn khán giả với sân khấu hoành tráng, hệ thống âm thanh đẳng cấp quốc tế và màn trình diễn không thể bỏ lỡ.
                </>
              )}
            </p>

            <div style={{ fontSize:14, fontWeight:700, margin:'20px 0 14px' }}>Nghệ sĩ biểu diễn</div>
            <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
              {ARTIST_CHIPS.map((a) => (
                <ArtistChip key={a.name} {...a} />
              ))}
            </div>
          </InfoCard>

          {/* Venue */}
          <InfoCard heading="Địa điểm">
            <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>{event.venue || 'Địa điểm chưa cập nhật'}</div>
            <div style={{ fontSize:13, color:'#AAAAAA', marginBottom:14, lineHeight:1.6 }}>
              {event.venue ? `${event.venue} · Sức chứa lớn · Có bãi đỗ xe` : ''}
            </div>
            <MapPlaceholder venue={event.venue} />
          </InfoCard>

          {/* Terms */}
          <InfoCard heading="Điều khoản & Lưu ý">
            <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:10, padding:0 }}>
              {TERMS.map((t, i) => (
                <li key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', fontSize:14, color:'#AAAAAA', lineHeight:1.6 }}>
                  <span style={{ color:'#FF6B35', fontSize:18, lineHeight:1.2, flexShrink:0 }}>•</span>
                  {t}
                </li>
              ))}
            </ul>
          </InfoCard>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ position:'sticky', top:116 }}>
          <div style={{ background:'#242424', border:'1px solid #333333', borderRadius:12, padding:24 }}>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:18 }}>Chọn loại vé</div>

            {zones.length > 0 ? zones.map((zone, idx) => (
              <ZoneRow
                key={zone.id}
                zone={zone}
                selected={selectedZoneId === zone.id}
                available={idx === 0 ? 'low' : idx < zones.length - 1 ? true : false}
                onSelect={() => { if (zone.available !== false) setSelectedZoneId(zone.id); }}
              />
            )) : (
              /* Fallback static zones when API has no zone data */
              STATIC_ZONES.map((z, idx) => (
                <ZoneRow
                  key={z.id}
                  zone={z}
                  selected={selectedZoneId === z.id || (selectedZoneId === null && idx === 0)}
                  available={z.available}
                  onSelect={() => z.available !== false && setSelectedZoneId(z.id)}
                />
              ))
            )}

            {/* Divider */}
            <div style={{ height:1, background:'#FF6B35', margin:'18px 0', opacity:.4 }} />

            {/* Quantity */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <span style={{ fontSize:14, color:'#AAAAAA' }}>Số lượng vé</span>
              <div style={{ display:'flex', alignItems:'center' }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  style={{ width:32, height:32, background:'#1A1A1A', border:'1px solid #333333', borderRadius:'6px 0 0 6px', color:'#fff', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                >−</button>
                <div style={{ width:36, height:32, background:'#1A1A1A', border:'1px solid #333333', borderLeft:'none', borderRight:'none', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700 }}>
                  {qty}
                </div>
                <button
                  onClick={() => setQty(q => Math.min(4, q + 1))}
                  style={{ width:32, height:32, background:'#1A1A1A', border:'1px solid #333333', borderRadius:'0 6px 6px 0', color:'#fff', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                >+</button>
              </div>
            </div>

            {/* Total */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <span style={{ fontSize:13, color:'#AAAAAA' }}>Tổng cộng</span>
              <span style={{ fontSize:20, fontWeight:800, color:'#FF6B35' }}>
                {total > 0 ? `${total.toLocaleString('vi-VN')}đ` : '—'}
              </span>
            </div>

            {/* Book button */}
            <button
              onClick={handleBook}
              style={{
                width:'100%', height:48, background:'#FF6B35', border:'none',
                borderRadius:8, color:'#fff', fontFamily:'inherit', fontSize:16, fontWeight:700,
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                boxShadow:'0 4px 20px rgba(255,107,53,.35)',
              }}
              onMouseEnter={e => e.currentTarget.style.background='#e85a24'}
              onMouseLeave={e => e.currentTarget.style.background='#FF6B35'}
            >
              Chọn ghế &amp; Đặt vé
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>

            <div style={{ textAlign:'center', fontSize:12, color:'#AAAAAA', marginTop:10, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
              Bạn có <strong style={{ color:'#fff', margin:'0 3px' }}>10 phút</strong> để hoàn tất thanh toán
            </div>

            {/* Share row */}
            <div style={{ display:'flex', gap:8, marginTop:16, paddingTop:16, borderTop:'1px solid #333333' }}>
              {['🔗 Sao chép link', '📤 Chia sẻ', '❤️ Yêu thích'].map((label) => (
                <button key={label} style={{
                  flex:1, padding:8, border:'1px solid #333333', borderRadius:8,
                  background:'transparent', color:'#AAAAAA', fontFamily:'inherit',
                  fontSize:11, cursor:'pointer', textAlign:'center', whiteSpace:'nowrap',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#FF6B35'; e.currentTarget.style.color='#FF6B35'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#333333'; e.currentTarget.style.color='#AAAAAA'; }}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ heading, children }) {
  return (
    <div style={{ background:'#242424', border:'1px solid #333333', borderRadius:12, padding:24, marginBottom:20 }}>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:18, paddingLeft:14, borderLeft:'3px solid #FF6B35', display:'flex', alignItems:'center', gap:10 }}>
        {heading}
      </h2>
      {children}
    </div>
  );
}

function ArtistChip({ emoji, name, role, bg }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width:64, height:64, borderRadius:'50%',
        background: bg, display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:26, border:`2px solid ${hovered ? '#FF6B35' : '#333333'}`,
        transition:'border-color .2s',
      }}>{emoji}</div>
      <div style={{ fontSize:12, fontWeight:600, textAlign:'center' }}>{name}</div>
      <div style={{ fontSize:11, color:'#AAAAAA', textAlign:'center' }}>{role}</div>
    </div>
  );
}

function MapPlaceholder({ venue }) {
  return (
    <div style={{
      width:'100%', height:180, background:'#1A1A1A',
      borderRadius:8, border:'1px solid #333333',
      display:'flex', alignItems:'center', justifyContent:'center',
      flexDirection:'column', gap:8, position:'relative', overflow:'hidden',
    }}>
      {/* Grid bg */}
      <div style={{
        position:'absolute', inset:0, opacity:.15,
        backgroundImage:'linear-gradient(#333333 1px, transparent 1px), linear-gradient(90deg, #333333 1px, transparent 1px)',
        backgroundSize:'30px 30px',
      }} />
      {/* Roads */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:.3 }} viewBox="0 0 400 180" preserveAspectRatio="none">
        <line x1="0" y1="90" x2="400" y2="90" stroke="#555" strokeWidth="6"/>
        <line x1="200" y1="0" x2="200" y2="180" stroke="#555" strokeWidth="6"/>
        <line x1="0" y1="50" x2="400" y2="130" stroke="#444" strokeWidth="3"/>
        <rect x="155" y="65" width="90" height="50" rx="4" fill="rgba(255,107,53,.15)" stroke="#FF6B35" strokeWidth="1.5"/>
      </svg>
      <span style={{ fontSize:28, position:'relative', zIndex:1 }}>📍</span>
      <span style={{ position:'relative', zIndex:1, fontSize:12, color:'#AAAAAA' }}>{venue || 'Địa điểm'}</span>
    </div>
  );
}

function ZoneRow({ zone, selected, available, onSelect }) {
  const soldOut = available === false;
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => !soldOut && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? 'rgba(255,107,53,.06)' : '#1A1A1A',
        borderRadius:8, padding:'14px 16px', marginBottom:10,
        display:'flex', alignItems:'center', gap:12,
        cursor: soldOut ? 'not-allowed' : 'pointer',
        border: `1px solid ${selected ? '#FF6B35' : hovered ? '#FF6B35' : 'transparent'}`,
        opacity: soldOut ? .5 : 1,
        transition:'border-color .2s, background .2s',
      }}
    >
      {/* Radio */}
      <div style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${selected ? '#FF6B35' : '#333333'}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', transition:'border-color .2s' }}>
        {selected && <div style={{ width:8, height:8, borderRadius:'50%', background:'#FF6B35' }} />}
      </div>

      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:2 }}>{zone.name}</div>
        <div style={{ fontSize:12, color:'#AAAAAA' }}>{zone.description || ''}</div>
      </div>

      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:14, fontWeight:700, color:'#FF6B35', marginBottom:4 }}>
          {zone.price?.toLocaleString('vi-VN')}đ
        </div>
        <ZoneBadge available={available} />
      </div>
    </div>
  );
}

const STATIC_ZONES = [
  { id: 'z1', name: 'VIP Golden', description: 'Khu A — Sát sân khấu', price: 2500000, available: 'low' },
  { id: 'z2', name: 'Premium', description: 'Khu B — Khán đài chính', price: 1500000, available: true },
  { id: 'z3', name: 'Standard', description: 'Khu C — Khán đài bên', price: 800000, available: true },
  { id: 'z4', name: 'Economy', description: 'Khu D — Đứng xa', price: 350000, available: false },
];
