import EventCard from './EventCard';
import SkeletonLoader from './SkeletonLoader';
import EmptyState from './EmptyState';

export default function EventList({ events, isLoading, searchQuery = '' }) {
  if (isLoading) {
    return <SkeletonLoader count={6} />;
  }

  if (!events || events.length === 0) {
    return <EmptyState searchQuery={searchQuery} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
