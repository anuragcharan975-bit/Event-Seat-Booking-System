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
  ChevronRight
} from 'lucide-react';

const CATEGORIES = [
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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white p-8 sm:p-14 lg:p-16 shadow-2xl border border-sky-900/40">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold mb-6 border border-sky-500/30 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>High-Concurrency Live Ticket Engine</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.15]">
            Discover, Reserve & Experience{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-300">
              Live Events
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl mb-8">
            Experience seamless ticket booking with our interactive seat grid, real-time 120-second atomic hold locks, and guaranteed zero double-bookings.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Link
              to="/events"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm sm:text-base font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-600/30 hover:shadow-sky-600/50 hover:scale-[1.02] active:scale-98 transition-all"
            >
              <span>Explore All Events</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#categories"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm sm:text-base font-semibold text-slate-200 bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md transition-all"
            >
              <span>Browse Categories</span>
            </a>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 pt-8 border-t border-white/10 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <p className="font-bold text-white text-sm">120s Hold</p>
                <p className="text-[11px] text-slate-400">Atomic Seat Lock</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-white text-sm">ACID Safe</p>
                <p className="text-[11px] text-slate-400">Zero Race Conditions</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-white text-sm">Visual Grid</p>
                <p className="text-[11px] text-slate-400">Interactive Seat Map</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <div>
                <p className="font-bold text-white text-sm">Instant E-Ticket</p>
                <p className="text-[11px] text-slate-400">Direct Confirmation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-16 -bottom-16 w-[450px] h-[450px] bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -top-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.id}
                to={`/events/${cat.id}`}
                className="group bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${cat.bg} ${cat.border} border`}
                  >
                    <Icon className={`w-6 h-6 ${cat.text}`} />
                  </div>

                  <h3 className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors text-base mb-1">
                    {cat.name}
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    {cat.desc}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600 group-hover:text-sky-700 pt-2 border-t border-slate-100">
                  <span>Browse {cat.name.split(' ')[0]}</span>
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/20 transition active:scale-95 self-start sm:self-auto"
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
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 border border-slate-800 shadow-xl space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
            Simple 4-Step Process
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            How SeatSpot Reservation Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Engineered with strict concurrency control so you never lose your selected seats to another user.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          <div className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/60 flex flex-col justify-between">
            <div>
              <span className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 font-black text-sm flex items-center justify-center mb-4 border border-sky-500/30">
                1
              </span>
              <h3 className="font-bold text-base text-white mb-2">Choose an Event</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Filter by Music, Dance, Comedy, Theatre, Sports, or Workshops to find the perfect event.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/60 flex flex-col justify-between">
            <div>
              <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center mb-4 border border-emerald-500/30">
                2
              </span>
              <h3 className="font-bold text-base text-white mb-2">Pick Your Seats</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inspect the live seat grid and pick up to 4 available seats with instant price calculation.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/60 flex flex-col justify-between">
            <div>
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-black text-sm flex items-center justify-center mb-4 border border-amber-500/30">
                3
              </span>
              <h3 className="font-bold text-base text-white mb-2">120-Sec Hold Lock</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seats are held for you for two minutes, preventing any conflicting reservations.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/60 flex flex-col justify-between">
            <div>
              <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-black text-sm flex items-center justify-center mb-4 border border-purple-500/30">
                4
              </span>
              <h3 className="font-bold text-base text-white mb-2">Instant Confirmation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Get an atomic booking reference and view all your confirmed tickets in My Bookings anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Bottom CTA Banner */}
      <section className="bg-gradient-to-r from-sky-600 to-indigo-600 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl font-black">
            Ready to book your next live event?
          </h2>
          <p className="text-xs sm:text-sm text-sky-100 max-w-xl">
            Explore our curated catalog of concerts, dance festivals, stand-up shows, sports tournaments, and wellness retreats.
          </p>
        </div>

        <Link
          to="/events"
          className="px-6 py-3.5 bg-white text-sky-700 hover:bg-sky-50 font-bold rounded-2xl text-sm shadow-md transition-all active:scale-95 shrink-0 flex items-center gap-2"
        >
          <span>Browse All Events</span>
          <ArrowRight className="w-4 h-4 text-sky-600" />
        </Link>
      </section>
    </div>
  );
};

export default Home;
