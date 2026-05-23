// Purpose: React hook dong goi state/effect dung lai trong UI.
import { useState, useEffect } from 'react';

export function useCountdown(expiresAt) {
  const [seconds, setSeconds] = useState(() => {
    if (!expiresAt) return 0;
    const expiresTime = new Date(expiresAt).getTime();
    return Math.max(0, Math.floor((expiresTime - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!expiresAt) { setSeconds(0); return; }

    const expiresTime = new Date(expiresAt).getTime();
    const tick = () => Math.max(0, Math.floor((expiresTime - Date.now()) / 1000));

    setSeconds(tick());

    const interval = setInterval(() => {
      const rem = tick();
      setSeconds(rem);
      if (rem <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return {
    minutes,
    seconds: secs,
    totalSeconds: seconds,
    isExpired: seconds <= 0,
  };
}
