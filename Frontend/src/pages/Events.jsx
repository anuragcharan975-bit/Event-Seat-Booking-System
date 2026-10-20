import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventApi } from '../api/eventApi';
import EventCard from '../components/EventCard';
import EventDetails from './EventDetails';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import {
  Calendar,
  Sparkles,
  Search,
  Filter,
  X,
  RotateCcw,
  Tag,
  Clock,
  ShieldCheck,
  Music,
  Flame,
  Smile,
  Film,
  Trophy,
  BookOpen,
  Layers,
  HelpCircle
} from 'lucide-react';

// Exact required categories list from specifications
const REQUIRED_CATEGORIES = [
  { id: 'all', label: 'All Events', icon: Sparkles },
  { id: 'Music', label: 'Music', icon: Music },
  { id: 'Dance', label: 'Dance', icon: Flame },
  { id: 'Comedy', label: 'Comedy', icon: Smile },
  { id: 'Theatre', label: 'Theatre', icon: Film },
  { id: 'Sports', label: 'Sports', icon: Trophy },
  { id: 'Workshops', label: 'Workshops', icon: BookOpen },
  { id: 'Spa', label: 'Spa & Wellness', icon: Sparkles },
  { id: 'Other', label: 'Other', icon: Tag }
];

const Events = () => {
  const { category: routeCategory } = useParams();
  const navigate = useNavigate();

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (routeCategory) {
      const match = REQUIRED_CATEGORIES.find(
        (c) => c.id.toLowerCase() === routeCategory.toLowerCase()
      );
      return match ? match.id : routeCategory;
    }
    return 'all';
  });
  const [selectedDate, setSelectedDate] = useState('');

  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sync category state when URL changes (e.g. browser back/forward or direct URL visit)
  useEffect(() => {
    if (routeCategory) {
      const raw = routeCategory.trim();
      if (raw.toLowerCase() === 'all' || raw.toLowerCase() === 'all-events') {
        setSelectedCategory('all');
      } else {
        const match = REQUIRED_CATEGORIES.find(
          (c) => c.id.toLowerCase() === raw.toLowerCase()
        );
        setSelectedCategory(match ? match.id : raw);
      }
    } else {
      setSelectedCategory('all');
    }
  }, [routeCategory]);

  // Debounce search input to avoid spamming network calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await eventApi.getEvents({
        search: debouncedSearch,
        category: selectedCategory,
        date: selectedDate
      });

      if (response.success) {
        setEvents(response.data || []);
        if (response.categories && response.categories.length > 0) {
          setCategories(response.categories);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load upcoming events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Category tab navigation handler
  const handleCategoryClick = (catId) => {
    if (catId === 'all') {
      setSelectedCategory('all');
      navigate('/events');
    } else {
      setSelectedCategory(catId);
      navigate(`/events/${catId.toLowerCase()}`);
    }
  };

  // Reset all filters handler
  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedCategory('all');
    setSelectedDate('');
    navigate('/events');
  };

  // If routeCategory is an ObjectId (legacy URL), delegate directly to EventDetails
  if (routeCategory && /^[0-9a-fA-F]{24}$/.test(routeCategory)) {
    return <EventDetails />;
  }

  const hasActiveFilters = Boolean(
    searchTerm.trim() || (selectedCategory && selectedCategory !== 'all') || selectedDate
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Catalog Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-sky-900/30">
        <div className="relative z-10 max-w-3xl">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-sky-300/80 mb-3 font-medium">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <span>/</span>
            <span className="text-white font-semibold">Events Catalog</span>
            {selectedCategory !== 'all' && (
              <>
                <span>/</span>
                <span className="text-sky-300 font-bold">{selectedCategory}</span>
              </>
            )}
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold mb-3 border border-sky-500/30 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Real-Time Seat Booking Catalog</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-3 leading-tight">
            Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-300">Events Catalog</span>
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
            Browse our full catalog of upcoming live events. Filter by category, search by artist or venue, select your date, and book up to 4 seats with guaranteed two-minute atomic seat locks.
          </p>

          {/* Quick Info Badges */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-5 pt-4 border-t border-white/10 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>120-Second Atomic Hold</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ACID Guaranteed Booking</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Real-Time Live Availability</span>
            </div>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -top-10 w-56 h-56 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Primary Category Filter Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-sky-600" />
            <span>Event Categories</span>
          </span>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => handleCategoryClick('all')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-800 transition flex items-center gap-1"
            >
              <span>Show All Categories</span>
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {REQUIRED_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive =
              selectedCategory.toLowerCase() === cat.id.toLowerCase() ||
              (cat.id === 'all' && selectedCategory === 'all');

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 shrink-0 border ${
                  isActive
                    ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/25 scale-[1.02]'
                    : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-sky-600'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Date Filter Bar Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* 1. Search Input */}
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search dance, music, comedy, or any event name..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 2. Date Filter (Optional) */}
          <div className="md:col-span-4 relative flex items-center">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              title="Filter by date (optional)"
              aria-label="Filter by date (optional)"
              className="w-full pl-10 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition cursor-pointer"
            />
            {selectedDate ? (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200"
                title="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-200/60 px-1.5 py-0.5 rounded pointer-events-none">
                Optional
              </span>
            )}
          </div>
        </div>

        {/* Quick Search Suggestion Pills */}
        {/* <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 pt-1">
          <span className="font-semibold text-slate-400">Quick search:</span>
          {['Spa', 'Dance', 'Music', 'Comedy', 'Theatre', 'Sports', 'Workshops'].map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                setSearchTerm(term);
                if (selectedCategory !== 'all') {
                  setSelectedCategory('all');
                  navigate('/events');
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 border border-transparent font-medium transition"
            >
              {term}
            </button>
          ))}
        </div> */}

        {/* Active Filters row & Reset Action */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-500">Active Filters:</span>

              {selectedCategory && selectedCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                  <span>Category: {selectedCategory}</span>
                  <button onClick={() => handleCategoryClick('all')} className="hover:text-sky-900" title="Remove category filter">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchTerm.trim() && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                  <span>Keyword: "{searchTerm.trim()}"</span>
                  <button onClick={() => setSearchTerm('')} className="hover:text-purple-900" title="Remove keyword search">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedDate && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  <span>Date: {selectedDate}</span>
                  <button onClick={() => setSelectedDate('')} className="hover:text-emerald-900" title="Remove date filter">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-xl transition shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
              <span>Clear Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Events Listing Header */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-sky-600 shrink-0" />
            <h2 className="text-xl font-bold text-slate-900 flex flex-wrap items-center gap-2">
              <span>
                {debouncedSearch
                  ? `Events matching "${debouncedSearch}"`
                  : selectedCategory === 'all'
                  ? 'All Upcoming Events'
                  : `${selectedCategory} Events`}
              </span>
              {debouncedSearch && !selectedDate && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Any Date
                </span>
              )}
            </h2>
          </div>

          <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
            {events.length} {events.length === 1 ? 'Event' : 'Events'} Found
          </span>
        </div>

        {/* Loading Spinner */}
        {loading && <Loading message="Finding events with live seat availability..." size="lg" />}

        {/* Error State */}
        {error && <ErrorMessage message={error} onRetry={fetchEvents} />}

        {/* Empty State when no events match */}
        {!loading && !error && events.length === 0 && (
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto">
            <div className="p-4 bg-slate-100 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center text-slate-400">
              <Search className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-800">
              {hasActiveFilters ? 'No matching events found' : 'No Events Available'}
            </h3>

            <p className="text-sm text-slate-500 mt-2 mb-6 max-w-sm mx-auto leading-relaxed">
              {selectedCategory !== 'all' && debouncedSearch
                ? `No events found in ${selectedCategory} matching "${debouncedSearch}". Try searching across all categories or clearing your filters.`
                : hasActiveFilters
                ? 'No matching events found for your search criteria. Date filter is optional — try clearing the date or searching for Dance, Music, or Comedy.'
                : 'There are currently no upcoming events listed. Please check back later.'}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    navigate('/events');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md shadow-sky-600/20 transition active:scale-95"
                >
                  <span>Search in All Categories</span>
                </button>
              )}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Clear All Filters</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Events Cards Grid */}
        {!loading && !error && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
