import { Link } from 'react-router-dom';
import { MapPin, Calendar } from 'lucide-react';
import { formatDate, formatPrice } from '../../lib/utils';

export default function EventCard({ event }) {
  return (
    <Link to={`/event/${event.id}`} className="block">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 h-full hover:-translate-y-1 cursor-pointer">
        {/* Thumbnail */}
        <div className="relative overflow-hidden bg-gray-200 h-48">
          <img
            src={event.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'}
            alt={event.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col h-full">
          {/* Event Title */}
          <h3 className="font-bold text-lg mb-2 line-clamp-2 text-gray-900">
            {event.title}
          </h3>

          {/* Venue */}
          <div className="flex items-start gap-2 mb-3 text-gray-600">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm line-clamp-2">{event.venue}</p>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 mb-4 text-gray-600">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-medium">{formatDate(event.date)}</p>
          </div>

          {/* Price - always at bottom */}
          <div className="mt-auto pt-4 border-t border-gray-200">
            <p className="text-lg font-bold text-primary">
              Từ {formatPrice(event.minPrice)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
