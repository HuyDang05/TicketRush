import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import queueService from '../../services/queue.service';
import Header from '../../components/shared/Header';
import { useSocket } from '../../hooks/useSocket';

const POLL_INTERVAL = 3000; // ms

function getQueueSessionId(eventId, preferredSessionId) {
  return preferredSessionId || `tkr-q-${eventId}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// Floating particle component
function Particle({ style }) {
  return <div className="vq-particle" style={style} />;
}

export default function VirtualQueuePage() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // State from caller (event name, zone info)
  const eventName = location.state?.eventName ?? 'Sự kiện';
  const zoneId    = location.state?.zoneId;
  const zoneName  = location.state?.zoneName;
  const qty       = location.state?.qty ?? 1;

  const alreadyJoined = location.state?.alreadyJoined === true;
  const initialPosition = location.state?.initialPosition;
  const initialTotal = location.state?.initialTotal;

  const [position, setPosition]   = useState(null);
  const [total, setTotal]         = useState(null);
  const [movePerMin, setMovePerMin] = useState(28);
  const [particles, setParticles] = useState([]);
  const sessionCode = useRef(getQueueSessionId(eventId, location.state?.queueSessionId));
  const queueSessionId = useRef(sessionCode.current);
  const pollingRef  = useRef(null);
  const admittedRef = useRef(false);
  const releasedRef = useRef(false);
  const { on } = useSocket(eventId);

  // Progress 0–100 relative to entry position
  const entryPosition = useRef(null);
  const [progress, setProgress] = useState(92);

  const computeProgress = useCallback((pos) => {
    if (!entryPosition.current) return 92;
    const moved = entryPosition.current - pos;
    return Math.min(100, Math.round((moved / entryPosition.current) * 8 + 92));
  }, []);

  const estimatedWaitSec = position && movePerMin > 0
    ? Math.round((position / movePerMin) * 60)
    : 0;
  const waitMinutes = Math.floor(estimatedWaitSec / 60);
  const waitSeconds = estimatedWaitSec % 60;

  // Ring SVG progress
  const CIRCUMFERENCE = 2 * Math.PI * 96; // r=96
  const ringOffset = position && entryPosition.current
    ? CIRCUMFERENCE * (1 - (1 - position / entryPosition.current) * 0.5) - 80
    : CIRCUMFERENCE * 0.2;

  // Polling
  const poll = useCallback(async () => {
    try {
      const res = await queueService.status(eventId, queueSessionId.current);
      if (res.admitted && res.token) {
        admittedRef.current = true;
        clearInterval(pollingRef.current);
        navigate(`/events/${eventId}/seats`, {
          state: { zoneId, zoneName, qty, queueToken: res.token, queueSessionId: queueSessionId.current },
          replace: true,
        });
        return;
      }
      if (res.position !== undefined) {
        if (!entryPosition.current) entryPosition.current = res.position;
        setPosition(res.position);
        setTotal(res.total);
        setProgress(computeProgress(res.position));
        setMovePerMin(22 + Math.floor(Math.random() * 13));
      }
    } catch {
      // Silently ignore transient errors — keep polling
    }
  }, [eventId, navigate, zoneId, zoneName, qty, computeProgress]);

  const releaseCurrentQueueSession = useCallback(async () => {
    if (releasedRef.current) return;
    releasedRef.current = true;
    await queueService.release(eventId, queueSessionId.current).catch(() => {
      releasedRef.current = false;
    });
  }, [eventId]);

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
          setProgress(92);
        }
        return;
      }

      try {
        const res = await queueService.join(eventId, queueSessionId.current);
        if (cancelled) return;

        if (res.admitted && res.token) {
          admittedRef.current = true;
          navigate(`/events/${eventId}/seats`, {
            state: { zoneId, zoneName, qty, queueToken: res.token, queueSessionId: queueSessionId.current },
            replace: true,
          });
          return;
        }
        if (res.position !== undefined) {
          entryPosition.current = res.position;
          setPosition(res.position);
          setTotal(res.total);
          setProgress(92);
        }
      } catch {
        if (cancelled) return;
        setPosition(1);
        setTotal(1);
        entryPosition.current = 1;
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
        opacity: 0.3 + Math.random() * 0.4,
      };
      setParticles((prev) => [...prev, p]);
      setTimeout(() => setParticles((prev) => prev.filter((x) => x.id !== id)), 14000);
    };

    // Initial burst
    for (let i = 0; i < 6; i++) setTimeout(spawn, i * 200);
    const interval = setInterval(spawn, 800);
    return () => clearInterval(interval);
  }, []);

  // Prevent page refresh warning
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const displayPos   = position ?? 1;
  const displayTotal = total   ?? 1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .vq-root {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,107,53,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 60% 60% at 50% 100%, rgba(255,107,53,0.10) 0%, transparent 60%),
            #0F0F0F;
          color: #fff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
          position: relative;
        }

        /* Top bar */
        .vq-topbar {
          display: none;
          padding: 18px 32px;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #222;
          background: rgba(17,17,17,0.6);
          backdrop-filter: blur(8px);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .vq-brand { display: flex; align-items: center; gap: 10px; }
        .vq-brand-mark {
          width: 28px; height: 28px;
          background: #FF6B35;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; color: #111; font-size: 13px;
        }
        .vq-brand-name { font-weight: 700; letter-spacing: 0.04em; font-size: 14px; }
        .vq-live-pill {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,107,53,0.12);
          color: #FF6B35;
          border: 1px solid rgba(255,107,53,0.3);
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .vq-live-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #FF6B35;
          animation: vqLivePulse 1.8s infinite;
        }
        @keyframes vqLivePulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,107,53,0.6); }
          50%      { box-shadow: 0 0 0 6px rgba(255,107,53,0); }
        }

        /* Main */
        .vq-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          position: relative;
        }

        .vq-back-btn {
          position: fixed;
          left: 32px;
          top: 112px;
          z-index: 20;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 40px;
          padding: 0 14px 0 12px;
          border: 1px solid rgba(255,107,53,0.35);
          border-radius: 8px;
          background: rgba(18,18,18,0.82);
          color: #F5F5F5;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          backdrop-filter: blur(10px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.32);
          transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
        }
        .vq-back-btn:hover {
          background: rgba(255,107,53,0.12);
          border-color: rgba(255,107,53,0.7);
          transform: translateX(-2px);
        }
        .vq-back-btn svg {
          flex-shrink: 0;
        }

        .vq-card {
          width: 100%;
          max-width: 560px;
          background: linear-gradient(180deg, #1E1E1E 0%, #181818 100%);
          border: 1px solid #2C2C2C;
          border-radius: 20px;
          padding: 40px 36px;
          text-align: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .vq-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent 10%, #FF6B35 50%, transparent 90%);
        }

        .vq-event-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,107,53,0.08);
          color: #FF6B35;
          border: 1px solid rgba(255,107,53,0.2);
          border-radius: 6px;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 24px;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Position ring */
        .vq-ring-wrap {
          width: 220px; height: 220px;
          position: relative;
          margin: 0 auto 28px;
        }
        .vq-ring-svg { transform: rotate(-90deg); }
        .vq-ring-track { stroke: #2A2A2A; }
        .vq-ring-progress {
          stroke: #FF6B35;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1);
          filter: drop-shadow(0 0 6px rgba(255,107,53,0.5));
        }
        .vq-ring-inner {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }
        .vq-pos-label {
          font-size: 10px; font-weight: 600; color: #888;
          letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 6px;
        }
        .vq-pos-num {
          font-size: 64px; font-weight: 800;
          line-height: 1; letter-spacing: -0.03em;
          background: linear-gradient(180deg, #FFF 0%, #FF6B35 130%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .vq-pos-suffix { font-size: 12px; color: #AAAAAA; margin-top: 8px; }
        .vq-pos-suffix b { color: #FFF; font-weight: 600; }

        .vq-title {
          font-size: 22px; font-weight: 700; color: #FFF;
          margin-bottom: 8px; letter-spacing: -0.01em;
        }
        .vq-subtitle {
          color: #AAAAAA; font-size: 13px; line-height: 1.6;
          max-width: 420px; margin: 0 auto 28px;
        }

        /* Progress bar */
        .vq-progress-section { margin-bottom: 24px; }
        .vq-progress-row {
          display: flex; justify-content: space-between;
          font-size: 11px; color: #AAAAAA; margin-bottom: 8px;
        }
        .vq-progress-row b { color: #FFF; font-weight: 600; }
        .vq-progress-bar {
          width: 100%; height: 6px;
          background: #2A2A2A; border-radius: 4px;
          overflow: hidden; position: relative;
        }
        .vq-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF6B35 0%, #f59e0b 100%);
          border-radius: 4px;
          transition: width 0.8s cubic-bezier(.4,0,.2,1);
          position: relative;
        }
        .vq-progress-fill::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: vqShimmer 2s infinite;
        }
        @keyframes vqShimmer {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }

        /* Stats grid */
        .vq-stats-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 10px; margin-bottom: 28px;
        }
        .vq-stat-tile {
          background: #161616;
          border: 1px solid #2A2A2A;
          border-radius: 10px; padding: 14px 10px; text-align: center;
        }
        .vq-stat-label {
          font-size: 10px; color: #888;
          text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;
        }
        .vq-stat-val {
          font-size: 18px; font-weight: 700; color: #FFF; line-height: 1.1;
        }
        .vq-stat-sub { font-size: 10px; color: #FF6B35; margin-top: 2px; }

        /* Warning */
        .vq-warning {
          background: rgba(255,107,53,0.06);
          border: 1px solid rgba(255,107,53,0.2);
          border-radius: 10px; padding: 12px 14px;
          display: flex; align-items: flex-start; gap: 10px;
          text-align: left; margin-bottom: 20px;
        }
        .vq-warning-icon { color: #FF6B35; flex-shrink: 0; margin-top: 1px; }
        .vq-warning-text { color: #DDDDDD; font-size: 12px; line-height: 1.55; }
        .vq-warning-text b { color: #FF6B35; font-weight: 600; }

        /* Tips */
        .vq-tips {
          text-align: left;
          background: #161616;
          border: 1px dashed #333;
          border-radius: 10px; padding: 14px 16px;
        }
        .vq-tips-title {
          font-size: 11px; font-weight: 700; color: #FFF;
          text-transform: uppercase; letter-spacing: 0.08em;
          margin-bottom: 8px;
          display: flex; align-items: center; gap: 6px;
        }
        .vq-tips ul { list-style: none; padding: 0; margin: 0; }
        .vq-tips li {
          color: #AAAAAA; font-size: 12px; line-height: 1.7;
          padding-left: 18px; position: relative;
        }
        .vq-tips li::before {
          content: ''; position: absolute;
          left: 4px; top: 10px;
          width: 4px; height: 4px;
          background: #FF6B35; border-radius: 50%;
        }

        /* Footer note */
        .vq-footer {
          text-align: center; color: #666; font-size: 11px;
          padding: 24px; line-height: 1.6;
        }
        .vq-footer a { color: #FF6B35; text-decoration: none; }
        .vq-footer a:hover { text-decoration: underline; }

        /* Floating particles */
        .vq-particle {
          position: fixed;
          width: 3px; height: 3px;
          background: #FF6B35; border-radius: 50%;
          pointer-events: none;
          animation: vqFloat linear forwards;
        }
        @keyframes vqFloat {
          0%   { transform: translateY(100vh) scale(0); opacity: 0; }
          10%  { opacity: 0.5; }
          90%  { opacity: 0.5; }
          100% { transform: translateY(-10vh) scale(1); opacity: 0; }
        }

        @media (max-width: 480px) {
          .vq-back-btn {
            left: 16px;
            top: 88px;
            height: 36px;
            padding: 0 11px 0 9px;
            font-size: 12px;
          }
          .vq-card { padding: 28px 20px; }
          .vq-pos-num { font-size: 48px; }
          .vq-ring-wrap { width: 180px; height: 180px; }
          .vq-stats-grid { grid-template-columns: repeat(3, 1fr); gap: 6px; }
          .vq-stat-val { font-size: 15px; }
        }
      `}</style>

      <div className="vq-root">
        <Header />
        {/* Particles */}
        {particles.map((p) => (
          <Particle
            key={p.id}
            style={{
              left: p.left,
              animationDuration: p.animationDuration,
              opacity: p.opacity,
            }}
          />
        ))}

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
          <button
            type="button"
            className="vq-back-btn"
            onClick={async () => {
              await releaseCurrentQueueSession();
              navigate(`/events/${eventId}`);
            }}
          >
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
                <circle
                  cx="110" cy="110" r="96"
                  fill="none" strokeWidth="10"
                  className="vq-ring-track"
                />
                <circle
                  cx="110" cy="110" r="96"
                  fill="none" strokeWidth="10"
                  className="vq-ring-progress"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={Math.max(0, ringOffset)}
                />
              </svg>
              <div className="vq-ring-inner">
                <span className="vq-pos-label">Vị trí của bạn</span>
                <span className="vq-pos-num">{displayPos.toLocaleString('vi-VN')}</span>
                <span className="vq-pos-suffix">
                  trong tổng số <b>{displayTotal.toLocaleString('vi-VN')}</b>
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
                <div
                  className="vq-progress-fill"
                  style={{ width: `${progress}%` }}
                />
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
                <div className="vq-stat-val">{Math.max(0, displayPos - 1).toLocaleString('vi-VN')}</div>
                <div className="vq-stat-sub">người đang chờ</div>
              </div>
            </div>

            {/* Warning */}
            <div className="vq-warning">
              <svg className="vq-warning-icon" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"/>
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
          Mã phiên: <span style={{ color: '#AAA', fontFamily: 'monospace' }}>{sessionCode.current}</span> ·{' '}
          Cần hỗ trợ? <a href="mailto:support@ticketrush.vn">Liên hệ CSKH</a>
        </div>
      </div>
    </>
  );
}
