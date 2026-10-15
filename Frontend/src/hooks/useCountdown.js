import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to manage the hold countdown timer.
 * Calculates remaining seconds dynamically against the authoritative server `expiresAt`.
 *
 * @param {string|Date} expiresAt - Server-generated expiration timestamp
 * @param {string|Date} [serverTime] - Server timestamp when hold was issued (to adjust for clock drift)
 * @param {Function} [onExpire] - Optional callback fired when countdown reaches 0
 */
export const useCountdown = (expiresAt, serverTime = null, onExpire = null) => {
  // Compute initial clock skew between client and server
  const skewRef = useRef(
    serverTime ? new Date(serverTime).getTime() - Date.now() : 0
  );

  const calculateSecondsLeft = () => {
    if (!expiresAt) return 0;
    const targetMs = new Date(expiresAt).getTime();
    // Adjusted current time using server skew
    const currentAdjustedMs = Date.now() + skewRef.current;
    const diffSeconds = Math.max(0, Math.floor((targetMs - currentAdjustedMs) / 1000));
    return diffSeconds;
  };

  const [secondsLeft, setSecondsLeft] = useState(calculateSecondsLeft);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(0);
      return;
    }

    // Recompute skew if serverTime updates
    if (serverTime) {
      skewRef.current = new Date(serverTime).getTime() - Date.now();
    }

    const initialDiff = calculateSecondsLeft();
    setSecondsLeft(initialDiff);

    if (initialDiff <= 0) {
      if (onExpireRef.current) {
        onExpireRef.current();
      }
      return;
    }

    const intervalId = setInterval(() => {
      const remaining = calculateSecondsLeft();
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(intervalId);
        if (onExpireRef.current) {
          onExpireRef.current();
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [expiresAt, serverTime]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    secondsLeft,
    formattedTime,
    isExpired: secondsLeft <= 0
  };
};
