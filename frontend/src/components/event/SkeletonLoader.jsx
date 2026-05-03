import EventSkeleton from './EventSkeleton';
import './event.css';

export default function SkeletonLoader({ count = 8 }) {
  return (
    <div className="event-list">
      {Array.from({ length: count }).map((_, i) => (
        <EventSkeleton key={i} />
      ))}
    </div>
  );
}
