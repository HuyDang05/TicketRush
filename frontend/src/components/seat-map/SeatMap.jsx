import SeatGrid from './SeatGrid';
import ZoneLegend from './ZoneLegend';

export default function SeatMap({ zones, selectedSeats, onSelectSeat }) {
  return (
    <div>
      {/* Stage */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{
          background: '#111111',
          border: '1px solid #333333',
          borderRadius: 8,
          padding: '10px 0',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 2,
          color: 'rgba(255,255,255,.6)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(255,107,53,.5), transparent)',
          }} />
          SÂN KHẤU / STAGE
        </div>
      </div>

      {/* Zones */}
      {zones.map((zone) => (
        <div key={zone.id} style={{ marginBottom: 16, background: '#1A1A1A', borderRadius: 10, overflow: 'hidden', border: '1px solid #333333' }}>
          <div style={{
            background: '#242424',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #333333',
          }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{zone.name}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#FF6B35' }}>
              {zone.price?.toLocaleString('vi-VN')}đ / ghế
            </span>
          </div>
          <SeatGrid
            seats={zone.seats || []}
            selectedSeats={selectedSeats}
            onSelectSeat={onSelectSeat}
            zonePrice={zone.price}
          />
        </div>
      ))}

      <ZoneLegend />
    </div>
  );
}
