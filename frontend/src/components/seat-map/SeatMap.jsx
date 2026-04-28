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
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-2">
        <h2 className="font-bold text-lg mb-4">Chọn ghế</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-auto">
          {zones.map((zone) => (
            <div key={zone.id} className="border-b last:border-b-0">
              <div className="bg-gray-50 px-4 py-2">
                <h3 className="font-semibold">
                  {zone.name} - {zone.price.toLocaleString()}đ
                </h3>
              </div>
              <SeatGrid
                seats={zone.seats}
                selectedSeats={selectedSeats}
                onSelectSeat={onSelectSeat}
              />
            </div>
          ))}
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
      </div>
    </div>
  );
}
