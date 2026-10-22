import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  Clock,
  ShieldCheck,
  Music,
  Flame,
  Smile,
  Film,
  Trophy,
  BookOpen,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  CheckCircle2,
  Tag,
  Gamepad2,
  Activity,
  Zap
} from 'lucide-react';

// Required categories list with icons
const REQUIRED_CATEGORIES = [
  { id: 'all', label: 'All Events', icon: Sparkles },
  { id: 'Game', label: 'Game', icon: Gamepad2 },
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
  const [searchParams] = useSearchParams();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (routeCategory) {
      const match = REQUIRED_CATEGORIES.find(
        (c) =>
          c.id.toLowerCase() === routeCategory.toLowerCase() ||
          (c.id === 'Theatre' && routeCategory.toLowerCase() === 'theater') ||
          (c.id === 'Workshops' && (routeCategory.toLowerCase() === 'workspace' || routeCategory.toLowerCase() === 'workspaces'))
      );
      return match ? match.id : routeCategory;
    }
    return 'all';
  });
  const [selectedStatus, setSelectedStatus] = useState(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus && ['pending', 'in_progress', 'completed'].includes(urlStatus.toLowerCase())) {
      return urlStatus.toLowerCase();
    }
    return 'all';
  });
  const [selectedSort, setSelectedSort] = useState('newest');
  const [selectedDate, setSelectedDate] = useState('');

  // Pagination state (5 records per page requirement)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);

  // Data & Status states
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
          (c) =>
            c.id.toLowerCase() === raw.toLowerCase() ||
            (c.id === 'Theatre' && raw.toLowerCase() === 'theater') ||
            (c.id === 'Workshops' && (raw.toLowerCase() === 'workspace' || raw.toLowerCase() === 'workspaces'))
        );
        setSelectedCategory(match ? match.id : raw);
      }
    } else {
      setSelectedCategory('all');
    }
    setCurrentPage(1);
  }, [routeCategory]);

  // Debounce search input to avoid excessive network requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch events from backend API
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await eventApi.getEvents({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch,
        category: selectedCategory,
        status: selectedStatus,
        sort: selectedSort,
        date: selectedDate
      });

      if (response && response.success) {
        setEvents(response.data || []);
        setTotalEvents(response.totalEvents || 0);
        setTotalPages(response.totalPages || 1);
        if (response.categories && response.categories.length > 0) {
          setCategories(response.categories);
        }
      } else {
        setEvents([]);
        setTotalEvents(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('[Events Catalog Error]:', err);
      const errorMsg =
        err.response?.data?.message ||
        (err.message === 'Network Error'
          ? 'Cannot connect to backend server. Please verify the backend is running on port 5000.'
          : 'Failed to load events. Please check your connection and try again.');
      setError(errorMsg);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedCategory, selectedStatus, selectedSort, selectedDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Category tab navigation handler
  const handleCategoryClick = (catId) => {
    setCurrentPage(1);
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
    setSelectedStatus('all');
    setSelectedSort('newest');
    setSelectedDate('');
    setCurrentPage(1);
    navigate('/events');
  };

  // Pagination navigation handler
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 320, behavior: 'smooth' });
    }
  };

  // If routeCategory is an ObjectId (legacy fallback), delegate directly to EventDetails
  if (routeCategory && /^[0-9a-fA-F]{24}$/.test(routeCategory)) {
    return <EventDetails />;
  }

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      (selectedCategory && selectedCategory !== 'all') ||
      (selectedStatus && selectedStatus !== 'all') ||
      (selectedSort && selectedSort !== 'newest') ||
      selectedDate
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
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
            <span>High-Performance Live Ticket Engine</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-3 leading-tight">
            Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-300">Events Catalog</span>
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
            Browse our full catalog of upcoming live events. Search by title, venue, or artist, filter by category and status, sort results, and book tickets with real-time seat map locks.
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
            <span>Filter by Category</span>
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

      {/* Search, Filter, Sort & Date Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        {/* Quick Status Filter Tabs: Pending, In Progress, Completed */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Filter by Event Status:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Status', icon: Sparkles },
              { id: 'pending', label: 'Pending', icon: Clock },
              { id: 'in_progress', label: 'In Progress', icon: Zap },
              { id: 'completed', label: 'Completed', icon: CheckCircle2 }
            ].map((st) => {
              const Icon = st.icon;
              const isActive = selectedStatus === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(st.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border shadow-2xs ${
                    isActive
                      ? st.id === 'pending'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/30 ring-2 ring-amber-400/30'
                        : st.id === 'in_progress'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-600/30 ring-2 ring-blue-400/30'
                        : st.id === 'completed'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-600/30 ring-2 ring-emerald-400/30'
                        : 'bg-sky-600 text-white border-sky-700 shadow-sm shadow-sky-600/30 ring-2 ring-sky-400/30'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* 1. Case-insensitive Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, venue, or Pending, In Progress, Completed..."
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

          {/* 2. Status Filter Input Dropdown */}
          <div className="md:col-span-3 relative">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by Status"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition cursor-pointer"
            >
              <option value="all">Status: All Status</option>
              <option value="pending">⏳ Status: Pending</option>
              <option value="in_progress">⚡ Status: In Progress</option>
              <option value="completed">✓ Status: Completed</option>
            </select>
          </div>

          {/* 3. Sorting Dropdown (Newest, Oldest, A–Z, Z–A) */}
          <div className="md:col-span-2 relative">
            <select
              value={selectedSort}
              onChange={(e) => {
                setSelectedSort(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Sort Events"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition cursor-pointer"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="a-z">Sort: A–Z</option>
              <option value="z-a">Sort: Z–A</option>
            </select>
          </div>

          {/* 4. Date Filter */}
          <div className="md:col-span-2 relative flex items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              title="Filter by date (optional)"
              aria-label="Filter by date (optional)"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition cursor-pointer"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDate('');
                  setCurrentPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title="Clear date"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

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

              {selectedStatus && selectedStatus !== 'all' && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${
                    selectedStatus === 'pending'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : selectedStatus === 'in_progress'
                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  }`}
                >
                  <span>
                    Status: {selectedStatus === 'in_progress' ? 'In Progress' : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
                  </span>
                  <button onClick={() => setSelectedStatus('all')} className="hover:opacity-75" title="Remove status filter">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedSort && selectedSort !== 'newest' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                  <span>Sort: {selectedSort.toUpperCase()}</span>
                  <button onClick={() => setSelectedSort('newest')} className="hover:text-amber-900" title="Reset sort">
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
              <span>Reset All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Events Listing Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
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
              {selectedStatus !== 'all' && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border capitalize ${
                    selectedStatus === 'pending'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : selectedStatus === 'in_progress'
                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  }`}
                >
                  Status: {selectedStatus === 'in_progress' ? 'In Progress' : selectedStatus}
                </span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
              {totalEvents} {totalEvents === 1 ? 'Event' : 'Events'} Total
            </span>
            <span className="bg-sky-50 border border-sky-200 text-sky-700 px-3 py-1.5 rounded-full">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && <Loading message="Loading events..." size="lg" />}

        {/* Error State with Retry Button */}
        {error && !loading && (
          <div className="my-6">
            <ErrorMessage message={error} onRetry={fetchEvents} />
          </div>
        )}

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
              {hasActiveFilters
                ? 'No events match your current filter and search criteria. Try clearing search keywords or resetting filters.'
                : 'There are currently no events listed in the catalog. Please check back later.'}
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
                  <span>View All Categories</span>
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

        {/* Events Cards Grid (5 records per page) */}
        {!loading && !error && events.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>

            {/* Pagination Controls (5 records per page requirement) */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-200 mt-8">
                <div className="text-xs text-slate-500 font-medium">
                  Showing <span className="font-bold text-slate-800">{Math.min((currentPage - 1) * pageSize + 1, totalEvents)}</span> to{' '}
                  <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, totalEvents)}</span> of{' '}
                  <span className="font-bold text-slate-800">{totalEvents}</span> events (Page {currentPage} of {totalPages})
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 shadow-xs bg-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  {/* Page Number Buttons */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                          currentPage === pageNum
                            ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 shadow-xs bg-white"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Events;
