import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventApi } from '../api/eventApi';
import EventCard from '../components/EventCard';
import Loading from '../components/Loading';
import {
  Sparkles,
  Calendar,
  Ticket,
  Clock,
  ShieldCheck,
  ArrowRight,
  Music,
  Flame,
  Smile,
  Film,
  Trophy,
  BookOpen,
  Tag,
  Users,
  Compass,
  CheckCircle2,
  ChevronRight,
  Gamepad2,
  Car,
  Heart
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'car',
    name: 'Car & Auto Shows',
    desc: 'Formula 1 racing, supercar showcases, drift battles & auto expos',
    icon: Car,
    color: 'from-red-600 to-amber-600',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200'
  },
  {
    id: 'game',
    name: 'Game & Esports',
    desc: 'PUBG Battlegrounds, Clash of Clans tournaments & pro gaming leagues',
    icon: Gamepad2,
    color: 'from-violet-600 to-fuchsia-600',
    bg: 'bg-violet-50',
    text: 'text-violet-800',
    border: 'border-violet-200'
  },
  {
    id: 'music',
    name: 'Music & Concerts',
    desc: 'Live rock, jazz, classical symphonies & acoustic jams',
    icon: Music,
    color: 'from-amber-500 to-rose-500',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200'
  },
  {
    id: 'dance',
    name: 'Dance & Ballet',
    desc: 'Contemporary ballet, hip-hop fusion & folk dance',
    icon: Flame,
    color: 'from-rose-500 to-pink-500',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200'
  },
  {
    id: 'comedy',
    name: 'Stand-Up Comedy',
    desc: 'Top national stand-up artists & improv comedy nights',
    icon: Smile,
    color: 'from-yellow-400 to-amber-500',
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200'
  },
  {
    id: 'theatre',
    name: 'Theatre & Plays',
    desc: 'Classic dramas, broadway plays & live stage craft',
    icon: Film,
    color: 'from-purple-500 to-indigo-600',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200'
  },
  {
    id: 'sports',
    name: 'Sports & Matches',
    desc: 'Championship tournaments, clashes & live stadium games',
    icon: Trophy,
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200'
  },
  {
    id: 'workshops',
    name: 'Tech & Workshops',
    desc: 'Cloud architecture masterclasses, AI summits & bootcamps',
    icon: BookOpen,
    color: 'from-sky-500 to-blue-600',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200'
  },
  {
    id: 'spa',
    name: 'Spa & Wellness',
    desc: 'Ayurvedic retreats, herbal massages, hot stone therapy & detox weekends',
    icon: Sparkles,
    color: 'from-teal-500 to-emerald-600',
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200'
  },
  {
    id: 'other',
    name: 'Expos & Exhibitions',
    desc: 'Artisan culinary expos, coffee roasters & international exhibitions',
    icon: Tag,
    color: 'from-slate-600 to-slate-800',
    bg: 'bg-slate-50',
    text: 'text-slate-800',
    border: 'border-slate-200'
  }
];

const Home = () => {
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedEvents = async () => {
      try {
        setLoading(true);
        const res = await eventApi.getEvents({});
        if (res.success && res.data) {
          // Take top 3 upcoming events for the homepage showcase
          setFeaturedEvents(res.data.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load featured events for home page', err);
      } finally {
        setLoading(false);
      }
    };
    loadFeaturedEvents();
  }, []);

  return (
    <div className="space-y-16 animate-fadeIn pb-12">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-[#0B0F19] to-[#0A1026] text-white p-8 sm:p-14 lg:p-16 shadow-2xl border border-sky-500/20">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/15 text-sky-300 text-xs font-bold mb-6 border border-sky-400/30 backdrop-blur-md shadow-inner">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>High-Concurrency Live Ticket Engine • Zero Overbooking Guarantee</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.12]">
            Discover, Reserve & Experience{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-indigo-300">
              Live Events
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl mb-8">
            Experience next-generation ticket booking with our real-time interactive seat grid, 120-second atomic hold locks, 40% Couple Date Passes, and instant scannable E-Tickets.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Link
              to="/events"
              className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl text-sm sm:text-base font-black text-white bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:via-indigo-500 hover:to-purple-500 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-98 transition-all duration-200"
            >
              <span>Explore All Events</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#categories"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm sm:text-base font-bold text-slate-200 bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md transition-all hover:scale-[1.02]"
            >
              <span>Browse Categories</span>
            </a>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-12 pt-8 border-t border-white/10 text-xs text-slate-300">
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] transition-all">
              <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/20">
                <Clock className="w-4 h-4 shrink-0" />
              </div>
              <div>
                <p className="font-extrabold text-white text-sm">120s Hold</p>
                <p className="text-[11px] text-slate-400">Atomic Seat Lock</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] transition-all">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-400/20">
                <Heart className="w-4 h-4 shrink-0 fill-rose-400 text-rose-400" />
              </div>
              <div>
                <p className="font-extrabold text-white text-sm">40% Couple OFF</p>
                <p className="text-[11px] text-slate-400">Date Night Pass</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] transition-all">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/20">
                <Ticket className="w-4 h-4 shrink-0" />
              </div>
              <div>
                <p className="font-extrabold text-white text-sm">Visual Grid</p>
                <p className="text-[11px] text-slate-400">Interactive Map</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] transition-all">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/20">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              </div>
              <div>
                <p className="font-extrabold text-white text-sm">Instant E-Ticket</p>
                <p className="text-[11px] text-slate-400">QR Gate Ready</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-16 -bottom-16 w-[450px] h-[450px] bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -top-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-20 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* 2. Browse Categories Section */}
      <section id="categories" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 uppercase tracking-wider mb-1">
              <Compass className="w-3.5 h-3.5" />
              <span>Explore by Category</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              What are you in the mood for?
            </h2>
          </div>

          <Link
            to="/events"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-sky-600 hover:text-sky-800 transition group"
          >
            <span>View All Categories</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.id}
                to={`/events/${cat.id}`}
                className="group bg-white/95 backdrop-blur-md rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-2xs ${cat.bg} ${cat.border} border`}
                  >
                    <Icon className={`w-6 h-6 ${cat.text}`} />
                  </div>

                  <h3 className="font-extrabold text-slate-900 group-hover:text-sky-600 transition-colors text-base mb-1.5 tracking-tight">
                    {cat.name}
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed mb-5">
                    {cat.desc}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600 group-hover:text-sky-700 pt-3 border-t border-slate-100/80">
                  <span>Explore {cat.name.split(' ')[0]}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Featured / Upcoming Events Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 uppercase tracking-wider mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Trending Shows</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Featured Upcoming Events
            </h2>
          </div>

          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-md shadow-sky-600/20 transition active:scale-95 self-start sm:self-auto"
          >
            <span>See All Events</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <Loading message="Loading featured events..." size="md" />
        ) : featuredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredEvents.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">No events currently listed.</p>
          </div>
        )}
      </section>

      {/* 4. How It Works Section */}
      <section className="relative overflow-hidden bg-slate-950 text-white rounded-3xl p-8 sm:p-14 border border-slate-800 shadow-2xl space-y-10">
        <div className="relative z-10 text-center max-w-2xl mx-auto space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-400/20">
            Simple 4-Step Reservation
          </span>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            How SeatSpot Reservation Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Engineered with strict concurrency control and atomic holding so you never lose your selected seats to another user.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
          <div className="bg-white/[0.04] backdrop-blur-md rounded-2xl p-6 border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] transition-all flex flex-col justify-between">
            <div>
              <span className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 font-black text-sm flex items-center justify-center mb-4 border border-sky-400/30 shadow-xs">
                1
              </span>
              <h3 className="font-extrabold text-base text-white mb-2">Choose an Event</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Filter by Car Shows, Esports, Music, Dance, Comedy, Theatre, Sports, or Spa to find your ideal event.
              </p>
            </div>
          </div>

          <div className="bg-white/[0.04] backdrop-blur-md rounded-2xl p-6 border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] transition-all flex flex-col justify-between">
            <div>
              <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center mb-4 border border-emerald-400/30 shadow-xs">
                2
              </span>
              <h3 className="font-extrabold text-base text-white mb-2">Pick Your Seats</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inspect the live visual seat grid. Select Standard, 40% Couple Pass, or Group Booking with live calculation.
              </p>
            </div>
          </div>

          <div className="bg-white/[0.04] backdrop-blur-md rounded-2xl p-6 border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] transition-all flex flex-col justify-between">
            <div>
              <span className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 font-black text-sm flex items-center justify-center mb-4 border border-amber-400/30 shadow-xs">
                3
              </span>
              <h3 className="font-extrabold text-base text-white mb-2">120-Sec Atomic Hold</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seats are atomically held exclusively for you for two minutes, preventing any conflicting double-bookings.
              </p>
            </div>
          </div>

          <div className="bg-white/[0.04] backdrop-blur-md rounded-2xl p-6 border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] transition-all flex flex-col justify-between">
            <div>
              <span className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 font-black text-sm flex items-center justify-center mb-4 border border-purple-400/30 shadow-xs">
                4
              </span>
              <h3 className="font-extrabold text-base text-white mb-2">Instant E-Ticket & QR</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Receive atomic booking confirmation with downloadable PDF ticket and live scannable gate QR code.
              </p>
            </div>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* 5. Bottom CTA Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 rounded-3xl p-8 sm:p-14 text-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="relative z-10 space-y-2 text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Ready to book your next live experience?
          </h2>
          <p className="text-xs sm:text-sm text-sky-100 max-w-xl leading-relaxed">
            Explore our curated catalog of concerts, auto expos, gaming tournaments, stand-up nights, sports clashes, and wellness retreats.
          </p>
        </div>

        <Link
          to="/events"
          className="relative z-10 px-7 py-3.5 bg-white text-slate-900 hover:bg-slate-100 font-black rounded-2xl text-sm shadow-xl transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center gap-2"
        >
          <span>Browse All Events</span>
          <ArrowRight className="w-4 h-4 text-sky-600" />
        </Link>

        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </section>
    </div>
  );
};

export default Home;
