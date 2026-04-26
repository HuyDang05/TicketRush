import { useState, useEffect } from 'react';
import bookingService from '../../services/booking.service';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function MyTicketsPage() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const response = await bookingService.getMyBookings();
      setBookings(response.data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Vé của tôi</h1>

      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Bạn chưa có vé nào</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Sự kiện</p>
                  <p className="font-semibold">{booking.seat.zone.event.title}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Ghế</p>
                  <p className="font-semibold">{booking.seat.label}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Giá vé</p>
                  <p className="font-semibold">{booking.totalPrice.toLocaleString()}đ</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Trạng thái</p>
                  <p
                    className={`font-semibold ${
                      booking.status === 'PAID' ? 'text-green-600' : 'text-yellow-600'
                    }`}
                  >
                    {booking.status}
                  </p>
                </div>
              </div>
              {booking.qrCode && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-gray-600 text-sm mb-2">Mã QR</p>
                  <p className="font-mono text-sm">{booking.qrCode}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
