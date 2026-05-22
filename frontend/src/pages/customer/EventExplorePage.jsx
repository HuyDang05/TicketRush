import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import EventList from '../../components/event/EventList';
import eventService from '../../services/event.service';
import { useLang } from '../../context/LangContext';
import { CATEGORIES, CATEGORY_LABELS, isValidCategory } from './eventCategories';
import './home.css';

const EVENTS_PAGE_SIZE = 12;

function getSafePage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export default function EventExplorePage() {
  const { t } = useLang();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestRef = useRef(0);
  const filterRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    hasMore: false,
    total: 0,
  });

  const searchQuery = (searchParams.get('search') || '').trim();
  const categoriesParam = searchParams.get('categories') || searchParams.get('category') || '';
  const selectedCategories = useMemo(() => {
    return [...new Set(
      categoriesParam
        .split(',')
        .map((category) => category.trim())
        .filter((category) => isValidCategory(category))
    )];
  }, [categoriesParam]);
  const currentPage = getSafePage(searchParams.get('page'));
  const selectedCategoryLabels = selectedCategories.map((category) => CATEGORY_LABELS[category]);
  const filterLabel = selectedCategories.length > 0
    ? selectedCategoryLabels.map((label) => t(label)).join(', ')
    : t("Tất cả thể loại");

  const queryParams = useMemo(() => {
    const params = {
      page: currentPage,
      limit: EVENTS_PAGE_SIZE,
    };
    if (searchQuery) {
      params.search = searchQuery;
    }
    if (selectedCategories.length > 0) {
      params.categories = selectedCategories.join(',');
    }
    return params;
  }, [currentPage, searchQuery, selectedCategories]);

  useEffect(() => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setIsLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    eventService.getEvents(queryParams)
      .then((res) => {
        if (requestRef.current !== requestId) return;
        const data = res.data || {};
        setEvents(data.events || []);
        setPagination({
          page: data.page || currentPage,
          totalPages: data.totalPages || 1,
          hasMore: Boolean(data.hasMore),
          total: data.total || 0,
        });
      })
      .catch(() => {
        if (requestRef.current !== requestId) return;
        setEvents([]);
        setPagination({
          page: currentPage,
          totalPages: 1,
          hasMore: false,
          total: 0,
        });
      })
      .finally(() => {
        if (requestRef.current === requestId) {
          setIsLoading(false);
        }
      });
  }, [currentPage, queryParams]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buildNextParams = ({ page = 1, categories = selectedCategories } = {}) => {
    const nextParams = { page: String(page) };
    if (searchQuery) {
      nextParams.search = searchQuery;
    }
    if (categories.length > 0) {
      nextParams.categories = categories.join(',');
    }
    return nextParams;
  };

  const toggleCategory = (categorySlug) => {
    const nextCategories = selectedCategories.includes(categorySlug)
      ? selectedCategories.filter((category) => category !== categorySlug)
      : [...selectedCategories, categorySlug];
    setSearchParams(buildNextParams({ page: 1, categories: nextCategories }));
  };

  const clearCategories = () => {
    setSearchParams(buildNextParams({ page: 1, categories: [] }));
    setIsFilterOpen(false);
  };

  const goToPage = (page) => {
    setSearchParams(buildNextParams({ page }));
  };

  return (
    <div className="home-page events-page">
      <section className="events-page__hero">
        <div className="rv-eyebrow">{t("Khám phá sự kiện")}</div>
        <h1 className="events-page__title">
          {searchQuery
            ? `${t("Kết quả tìm kiếm")}: ${searchQuery}`
            : t("Tất cả sự kiện")}
        </h1>
      </section>

      <section className="events-filter-bar">
        <div>
          <div className="events-filter-bar__label">{t("Bộ lọc")}</div>
          <div className="events-filter-bar__value">{filterLabel}</div>
        </div>
        <div className="events-filter" ref={filterRef}>
          <button
            type="button"
            className="events-filter__trigger"
            onClick={() => setIsFilterOpen((open) => !open)}
            aria-expanded={isFilterOpen}
          >
            <SlidersHorizontal size={16} />
            {t("Bộ lọc")}
            {selectedCategories.length > 0 && (
              <span className="events-filter__count">{selectedCategories.length}</span>
            )}
            <ChevronDown size={16} />
          </button>
          {isFilterOpen && (
            <div className="events-filter__dropdown">
              <div className="events-filter__dropdown-head">
                <span>{t("Thể loại")}</span>
                {selectedCategories.length > 0 && (
                  <button type="button" className="events-filter__clear" onClick={clearCategories}>
                    <X size={14} />
                    {t("Xóa lọc")}
                  </button>
                )}
              </div>
              <div className="events-filter__options">
                {CATEGORIES.map((cat) => (
                  <label key={cat.slug} className="events-filter__option">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.slug)}
                      onChange={() => toggleCategory(cat.slug)}
                    />
                    <span className="events-filter__option-icon">{cat.icon}</span>
                    <span>{t(cat.label)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="home-events events-page__list">
        <div className="home-section-header">
          <div>
            <h2 className="home-section-title">
              {searchQuery ? t("Kết quả tìm kiếm") : t("Tất cả sự kiện")}
            </h2>
            {!isLoading && (
              <p className="events-page__summary">
                {pagination.total.toLocaleString('vi-VN')} {t('sự kiện')}
              </p>
            )}
          </div>
        </div>

        <EventList
          events={events}
          isLoading={isLoading}
          searchQuery={searchQuery || filterLabel}
        />

        <div className="events-pagination" aria-label="Event pagination">
          <button
            type="button"
            className="events-pagination__btn"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => goToPage(currentPage - 1)}
          >
            ← {t("Trước")}
          </button>
          <span className="events-pagination__status">
            {t("Trang")} {pagination.page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            className="events-pagination__btn"
            disabled={!pagination.hasMore || isLoading}
            onClick={() => goToPage(currentPage + 1)}
          >
            {t("Tiếp")} →
          </button>
        </div>
      </section>
    </div>
  );
}
