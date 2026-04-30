import './event.css';

export default function EventSkeleton() {
  return (
    <div className="event-skeleton">
      <div className="event-skeleton__thumb" />
      <div className="event-skeleton__body">
        <div className="event-skeleton__line" />
        <div className="event-skeleton__line event-skeleton__line--short" />
        <div className="event-skeleton__line event-skeleton__line--shorter" />
        <div className="event-skeleton__footer">
          <div className="event-skeleton__price-stub" />
          <div className="event-skeleton__btn-stub" />
        </div>
      </div>
    </div>
  );
}
