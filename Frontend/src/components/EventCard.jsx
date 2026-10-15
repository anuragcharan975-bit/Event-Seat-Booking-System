import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Ticket, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

const EventCard = ({ event }) => {
  const isSoldOut = event.availableSeats === 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group">
      <div className="p-6">
        {/* Availability Badge */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isSoldOut
                ? 'bg-rose-100 text-rose-700'
                : event.availableSeats <= 5
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSoldOut
                  ? 'bg-rose-500'
                  : event.availableSeats <= 5
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            />
            {isSoldOut ? 'Sold Out' : `${event.availableSeats} of ${event.totalSeats} seats available`}
          </span>

          <span className="text-lg font-bold text-slate-900">
            {formatCurrency(event.pricePerSeat)}
            <span className="text-xs font-normal text-slate-500 ml-1">/seat</span>
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-slate-900 group-hover:text-sky-600 transition-colors mb-2">
          {event.title}
        </h3>

        {/* Description */}
        <p className="text-slate-600 text-sm line-clamp-2 mb-6">
          {event.description}
        </p>

        {/* Details list */}
        <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{formatDate(event.startTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
        <Link
          to={`/events/${event._id}`}
          className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            isSoldOut
              ? 'bg-slate-200 text-slate-500 pointer-events-none'
              : 'bg-sky-600 text-white hover:bg-sky-500 shadow-sm shadow-sky-600/20'
          }`}
        >
          <span>{isSoldOut ? 'Event Sold Out' : 'Select Seats'}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default EventCard;
