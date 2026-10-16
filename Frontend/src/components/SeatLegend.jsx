import React from 'react';
import { Clock, Lock } from 'lucide-react';

const SeatLegend = () => {
  const legendItems = [
    {
      label: 'Available',
      icon: null,
      colorClass: 'bg-white border-2 border-slate-300 text-slate-700'
    },
    {
      label: 'Selected',
      icon: null,
      colorClass: 'bg-sky-600 border-2 border-sky-600 text-white font-black'
    },
    {
      label: 'Held by You',
      icon: <Clock className="w-3 h-3 text-white" />,
      colorClass: 'bg-emerald-600 border-2 border-emerald-600 text-white animate-pulse'
    },
    {
      label: 'Held (Others)',
      icon: <Lock className="w-2.5 h-2.5 text-amber-800" />,
      colorClass: 'bg-amber-100 border-2 border-amber-300 text-amber-800'
    },
    {
      label: 'Booked',
      icon: null,
      colorClass: 'bg-slate-200 border-2 border-slate-200 text-slate-400 line-through'
    }
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 py-3 px-4 sm:px-6 bg-slate-50 border border-slate-200 rounded-2xl">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 sm:gap-2">
          <div
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${item.colorClass}`}
          >
            {item.icon ? item.icon : item.label === 'Booked' ? '✕' : ''}
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-600">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SeatLegend;
