import { Link } from 'react-router-dom';

export default function EventCard({ event }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      <img
        src={event.imageUrl || 'https://via.placeholder.com/300x200'}
        alt={event.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="font-bold text-lg mb-2">{event.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {event.description}
        </p>
        <p className="text-gray-500 text-sm mb-4">{event.venue}</p>
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-primary">
            {new Date(event.date).toLocaleDateString('vi-VN')}
          </span>
          <Link
            to={`/event/${event.id}`}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Chi tiết
          </Link>
        </div>
      </div>
    </div>
  );
}
