import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Ticket, ArrowRight, Tag } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { slugify } from '../utils/slugify';

const getCategoryStyles = (category = '') => {
  const cat = category.toLowerCase().trim();
  if (cat.includes('music') || cat.includes('concert') || cat.includes('rock') || cat.includes('jazz')) {
    return {
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      headerGradient: 'from-amber-500 to-rose-500',
      dot: 'bg-amber-500'
    };
  }
  if (cat.includes('dance') || cat.includes('ballet')) {
    return {
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      headerGradient: 'from-rose-500 to-pink-500',
      dot: 'bg-rose-500'
    };
  }
  if (cat.includes('comedy') || cat.includes('stand-up')) {
    return {
      badge: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      headerGradient: 'from-yellow-400 to-amber-500',
      dot: 'bg-yellow-500'
    };
  }
  if (cat.includes('theat') || cat.includes('drama')) {
    return {
      badge: 'bg-purple-50 text-purple-800 border-purple-200',
      headerGradient: 'from-purple-500 to-indigo-600',
      dot: 'bg-purple-500'
    };
  }
  if (cat.includes('sport') || cat.includes('match') || cat.includes('game')) {
    return {
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      headerGradient: 'from-emerald-500 to-teal-600',
      dot: 'bg-emerald-500'
    };
  }
  if (cat.includes('workshop') || cat.includes('tech') || cat.includes('masterclass')) {
    return {
      badge: 'bg-sky-50 text-sky-800 border-sky-200',
      headerGradient: 'from-sky-500 to-blue-600',
      dot: 'bg-sky-500'
    };
  }
  return {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    headerGradient: 'from-slate-600 to-slate-800',
    dot: 'bg-slate-500'
  };
};

const CATEGORY_IMAGES = {
  music: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80',
  dance: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=800&q=80',
  comedy: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=800&q=80',
  theatre: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=800&q=80',
  theater: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=800&q=80',
  sports: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
  sport: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
  workshops: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
  workshop: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
  other: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80'
};

const getEventImage = (event) => {
  if (event.imageUrl && typeof event.imageUrl === 'string' && event.imageUrl.trim()) {
    return event.imageUrl.trim();
  }
  const cat = (event.category || '').toLowerCase().trim();
  for (const [key, url] of Object.entries(CATEGORY_IMAGES)) {
    if (cat.includes(key)) return url;
  }
  return CATEGORY_IMAGES.other;
};

const EventCard = ({ event }) => {
  const isSoldOut = event.availableSeats === 0;
  const isLowAvailability = event.availableSeats > 0 && event.availableSeats <= 5;
  const categoryStyles = getCategoryStyles(event.category || 'General');

  const categorySlug = event.categorySlug || slugify(event.category || 'other') || 'other';
  const eventSlug = event.slug || slugify(event.title) || event._id;
  const eventUrl = `/events/${categorySlug}/${eventSlug}`;
  const categoryUrl = `/events/${categorySlug}`;

  const [imgSrc, setImgSrc] = React.useState(() => getEventImage(event));

  // Sync image source if event changes
  React.useEffect(() => {
    setImgSrc(getEventImage(event));
  }, [event.imageUrl, event.category]);

  const totalSeats = event.totalSeats || 40;
  const availablePercentage = Math.round((event.availableSeats / totalSeats) * 100);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between group">
      {/* Event Image Banner with Object-Cover & Smooth Hover Scale */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-900">
        <Link to={eventUrl} className="block w-full h-full">
          <img
            src={imgSrc}
            alt={`${event.title} - ${event.category || 'Event'} live reservation`}
            onError={() => {
              const cat = (event.category || '').toLowerCase().trim();
              const fallback =
                CATEGORY_IMAGES[cat] ||
                (cat.includes('dance') ? CATEGORY_IMAGES.dance : null) ||
                (cat.includes('music') ? CATEGORY_IMAGES.music : null) ||
                (cat.includes('comedy') ? CATEGORY_IMAGES.comedy : null) ||
                (cat.includes('theat') ? CATEGORY_IMAGES.theatre : null) ||
                (cat.includes('sport') ? CATEGORY_IMAGES.sports : null) ||
                (cat.includes('work') ? CATEGORY_IMAGES.workshops : null) ||
                CATEGORY_IMAGES.other;
              if (imgSrc !== fallback) {
                setImgSrc(fallback);
              }
            }}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        {/* Ambient Dark Gradient for badge contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/25 pointer-events-none" />

        {/* Top Badges: Category & Seat Availability overlaid on image */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 pointer-events-none">
          <Link
            to={categoryUrl}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold backdrop-blur-md shadow-md border hover:scale-105 transition-all pointer-events-auto ${categoryStyles.badge}`}
            title={`Browse all ${event.category || 'this category'} events`}
          >
            <Tag className="w-3 h-3" />
            <span>{event.category || 'General'}</span>
          </Link>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-md ${
              isSoldOut
                ? 'bg-rose-950/80 text-rose-200 border border-rose-500/30'
                : isLowAvailability
                ? 'bg-amber-950/80 text-amber-200 border border-amber-500/30'
                : 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSoldOut
                  ? 'bg-rose-400'
                  : isLowAvailability
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-emerald-400'
              }`}
            />
            {isSoldOut ? 'Sold Out' : `${event.availableSeats} seats left`}
          </span>
        </div>

        {/* Category Accent Line at Bottom Edge of Image */}
        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${categoryStyles.headerGradient}`} />
      </div>

      <div className="p-6">

        {/* Title */}
        <h3 className="text-xl font-bold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1 mb-2">
          <Link to={eventUrl} className="hover:text-sky-600 transition">
            {event.title}
          </Link>
        </h3>

        {/* Description */}
        <p className="text-slate-600 text-sm line-clamp-2 mb-5 leading-relaxed">
          {event.description}
        </p>

        {/* Seat Availability Bar */}
        <div className="mb-5">
          <div className="flex justify-between items-center text-[11px] font-medium text-slate-500 mb-1">
            <span>Seat Capacity</span>
            <span>
              {event.availableSeats} / {totalSeats} ({availablePercentage}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isSoldOut
                  ? 'bg-rose-500'
                  : isLowAvailability
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(4, availablePercentage)}%` }}
            />
          </div>
        </div>

        {/* Date and Venue Information */}
        <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="font-medium text-slate-700">{formatDate(event.startTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="truncate text-slate-600">{event.venue}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Price per seat
          </span>
          <span className="text-lg font-black text-slate-900">
            {formatCurrency(event.pricePerSeat)}
          </span>
        </div>

        <Link
          to={eventUrl}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all duration-200 ${
            isSoldOut
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed pointer-events-none'
              : 'bg-sky-600 text-white hover:bg-sky-500 shadow-md shadow-sky-600/20 active:scale-95'
          }`}
        >
          <span>{isSoldOut ? 'Sold Out' : 'Select Seats'}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default EventCard;
