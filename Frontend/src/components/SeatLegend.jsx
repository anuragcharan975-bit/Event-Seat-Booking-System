import React from 'react';

const SeatLegend = () => {
  const legendItems = [
    { label: 'Available', colorClass: 'bg-white border-2 border-slate-300 text-slate-700' },
    { label: 'Selected', colorClass: 'bg-sky-600 border-2 border-sky-600 text-white shadow-sm' },
    { label: 'Held by You', colorClass: 'bg-emerald-500 border-2 border-emerald-500 text-white animate-pulse' },
    { label: 'Held (Other)', colorClass: 'bg-amber-100 border-2 border-amber-300 text-amber-700' },
    { label: 'Booked', colorClass: 'bg-slate-200 border-2 border-slate-200 text-slate-400' }
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-4 px-6 bg-slate-50 border border-slate-200 rounded-xl">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${item.colorClass}`}>
            •
          </div>
          <span className="text-xs font-medium text-slate-700">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default SeatLegend;
