import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventApi } from '../api/eventApi';
import { holdApi } from '../api/holdApi';
import { bookingApi } from '../api/bookingApi';
import { useAuth } from '../context/AuthContext';
import SeatGrid from '../components/SeatGrid';
import SeatLegend from '../components/SeatLegend';
import CountdownTimer from '../components/CountdownTimer';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import ConfirmDialog from '../components/ConfirmDialog';
import BookingModal from '../components/BookingModal';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, getEventTimingDisplay, isEventOverTime } from '../utils/formatDate';
import {
  Calendar,
  MapPin,
  Ticket,
  Clock,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Tag,
  ArrowLeft,
  Info,
  Users,
  Check
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

  // Direct Booking Modal States
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

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
      // If the URL category parameter differs from the event's actual canonical categorySlug,
      // silently correct the URL in the address bar without reloading
      if (loadedEvent && loadedEvent.categorySlug && category) {
        const canonicalCat = loadedEvent.categorySlug.toLowerCase();
        if (category.toLowerCase() !== canonicalCat) {
          navigate(`/events/${canonicalCat}/${loadedEvent.slug || slug}`, { replace: true });
        }
      }
    };
    initialize();
  }, [fetchSeatsAndDetails, restoreActiveHold, effectiveEventId, category, slug, navigate]);

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

    if (eventStatus === 'Completed') {
      setError('Completed Event! Bookings are closed for this event.');
      return;
    }

    if (isOverTime) {
      setError(`Event Time Over! Booking time has ended. This event closed at ${timing.closeTime}.`);
      return;
    }

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

  // Live timing & seats calculations
  const timing = getEventTimingDisplay(event);
  const isOverTime = timing.isOverTime;
  const rawStatus = event?.eventStatus || event?.status || 'Pending';
  const eventStatus = isOverTime || rawStatus === 'Completed' ? 'Completed' : rawStatus;
  const isCompleted = eventStatus === 'Completed';
  const isPastEvent = isOverTime;
  const STATUS_STEPS = ['Pending', 'In Progress', 'Completed'];
  const stepIdx = STATUS_STEPS.indexOf(eventStatus);
  const safeStepIndex = stepIdx === -1 ? 0 : stepIdx;
  const availableSeatsCount = seats.filter((s) => s.status === 'AVAILABLE').length;
  const totalSeatsCount = event?.totalSeats || seats.length;
  const isSoldOut = availableSeatsCount === 0;
  const canBook = !isCompleted && !isSoldOut;

  // Calculate pricing & seat data
  const myHeldSeatIds = activeHold ? activeHold.seats.map((s) => s.id || s._id) : [];
  const selectedSeatCount = activeHold ? myHeldSeatIds.length : selectedSeatIds.length;
  const totalPrice = activeHold
    ? activeHold.totalAmount
    : selectedSeatCount * (event.pricePerSeat || 0);

  const selectedSeatObjects = activeHold
    ? activeHold.seats
    : seats.filter((s) => selectedSeatIds.includes(s._id));

  // Handle Book Now button click -> Opens BookingModal with summary
  const handleBookNow = () => {
    if (eventStatus === 'Completed') {
      setError('Completed Event! Bookings are closed for this event.');
      return;
    }

    if (isOverTime) {
      setError(`Event Time Over! Booking time has ended. This event closed at ${timing.closeTime}.`);
      return;
    }

    if (!canBook) return;

    if (!isAuthenticated) {
      const returnPath = category && slug ? `/events/${category}/${slug}` : `/events/${event?._id || effectiveEventId}`;
      navigate('/login', { state: { from: { pathname: returnPath } } });
      return;
    }

    if (selectedSeatIds.length === 0) {
      setError('Please select at least 1 seat on the grid to book tickets.');
      return;
    }

    setBookingError('');
    setConfirmedBooking(null);
    setShowBookingModal(true);
  };

  // Confirm Direct Booking inside BookingModal
  const handleConfirmDirectBooking = async () => {
    const currentEventId = event?._id || effectiveEventId;
    if (!currentEventId || selectedSeatIds.length === 0) return;

    try {
      setIsBooking(true);
      setBookingError('');

      const res = await bookingApi.createBooking(currentEventId, selectedSeatIds);
      if (res.success && res.data) {
        setConfirmedBooking(res.data);
        setSelectedSeatIds([]);
        await fetchSeatsAndDetails(true);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Booking confirmation failed. Please try again.';
      setBookingError(msg);
      if (err.response?.status === 409 || err.response?.status === 400) {
        await fetchSeatsAndDetails(true);
      }
    } finally {
      setIsBooking(false);
    }
  };

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

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                {!event.imageUrl && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-100">
                    <Tag className="w-3.5 h-3.5 text-sky-600" />
                    <span>{event.category || 'General Event'}</span>
                  </span>
                )}

                {/* Lifecycle Event Status Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${
                    isCompleted
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : eventStatus === 'In Progress'
                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCompleted
                        ? 'bg-emerald-500'
                        : eventStatus === 'In Progress'
                        ? 'bg-blue-500 animate-pulse'
                        : 'bg-amber-500'
                    }`}
                  />
                  <span>Status: {eventStatus}</span>
                </span>

                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Completed</span>
                  </span>
                ) : isPastEvent ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Event Ended</span>
                  </span>
                ) : isSoldOut ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Sold Out</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Open for Booking</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {event.title}
              </h1>

              {/* Event Attributes Badges: Date, Open Time, Close Time, Venue, Price, Seats */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-slate-700 pt-1">
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                  <span><strong>Date:</strong> {timing.dateStr || formatDate(event.startTime)}</span>
                </div>

                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Open Time:</strong> {timing.openTime}</span>
                </div>

                <div className="flex items-center gap-1.5 bg-purple-50 text-purple-900 px-3 py-1.5 rounded-xl border border-purple-200">
                  <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                  <span><strong>Close Time:</strong> {timing.closeTime}</span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="truncate">{event.venue}</span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <Ticket className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="font-bold text-slate-900">
                    {formatCurrency(event.pricePerSeat)}
                  </span>
                  <span className="text-xs text-slate-500">/seat</span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <Users className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>
                    <strong className="text-slate-900">{totalSeatsCount}</strong> seats
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                      availableSeatsCount > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {availableSeatsCount} seats available
                  </span>
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

          {/* Down a line: Event Lifecycle Progress Tracker (Pending -> In Progress -> Completed) */}
          <div className="pt-4 border-t border-slate-100">
            <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Event Progress Status
                </span>
                <span
                  className={`font-black px-2.5 py-0.5 rounded-full text-xs border ${
                    safeStepIndex === 2
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : safeStepIndex === 1
                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  Current Status: {eventStatus}
                </span>
              </div>

              <div className="relative flex items-center justify-between max-w-md mx-auto px-4 py-2">
                {/* Background Track Line */}
                <div className="absolute top-[18px] left-8 right-8 h-1.5 bg-slate-200 z-0 rounded-full" />

                {/* Filled Progress Line */}
                <div
                  className={`absolute top-[18px] left-8 h-1.5 z-0 rounded-full transition-all duration-700 ${
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
                        ? 'calc(50% - 16px)'
                        : 'calc(100% - 64px)'
                  }}
                />

                {/* Step 1: Pending */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                      safeStepIndex > 0
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-amber-500 text-white ring-4 ring-amber-100 shadow-md scale-105'
                    }`}
                  >
                    {safeStepIndex > 0 ? <Check className="w-4 h-4" /> : '1'}
                  </div>
                  <span
                    className={`text-xs mt-1.5 font-bold ${
                      safeStepIndex === 0 ? 'text-amber-800 font-extrabold' : 'text-slate-700'
                    }`}
                  >
                    Pending
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">Scheduled</span>
                </div>

                {/* Step 2: In Progress */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                      safeStepIndex > 1
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : safeStepIndex === 1
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md scale-105 animate-pulse'
                        : 'bg-white border-2 border-slate-300 text-slate-400'
                    }`}
                  >
                    {safeStepIndex > 1 ? <Check className="w-4 h-4" /> : '2'}
                  </div>
                  <span
                    className={`text-xs mt-1.5 font-bold ${
                      safeStepIndex === 1
                        ? 'text-blue-800 font-extrabold'
                        : safeStepIndex > 1
                        ? 'text-slate-700'
                        : 'text-slate-400'
                    }`}
                  >
                    In Progress
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">Active</span>
                </div>

                {/* Step 3: Completed */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                      safeStepIndex === 2
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-md scale-105'
                        : 'bg-white border-2 border-slate-300 text-slate-400'
                    }`}
                  >
                    {safeStepIndex === 2 ? <Check className="w-4 h-4" /> : '3'}
                  </div>
                  <span
                    className={`text-xs mt-1.5 font-bold ${
                      safeStepIndex === 2 ? 'text-emerald-800 font-extrabold' : 'text-slate-400'
                    }`}
                  >
                    Completed
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">Finished</span>
                </div>
              </div>
            </div>
          </div>

          {/* About This Event: Event Description */}
          {event.description && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-600" />
                <span>About This Event</span>
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Event Timing & Booking Status Banner */}
      {eventStatus === 'Completed' ? (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shadow-sm">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <span>Completed Event</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                Status: Completed
              </span>
            </h4>
            <p className="text-xs text-emerald-800 mt-1">
              This event is completed. Ticket bookings are closed for this event.
            </p>
          </div>
        </div>
      ) : isOverTime ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shadow-sm">
          <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <span>⏰ Event Time Over!</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 border border-rose-300">
                Closed at {timing.closeTime}
              </span>
            </h4>
            <p className="text-xs text-rose-700 mt-1">
              Event booking time has ended. This event closed at <strong>{timing.closeTime}</strong> on {timing.dateStr}. Ticket bookings are over time and no longer available.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/90 border border-emerald-200 text-emerald-950 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-emerald-950">
                  🟢 Seat Bookings Open
                </h4>
              </div>
              <p className="text-xs text-emerald-800 mt-1">
                Event Date: <strong>{timing.dateStr}</strong> • Open Time: <strong>{timing.openTime}</strong> • Close Time: <strong>{timing.closeTime}</strong>
              </p>
            </div>
          </div>
          <div className="text-xs font-extrabold text-emerald-800 bg-emerald-100/90 px-3.5 py-2 rounded-xl border border-emerald-200 shrink-0 self-start sm:self-center flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Bookings open until {timing.closeTime}</span>
          </div>
        </div>
      )}

      {/* Sold Out Banner */}
      {!isPastEvent && isSoldOut && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-amber-900">Sold Out</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              All {totalSeatsCount} seats for this event are fully booked. Check our other upcoming events!
            </p>
          </div>
        </div>
      )}

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
                {canBook
                  ? 'Click up to 4 available seats to book tickets'
                  : 'Seat selection is closed for this event'}
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
              disabled={!canBook || Boolean(activeHold) || actionLoading || isBooking}
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              Clicking an available seat selects it. Use the Book Now button to review your booking summary and confirm tickets.
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

              {/* Automatic Calculation Formula */}
              {selectedSeatCount > 0 && (
                <div className="flex justify-between items-center text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                  <span className="font-medium text-slate-500">Auto Calculation:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedSeatCount} × {formatCurrency(event.pricePerSeat)} = {formatCurrency(totalPrice)}
                  </span>
                </div>
              )}

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
              {eventStatus === 'Completed' ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 border border-slate-300 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Completed Event</span>
                </button>
              ) : isOverTime ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4 text-rose-600" />
                  <span>
                    Event Time Over (Closed at {timing.closeTime})
                  </span>
                </button>
              ) : isSoldOut ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Sold Out - No Seats Available</span>
                </button>
              ) : !activeHold ? (
                <>
                  <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 px-1 pb-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    <span>Seat bookings open now! Closes at {timing.closeTime}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleBookNow}
                    disabled={selectedSeatIds.length === 0 || actionLoading || isBooking}
                    className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                  >
                    {isBooking ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Ticket className="w-4 h-4" />
                        <span>
                          {selectedSeatCount > 0
                            ? `Book Now (${formatCurrency(totalPrice)})`
                            : 'Select Seats to Book'}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleHoldSeats}
                    disabled={selectedSeatIds.length === 0 || actionLoading || isBooking}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hold Seats for 120s First</span>
                  </button>
                </>
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
              Ticket booking provides instant confirmation with atomic seat reservation.
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

      {/* Booking Summary & Confirmation Modal */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setBookingError('');
          if (confirmedBooking) {
            setConfirmedBooking(null);
            setSelectedSeatIds([]);
          }
        }}
        event={event}
        selectedSeats={selectedSeatObjects}
        totalPrice={totalPrice}
        onConfirmBooking={handleConfirmDirectBooking}
        isConfirming={isBooking}
        error={bookingError}
        confirmedBooking={confirmedBooking}
        onViewMyBookings={() => navigate('/my-bookings')}
        onExploreEvents={() => navigate('/events')}
        activeHold={activeHold}
      />
    </div>
  );
};

export default EventDetails;
