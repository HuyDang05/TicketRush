import { useState, useEffect } from 'react';
import EventList from '../../components/event/EventList';
import eventService from '../../services/event.service';

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const response = await eventService.getEvents({ status: 'PUBLISHED' });
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-2">Sự kiện sắp tới</h1>
      <p className="text-gray-600 mb-8">Khám phá và đặt vé cho các sự kiện hấp dẫn</p>

      <EventList events={events} isLoading={isLoading} />
    </div>
  );
}
