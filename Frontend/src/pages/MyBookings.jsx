import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { bookingApi } from '../api/bookingApi';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import {
  BookmarkCheck,
  Calendar,
  MapPin,
  Ticket,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Receipt,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Tag
} from 'lucide-react';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'CONFIRMED' | 'CANCELLED'

  // Cancellation modal state
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Copied reference indicator state
  const [copiedRef, setCopiedRef] = useState('');

  const location = useLocation();
  const navigate = useNavigate();
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
      if (err.response?.status === 401) {
        navigate('/login', { state: { from: { pathname: '/my-bookings' } } });
        return;
      }
      setError(err.response?.data?.message || 'Failed to retrieve your bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCopyReference = (ref) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => {
      setCopiedRef('');
    }, 2500);
  };

  const handleCancelClick = (booking) => {
    setError('');
    setSuccessMessage('');
    setCancellingBooking(booking);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;

    try {
      setActionLoading(true);
      setError('');
      const res = await bookingApi.cancelBooking(cancellingBooking._id);
      if (res.success) {
        setSuccessMessage(
          `Booking ${cancellingBooking.bookingReference} has been successfully cancelled. Your seats have been released back to availability.`
        );
        setCancellingBooking(null);
        await fetchBookings();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to cancel this booking. Please try again.';
      setError(msg);
      setCancellingBooking(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter bookings based on selected status tab
  const filteredBookings = bookings.filter((b) => {
    if (statusFilter === 'ALL') return true;
    return b.status === statusFilter;
  });

  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const cancelledCount = bookings.filter((b) => b.status === 'CANCELLED').length;

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100 shadow-sm">
            <BookmarkCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Bookings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage your confirmed tickets, view reservations, and track history
            </p>
          </div>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition self-start sm:self-center"
        >
          <span>Browse More Events</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Fresh Booking Success Banner */}
      {justBookedRef && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-900 flex items-start gap-4 shadow-sm animate-bounceOnce">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-base">Booking Confirmed Successfully!</h4>
            <p className="text-sm text-emerald-800 mt-1">
              Your booking reference is{' '}
              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300">
                {justBookedRef}
              </span>
              . Your seats have been permanently locked and reserved.
            </p>
          </div>
        </div>
      )}

      {/* Operation Feedback Messages */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold p-1"
          >
            ✕
          </button>
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={fetchBookings} />}

      {/* Status Filter Tabs (when bookings exist) */}
      {!loading && bookings.length > 0 && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>All Bookings</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {bookings.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('CONFIRMED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'CONFIRMED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Confirmed</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
              {confirmedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('CANCELLED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'CANCELLED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Cancelled</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800">
              {cancelledCount}
            </span>
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && <Loading message="Loading your tickets and booking records..." size="lg" />}

      {/* Empty State when no bookings exist at all */}
      {!loading && !error && bookings.length === 0 && (
        <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm max-w-lg mx-auto">
          <div className="p-4 bg-sky-50 text-sky-600 rounded-3xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Receipt className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Bookings Yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2 mb-6 leading-relaxed">
            You haven't reserved any tickets yet. Explore upcoming concerts, tech conferences, and workshops!
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md shadow-sky-600/20 transition active:scale-95"
          >
            <span>Explore Events</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Empty Filter State (e.g. no Cancelled bookings) */}
      {!loading && !error && bookings.length > 0 && filteredBookings.length === 0 && (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200">
          <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-700">No {statusFilter.toLowerCase()} bookings found</h4>
          <p className="text-xs text-slate-500 mt-1">Switch filter tabs to view other bookings.</p>
        </div>
      )}

      {/* Bookings List */}
      {!loading && !error && filteredBookings.length > 0 && (
        <div className="space-y-5">
          {filteredBookings.map((booking) => {
            const isFresh = booking.bookingReference === justBookedRef;
            const isCancelled = booking.status === 'CANCELLED';

            return (
              <div
                key={booking._id}
                className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md ${
                  isFresh
                    ? 'border-emerald-300 ring-2 ring-emerald-400/20 bg-emerald-50/10'
                    : isCancelled
                    ? 'border-slate-200 opacity-80 bg-slate-50/50'
                    : 'border-slate-200'
                }`}
              >
                {/* Booking Header Bar */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Booking Reference
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-black text-base sm:text-lg text-slate-900">
                          {booking.bookingReference}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyReference(booking.bookingReference)}
                          className="p-1 text-slate-400 hover:text-sky-600 rounded transition"
                          title="Copy Booking Reference"
                        >
                          {copiedRef === booking.bookingReference ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:justify-end">
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        isCancelled
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {isCancelled ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>Cancelled</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Confirmed</span>
                        </>
                      )}
                    </span>

                    {/* Amount */}
                    <span
                      className={`text-xl font-black ${
                        isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'
                      }`}
                    >
                      {formatCurrency(booking.amount)}
                    </span>
                  </div>
                </div>

                {/* Booking Details Body */}
                <div className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {booking.event?.imageUrl && (
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-200 shadow-xs hidden sm:block">
                          <img
                            src={booking.event.imageUrl}
                            alt={booking.event?.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 mb-2">
                          <Tag className="w-3 h-3" />
                          <span>{booking.event?.category || 'General'}</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                          {booking.event?.title || 'Event Name'}
                        </h3>
                      </div>
                    </div>

                    {/* Cancellation Action Button */}
                    {!isCancelled ? (
                      <button
                        type="button"
                        onClick={() => handleCancelClick(booking)}
                        disabled={actionLoading}
                        className="self-start px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Booking</span>
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 italic">
                        Cancelled on {booking.cancelledAt ? formatDate(booking.cancelledAt) : 'Archived'}
                      </span>
                    )}
                  </div>

                  {/* Metadata grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>{booking.event?.startTime ? formatDate(booking.event.startTime) : 'Date unavailable'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                      <span className="truncate">{booking.event?.venue || 'Venue unavailable'}</span>
                    </div>

                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Ticket className="w-4 h-4 text-sky-600 shrink-0" />
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-800">Reserved Seats:</span>
                        {(booking.seats || []).map((s) => (
                          <span
                            key={s._id}
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${
                              isCancelled
                                ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}
                          >
                            {s.seatNumber}
                          </span>
                        ))}
                        <span className="text-slate-400 text-xs">
                          ({booking.seats?.length || 0} {booking.seats?.length === 1 ? 'seat' : 'seats'})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer timestamp and details */}
                <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 gap-1">
                  <span>Booked on {formatDate(booking.createdAt)}</span>
                  <span>Booking ID: {booking._id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Booking Cancellation */}
      <ConfirmDialog
        isOpen={Boolean(cancellingBooking)}
        title="Cancel Booking & Release Seats?"
        message={
          cancellingBooking
            ? `Are you sure you want to cancel booking "${cancellingBooking.bookingReference}" for "${
                cancellingBooking.event?.title
              }"? Your reserved seats (${(cancellingBooking.seats || [])
                .map((s) => s.seatNumber)
                .join(', ')}) will be immediately released back to general availability for other customers. This action cannot be undone.`
            : ''
        }
        confirmText="Yes, Cancel Booking"
        cancelText="Keep My Booking"
        isDanger={true}
        isLoading={actionLoading}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancellingBooking(null)}
      />
    </div>
  );
};

export default MyBookings;
