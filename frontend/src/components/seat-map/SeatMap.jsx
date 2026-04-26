import SeatGrid from './SeatGrid';
import ZoneLegend from './ZoneLegend';

export default function SeatMap({ zones, selectedSeats, onSelectSeat }) {
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
                  <span>{seat.label}</span>
                  <span className="font-semibold">
                    {seat.zone.price.toLocaleString()}đ
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 font-bold">
                Tổng:{' '}
                {selectedSeats
                  .reduce((sum, seat) => sum + parseInt(seat.zone.price), 0)
                  .toLocaleString()}
                đ
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
