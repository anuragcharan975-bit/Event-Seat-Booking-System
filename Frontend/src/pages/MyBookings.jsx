import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { bookingApi } from '../api/bookingApi';
import { useAuth } from '../context/AuthContext';
import { downloadTicketPdf } from '../utils/ticketPdfGenerator';
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
  Tag,
  Download,
  Users,
  QrCode,
  Heart
} from 'lucide-react';

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'CONFIRMED' | 'CANCELLED'
  const [downloadingId, setDownloadingId] = useState(null);

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

  const handleDownloadTicket = async (booking) => {
    if (!booking) return;
    try {
      setDownloadingId(booking._id);
      setError('');
      await downloadTicketPdf({ booking, user });
    } catch (err) {
      console.error('Failed to generate ticket PDF:', err);
      setError('Could not generate ticket PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
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
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-white p-6 sm:p-8 shadow-xl border border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3.5 bg-sky-500/15 text-sky-400 rounded-2xl border border-sky-400/30 backdrop-blur-md shadow-inner">
            <BookmarkCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              My Bookings
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Manage your confirmed tickets, view reservations, and download receipts
            </p>
          </div>
        </div>

        <Link
          to="/events"
          className="relative z-10 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 rounded-2xl shadow-lg shadow-sky-600/25 transition active:scale-95 self-start sm:self-center"
        >
          <span>Browse More Events</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        {/* Ambient background decoration */}
        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/2 -top-8 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Fresh Booking Success Banner */}
      {justBookedRef && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-bounceOnce">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-base text-emerald-950">Booking Confirmed Successfully!</h4>
              <p className="text-sm text-emerald-800 mt-1">
                Your booking reference is{' '}
                <span className="font-mono font-black bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300 text-emerald-950 shadow-2xs">
                  {justBookedRef}
                </span>
                . Your seats have been permanently locked and reserved.
              </p>
            </div>
          </div>
          {bookings.find((b) => b.bookingReference === justBookedRef) && (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={`/tickets/${justBookedRef}`}
                className="px-4 py-2.5 text-xs font-bold text-emerald-950 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-xl transition shadow-xs flex items-center gap-2 active:scale-95"
              >
                <QrCode className="w-4 h-4 text-emerald-700" />
                <span>View E-Ticket & QR</span>
              </Link>
              <button
                type="button"
                onClick={() =>
                  handleDownloadTicket(
                    bookings.find((b) => b.bookingReference === justBookedRef)
                  )
                }
                disabled={Boolean(downloadingId)}
                className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-md shadow-emerald-600/25 flex items-center gap-2 shrink-0 active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Download Ticket (PDF)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Operation Feedback Messages */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold p-1 rounded-lg hover:bg-emerald-100 transition"
          >
            ✕
          </button>
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={fetchBookings} />}

      {/* Status Filter Tabs (when bookings exist) */}
      {!loading && bookings.length > 0 && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              statusFilter === 'ALL'
                ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-600/25 ring-2 ring-sky-400/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 shadow-2xs'
            }`}
          >
            <span>All Bookings</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {bookings.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('CONFIRMED')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              statusFilter === 'CONFIRMED'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-400/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 shadow-2xs'
            }`}
          >
            <span>Confirmed</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${statusFilter === 'CONFIRMED' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
              {confirmedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('CANCELLED')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              statusFilter === 'CANCELLED'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25 ring-2 ring-rose-400/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 shadow-2xs'
            }`}
          >
            <span>Cancelled</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${statusFilter === 'CANCELLED' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700'}`}>
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
            to="/events"
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
                className={`bg-white/95 backdrop-blur-xl rounded-3xl border transition-all duration-300 overflow-hidden shadow-md shadow-slate-200/40 hover:shadow-xl ${
                  isFresh
                    ? 'border-emerald-300 ring-2 ring-emerald-400/20 bg-emerald-50/10'
                    : isCancelled
                    ? 'border-slate-200/80 opacity-80 bg-slate-50/50'
                    : booking.isCoupleBooking
                    ? 'border-rose-200/90 ring-1 ring-rose-200/50 bg-gradient-to-b from-white via-rose-50/10 to-pink-50/15'
                    : 'border-slate-200/80'
                }`}
              >
                {/* Booking Header Bar */}
                <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                    {/* Couple Booking Badge if applicable */}
                    {booking.isCoupleBooking && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                        <Heart className="w-3 h-3 text-rose-600 fill-rose-600" />
                        <span>Couple Pass (1 Boy + 1 Girl)</span>
                      </span>
                    )}

                    {/* Group Booking Badge if applicable */}
                    {(booking.isGroupBooking || (booking.discountAmount && booking.discountAmount > 0)) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        <Users className="w-3 h-3 text-amber-600" />
                        <span>Group Booking (-{booking.discountPercentage || 10}%)</span>
                      </span>
                    )}

                    {/* Gate Admission Check-In Status */}
                    {!isCancelled && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          booking.checkInStatus === 'CHECKED_IN'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        <QrCode className="w-3 h-3" />
                        <span>{booking.checkInStatus === 'CHECKED_IN' ? 'Admitted' : 'Ready for Entry'}</span>
                      </span>
                    )}

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

                    {/* Action Buttons: View E-Ticket & QR, Download Ticket (PDF) & Cancellation */}
                    <div className="flex flex-wrap items-center gap-2 self-start">
                      <Link
                        to={`/tickets/${booking.bookingReference}`}
                        className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 active:scale-95"
                        title="View Official E-Ticket with Live QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5 text-sky-600" />
                        <span>View E-Ticket & QR</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDownloadTicket(booking)}
                        disabled={downloadingId === booking._id}
                        className="px-3.5 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                        title="Download official admission ticket as PDF"
                      >
                        {downloadingId === booking._id ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                            <span>Generating PDF...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 text-sky-600" />
                            <span>Download Ticket (PDF)</span>
                          </>
                        )}
                      </button>

                      {!isCancelled ? (
                        <button
                          type="button"
                          onClick={() => handleCancelClick(booking)}
                          disabled={actionLoading}
                          className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
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
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                              isCancelled
                                ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                                : booking.isCoupleBooking
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}
                          >
                            {booking.isCoupleBooking && !isCancelled && (
                              <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500 shrink-0" />
                            )}
                            <span>Seat {s.seatNumber}</span>
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
