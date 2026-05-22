import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import eventService from '../../services/event.service';
import bookingService from '../../services/booking.service';
import queueService, { getQueueSessionId } from '../../services/queue.service';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import CustomerSeatmapCanvas from '../../components/seatmap/CustomerSeatmapCanvas';
import { useSocket } from '../../hooks/useSocket';
import { useTheme } from '../../hooks/useTheme';
import { useCart } from '../../context/CartContext';
import useAuthStore from '../../store/authStore';
import './seat-selection.css';
import { css, cx } from "../../lib/runtimeCss";
const LOCK_SECONDS = 10 * 60;
function toNumberPrice(value) {
  if (value === null || value === undefined) return 0;
  return Number(String(value).replace(/[^\d]/g, '')) || 0;
}
function fmt(n) {
  return toNumberPrice(n).toLocaleString('vi-VN') + 'đ';
}
function Countdown({
  expiresAt,
  onExpire
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const calculateTimeLeft = () => {
      const now = Date.now();
      const expiresTime = new Date(expiresAt).getTime();
      const diff = Math.floor((expiresTime - now) / 1000);
      return diff > 0 ? diff : 0;
    };
    setTimeLeft(calculateTimeLeft());
    const t = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(t);
        if (onExpire) onExpire();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt, onExpire]);
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');
  return <span>{mm}:{ss}</span>;
}
export default function SeatSelectionPage() {
  const {
    id: eventId
  } = useParams();
  const {
    theme,
    toggleTheme
  } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    refreshCart
  } = useCart();
  const currentUser = useAuthStore(state => state.user);
  const [queueAccess, setQueueAccess] = useState(() => ({
    token: location.state?.queueToken || null,
    sessionId: location.state?.queueSessionId || null
  }));
  const queueToken = queueAccess.token;
  const queueSessionId = queueAccess.sessionId;
  const releaseSentRef = useRef(false);
  const [event, setEvent] = useState(null);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queueValidated, setQueueValidated] = useState(false);
  const [booking, setBooking] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [selected, setSelected] = useState({});
  const [lockingSeats, setLockingSeats] = useState({});
  // seatId -> true: ghế người khác đang soft-select (chưa lock)
  const [othersSelecting, setOthersSelecting] = useState({});
  const {
    on,
    emit,
    getSocketId
  } = useSocket(eventId);
  const enterQueuePage = useCallback((result, sessionId) => {
    navigate(`/events/${eventId}/queue`, {
      replace: true,
      state: {
        ...(location.state || {}),
        queueSessionId: sessionId,
        initialPosition: result?.position,
        initialTotal: result?.total,
        alreadyJoined: true
      }
    });
  }, [eventId, location.state, navigate]);
  const silentlyAcquireQueueAccess = useCallback(async () => {
    const nextSessionId = getQueueSessionId(eventId);
    const result = await queueService.join(eventId, nextSessionId);
    if (result.admitted && result.token) {
      releaseSentRef.current = false;
      setQueueAccess({
        token: result.token,
        sessionId: nextSessionId
      });
      setQueueValidated(true);
      navigate(`/events/${eventId}/seats`, {
        replace: true,
        state: {
          ...(location.state || {}),
          queueToken: result.token,
          queueSessionId: nextSessionId
        }
      });
      return true;
    }
    enterQueuePage(result, nextSessionId);
    return false;
  }, [enterQueuePage, eventId, location.state, navigate]);
  const releaseQueueSlot = useCallback(async ({
    keepalive = false
  } = {}) => {
    if (!eventId || !queueToken || !queueSessionId || !queueValidated || releaseSentRef.current) return;
    releaseSentRef.current = true;
    if (keepalive) {
      const token = localStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      fetch(`${baseURL}/queue/${eventId}/release`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? {
            Authorization: `Bearer ${token}`
          } : {})
        },
        body: JSON.stringify({
          queueSessionId
        })
      }).catch(() => {});
      return;
    }
    try {
      await queueService.release(eventId, queueSessionId);
    } catch {
      releaseSentRef.current = false;
    }
  }, [eventId, queueToken, queueSessionId, queueValidated]);
  useEffect(() => {
    if (!eventId) return;
    let alive = true;
    async function validateQueueAccess() {
      if (!queueToken || !queueSessionId) {
        await silentlyAcquireQueueAccess();
        return;
      }
      try {
        const res = await queueService.validate(eventId, queueToken, queueSessionId);
        if (!alive) return;
        if (res.valid) {
          setQueueValidated(true);
          return;
        }
        await silentlyAcquireQueueAccess();
      } catch {
        if (alive) await silentlyAcquireQueueAccess();
      }
    }
    validateQueueAccess();
    return () => {
      alive = false;
    };
  }, [eventId, queueToken, queueSessionId, silentlyAcquireQueueAccess]);
  useEffect(() => {
    if (!queueValidated) return undefined;
    const interval = setInterval(async () => {
      try {
        const res = await queueService.heartbeat(eventId, queueToken, queueSessionId);
        if (!res.valid) {
          await silentlyAcquireQueueAccess();
        }
      } catch {
        // Transient network errors should not eject the user immediately.
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [eventId, queueToken, queueSessionId, queueValidated, silentlyAcquireQueueAccess]);
  useEffect(() => {
    if (!queueValidated) return undefined;
    const releaseOnPageExit = () => {
      releaseQueueSlot({
        keepalive: true
      });
    };
    window.addEventListener('pagehide', releaseOnPageExit);
    return () => window.removeEventListener('pagehide', releaseOnPageExit);
  }, [queueValidated, releaseQueueSlot]);

  // ── Nhận realtime events ───────────────────────────────────────────────────
  useEffect(() => {
    function updateSeatStatus(seatId, newStatus) {
      setZones(prev => prev.map(zone => ({
        ...zone,
        seats: zone.seats?.map(seat => seat.id === seatId ? {
          ...seat,
          status: newStatus
        } : seat)
      })));
    }

    // Người khác đang chọn (soft) → tô màu "đang xem"
    const offSelecting = on('seat_selecting', ({
      seatId
    }) => {
      setOthersSelecting(prev => ({
        ...prev,
        [seatId]: true
      }));
    });

    // Người khác bỏ chọn (soft) → trả về available
    const offDeselecting = on('seat_deselecting', ({
      seatId
    }) => {
      setOthersSelecting(prev => {
        if (!prev[seatId]) return prev;
        const next = {
          ...prev
        };
        delete next[seatId];
        return next;
      });
    });

    // Ghế bị lock cứng (sau khi bấm thanh toán)
    const offLocked = on('seat_locked', ({
      seatId,
      label,
      socketId,
      userId,
      bookingId,
      expiresAt,
      zoneId,
      zoneName,
      totalPrice
    }) => {
      updateSeatStatus(seatId, 'LOCKED');
      // Xoá khỏi soft-selecting map vì giờ đã locked
      setOthersSelecting(prev => {
        if (!prev[seatId]) return prev;
        const next = {
          ...prev
        };
        delete next[seatId];
        return next;
      });
      // Chỉ thông báo nếu event đến từ người khác
      const isMyLock = userId && currentUser?.id && userId === currentUser.id;
      if (isMyLock && bookingId) {
        const dbZone = zones.find(zone => zone.seats?.some(seat => seat.id === seatId));
        const dbSeat = dbZone?.seats?.find(seat => seat.id === seatId);
        const sj = event?.seatmapJson;
        const rawLayout = Array.isArray(sj?.layout) ? sj.layout : Array.isArray(sj?.zones) ? sj.zones : [];
        const matchedLayoutZone = rawLayout.find(lz => lz.id === zoneId || lz.name === (zoneName || dbZone?.name));
        setSelected(prev => ({
          ...prev,
          [seatId]: {
            seatDbId: seatId,
            bookingId,
            expiresAt,
            label: label || dbSeat?.label,
            row: dbSeat?.row,
            col: dbSeat?.col,
            zoneKey: zoneName || dbZone?.name,
            zoneId: zoneId || dbZone?.id,
            price: Number(totalPrice ?? dbZone?.price ?? 0),
            color: matchedLayoutZone?.color
          }
        }));
        refreshCart();
        return;
      }
      if (socketId && socketId === getSocketId()) return;
      setSelected(prev => {
        if (!prev[seatId]) return prev;
        const next = {
          ...prev
        };
        delete next[seatId];
        setToastMsg('Một ghế bạn chọn vừa bị người khác giữ chỗ');
        return next;
      });
    });
    const offSold = on('seat_sold', ({
      seatId
    }) => {
      updateSeatStatus(seatId, 'SOLD');
      setSelected(prev => {
        if (!prev[seatId]) return prev;
        const next = {
          ...prev
        };
        delete next[seatId];
        setToastMsg('Một ghế bạn chọn vừa được người khác mua');
        return next;
      });
    });
    const offReleased = on('seat_released', ({
      seatId,
      label
    }) => {
      updateSeatStatus(seatId, 'AVAILABLE');
      setSelected(prev => {
        if (!prev[seatId]) return prev;
        const next = {
          ...prev
        };
        delete next[seatId];
        showToast(`Ghế ${label || ''} đã được giải phóng`);
        return next;
      });
    });
    return () => {
      offSelecting();
      offDeselecting();
      offLocked();
      offSold();
      offReleased();
    };
  }, [on, getSocketId, currentUser?.id, zones, event?.seatmapJson, refreshCart]);

  // ── Load dữ liệu sự kiện ───────────────────────────────────────────────────
  useEffect(() => {
    if (!eventId || !queueValidated) return;
    setLoading(true);
    Promise.allSettled([eventService.getEventById(eventId), bookingService.getMyPendingLocks(eventId)]).then(([evResult, locksResult]) => {
      if (evResult.status === 'fulfilled') {
        const evData = evResult.value.data?.event ?? evResult.value.data;
        setEvent(evData);
        setZones(evData?.zones || []);

        // Process pending locks if available
        if (locksResult.status === 'fulfilled') {
          const pendingLocks = locksResult.value.data?.data || [];
          const initialSelected = {};
          const sj = evData.seatmapJson;
          const rawLayout = Array.isArray(sj?.layout) ? sj.layout : Array.isArray(sj?.zones) ? sj.zones : [];
          pendingLocks.forEach(lock => {
            if (new Date(lock.expiresAt).getTime() > Date.now()) {
              let color = undefined;
              const matchedLayoutZone = rawLayout.find(lz => lz.name === lock.zoneName);
              if (matchedLayoutZone) color = matchedLayoutZone.color;
              initialSelected[lock.seatId] = {
                seatDbId: lock.seatId,
                bookingId: lock.bookingId,
                expiresAt: lock.expiresAt,
                label: lock.seatLabel,
                row: lock.row,
                col: lock.col,
                zoneKey: lock.zoneName,
                zoneId: lock.zoneId,
                price: lock.totalPrice,
                color: color
              };
            }
          });
          setSelected(initialSelected);
        }
      }
    }).catch(err => console.error('SeatSelection load error:', err)).finally(() => setLoading(false));
  }, [eventId, queueValidated]);
  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  }

  // ── Click chọn / bỏ chọn ghế → gọi API lockSeat / releaseSeat ────────────
  const handleSeatClick = useCallback(async (dbSeat, layoutZone, dbZone) => {
    const seatId = dbSeat.id;
    if (lockingSeats[seatId]) return;
    if (!queueToken || !queueSessionId || !queueValidated) {
      showToast('Đang kiểm tra lượt chọn ghế...');
      await silentlyAcquireQueueAccess();
      return;
    }

    // Bỏ chọn ghế (hủy giữ chỗ)
    if (selected[seatId]) {
      const bookingId = selected[seatId].bookingId;
      if (!bookingId) return; // Đang trong quá trình lock, từ chối hủy

      const backupSeat = selected[seatId];
      // Optimistic update: xóa ngay khỏi UI
      setSelected(prev => {
        const next = {
          ...prev
        };
        delete next[seatId];
        return next;
      });
      setLockingSeats(prev => ({
        ...prev,
        [seatId]: true
      }));
      try {
        await bookingService.releaseSeat(bookingId);
        refreshCart();
      } catch (err) {
        // Rollback nếu lỗi
        setSelected(prev => ({
          ...prev,
          [seatId]: backupSeat
        }));
        showToast('Không thể hủy giữ ghế. ' + (err.response?.data?.message || ''));
      } finally {
        setLockingSeats(prev => {
          const next = {
            ...prev
          };
          delete next[seatId];
          return next;
        });
      }
      return;
    }

    // Chọn ghế (khóa chỗ)
    if (Object.keys(selected).length >= 4) {
      showToast('Tối đa 4 ghế mỗi lần đặt');
      return;
    }

    // Optimistic update: thêm ngay vào UI với trạng thái đang xử lý (expiresAt = null)
    const optSeat = {
      seatDbId: seatId,
      bookingId: null,
      expiresAt: null,
      label: dbSeat.label,
      row: dbSeat.row,
      col: dbSeat.col,
      zoneKey: dbZone.name,
      zoneId: dbZone.id,
      price: Number(dbZone.price || 0),
      color: layoutZone.color
    };
    setSelected(prev => ({
      ...prev,
      [seatId]: optSeat
    }));
    setLockingSeats(prev => ({
      ...prev,
      [seatId]: true
    }));
    try {
      const res = await bookingService.lockSeat(seatId, getSocketId(), queueToken, queueSessionId);
      const data = res.data;

      // Cập nhật lại với dữ liệu thật từ DB
      setSelected(prev => {
        if (!prev[seatId]) return prev; // Đã bị xóa bởi logic khác?
        return {
          ...prev,
          [seatId]: {
            ...prev[seatId],
            bookingId: data.bookingId,
            expiresAt: data.expiresAt
          }
        };
      });
      refreshCart();
    } catch (err) {
      // Rollback nếu lỗi
      setSelected(prev => {
        const next = {
          ...prev
        };
        delete next[seatId];
        return next;
      });
      showToast(err.response?.data?.message || 'Không thể giữ ghế lúc này');
    } finally {
      setLockingSeats(prev => {
        const next = {
          ...prev
        };
        delete next[seatId];
        return next;
      });
    }
  }, [selected, lockingSeats, getSocketId, queueToken, queueSessionId, queueValidated, silentlyAcquireQueueAccess]);

  // Hủy tự động khi hết hạn (onExpire từ Countdown)
  const handleSeatExpire = useCallback(seatId => {
    setSelected(prev => {
      const next = {
        ...prev
      };
      delete next[seatId];
      return next;
    });

    // Proactively set status to AVAILABLE to prevent flashing grey before socket event arrives
    setZones(prev => prev.map(zone => ({
      ...zone,
      seats: zone.seats?.map(seat => seat.id === seatId ? {
        ...seat,
        status: 'AVAILABLE'
      } : seat)
    })));
    showToast('Một ghế bạn chọn đã hết thời gian giữ chỗ');
  }, []);

  // ── Tiến hành thanh toán ───────────────────────────────────────────────────
  async function handlePay() {
    const keys = Object.keys(selected);
    if (keys.length === 0) return;
    if (keys.some(k => !selected[k].bookingId)) {
      showToast('Đang xử lý khóa ghế, vui lòng đợi giây lát...');
      return;
    }
    setBooking(true);
    try {
      const bookings = keys.map(k => ({
        bookingId: selected[k].bookingId,
        seatId: selected[k].seatDbId,
        seatLabel: selected[k].label,
        zoneName: selected[k].zoneKey,
        totalPrice: selected[k].price,
        status: 'PENDING',
        expiresAt: selected[k].expiresAt
      }));
      await releaseQueueSlot();
      navigate('/checkout', {
        state: {
          bookings,
          eventId,
          eventTitle: event?.title,
          eventVenue: event?.venue,
          eventDate: event?.date
        }
      });
    } catch (err) {
      showToast('Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setBooking(false);
    }
  }

  // ── Layout zones (stable reference — không tạo mới mỗi render) ────────────
  const layoutZones = useMemo(() => {
    const sj = event?.seatmapJson;
    if (!sj) return [];
    // Prefer layout tree (floor frames + grouped children); fall back to flat zones
    const raw = Array.isArray(sj.layout) && sj.layout.length > 0 ? sj.layout : Array.isArray(sj.zones) ? sj.zones : [];
    return raw.map(z => {
      const withId = z.id ? z : (() => {
        const match = zones.find(d => d.name === z.name);
        return match ? {
          ...z,
          id: match.id
        } : z;
      })();
      return withId;
    });
  }, [event?.seatmapJson, zones]);
  const selKeys = Object.keys(selected);
  const subtotal = selKeys.reduce((acc, k) => acc + toNumberPrice(selected[k].price), 0);
  const fee = Math.round(subtotal * 0.05);
  const total = subtotal + fee;
  const firstSeat = selKeys.length > 0 ? selected[selKeys[0]] : null;
  const dateStr = event?.date ? new Date(event.date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) : '';
  const timeStr = event?.date ? new Date(event.date).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  }) : '';
  if (loading) return <LoadingSpinner />;
  return <div className="ss-fullscreen">
      {toastMsg && <div className="ss-toast">{toastMsg}</div>}

      <header className="ss-fullscreen__header">
        <button onClick={async () => {
        await releaseQueueSlot();
        navigate(`/events/${eventId}`, {
          replace: true
        });
      }} className="ss-fullscreen__back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="ss-fullscreen__title">
          {event?.title || 'Sự kiện'}
          <span className="ss-fullscreen__tag">Chọn ghế</span>
        </div>
        <div className={css({
        flex: 1
      }, "SeatSelectionPage")} />
        <button type="button" className="header__theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Chuyển sang theme sáng' : 'Chuyển sang theme tối'} title={theme === 'dark' ? 'Theme sáng' : 'Theme tối'}>
          {theme === 'dark' ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 4.75a1 1 0 0 1 1 1V7a1 1 0 1 1-2 0V5.75a1 1 0 0 1 1-1zM12 17a1 1 0 0 1 1 1v1.25a1 1 0 1 1-2 0V18a1 1 0 0 1 1-1zm7.25-5a1 1 0 0 1 1 1 1 1 0 0 1-1 1H18a1 1 0 1 1 0-2h1.25zM6 12a1 1 0 0 1-1 1H3.75a1 1 0 1 1 0-2H5a1 1 0 0 1 1 1zm10.35-5.6a1 1 0 0 1 1.42 0l.9.9a1 1 0 1 1-1.42 1.42l-.9-.9a1 1 0 0 1 0-1.42zm-9.9 9.9a1 1 0 0 1 1.42 0l.9.9a1 1 0 1 1-1.42 1.42l-.9-.9a1 1 0 0 1 0-1.42zm11.32 1.32a1 1 0 0 1 1.42-1.42l.9.9a1 1 0 0 1-1.42 1.42l-.9-.9zM6.54 6.54a1 1 0 0 1 1.42 0l.9.9a1 1 0 1 1-1.42 1.42l-.9-.9a1 1 0 0 1 0-1.42zM12 8.25A3.75 3.75 0 1 1 8.25 12 3.75 3.75 0 0 1 12 8.25z" />
            </svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3a.75.75 0 0 0-.86.97A6.5 6.5 0 0 0 17 15.36a.75.75 0 0 0 .97-.86A8.46 8.46 0 0 1 21 14.5z" />
            </svg>}
        </button>
        {dateStr && <div className="ss-fullscreen__date">
            {dateStr}{timeStr && ` · ${timeStr}`}
          </div>}
      </header>

      <div className="ss-fullscreen__body">

        <div className="ss-fullscreen__canvas-wrap">
          <CustomerSeatmapCanvas layoutZones={layoutZones} dbZones={zones} selectedSeats={selected} othersSelectingSeats={othersSelecting} onSeatClick={handleSeatClick} />

          {/* Legend */}
          <div className="ss-fullscreen__legend">
            <div className="ss-fullscreen__legend-title">Chú thích</div>
            <div className="ss-fullscreen__legend-items">
              {[{
              color: '#4CAF50',
              label: 'Ghế có thể chọn'
            }, {
              color: '#888888',
              label: 'Ghế đang bị khóa/giữ'
            }, {
              color: '#FFA500',
              label: 'Ghế bạn đang chọn'
            }, {
              color: '#F44336',
              label: 'Ghế đã được bán'
            }].map(item => <div key={item.label} className="ss-fullscreen__legend-item">
                  <div className={css({
                width: 12,
                height: 12,
                borderRadius: 3,
                background: item.color,
                flexShrink: 0
              }, "SeatSelectionPage")} />
                  {item.label}
                </div>)}
            </div>
          </div>
        </div>

        {/* Order panel */}
        <div className="ss-fullscreen__panel">
          <div className="ss-fullscreen__panel-top">
            <div className="ss-fullscreen__panel-heading">Ghế đang chọn</div>
          </div>

          <div className="ss-fullscreen__seat-list">
            {selKeys.length === 0 ? <div className={cx("ss-seat-list__empty", css({
            marginTop: 40
          }, "SeatSelectionPage"))}>Chưa chọn ghế nào</div> : selKeys.map(key => {
            const s = selected[key];
            return <div key={key} className="ss-fullscreen__seat-item">
                    <div className={css({
                width: 10,
                height: 10,
                borderRadius: 3,
                background: s.color,
                flexShrink: 0
              }, "SeatSelectionPage")} />
                    <div className={css({
                flex: 1
              }, "SeatSelectionPage")}>
                      <div className="ss-fullscreen__seat-zone">{s.zoneKey}</div>
                      <div className="ss-fullscreen__seat-label">{s.label || `Hàng ${s.row} · Ghế ${s.col}`}</div>
                    </div>
                    <div className={css({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '2px',
                marginRight: '10px'
              }, "SeatSelectionPage")}>
                      <div className={cx("ss-fullscreen__seat-price", css({
                  margin: 0
                }, "SeatSelectionPage"))}>{fmt(s.price)}</div>
                      <div className={css({
                  fontSize: '11px',
                  color: '#ff6b35',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }, "SeatSelectionPage")}>
                        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
                        </svg>
                        {s.expiresAt ? <Countdown expiresAt={s.expiresAt} onExpire={() => handleSeatExpire(key)} /> : <span>Đang khóa...</span>}
                      </div>
                    </div>
                    <button onClick={() => handleSeatClick({
                id: key
              }, null, null)} className="ss-seat-item__remove">×</button>
                  </div>;
          })}
          </div>

          <div className="ss-fullscreen__panel-footer">
            <div className="ss-fullscreen__price-row">
              <span className="ss-price-row__label">Đơn giá</span>
              <span className="ss-price-row__val">{firstSeat ? fmt(firstSeat.price) : '—'}</span>
            </div>
            <div className="ss-fullscreen__price-row">
              <span className="ss-price-row__label">Phí dịch vụ (5%)</span>
              <span className="ss-price-row__val">{selKeys.length > 0 ? fmt(fee) : '—'}</span>
            </div>
            <div className="ss-price-divider" />
            <div className={cx("ss-total-row", css({
            marginBottom: 20
          }, "SeatSelectionPage"))}>
              <span className="ss-total-row__label">Tổng cộng</span>
              <span className="ss-total-row__val">{selKeys.length > 0 ? fmt(total) : '0đ'}</span>
            </div>

            <button onClick={handlePay} disabled={selKeys.length === 0 || booking} className={`ss-pay-btn${selKeys.length === 0 ? ' ss-pay-btn--disabled' : ''}`}>
              {booking ? 'Đang xử lý...' : 'Tiến hành thanh toán'}
              {!booking && selKeys.length > 0 && <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>}
            </button>
          </div>
        </div>

      </div>
    </div>;
}
