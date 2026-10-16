import React from 'react';
import { Check, Clock, Lock } from 'lucide-react';

const SeatGrid = ({
  seats = [],
  selectedSeatIds = [],
  onToggleSeat,
  myHeldSeatIds = [],
  disabled = false
}) => {
  // Group seats by row
  const rowsMap = seats.reduce((acc, seat) => {
    const rowKey = seat.row || (seat.seatNumber ? seat.seatNumber[0] : 'General');
    if (!acc[rowKey]) {
      acc[rowKey] = [];
    }
    acc[rowKey].push(seat);
    return acc;
  }, {});

  const sortedRowKeys = Object.keys(rowsMap).sort();

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Curved Screen / Stage Visual Banner */}
      <div className="w-full max-w-xl mb-10 text-center">
        <div className="relative py-2">
          {/* Ambient stage glow */}
          <div className="absolute inset-x-12 top-0 h-6 bg-gradient-to-b from-sky-400/20 to-transparent blur-md pointer-events-none" />
          <div className="h-2 w-full bg-gradient-to-r from-sky-200 via-sky-600 to-sky-200 rounded-full shadow-sm" />
        </div>
        <span className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase inline-block mt-1">
          Stage / Screen (Front)
        </span>
      </div>

      {/* Grid of Rows */}
      <div className="space-y-3.5 w-full max-w-2xl overflow-x-auto pb-4 pt-1 px-2">
        {sortedRowKeys.map((rowKey) => (
          <div key={rowKey} className="flex items-center justify-center gap-2 sm:gap-3.5 min-w-[340px]">
            {/* Row Label Left */}
            <span className="w-6 text-center text-xs font-black text-slate-400 shrink-0">
              {rowKey}
            </span>

            {/* Seat Buttons */}
            <div className="flex gap-1.5 sm:gap-2.5">
              {rowsMap[rowKey].map((seat) => {
                const isSelected = selectedSeatIds.includes(seat._id);
                const isMyHold = myHeldSeatIds.includes(seat._id);
                const isBooked = seat.status === 'BOOKED';
                const isHeldByOther = seat.status === 'HELD' && !isMyHold;
                const isAvailable = seat.status === 'AVAILABLE';

                // Determine styling and disabled state
                let seatStyle =
                  'bg-white border-2 border-slate-300 text-slate-700 hover:border-sky-500 hover:bg-sky-50/70 hover:shadow-sm focus:ring-2 focus:ring-sky-500 focus:outline-none';
                let isDisabled = disabled || !isAvailable;
                let ariaStatusText = 'Available';

                if (isBooked) {
                  seatStyle =
                    'bg-slate-200 border-2 border-slate-200 text-slate-400 cursor-not-allowed line-through';
                  isDisabled = true;
                  ariaStatusText = 'Booked';
                } else if (isHeldByOther) {
                  seatStyle =
                    'bg-amber-100 border-2 border-amber-300 text-amber-800 cursor-not-allowed';
                  isDisabled = true;
                  ariaStatusText = 'Held by another customer';
                } else if (isMyHold) {
                  seatStyle =
                    'bg-emerald-600 border-2 border-emerald-600 text-white shadow-md animate-pulse cursor-default';
                  isDisabled = true;
                  ariaStatusText = 'Held by you for 120 seconds';
                } else if (isSelected) {
                  seatStyle =
                    'bg-sky-600 border-2 border-sky-600 text-white shadow-md shadow-sky-600/30 scale-105 font-black ring-2 ring-sky-300';
                  isDisabled = disabled;
                  ariaStatusText = 'Selected by you';
                }

                return (
                  <button
                    key={seat._id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => onToggleSeat(seat)}
                    aria-label={`Seat ${seat.seatNumber}, Row ${seat.row}, ${ariaStatusText}`}
                    title={`Seat ${seat.seatNumber} (${ariaStatusText})`}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-150 flex items-center justify-center relative ${seatStyle}`}
                  >
                    {isMyHold ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : isHeldByOther ? (
                      <Lock className="w-3 h-3 text-amber-700" />
                    ) : isSelected ? (
                      <span className="flex items-center gap-0.5">
                        {seat.seatNumber}
                      </span>
                    ) : (
                      seat.seatNumber
                    )}
                  </button>
                );
              })}
            </div>

            {/* Row Label Right */}
            <span className="w-6 text-center text-xs font-black text-slate-400 shrink-0">
              {rowKey}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeatGrid;
