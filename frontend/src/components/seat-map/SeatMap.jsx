import SeatGrid from './SeatGrid';
import './seat-map.css';

const LEGEND = [
  { color: '#22c55e', label: 'Còn trống' },
  { color: '#555555', label: 'Đang giữ' },
  { color: '#ef4444', label: 'Đã bán' },
  { color: '#3b82f6', label: 'Đang chọn' },
];

const ZONE_COLORS = ['#FF6B35', '#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#ec4899'];

export default function SeatMap({ zones, selectedSeats, onSelectSeat }) {
  if (!zones || zones.length === 0) {
    return <div className="seat-map__empty">Không có dữ liệu sơ đồ ghế</div>;
  }

  return (
    <div className="seat-map">
      <div className="seat-map__stage">
        <div className="seat-map__stage-bar">SÂN KHẤU / STAGE</div>
      </div>

      <div className="seat-map__legend">
        {LEGEND.map((item) => (
          <div key={item.label} className="seat-map__legend-item">
            <div className="seat-map__legend-dot" style={{ background: item.color }} />
            {item.label}
          </div>
        ))}
      </div>

      <div className="seat-map__zones">
        {zones.map((zone, idx) => {
          const accentColor = ZONE_COLORS[idx % ZONE_COLORS.length];
          const availableCount = (zone.seats || []).filter(s => s.status === 'AVAILABLE').length;

          return (
            <div
              key={zone.id}
              className="seat-zone"
              style={{
                background: '#0D0D0D',
                borderColor: `${accentColor}33`,
              }}
            >
              <div
                className="seat-zone__header"
                style={{ borderBottom: `1px solid ${accentColor}22`, background: `${accentColor}0D` }}
              >
                <div className="seat-zone__header-left">
                  <div className="seat-zone__dot" style={{ background: accentColor }} />
                  <span className="seat-zone__name">{zone.name}</span>
                </div>
                <div className="seat-zone__header-right">
                  <span className="seat-zone__available">{availableCount} ghế trống</span>
                  <span className="seat-zone__price" style={{ color: accentColor }}>
                    {Number(zone.price).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              <div className="seat-zone__body">
                {zone.seats && zone.seats.length > 0 ? (
                  <SeatGrid
                    seats={zone.seats}
                    selectedSeats={selectedSeats}
                    onSelectSeat={onSelectSeat}
                    zonePrice={zone.price}
                    accentColor={accentColor}
                  />
                ) : (
                  <div className="seat-zone__no-seats">Không có ghế trong khu vực này</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
