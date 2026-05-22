import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import queueService, { getQueueSessionId } from '../../services/queue.service';
import Header from '../../components/shared/Header';
import { useSocket } from '../../hooks/useSocket';
import { css, cx } from "../../lib/runtimeCss";
import './virtual-queue.css';
const POLL_INTERVAL = 3000; // ms

// Floating particle component
function Particle({
  style
}) {
  return <div className={cx("vq-particle", css(style, "VirtualQueuePage"))} />;
}
export default function VirtualQueuePage() {
  const {
    id: eventId
  } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // State from caller (event name, zone info)
  const eventName = location.state?.eventName ?? 'Sự kiện';
  const zoneId = location.state?.zoneId;
  const zoneName = location.state?.zoneName;
  const qty = location.state?.qty ?? 1;
  const alreadyJoined = location.state?.alreadyJoined === true;
  const initialPosition = location.state?.initialPosition;
  const initialTotal = location.state?.initialTotal;
  const [position, setPosition] = useState(null);
  const [total, setTotal] = useState(null);
  const [movePerMin, setMovePerMin] = useState(28);
  const [particles, setParticles] = useState([]);
  const sessionCode = useRef(getQueueSessionId(eventId, location.state?.queueSessionId));
  const queueSessionId = useRef(sessionCode.current);
  const pollingRef = useRef(null);
  const admittedRef = useRef(false);
  const releasedRef = useRef(false);
  const {
    on
  } = useSocket(eventId);

  // Progress 0-100. Keep this deterministic so equal queue state renders equally.
  const entryPosition = useRef(null);
  const [progress, setProgress] = useState(92);
  const computeProgress = useCallback((pos, totalCount) => {
    if (!Number.isFinite(pos) || pos < 1) return 0;
    if (!Number.isFinite(totalCount) || totalCount <= 1) return 92;
    const movedRatio = (totalCount - pos) / totalCount;
    return Math.max(8, Math.min(92, Math.round(movedRatio * 92)));
  }, []);
  const estimatedWaitSec = position && movePerMin > 0 ? Math.round(position / movePerMin * 60) : 0;
  const waitMinutes = Math.floor(estimatedWaitSec / 60);
  const waitSeconds = estimatedWaitSec % 60;

  // Ring SVG progress
  const CIRCUMFERENCE = 2 * Math.PI * 96; // r=96
  const ringOffset = CIRCUMFERENCE * (1 - progress / 100);
  const releaseCurrentQueueSession = useCallback(async () => {
    if (releasedRef.current) return;
    releasedRef.current = true;
    await queueService.release(eventId, queueSessionId.current).catch(() => {
      releasedRef.current = false;
    });
  }, [eventId]);

  // Polling
  const poll = useCallback(async () => {
    try {
      const res = await queueService.status(eventId, queueSessionId.current);
      if (res.admitted && res.token) {
        admittedRef.current = true;
        clearInterval(pollingRef.current);
        navigate(`/events/${eventId}/seats`, {
          state: {
            zoneId,
            zoneName,
            qty,
            queueToken: res.token,
            queueSessionId: queueSessionId.current
          },
          replace: true
        });
        return;
      }
      if (res.position == null) {
        clearInterval(pollingRef.current);
        await releaseCurrentQueueSession();
        navigate(`/events/${eventId}`, {
          replace: true
        });
        return;
      }
      if (res.position !== undefined) {
        if (!entryPosition.current) entryPosition.current = res.position;
        setPosition(res.position);
        setTotal(res.total);
        setProgress(computeProgress(res.position, res.total));
        setMovePerMin(22 + Math.floor(Math.random() * 13));
      }
    } catch {
      // Silently ignore transient errors — keep polling
    }
  }, [eventId, navigate, zoneId, zoneName, qty, computeProgress, releaseCurrentQueueSession]);
  useEffect(() => {
    return on('queue_updated', () => {
      poll();
    });
  }, [on, poll]);

  // Join queue on mount
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (alreadyJoined) {
        if (initialPosition !== undefined && initialPosition !== null) {
          entryPosition.current = initialPosition;
          setPosition(initialPosition);
          setTotal(initialTotal);
          setProgress(computeProgress(initialPosition, initialTotal));
        }
        poll();
        return;
      }
      try {
        const res = await queueService.join(eventId, queueSessionId.current);
        if (cancelled) return;
        if (res.admitted && res.token) {
          admittedRef.current = true;
          navigate(`/events/${eventId}/seats`, {
            state: {
              zoneId,
              zoneName,
              qty,
              queueToken: res.token,
              queueSessionId: queueSessionId.current
            },
            replace: true
          });
          return;
        }
        if (res.position !== undefined && res.position !== null) {
          entryPosition.current = res.position;
          setPosition(res.position);
          setTotal(res.total);
          setProgress(computeProgress(res.position, res.total));
        }
      } catch {
        if (cancelled) return;
        setPosition(null);
        setTotal(null);
        entryPosition.current = null;
        setProgress(0);
      }
    }
    init();
    pollingRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(pollingRef.current);
      if (!admittedRef.current) {
        releaseCurrentQueueSession();
      }
    };
  }, [eventId, navigate, poll, zoneId, zoneName, qty, alreadyJoined, initialPosition, initialTotal, releaseCurrentQueueSession]);

  // Spawn particles
  useEffect(() => {
    const spawn = () => {
      const id = Date.now() + Math.random();
      const p = {
        id,
        left: `${Math.random() * 100}vw`,
        animationDuration: `${8 + Math.random() * 6}s`,
        animationDelay: '0s',
        opacity: 0.3 + Math.random() * 0.4
      };
      setParticles(prev => [...prev, p]);
      setTimeout(() => setParticles(prev => prev.filter(x => x.id !== id)), 14000);
    };

    // Initial burst
    for (let i = 0; i < 6; i++) setTimeout(spawn, i * 200);
    const interval = setInterval(spawn, 800);
    return () => clearInterval(interval);
  }, []);

  // Prevent page refresh warning
  useEffect(() => {
    const handler = e => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);
  const displayPos = Number.isFinite(position) && position > 0 ? position : null;
  const displayTotal = Number.isFinite(total) && total > 0 ? total : null;
  return <>
      <div className="vq-root">
        <Header />
        {/* Particles */}
        {particles.map(p => <Particle key={p.id} className={css({
        left: p.left,
        animationDuration: p.animationDuration,
        opacity: p.opacity
      }, "VirtualQueuePage")} />)}

        {/* Top bar */}
        <div className="vq-topbar">
          <div className="vq-brand">
            <div className="vq-brand-mark">T</div>
            <div className="vq-brand-name">TICKETRUSH</div>
          </div>
          <div className="vq-live-pill">
            <span className="vq-live-dot" />
            Hệ thống đang hoạt động
          </div>
        </div>

        {/* Main */}
        <main className="vq-main">
          <button type="button" className="vq-back-btn" onClick={async () => {
          await releaseCurrentQueueSession();
          navigate(`/events/${eventId}`);
        }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7 7-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="vq-card">
            <div className="vq-event-tag">
              🎤 {eventName}
            </div>

            {/* Position ring */}
            <div className="vq-ring-wrap">
              <svg className="vq-ring-svg" width="220" height="220" viewBox="0 0 220 220">
                <circle cx="110" cy="110" r="96" fill="none" strokeWidth="10" className="vq-ring-track" />
                <circle cx="110" cy="110" r="96" fill="none" strokeWidth="10" className="vq-ring-progress" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={Math.max(0, ringOffset)} />
              </svg>
              <div className="vq-ring-inner">
                <span className="vq-pos-label">Vị trí của bạn</span>
                <span className="vq-pos-num">{displayPos ? displayPos.toLocaleString('vi-VN') : '...'}</span>
                <span className="vq-pos-suffix">
                  trong tổng số <b>{displayTotal ? displayTotal.toLocaleString('vi-VN') : '...'}</b>
                </span>
              </div>
            </div>

            <h1 className="vq-title">Bạn đang trong hàng đợi</h1>
            <p className="vq-subtitle">
              Hệ thống đang xử lý lưu lượng truy cập cao bất thường.
              Vui lòng giữ tab này mở — chúng tôi sẽ tự động chuyển bạn
              vào trang mua vé khi đến lượt.
            </p>

            {/* Progress bar */}
            <div className="vq-progress-section">
              <div className="vq-progress-row">
                <span>Tiến độ hàng đợi</span>
                <span><b>{progress}%</b> đã qua</span>
              </div>
              <div className="vq-progress-bar">
                <div className={cx("vq-progress-fill", css({
                width: `${progress}%`
              }, "VirtualQueuePage"))} />
              </div>
            </div>

            {/* Stats */}
            <div className="vq-stats-grid">
              <div className="vq-stat-tile">
                <div className="vq-stat-label">Ước tính</div>
                <div className="vq-stat-val">
                  ~{waitMinutes}:{String(waitSeconds).padStart(2, '0')}
                </div>
                <div className="vq-stat-sub">phút còn lại</div>
              </div>
              <div className="vq-stat-tile">
                <div className="vq-stat-label">Tốc độ</div>
                <div className="vq-stat-val">{movePerMin}</div>
                <div className="vq-stat-sub">người/phút</div>
              </div>
              <div className="vq-stat-tile">
                <div className="vq-stat-label">Trước bạn</div>
                <div className="vq-stat-val">{Math.max(0, (displayPos || 1) - 1).toLocaleString('vi-VN')}</div>
                <div className="vq-stat-sub">người đang chờ</div>
              </div>
            </div>

            {/* Warning */}
            <div className="vq-warning">
              <svg className="vq-warning-icon" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
              </svg>
              <div className="vq-warning-text">
                <b>Đừng tải lại trang</b> — nếu refresh, vị trí của bạn sẽ bị
                mất và bạn phải xếp hàng lại từ đầu. Tab này sẽ tự động cập
                nhật mỗi vài giây.
              </div>
            </div>

            {/* Tips */}
            <div className="vq-tips">
              <div className="vq-tips-title">💡 Trong khi chờ</div>
              <ul>
                <li>Chuẩn bị sẵn thông tin thẻ thanh toán để check-out nhanh hơn</li>
                <li>Đăng nhập trên một thiết bị duy nhất để tránh mất chỗ</li>
                <li>Bạn có 8 phút để hoàn tất giao dịch khi đến lượt</li>
              </ul>
            </div>
          </div>
        </main>

        {/* Footer */}
        <div className="vq-footer">
          Mã phiên: <span className={css({
          color: '#AAA',
          fontFamily: 'monospace'
        }, "VirtualQueuePage")}>{sessionCode.current}</span> ·{' '}
          Cần hỗ trợ? <a href="mailto:support@ticketrush.vn">Liên hệ CSKH</a>
        </div>
      </div>
    </>;
}
