import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export function useSocket(eventId) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (eventId) socket.emit('join_event', eventId);
    });

    return () => {
      if (eventId) socket.emit('leave_event', eventId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [eventId]);

  // Stable reference — registers listener, returns cleanup fn so callers
  // can deregister inside their own useEffect cleanup.
  const on = useCallback((eventName, callback) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(eventName, callback);
    return () => socket.off(eventName, callback);
  }, []);

  return { on };
}
