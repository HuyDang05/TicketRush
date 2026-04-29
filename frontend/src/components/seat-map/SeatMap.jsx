import { useNavigate } from 'react-router-dom';
import SeatGrid from './SeatGrid';
import ZoneLegend from './ZoneLegend';
import { useCountdown } from '../../hooks/useCountdown';
import { toast } from '../../utils/toast';

export default function SeatMap({ zones, selectedSeats, onSelectSeat, onRemoveSeat }) {
  const navigate = useNavigate();

  function SeatCountdown({ expiresAt, onExpire }) {
    const { minutes, seconds, isExpired } = useCountdown(expiresAt, onExpire);
    return (
      <span className="text-sm text-gray-600">
        {isExpired ? '00:00' : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
      </span>
    );
  }

  const total = selectedSeats.reduce((sum, seat) => {
    const price = seat.zone?.price || seat.price || 0;
    return sum + Number(price);
  }, 0);

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

      <div>
        <ZoneLegend />
        <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-bold mb-3">Ghế đã chọn</h3>
          {selectedSeats.length > 0 ? (
            <div className="space-y-2">
              {selectedSeats.map((seat) => (
                <div
                  key={seat.id}
                  className="flex justify-between items-center text-sm"
                >
                  <div className="flex items-center gap-3">
                    <button
                      className="text-xs text-gray-400 hover:text-gray-600"
                      onClick={() => onRemoveSeat && onRemoveSeat(seat.id)}
                      aria-label={`Bỏ chọn ${seat.label}`}
                    >
                      ✕
                    </button>
                    <div className="flex flex-col">
                      <span className="font-medium">{seat.label}</span>
                      <span className="text-xs text-gray-500">{seat.zone?.name || seat.zone?.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-semibold">{(seat.zone?.price || seat.price || 0).toLocaleString()}đ</span>
                    <SeatCountdown
                      expiresAt={seat.expiresAt || seat.lockExpiresAt || seat.lockedUntil}
                      onExpire={() => {
                        toast('Phiên giữ chỗ đã hết hạn', 'warning');
                        onRemoveSeat && onRemoveSeat(seat.id);
                      }}
                    />
                  </div>
                </div>
              ))}

              <div className="border-t pt-2 font-bold">
                Tổng: {total.toLocaleString()}đ
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-primary text-white py-2 rounded"
                >
                  Tiến hành thanh toán
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Chưa chọn ghế</p>
          )}
        </div>
      ))}

      <ZoneLegend />
    </div>
  );
}
