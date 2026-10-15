import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown';

const CountdownTimer = ({ expiresAt, serverTime, onExpire }) => {
  const { secondsLeft, formattedTime, isExpired } = useCountdown(expiresAt, serverTime, onExpire);

  // Progress percentage (out of 120 seconds)
  const percent = Math.min(100, Math.max(0, (secondsLeft / 120) * 100));

  const isLowTime = secondsLeft <= 30;
  const isCritical = secondsLeft <= 10;

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-300 ${
        isCritical
          ? 'bg-rose-50 border-rose-300 text-rose-800'
          : isLowTime
          ? 'bg-amber-50 border-amber-300 text-amber-800'
          : 'bg-sky-50 border-sky-200 text-sky-900'
      }`}
    >
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-2">
          {isCritical ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" />
          ) : (
            <Clock className={`w-5 h-5 ${isLowTime ? 'text-amber-600' : 'text-sky-600'}`} />
          )}
          <span className="text-sm font-semibold">
            {isExpired ? 'Hold Expired' : 'Seats Held For You'}
          </span>
        </div>

        <div className="font-mono text-xl font-extrabold tracking-wider">
          {formattedTime}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            isCritical ? 'bg-rose-600' : isLowTime ? 'bg-amber-500' : 'bg-sky-600'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-xs mt-2 opacity-80">
        {isExpired
          ? 'Your hold has timed out. Seats are released back to general availability.'
          : 'Complete your booking before the timer expires to secure your selected seats.'}
      </p>
    </div>
  );
};

export default CountdownTimer;
