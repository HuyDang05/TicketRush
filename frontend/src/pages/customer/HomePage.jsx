import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import EventList from '../../components/event/EventList';
import eventService from '../../services/event.service';

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimer = useRef(null);

  // Handle search input with debounce
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for debounced search (300ms)
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
  };

  // Fetch events whenever debounced query changes
  useEffect(() => {
    fetchEvents(debouncedQuery);
  }, [debouncedQuery]);

  const fetchEvents = async (search = '') => {
    try {
      setIsLoading(true);
      const params = { status: 'PUBLISHED' };
      if (search) {
        params.search = search;
      }
      const response = await eventService.getEvents(params);
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className="w-full">
      {/* Hero Banner */}
      <div className="relative w-full h-72 bg-gradient-to-r from-primary to-gray-900 overflow-hidden">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=400&fit=crop)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative h-full flex flex-col items-center justify-center text-white px-4">
          <h1 className="text-5xl font-bold mb-2 text-center">🎫 TicketRush</h1>
          <p className="text-xl text-gray-100 text-center">
            Khám phá và đặt vé cho những sự kiện hấp dẫn
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-12">
          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-center bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
              <Search className="w-5 h-5 text-gray-400 ml-4" />
              <input
                type="text"
                placeholder="Tìm kiếm sự kiện..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="flex-1 px-4 py-3 outline-none text-gray-700 placeholder-gray-400"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                Tìm kiếm: "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* Events Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-8 text-gray-900">
            {searchQuery ? 'Kết quả tìm kiếm' : 'Sự kiện sắp tới'}
          </h2>
          <EventList events={events} isLoading={isLoading} searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  );
}
