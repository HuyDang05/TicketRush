import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar } from 'lucide-react';
import { formatDate, formatPrice } from '../../lib/utils';

const CARD_GRADIENTS = [
  'linear-gradient(135deg,#2d1200,#8b3a00)',
  'linear-gradient(135deg,#0a1a2d,#0a3d6b)',
  'linear-gradient(135deg,#0d2200,#1a4400)',
  'linear-gradient(135deg,#1a0a2d,#4a1a7a)',
  'linear-gradient(135deg,#1a1000,#5a3a00)',
  'linear-gradient(135deg,#001a1a,#006666)',
  'linear-gradient(135deg,#1a0010,#6a0040)',
  'linear-gradient(135deg,#001a0a,#004d20)',
];
const CARD_EMOJIS = ['🎸', '🎹', '⚽', '🎪', '🎷', '🏊', '🎭', '🎤'];

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function EventCard({ event }) {
  const [hovered, setHovered] = useState(false);
  const idx = hashCode(event.id || event.title) % CARD_GRADIENTS.length;
  const gradient = CARD_GRADIENTS[idx];
  const emoji = CARD_EMOJIS[idx];

  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    : '';

  const minPrice = event.zones?.length
    ? Math.min(...event.zones.map((z) => z.price))
    : null;

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
