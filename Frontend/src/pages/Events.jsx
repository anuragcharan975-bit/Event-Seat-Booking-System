import React, { useState, useEffect } from 'react';
import { eventApi } from '../api/eventApi';
import EventCard from '../components/EventCard';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { Calendar, Sparkles } from 'lucide-react';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await eventApi.getEvents();
      if (response.success) {
        setEvents(response.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load upcoming events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white p-8 sm:p-12 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold mb-4 border border-sky-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>High-Concurrency Seat Allocation</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Discover & Reserve <span className="text-sky-400">Live Events</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Select up to 4 seats with guaranteed two-minute atomic reservations, ACID transaction safety, and zero race conditions.
          </p>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Events Listing Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-600" />
            <h2 className="text-xl font-bold text-slate-900">Upcoming Events</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {events.length} Events Available
          </span>
        </div>

        {loading && <Loading message="Loading events..." size="lg" />}

        {error && <ErrorMessage message={error} onRetry={fetchEvents} />}

        {!loading && !error && events.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No Events Found</h3>
            <p className="text-sm text-slate-500 mt-1">Check back later for newly scheduled events.</p>
          </div>
        )}

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
