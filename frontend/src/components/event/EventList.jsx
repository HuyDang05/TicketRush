import EventCard from './EventCard';
import SkeletonLoader from './SkeletonLoader';
import EmptyState from './EmptyState';
import './event.css';

export default function EventList({ events, isLoading, searchQuery = '' }) {
  if (isLoading) return <SkeletonLoader count={8} />;
  if (!events || events.length === 0) return <EmptyState searchQuery={searchQuery} />;

  return (
    <div className="event-list">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
