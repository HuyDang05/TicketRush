import EventCard from './EventCard';

export default function EventList({ events, isLoading }) {
  if (isLoading) {
    return <div className="text-center py-8">Đang tải...</div>;
  }

  if (!events || events.length === 0) {
    return <div className="text-center py-8 text-gray-500">Không có sự kiện nào</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
