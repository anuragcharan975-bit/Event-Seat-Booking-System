import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Ticket, ArrowRight, Tag, Check, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, getEventTimingDisplay } from '../utils/formatDate';
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
  if (cat.includes('game') || cat.includes('gaming') || cat.includes('esport') || cat.includes('pubg') || cat.includes('coc')) {
    return {
      badge: 'bg-violet-50 text-violet-800 border-violet-200',
      headerGradient: 'from-violet-600 to-fuchsia-600',
      dot: 'bg-violet-500'
    };
  }
  if (cat.includes('sport') || cat.includes('match')) {
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
  if (cat.includes('spa') || cat.includes('wellness') || cat.includes('retreat')) {
    return {
      badge: 'bg-teal-50 text-teal-800 border-teal-200',
      headerGradient: 'from-teal-500 to-emerald-500',
      dot: 'bg-teal-500'
    };
  }
  return {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    headerGradient: 'from-slate-600 to-slate-800',
    dot: 'bg-slate-500'
  };
};

const CATEGORY_IMAGES = {
  game: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
  gaming: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
  music: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80',
  dance: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=800&q=80',
  comedy: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=800&q=80',
  theatre: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=800&q=80',
  theater: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=800&q=80',
  sports: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
  sport: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
  workshops: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
  workshop: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
  spa: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
  wellness: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
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
  const timing = getEventTimingDisplay(event);
  const isTimePassed = timing.isOverTime;
  const rawStatus = event.eventStatus || event.status || 'Pending';
  const eventStatus = isTimePassed || rawStatus === 'Completed' ? 'Completed' : rawStatus;
  const isCompleted = eventStatus === 'Completed';
  const STATUS_STEPS = ['Pending', 'In Progress', 'Completed'];
  const stepIdx = STATUS_STEPS.indexOf(eventStatus);
  const safeStepIndex = stepIdx === -1 ? 0 : stepIdx;

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
        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              isCompleted
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : eventStatus === 'In Progress'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isCompleted
                  ? 'bg-emerald-500'
                  : eventStatus === 'In Progress'
                  ? 'bg-blue-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <span>{eventStatus}</span>
          </span>
        </div>

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
        <div className="mb-4">
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

        {/* Down a line: Event Lifecycle Task Stepper (Pending -> In Progress -> Completed) */}
        <div className="mb-4 pt-3 pb-2.5 px-3 bg-slate-50/90 rounded-2xl border border-slate-100">
          <div className="relative flex items-center justify-between px-1">
            {/* Background Track Line */}
            <div className="absolute top-[12px] left-6 right-6 h-1 bg-slate-200 z-0 rounded-full" />

            {/* Filled Progress Line */}
            <div
              className={`absolute top-[12px] left-6 h-1 z-0 rounded-full transition-all duration-500 ${
                safeStepIndex === 2
                  ? 'bg-emerald-500'
                  : safeStepIndex === 1
                  ? 'bg-blue-500'
                  : 'bg-amber-400'
              }`}
              style={{
                width:
                  safeStepIndex === 0
                    ? '0%'
                    : safeStepIndex === 1
                    ? 'calc(50% - 12px)'
                    : 'calc(100% - 48px)'
              }}
            />

            {/* Step 1: Pending */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                  safeStepIndex > 0
                    ? 'bg-emerald-500 text-white'
                    : 'bg-amber-500 text-white ring-4 ring-amber-100 shadow-xs scale-105'
                }`}
              >
                {safeStepIndex > 0 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </div>
              <span
                className={`text-[10px] mt-1 font-bold ${
                  safeStepIndex === 0 ? 'text-amber-800 font-extrabold' : 'text-slate-600'
                }`}
              >
                Pending
              </span>
            </div>

            {/* Step 2: In Progress */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                  safeStepIndex > 1
                    ? 'bg-emerald-500 text-white'
                    : safeStepIndex === 1
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-xs scale-105 animate-pulse'
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {safeStepIndex > 1 ? <Check className="w-3.5 h-3.5" /> : '2'}
              </div>
              <span
                className={`text-[10px] mt-1 font-bold ${
                  safeStepIndex === 1
                    ? 'text-blue-800 font-extrabold'
                    : safeStepIndex > 1
                    ? 'text-slate-600'
                    : 'text-slate-400'
                }`}
              >
                In Progress
              </span>
            </div>

            {/* Step 3: Completed */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                  safeStepIndex === 2
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs scale-105'
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {safeStepIndex === 2 ? <Check className="w-3.5 h-3.5" /> : '3'}
              </div>
              <span
                className={`text-[10px] mt-1 font-bold ${
                  safeStepIndex === 2 ? 'text-emerald-800 font-extrabold' : 'text-slate-400'
                }`}
              >
                Completed
              </span>
            </div>
          </div>
        </div>

        {/* Date, Open/Close Times, and Venue Information */}
        <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{timing.dateStr || formatDate(event.startTime)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Open: <strong>{timing.openTime}</strong></span>
            <span className="text-slate-300">•</span>
            <span>Close: <strong>{timing.closeTime}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="truncate">{event.venue}</span>
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
            isCompleted
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
              : timing.isOverTime
              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              : isSoldOut
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed pointer-events-none'
              : 'bg-sky-600 text-white hover:bg-sky-500 shadow-md shadow-sky-600/20 active:scale-95'
          }`}
        >
          <span>
            {isCompleted
              ? 'Completed Event'
              : timing.isOverTime
              ? 'Over Time'
              : isSoldOut
              ? 'Sold Out'
              : 'Select Seats'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default EventCard;
