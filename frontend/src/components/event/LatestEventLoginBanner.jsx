// Purpose: Component UI dung de hien thi danh sach va thong tin su kien.
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useModalStore from '../../store/modalStore';
import eventService from '../../services/event.service';
import './event.css';

const LOGIN_BANNER_FLAG = 'ticketRush:showLatestEventBanner';

export function markLatestEventBannerForLogin() {
  sessionStorage.setItem(LOGIN_BANNER_FLAG, '1');
}

function LatestEventBannerContent({ event, onOpenEvent }) {
  const imageUrl = event?.imageUrl;

  return (
    <button
      type="button"
      className="event-login-banner"
      onClick={onOpenEvent}
      aria-label={`Xem sự kiện ${event.title}`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={event.title} className="event-login-banner__image" />
      ) : (
        <div className="event-login-banner__placeholder">{event.title}</div>
      )}
      <div className="event-login-banner__caption">
        <h3 className="event-login-banner__title">{event.title}</h3>
      </div>
    </button>
  );
}

export default function LatestEventLoginBanner() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const openModal = useModalStore((state) => state.openModal);
  const closeModal = useModalStore((state) => state.closeModal);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role === 'ADMIN' || handledRef.current) return;
    if (sessionStorage.getItem(LOGIN_BANNER_FLAG) !== '1') return;

    handledRef.current = true;
    sessionStorage.removeItem(LOGIN_BANNER_FLAG);

    let cancelled = false;

    eventService.getFifthLatestEvent()
      .then((response) => {
        if (cancelled) return;

        const latestEvent = response.data?.events?.[0];
        if (!latestEvent) return;

        const openEvent = () => {
          closeModal();
          navigate(`/events/${latestEvent.id}`);
        };

        openModal({
          type: 'custom',
          title: 'Trải nghiệm sự kiện mới nhất',
          width: '820px',
          className: 'event-login-modal',
          content: (
            <LatestEventBannerContent
              event={latestEvent}
              onOpenEvent={openEvent}
            />
          ),
          customActions: (
            <button
              type="button"
              className="event-login-banner__action"
              onClick={openEvent}
            >
              Xem chi tiết
            </button>
          ),
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [closeModal, isAuthenticated, navigate, openModal, user?.role]);

  return null;
}
