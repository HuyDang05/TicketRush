import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export function useSocket(eventId) {
  const socketRef    = useRef(null);
  // Map of eventName -> Set<callback> — populated before socket exists
  const listenersRef = useRef({});

  useEffect(() => {
    if (!eventId) return undefined;

    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    // Re-attach any listeners that were registered before socket was ready
    Object.entries(listenersRef.current).forEach(([event, cbs]) => {
      cbs.forEach(cb => socket.on(event, cb));
    });

    const joinRoom = () => {
      if (eventId) socket.emit('join_event', eventId);
    };

    socket.on('connect', joinRoom);
    if (socket.connected) joinRoom();

    return () => {
      if (eventId) socket.emit('leave_event', eventId);
      // Detach all managed listeners before disconnect
      Object.entries(listenersRef.current).forEach(([event, cbs]) => {
        cbs.forEach(cb => socket.off(event, cb));
      });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [eventId]);

  const on = useCallback((eventName, callback) => {
    // Register in the persistent map so it survives socket reconnects
    if (!listenersRef.current[eventName]) {
      listenersRef.current[eventName] = new Set();
    }
    listenersRef.current[eventName].add(callback);

    // If socket already exists, attach immediately
    if (socketRef.current) {
      socketRef.current.on(eventName, callback);
    }

    return () => {
      listenersRef.current[eventName]?.delete(callback);
      socketRef.current?.off(eventName, callback);
    };
  }, []);

  const emit = useCallback((eventName, data) => {
    socketRef.current?.emit(eventName, data);
  }, []);

  const getSocketId = useCallback(() => socketRef.current?.id ?? null, []);

  return { on, emit, getSocketId };
}
