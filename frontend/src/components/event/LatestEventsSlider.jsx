import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import { css, cx } from "../../lib/runtimeCss";
const CARD_GRADIENTS = ['linear-gradient(135deg,#2d1200,#8b3a00)', 'linear-gradient(135deg,#0a1a2d,#0a3d6b)', 'linear-gradient(135deg,#0d2200,#1a4400)', 'linear-gradient(135deg,#1a0a2d,#4a1a7a)'];
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
}
function sortByNewest(a, b) {
  const aTime = new Date(a.createdAt || a.date || 0).getTime();
  const bTime = new Date(b.createdAt || b.date || 0).getTime();
  return bTime - aTime;
}
function LatestSlideCard({
  event
}) {
  const {
    t
  } = useLang();
  const idx = hashCode(event.id || event.title) % CARD_GRADIENTS.length;
  const imageUrl = event.imageUrl || event.cardImageUrl;
  return <article className="latest-slide-card">
      {imageUrl ? <img src={imageUrl} alt={event.title} className="latest-slide-card__img" /> : <div className={cx("latest-slide-card__placeholder", css({
      background: CARD_GRADIENTS[idx]
    }, "LatestEventsSlider"))} />}
      <div className="latest-slide-card__overlay" />
      <div className="latest-slide-card__footer">
        <Link to={`/events/${event.id}`} className="latest-slide-card__btn">
          {t("Xem chi tiết")}
        </Link>
      </div>
    </article>;
}
function LatestSliderSkeleton({
  count
}) {
  return <div className="home-latest__grid" aria-hidden="true">
      {Array.from({
      length: count
    }, (_, i) => <div key={i} className="latest-slide-card latest-slide-card--skeleton" />)}
    </div>;
}
function LatestSliderPagination({
  totalPages,
  page,
  onSelect,
  isLoading
}) {
  if (isLoading) {
    return <div className="home-latest__dots home-latest__dots--loading" aria-hidden="true">
        {Array.from({
        length: 3
      }, (_, i) => <span key={i} className="home-latest__dot home-latest__dot--skeleton" />)}
      </div>;
  }
  if (totalPages < 1) return null;
  return <div className="home-latest__dots" role="tablist" aria-label="Vị trí slide hiện tại">
      {Array.from({
      length: totalPages
    }, (_, i) => <button key={i} type="button" role="tab" aria-selected={i === page} aria-label={`Slide ${i + 1} / ${totalPages}`} className={`home-latest__dot${i === page ? ' home-latest__dot--active' : ''}`} onClick={() => onSelect(i)} />)}
    </div>;
}
export default function LatestEventsSlider({
  events,
  isLoading
}) {
  const {
    t
  } = useLang();
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(2);
  const [isPaused, setIsPaused] = useState(false);
  const latestEvents = useMemo(() => [...events].sort(sortByNewest).slice(0, 6), [events]);
  const totalPages = Math.max(1, Math.ceil(latestEvents.length / itemsPerPage));
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const update = () => setItemsPerPage(mq.matches ? 1 : 2);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    setPage(p => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages, itemsPerPage]);
  const goPrev = () => setPage(p => (p - 1 + totalPages) % totalPages);
  const goNext = () => setPage(p => (p + 1) % totalPages);
  const canNavigate = !isLoading && latestEvents.length > itemsPerPage;
  useEffect(() => {
    if (!canNavigate || isPaused) return undefined;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;
    const timerId = window.setInterval(() => {
      setPage(p => (p + 1) % totalPages);
    }, 2500);
    return () => window.clearInterval(timerId);
  }, [canNavigate, isPaused, totalPages]);
  if (!isLoading && latestEvents.length === 0) {
    return null;
  }
  return <section className="home-latest">
      <div className="home-section-header">
        <h2 className="home-section-title">{t("Sự kiện mới nhất")}</h2>
      </div>

      <div className="home-latest__slider" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} onFocus={() => setIsPaused(true)} onBlur={() => setIsPaused(false)}>
        <button type="button" className="home-latest__arrow home-latest__arrow--prev" onClick={goPrev} disabled={!canNavigate} aria-label="Slide trước">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
          </svg>
        </button>

        <div className="home-latest__main">
          <div className="home-latest__viewport">
            {isLoading ? <LatestSliderSkeleton count={itemsPerPage} /> : <div className={cx("home-latest__grid", css({
            transform: `translateX(calc(-${page * 100}% - ${page * 20}px))`
          }, "LatestEventsSlider"))}>
                {latestEvents.map(event => <LatestSlideCard key={event.id} event={event} />)}
              </div>}
          </div>

          <LatestSliderPagination totalPages={totalPages} page={page} onSelect={setPage} isLoading={isLoading} />
        </div>

        <button type="button" className="home-latest__arrow home-latest__arrow--next" onClick={goNext} disabled={!canNavigate} aria-label="Slide sau">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </section>;
}
