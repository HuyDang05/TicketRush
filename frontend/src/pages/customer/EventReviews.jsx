import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import eventService from '../../services/event.service';
import { useAuth } from '../../hooks/useAuth';
import './event-reviews.css';
import { useLang } from '../../context/LangContext';
import { css, cx } from "../../lib/runtimeCss";
export default function EventReviews({
  eventId
}) {
  const {
    isAuthenticated
  } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [formRating, setFormRating] = useState(0);
  const [formText, setFormText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const {
    lang
  } = useLang();

  // Overall stats
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return '0.0';
    const total = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);
  const totalReviews = reviews.length;
  useEffect(() => {
    if (!eventId) return;
    setIsLoading(true);
    eventService.getEventReviews(eventId).then(res => {
      setReviews(res.data?.comments || []);
    }).catch(() => toast.error(lang === 'en' ? 'Unable to load reviews' : 'Không thể tải đánh giá')).finally(() => setIsLoading(false));
  }, [eventId]);
  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return undefined;
    }
    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);
  const renderStars = (rating, isInteractive = false) => {
    return Array.from({
      length: 5
    }).map((_, i) => {
      const starValue = i + 1;
      const isFilled = isInteractive ? starValue <= (hoverRating || formRating) : starValue <= rating;
      return <svg key={i} className={`er-star ${isFilled ? 'er-star--filled' : ''} ${isInteractive ? 'er-star--interactive' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" onMouseEnter={isInteractive ? () => setHoverRating(starValue) : undefined} onMouseLeave={isInteractive ? () => setHoverRating(0) : undefined} onClick={isInteractive ? () => setFormRating(starValue) : undefined}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>;
    });
  };
  const handleStartWriting = () => {
    if (!isAuthenticated) {
      toast.error(lang === 'en' ? 'Please log in to submit a review' : 'Vui lòng đăng nhập để gửi đánh giá');
      return;
    }
    setIsWriting(prev => !prev);
  };
  const handleFileChange = event => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageFile(null);
      return;
    }
    setImageFile(file);
  };
  const handleRemoveImage = () => {
    setImageFile(null);
  };
  const handleSubmit = async () => {
    if (!formRating) {
      toast.error(lang === 'en' ? 'Please select a rating' : 'Vui lòng chọn số sao đánh giá');
      return;
    }
    if (!formText.trim()) {
      toast.error(lang === 'en' ? 'Please enter your review content' : 'Vui lòng nhập nội dung đánh giá');
      return;
    }
    const form = new FormData();
    form.append('rating', String(formRating));
    form.append('text', formText.trim());
    if (imageFile) form.append('image', imageFile);
    setIsSubmitting(true);
    try {
      const res = await eventService.createEventReview(eventId, form);
      const created = res.data?.comment;
      if (created) {
        setReviews(prev => [created, ...prev]);
      }
      setFormRating(0);
      setFormText('');
      setImageFile(null);
      setIsWriting(false);
      toast.success(lang === 'en' ? 'Review submitted successfully' : 'Đánh giá đã được gửi');
    } catch (error) {
      toast.error(error.response?.data?.message || (lang === 'en' ? 'Failed to submit review' : 'Gửi đánh giá thất bại'));
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="ed-card er-container">
      <div className="er-header">
        <h2 className="ed-card__title er-title">{lang === 'en' ? 'Reviews & Comments' : 'Đánh giá & Bình luận'}</h2>
        <button className={`er-write-btn ${isWriting ? 'er-write-btn--active' : ''}`} onClick={handleStartWriting}>
          {isWriting ? lang === 'en' ? 'Close form' : 'Đóng form' : lang === 'en' ? 'Write a review' : 'Viết đánh giá'}
        </button>
      </div>

      {/* Overall Stats */}
      <div className="er-stats">
        <div className="er-stats__main">
          <div className="er-stats__score">{averageRating}</div>
          <div className="er-stats__details">
            <div className="er-stats__stars">{renderStars(Math.round(averageRating))}</div>
            <div className="er-stats__total">
              {totalReviews} {lang === 'en' ? 'reviews' : 'bài đánh giá'}
            </div>
          </div>
        </div>
      </div>

      {/* Write Form */}
      {isWriting && <div className="er-form-wrapper">
          <div className="er-form">
            <div className="er-form__rating">
              <span className="er-form__label">
                {lang === 'en' ? 'Your rating:' : 'Đánh giá của bạn:'}
              </span>
              <div className="er-form__stars">{renderStars(0, true)}</div>
            </div>
            
            <textarea className="er-form__textarea" placeholder={lang === 'en' ? 'Share your experience about this event...' : 'Chia sẻ trải nghiệm của bạn về sự kiện này...'} rows="4" value={formText} onChange={event => setFormText(event.target.value)}></textarea>

            {imagePreview && <div className="er-form__preview">
                <img src={imagePreview} alt={lang === 'en' ? 'Image preview' : 'Ảnh preview'} />
                <button type="button" className="er-form__remove" onClick={handleRemoveImage}>
                  {lang === 'en' ? 'Remove image' : 'Gỡ ảnh'}
                </button>
              </div>}
            
            <div className="er-form__actions">
              <label className="er-form__upload">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                {lang === 'en' ? 'Add image' : 'Thêm ảnh'}
                <input type="file" accept="image/*" hidden onChange={handleFileChange} />
              </label>
              <button className="er-form__submit" disabled={!formRating || isSubmitting} onClick={handleSubmit}>
                {isSubmitting ? lang === 'en' ? 'Submitting...' : 'Đang gửi...' : lang === 'en' ? 'Submit review' : 'Gửi đánh giá'}
              </button>
            </div>
          </div>
        </div>}

      {/* Review List */}
      <div className="er-list">
        {isLoading && <div className="er-empty">
            {lang === 'en' ? 'Loading reviews...' : 'Đang tải đánh giá...'}
          </div>}
        {!isLoading && reviews.length === 0 && <div className="er-empty">
            {lang === 'en' ? 'No reviews yet' : 'Chưa có đánh giá nào'}
          </div>}
        {!isLoading && reviews.map((review, index) => <div key={review.id} className={cx("er-card", css({
        animationDelay: `${index * 0.1}s`
      }, "EventReviews"))}>
            <div className="er-card__header">
              <img src={review.user?.avatar || 'https://i.pravatar.cc/150?u=guest'} alt={review.user?.name || (lang === 'en' ? 'Anonymous' : 'Ẩn danh')} className="er-card__avatar" />
              <div className="er-card__user-info">
                <div className="er-card__name">
                  {review.user?.name || (lang === 'en' ? 'Anonymous' : 'Ẩn danh')}
                </div>
                <div className="er-card__datetime">
                  {new Date(review.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
                  {' · '}
                  {new Date(review.createdAt).toLocaleTimeString(lang === 'en' ? 'en-US' : 'vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
                </div>
              </div>
              <div className="er-card__rating">
                {renderStars(review.rating)}
              </div>
            </div>
            <p className="er-card__text">{review.text}</p>
            {review.imageUrl && <div className="er-card__media">
                <img src={review.imageUrl} alt={lang === 'en' ? 'Event experience' : 'Trải nghiệm sự kiện'} loading="lazy" />
              </div>}
          </div>)}
      </div>
    </div>;
}
