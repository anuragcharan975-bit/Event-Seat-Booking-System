import React from 'react';

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
    <div className="w-full flex flex-col items-center">
      {/* Stage visual banner */}
      <div className="w-full max-w-xl mb-10 text-center">
        <div className="h-2 w-full bg-gradient-to-r from-sky-200 via-sky-500 to-sky-200 rounded-full mb-2 shadow-sm" />
        <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Stage / Screen
        </span>
      </div>

      {/* Grid of Rows */}
      <div className="space-y-4 w-full max-w-2xl overflow-x-auto pb-4">
        {sortedRowKeys.map((rowKey) => (
          <div key={rowKey} className="flex items-center justify-center gap-2 sm:gap-3">
            {/* Row Label Left */}
            <span className="w-6 text-center text-xs font-bold text-slate-400">
              {rowKey}
            </span>

            {/* Seat Buttons */}
            <div className="flex gap-2 sm:gap-3">
              {rowsMap[rowKey].map((seat) => {
                const isSelected = selectedSeatIds.includes(seat._id);
                const isMyHold = myHeldSeatIds.includes(seat._id);
                const isBooked = seat.status === 'BOOKED';
                const isHeldByOther = seat.status === 'HELD' && !isMyHold;
                const isAvailable = seat.status === 'AVAILABLE';

                // Determine styling and disabled state
                let seatStyle = 'bg-white border-2 border-slate-300 text-slate-700 hover:border-sky-500 hover:bg-sky-50';
                let isDisabled = disabled || !isAvailable;

                if (isBooked) {
                  seatStyle = 'bg-slate-200 border-2 border-slate-200 text-slate-400 cursor-not-allowed';
                  isDisabled = true;
                } else if (isHeldByOther) {
                  seatStyle = 'bg-amber-100 border-2 border-amber-300 text-amber-700 cursor-not-allowed';
                  isDisabled = true;
                } else if (isMyHold) {
                  seatStyle = 'bg-emerald-500 border-2 border-emerald-500 text-white shadow-md animate-pulse cursor-default';
                  isDisabled = true;
                } else if (isSelected) {
                  seatStyle = 'bg-sky-600 border-2 border-sky-600 text-white shadow-md shadow-sky-600/30 scale-105';
                  isDisabled = disabled;
                }

                return (
                  <button
                    key={seat._id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => onToggleSeat(seat)}
                    title={`Seat ${seat.seatNumber} (${isMyHold ? 'Held by you' : seat.status})`}
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center ${seatStyle}`}
                  >
                    {seat.seatNumber}
                  </button>
                );
              })}
            </div>

            {/* Row Label Right */}
            <span className="w-6 text-center text-xs font-bold text-slate-400">
              {rowKey}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeatGrid;
