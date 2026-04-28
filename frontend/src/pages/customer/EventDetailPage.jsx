import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import SeatMap from '../../components/seat-map/SeatMap';
import eventService from '../../services/event.service';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from '../../utils/toast';

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { on, off } = useSocket();

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  useEffect(() => {
    // subscribe to socket events
    const handleLocked = (data) => {
      const { seatId } = data;
      setZones((prev) =>
        prev.map((zone) => ({
          ...zone,
          seats: zone.seats.map((s) => (s.id === seatId ? { ...s, status: 'LOCKED' } : s)),
        }))
      );
    };

    const handleReleased = (data) => {
      const { seatId } = data;
      setZones((prev) =>
        prev.map((zone) => ({
          ...zone,
          seats: zone.seats.map((s) => (s.id === seatId ? { ...s, status: 'AVAILABLE' } : s)),
        }))
      );

      // if this seat was selected by current user, notify and remove
      if (selectedSeats.some((s) => s.id === data.seatId)) {
        toast('Phiên giữ chỗ đã hết hạn', 'warning');
        setSelectedSeats((prev) => prev.filter((s) => s.id !== data.seatId));
      }
    };

    const handleSold = (data) => {
      const { seatId } = data;
      setZones((prev) =>
        prev.map((zone) => ({
          ...zone,
          seats: zone.seats.map((s) => (s.id === seatId ? { ...s, status: 'SOLD' } : s)),
        }))
      );
    };

    on('seat_locked', handleLocked);
    on('seat_released', handleReleased);
    on('seat_sold', handleSold);

    return () => {
      off('seat_locked', handleLocked);
      off('seat_released', handleReleased);
      off('seat_sold', handleSold);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, off, selectedSeats]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      const eventResponse = await eventService.getEventById(id);
      // backend returns { event }
      const eventData = eventResponse.data?.event || eventResponse.data;
      setEvent(eventData);

      // zones are included in the event payload
      setZones(eventData?.zones || []);
    } catch (error) {
      console.error('Failed to fetch event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSeat = (seat) => {
    const isSelected = selectedSeats.some((s) => s.id === seat.id);
    if (isSelected) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seat.id));
    } else {
      // set a local expiry 10 minutes from now (ISO string) if server doesn't provide one
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      setSelectedSeats([...selectedSeats, { ...seat, expiresAt }]);
    }
  };

  const handleRemoveSeat = (seatId) => {
    setSelectedSeats((prev) => prev.filter((s) => s.id !== seatId));
    // optionally call API to unlock seat
    // eventService.unlockSeat(seatId).catch(() => {});
  };

  if (isLoading) return <LoadingSpinner />;

  if (!event) return <div className="text-center py-8">Không tìm thấy sự kiện</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <img
          src={event.imageUrl || 'https://via.placeholder.com/1200x400'}
          alt={event.title}
          className="w-full h-80 object-cover rounded-lg"
        />
      </div>

      <div className="grid grid-cols-3 gap-8 mb-8">
        <div className="col-span-2">
          <h1 className="text-4xl font-bold mb-4">{event.title}</h1>
          <p className="text-gray-600 mb-4">{event.description}</p>
          <div className="space-y-2 text-gray-700">
            <p>
              <strong>Địa điểm:</strong> {event.venue}
            </p>
            <p>
              <strong>Thời gian:</strong>{' '}
              {new Date(event.date).toLocaleString('vi-VN')}
            </p>
            <p>
              <strong>Trạng thái:</strong> {event.status}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-bold mb-4">Thông tin sự kiện</h3>
          <p className="text-sm text-gray-600 mb-2">Giá vé từ:</p>
          <p className="text-2xl font-bold text-primary">
            {Math.min(...zones.map((z) => z.price)).toLocaleString()}đ
          </p>
        </div>
      </div>

      <SeatMap
        zones={zones}
        selectedSeats={selectedSeats}
        onSelectSeat={handleSelectSeat}
        onRemoveSeat={handleRemoveSeat}
      />
    </div>
  );
}
