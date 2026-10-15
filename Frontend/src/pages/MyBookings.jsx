import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { bookingApi } from '../api/bookingApi';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import {
  BookmarkCheck,
  Calendar,
  MapPin,
  Ticket,
  CheckCircle2,
  ArrowRight,
  Receipt
} from 'lucide-react';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const location = useLocation();
  const justBookedRef = location.state?.newBookingReference;

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await bookingApi.getMyBookings();
      if (res.success) {
        setBookings(res.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve your bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-2xl">
            <BookmarkCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Bookings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Confirmed tickets and event reservations
            </p>
          </div>
        </div>

        <Link
          to="/"
          className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition"
        >
          <span>Browse More</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Celebration Alert for Fresh Booking */}
      {justBookedRef && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-900 flex items-start gap-4 shadow-sm animate-bounceOnce">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-base">Booking Confirmed Successfully!</h4>
            <p className="text-sm text-emerald-800 mt-1">
              Your booking reference is{' '}
              <span className="font-mono font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                {justBookedRef}
              </span>
              . Your seats are permanently reserved.
            </p>
          </div>
        </div>
      )}

      {loading && <Loading message="Loading your booking history..." size="lg" />}

      {error && <ErrorMessage message={error} onRetry={fetchBookings} />}

      {!loading && !error && bookings.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <Receipt className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No Bookings Yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            You haven't reserved any tickets yet. Explore upcoming concerts, expos, and shows!
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md shadow-sky-600/20 transition"
          >
            <span>Explore Events</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const isHighlighted = booking.bookingReference === justBookedRef;

            return (
              <div
                key={booking._id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden p-6 sm:p-7 shadow-sm ${
                  isHighlighted
                    ? 'border-emerald-300 ring-2 ring-emerald-400/20 bg-emerald-50/20'
                    : 'border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Booking Reference
                    </span>
                    <span className="font-mono font-extrabold text-base sm:text-lg text-slate-900">
                      {booking.bookingReference}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {booking.status}
                    </span>
                    <span className="text-xl font-black text-sky-600">
                      {formatCurrency(booking.amount)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-slate-900">{booking.event.title}</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>{formatDate(booking.event.startTime)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                      <span className="truncate">{booking.event.venue}</span>
                    </div>

                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Ticket className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>
                        <strong className="text-slate-800 font-semibold">Reserved Seats: </strong>
                        {booking.seats.map((s) => s.seatNumber).join(', ')} ({booking.seats.length}{' '}
                        {booking.seats.length === 1 ? 'seat' : 'seats'})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 mt-5 pt-3 flex justify-between items-center text-[11px] text-slate-400">
                  <span>Booked on {formatDate(booking.createdAt)}</span>
                  <span>ID: {booking._id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
