import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SeatMap from '../../components/seat-map/SeatMap';
import eventService from '../../services/event.service';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      const eventResponse = await eventService.getEventById(id);
      setEvent(eventResponse.data);

      const zonesResponse = await eventService.getEventZones(id);
      setZones(zonesResponse.data);
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
      setSelectedSeats([...selectedSeats, seat]);
    }
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

      <SeatMap zones={zones} selectedSeats={selectedSeats} onSelectSeat={handleSelectSeat} />
    </div>
  );
}
