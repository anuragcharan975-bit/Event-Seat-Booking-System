import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventApi } from '../api/eventApi';
import { holdApi } from '../api/holdApi';
import { useAuth } from '../context/AuthContext';
import SeatGrid from '../components/SeatGrid';
import SeatLegend from '../components/SeatLegend';
import CountdownTimer from '../components/CountdownTimer';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import {
  Calendar,
  MapPin,
  Ticket,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Tag,
  ArrowLeft,
  Info
} from 'lucide-react';

const EventDetails = () => {
  const { category, slug, eventId: paramEventId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Support direct ObjectId (legacy fallback) or slug params
  const effectiveEventId = paramEventId || (/^[0-9a-fA-F]{24}$/.test(category) ? category : null);

  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [activeHold, setActiveHold] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);

  // Fetch seats and event details
  const fetchSeatsAndDetails = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError('');
      let data;

      if (category && slug) {
        data = await eventApi.getEventBySlug(category, slug);
      } else if (effectiveEventId) {
        data = await eventApi.getEventSeats(effectiveEventId);
      } else {
        setError('Invalid event URL format.');
        if (!isSilent) setLoading(false);
        return null;
      }

      if (data.success) {
        setEvent(data.event);
        setSeats(data.seats || []);
        return data.event;
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 404) {
        setError(msg || 'The requested event could not be found.');
      } else {
        setError(msg || 'Failed to load event seat map.');
      }
      return null;
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [category, slug, effectiveEventId]);

  // Check for active hold restoration on page load / refresh
  const restoreActiveHold = useCallback(async (eventIdToRestore) => {
    if (!isAuthenticated || !eventIdToRestore) return;
    try {
      const res = await holdApi.getMyHold(eventIdToRestore);
      if (res.success && res.data) {
        setActiveHold(res.data);
      } else {
        setActiveHold(null);
      }
    } catch {
      setActiveHold(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const initialize = async () => {
      const loadedEvent = await fetchSeatsAndDetails();
      const eventMongoId = loadedEvent?._id || effectiveEventId;
      if (eventMongoId) {
        await restoreActiveHold(eventMongoId);
      }
    };
    initialize();
  }, [fetchSeatsAndDetails, restoreActiveHold, effectiveEventId]);

  // Handle seat toggle
  const handleToggleSeat = (seat) => {
    if (activeHold) return; // Prevent modifying selection while hold is active
    setError('');

    const seatId = seat._id;
    if (selectedSeatIds.includes(seatId)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seatId));
    } else {
      if (selectedSeatIds.length >= 4) {
        setError('You may select a maximum of 4 seats per booking reservation.');
        return;
      }
      setSelectedSeatIds((prev) => [...prev, seatId]);
    }
  };

  // Hold Selected Seats
  const handleHoldSeats = async () => {
    const currentEventId = event?._id || effectiveEventId;
    if (!currentEventId) return;

    if (!isAuthenticated) {
      const returnPath = category && slug ? `/events/${category}/${slug}` : `/events/${currentEventId}`;
      navigate('/login', { state: { from: { pathname: returnPath } } });
      return;
    }

    if (selectedSeatIds.length === 0) {
      setError('Please select at least 1 seat on the map to hold.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccessMessage('');

      const res = await holdApi.createHold(currentEventId, selectedSeatIds);
      if (res.success) {
        setActiveHold(res.data);
        setSelectedSeatIds([]);
        setSuccessMessage('Seats successfully held for 120 seconds! Please confirm your booking.');
        await fetchSeatsAndDetails(true);
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Failed to hold selected seats.';
      setError(msg);
      // If conflict (409), refresh seat availability immediately
      if (status === 409) {
        setSelectedSeatIds([]);
        await fetchSeatsAndDetails(true);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Hold -> Booking
  const handleConfirmBooking = async () => {
    if (!activeHold) return;

    try {
      setActionLoading(true);
      setError('');

      const res = await holdApi.confirmHold(activeHold.holdId);
      if (res.success) {
        setActiveHold(null);
        setSelectedSeatIds([]);
        navigate('/my-bookings', {
          state: {
            newBookingReference: res.data.bookingReference,
            justBooked: true
          }
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Booking confirmation failed.';
      setError(msg);
      if (err.response?.status === 409) {
        // Expired or seat lost
        setActiveHold(null);
        await fetchSeatsAndDetails(true);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Release Seats
  const handleReleaseSeats = async () => {
    if (!activeHold) return;

    try {
      setActionLoading(true);
      setError('');
      const res = await holdApi.releaseHold(activeHold.holdId);
      if (res.success) {
        setActiveHold(null);
        setSelectedSeatIds([]);
        setShowReleaseDialog(false);
        setSuccessMessage('Held seats have been released back to general availability.');
        await fetchSeatsAndDetails(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to release seat hold.');
    } finally {
      setActionLoading(false);
    }
  };

  // Expiration callback
  const handleHoldExpired = () => {
    setActiveHold(null);
    setError('Your 120-second seat hold has expired. The seats have been returned to general availability.');
    fetchSeatsAndDetails(true);
  };

  if (loading) {
    return <Loading message="Loading event details and interactive seat map..." size="lg" />;
  }

  if (!event) {
    const categoryName = category ? category.charAt(0).toUpperCase() + category.slice(1) : '';
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center animate-fadeIn">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl mx-auto flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Event Not Found</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {error || 'We could not find the event you are looking for. It may have been moved or the URL might be invalid.'}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {category && (
              <Link
                to={`/events/${category.toLowerCase()}`}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Browse {categoryName} Events
              </Link>
            )}
            <Link
              to="/events"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Events</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate pricing & seat data
  const myHeldSeatIds = activeHold ? activeHold.seats.map((s) => s.id || s._id) : [];
  const selectedSeatCount = activeHold ? myHeldSeatIds.length : selectedSeatIds.length;
  const totalPrice = activeHold
    ? activeHold.totalAmount
    : selectedSeatCount * (event.pricePerSeat || 0);

  const selectedSeatObjects = activeHold
    ? activeHold.seats
    : seats.filter((s) => selectedSeatIds.includes(s._id));

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Back button link */}
      <div>
        <Link
          to={category ? `/events/${category.toLowerCase()}` : '/events'}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>
            {category
              ? `Back to ${category.charAt(0).toUpperCase() + category.slice(1)} Events`
              : 'Back to All Events'}
          </span>
        </Link>
      </div>

      {/* Event Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {event.imageUrl && (
          <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-slate-900">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-white">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-xs font-bold border border-white/20">
                <Tag className="w-3.5 h-3.5 text-sky-400" />
                <span>{event.category || 'General Event'}</span>
              </span>
              <span className="text-xl sm:text-2xl font-black bg-black/40 backdrop-blur-md px-3 py-1 rounded-xl border border-white/20">
                {formatCurrency(event.pricePerSeat)} <span className="text-xs font-normal text-slate-300">/ seat</span>
              </span>
            </div>
          </div>
        )}

        <div className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                {!event.imageUrl && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-100">
                    <Tag className="w-3.5 h-3.5 text-sky-600" />
                    <span>{event.category || 'General Event'}</span>
                  </span>
                )}

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ACID Atomic Booking</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {event.title}
              </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                <span>{formatDate(event.startTime)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="truncate">{event.venue}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="font-bold text-slate-900">
                  {formatCurrency(event.pricePerSeat)}
                </span>
                <span className="text-xs text-slate-500">/seat</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => fetchSeatsAndDetails(false)}
            title="Refresh availability"
            className="self-start lg:self-center px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-2 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Seat Map</span>
          </button>
        </div>
      </div>
    </div>

      {/* Notification Banners */}
      {error && <ErrorMessage message={error} onRetry={() => fetchSeatsAndDetails(true)} />}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
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

      {/* Main Grid & Reservation Summary Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Interactive Seat Grid */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Select Seats</h2>
              <p className="text-xs text-slate-500">
                Click up to 4 available seats to reserve them for 120 seconds
              </p>
            </div>
            <SeatLegend />
          </div>

          {/* Seat Grid */}
          <div className="py-2">
            <SeatGrid
              seats={seats}
              selectedSeatIds={selectedSeatIds}
              onToggleSeat={handleToggleSeat}
              myHeldSeatIds={myHeldSeatIds}
              disabled={Boolean(activeHold) || actionLoading}
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              Clicking a seat toggles selection. Once held, your seats are locked for 120 seconds so no other user can book them.
            </span>
          </div>
        </div>

        {/* Right Column: Reservation & Checkout Panel */}
        <div className="space-y-6 sticky top-24">
          {/* Active Hold Countdown Timer Card */}
          {activeHold && (
            <CountdownTimer
              expiresAt={activeHold.expiresAt}
              serverTime={activeHold.serverTime}
              onExpire={handleHoldExpired}
            />
          )}

          {/* Booking Summary Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Reservation Summary</span>
              <span className="text-xs font-semibold text-slate-400">
                {selectedSeatCount} / 4 seats
              </span>
            </h3>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="flex justify-between items-start text-slate-600 gap-2">
                <span className="shrink-0 font-medium">Selected Seats:</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {selectedSeatObjects.length > 0 ? (
                    selectedSeatObjects.map((s) => (
                      <span
                        key={s._id || s.id}
                        className="font-mono font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-xs"
                      >
                        {s.seatNumber}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">None selected</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Price per seat:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(event.pricePerSeat)}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <div>
                  <span className="text-base font-bold text-slate-900 block">Total Amount</span>
                  <span className="text-[11px] text-slate-400">Server verified price</span>
                </div>
                <span className="text-2xl font-black text-sky-600">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {!activeHold ? (
                // Step 1: Hold Seats Button
                <button
                  type="button"
                  onClick={handleHoldSeats}
                  disabled={selectedSeatIds.length === 0 || actionLoading}
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                >
                  {actionLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      <span>
                        {isAuthenticated
                          ? `Hold ${selectedSeatCount || ''} Seat${selectedSeatCount === 1 ? '' : 's'} (120s)`
                          : 'Sign In to Hold Seats'}
                      </span>
                    </>
                  )}
                </button>
              ) : (
                // Step 2: Confirm or Release Held Seats
                <>
                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    disabled={actionLoading}
                    className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
                  >
                    {actionLoading ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Reserve ({formatCurrency(totalPrice)})</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowReleaseDialog(true)}
                    disabled={actionLoading}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all disabled:opacity-50"
                  >
                    Release Held Seats
                  </button>
                </>
              )}
            </div>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Seats are atomically held for exactly 120 seconds. If confirmation is not completed before expiry, seats are safely returned to availability.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Releasing Seats */}
      <ConfirmDialog
        isOpen={showReleaseDialog}
        title="Release Held Seats?"
        message="Are you sure you want to release your held seats? They will immediately become available for other customers."
        confirmText="Yes, Release Seats"
        cancelText="Keep My Hold"
        isDanger={true}
        isLoading={actionLoading}
        onConfirm={handleReleaseSeats}
        onCancel={() => setShowReleaseDialog(false)}
      />
    </div>
  );
};

export default EventDetails;
