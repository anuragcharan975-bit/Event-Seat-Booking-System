import React from 'react';
import { Clock, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown';

const CountdownTimer = ({ expiresAt, serverTime, onExpire }) => {
  const { secondsLeft, formattedTime, isExpired } = useCountdown(expiresAt, serverTime, onExpire);

  // Progress percentage (out of 120 seconds)
  const percent = Math.min(100, Math.max(0, (secondsLeft / 120) * 100));

  const isLowTime = secondsLeft <= 30 && secondsLeft > 10;
  const isCritical = secondsLeft <= 10 && secondsLeft > 0;

  return (
    <div
      className={`p-5 rounded-2xl border transition-all duration-300 shadow-sm ${
        isExpired
          ? 'bg-rose-50 border-rose-300 text-rose-900'
          : isCritical
          ? 'bg-rose-50/80 border-rose-300 text-rose-900 ring-2 ring-rose-400/30'
          : isLowTime
          ? 'bg-amber-50/80 border-amber-300 text-amber-900 ring-2 ring-amber-400/30'
          : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
      }`}
    >
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl ${
              isCritical || isExpired
                ? 'bg-rose-100 text-rose-600'
                : isLowTime
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {isCritical ? (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            ) : isExpired ? (
              <ShieldAlert className="w-5 h-5 text-rose-600" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block opacity-70">
              Hold Window Active
            </span>
            <span className="text-sm font-bold">
              {isExpired
                ? 'Hold Expired'
                : isCritical
                ? 'Expiring Very Soon!'
                : isLowTime
                ? 'Hurry, Time Running Out'
                : 'Seats Reserved for You'}
            </span>
          </div>
        </div>

        <div
          className={`font-mono text-2xl font-black tracking-wider px-3 py-1 rounded-xl bg-white/80 border ${
            isCritical
              ? 'border-rose-300 text-rose-600'
              : isLowTime
              ? 'border-amber-300 text-amber-700'
              : 'border-emerald-200 text-emerald-800'
          }`}
        >
          {formattedTime}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-black/5 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isCritical
              ? 'bg-rose-600'
              : isLowTime
              ? 'bg-amber-500'
              : 'bg-emerald-600'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-xs mt-3 opacity-80 leading-relaxed">
        {isExpired
          ? 'Your hold has timed out. Seats have been automatically returned to general availability.'
          : 'Complete your reservation before the 120-second timer reaches zero to guarantee your seats.'}
      </p>
    </div>
  );
};

export default CountdownTimer;
