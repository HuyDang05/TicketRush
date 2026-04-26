import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import eventService from '../../services/event.service';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function EventManagerPage() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const response = await eventService.getEvents();
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc muốn xoá sự kiện này?')) {
      try {
        await eventService.deleteEvent(id);
        fetchEvents();
      } catch (error) {
        console.error('Failed to delete event:', error);
      }
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Quản lý sự kiện</h1>
        <Link
          to="/admin/events/create"
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          Tạo sự kiện mới
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tên sự kiện</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Ngày</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Trạng thái</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">{event.title}</td>
                <td className="px-6 py-3">
                  {new Date(event.date).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      event.status === 'PUBLISHED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {event.status}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <Link
                    to={`/admin/events/${event.id}/edit`}
                    className="text-primary hover:underline mr-4"
                  >
                    Sửa
                  </Link>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="text-red-600 hover:underline"
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
