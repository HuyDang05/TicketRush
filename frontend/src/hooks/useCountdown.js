import { useState, useEffect } from 'react';

export function useCountdown(expiresAt) {
  const [seconds, setSeconds] = useState(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!expiresAt) { setSeconds(0); return; }

    const tick = () => Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

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
