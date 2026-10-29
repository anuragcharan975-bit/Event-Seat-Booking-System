import React from 'react';
import { Clock, Lock, Heart } from 'lucide-react';

const SeatLegend = ({ isCoupleMode = false }) => {
  const legendItems = [
    {
      label: 'Available',
      icon: null,
      colorClass: isCoupleMode
        ? 'bg-white border-2 border-pink-200 text-slate-700'
        : 'bg-white border-2 border-slate-300 text-slate-700'
    },
    {
      label: isCoupleMode ? 'Couple Seat' : 'Selected',
      icon: isCoupleMode ? <Heart className="w-2.5 h-2.5 fill-white text-white" /> : null,
      colorClass: isCoupleMode
        ? 'bg-gradient-to-r from-rose-500 to-pink-500 border-2 border-rose-400 text-white font-black shadow-xs'
        : 'bg-sky-600 border-2 border-sky-600 text-white font-black'
    },
    {
      label: 'Held by You',
      icon: <Clock className="w-3 h-3 text-white" />,
      colorClass: isCoupleMode
        ? 'bg-rose-600 border-2 border-rose-600 text-white animate-pulse'
        : 'bg-emerald-600 border-2 border-emerald-600 text-white animate-pulse'
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
    <div
      className={`flex flex-wrap items-center justify-center gap-3 sm:gap-4 py-3 px-4 sm:px-6 rounded-2xl transition-all duration-300 ${
        isCoupleMode
          ? 'bg-rose-50/90 border border-rose-200 shadow-xs'
          : 'bg-slate-50 border border-slate-200'
      }`}
    >
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 sm:gap-2">
          <div
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${item.colorClass}`}
          >
            {item.icon ? item.icon : item.label === 'Booked' ? '✕' : ''}
          </div>
          <span
            className={`text-[11px] sm:text-xs font-semibold ${
              isCoupleMode ? 'text-rose-900' : 'text-slate-600'
            }`}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SeatLegend;
