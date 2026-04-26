import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import bookingService from '../../services/booking.service';

export default function CheckoutPage() {
  const { seatId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      const response = await bookingService.createBooking({
        seatId,
      });
      // Redirect to payment gateway
      navigate(`/my-tickets`);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Thanh toán</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="font-bold mb-4">Tóm tắt đơn hàng</h2>
        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span>Ghế:</span>
            <span className="font-semibold">Đang tải...</span>
          </div>
          <div className="border-t pt-3 flex justify-between font-bold text-lg">
            <span>Tổng cộng:</span>
            <span>Đang tải...</span>
          </div>
        </div>

        <button
          onClick={handlePayment}
          disabled={isLoading}
          className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? 'Đang xử lý...' : 'Thanh toán'}
        </button>
      </div>
    </div>
  );
}
