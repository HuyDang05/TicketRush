import SeatItem from './SeatItem';

export default function SeatGrid({ seats, selectedSeats, onSelectSeat }) {
  // Group seats by row
  const seatsByRow = {};
  seats.forEach((seat) => {
    if (!seatsByRow[seat.row]) {
      seatsByRow[seat.row] = [];
    }
    seatsByRow[seat.row].push(seat);
  });

  return (
    <div className="flex flex-col gap-4 p-4">
      {Object.entries(seatsByRow).map(([rowIndex, rowSeats]) => (
        <div key={rowIndex} className="flex gap-2 items-center">
          <span className="w-8 font-bold text-gray-600">
            {rowSeats[0]?.label[0]}
          </span>
          <div className="flex gap-2">
            {rowSeats.map((seat) => (
              <SeatItem
                key={seat.id}
                seat={seat}
                onSelect={onSelectSeat}
                isSelected={selectedSeats.some((s) => s.id === seat.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
