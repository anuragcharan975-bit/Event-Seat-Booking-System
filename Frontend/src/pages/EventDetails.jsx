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
import EventReviews from '../components/EventReviews';
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
  Check,
  Star,
  Heart
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
  const [userBookedCount, setUserBookedCount] = useState(0);
  const [seatError, setSeatError] = useState('');
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [isCoupleMode, setIsCoupleMode] = useState(false);
  const [showCoupleModal, setShowCoupleModal] = useState(false);
  const [coupleDisclaimerAgreed, setCoupleDisclaimerAgreed] = useState(false);

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
      if (res.success) {
        if (res.data) {
          setActiveHold(res.data);
        } else {
          setActiveHold(null);
        }
        if (typeof res.userBookedSeatsCount === 'number') {
          setUserBookedCount(res.userBookedSeatsCount);
        }
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

  // Group booking configurations
  const isGroupBookingAvailable = event?.isGroupBookingEnabled !== false;
  const groupMinQuota = event?.groupMinSeats || 10;
  const groupDiscountPct = event?.groupDiscountPercentage || 10;

  // Handle seat toggle
  const handleToggleSeat = (seat) => {
    if (activeHold) return; // Prevent modifying selection while hold is active
    setSeatError('');

    const seatId = seat._id;
    if (selectedSeatIds.includes(seatId)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seatId));
    } else {
      if (isCoupleMode) {
        if (selectedSeatIds.length >= 2) {
          setSeatError('Couple ticket is strictly for 2 people (1 Boy + 1 Girl). You have already selected both seats!');
          return;
        }
      } else if (!isGroupMode) {
        if (userBookedCount >= 4) {
          setSeatError('You already booked your max seats for this event. Maximum limit is 4 seats per event.');
          return;
        }
        const remainingQuota = Math.max(0, 4 - userBookedCount);
        if (selectedSeatIds.length >= remainingQuota) {
          if (userBookedCount > 0) {
            setSeatError(`You have already booked ${userBookedCount} seat(s). You can only select up to ${remainingQuota} more seat(s). Maximum limit is 4 seats per event.`);
          } else {
            setSeatError('You may select a maximum of 4 seats per standard reservation. Switch to Couple Ticket or Group Booking for special offers!');
          }
          return;
        }
      } else {
        // Group Mode: allow selecting up to groupMinQuota (10 seats)
        if (selectedSeatIds.length >= groupMinQuota) {
          setSeatError(`Group booking is set to ${groupMinQuota} seats. You have selected all ${groupMinQuota} seats!`);
          return;
        }
      }
      setSelectedSeatIds((prev) => [...prev, seatId]);
    }
  };

  // Hold Selected Seats
  const handleHoldSeats = async () => {
    const currentEventId = event?._id || effectiveEventId;
    if (!currentEventId) return;

    if (eventStatus === 'Completed') {
      setSeatError('Completed Event! Bookings are closed for this event.');
      return;
    }

    if (isOverTime) {
      setSeatError(`Event Time Over! Booking time has ended. This event closed at ${timing.closeTime}.`);
      return;
    }

    if (!isGroupMode && userBookedCount >= 4) {
      setSeatError('You already booked your max seats for this event. Maximum limit is 4 seats per event.');
      return;
    }

    const remainingQuota = Math.max(0, 4 - userBookedCount);
    if (!isGroupMode && selectedSeatIds.length > remainingQuota) {
      setSeatError(`You can only book up to ${remainingQuota} more seat(s) for this event. Maximum limit is 4 seats per event.`);
      return;
    }

    if (isGroupMode && selectedSeatIds.length < groupMinQuota) {
      setSeatError(`Please select ${groupMinQuota} seats on the grid to complete your Group Booking (currently selected: ${selectedSeatIds.length}/${groupMinQuota}).`);
      return;
    }

    if (isCoupleMode) {
      if (!coupleDisclaimerAgreed) {
        setShowCoupleModal(true);
        return;
      }
      if (selectedSeatIds.length !== 2) {
        setSeatError('Please select exactly 2 seats on the grid for 1 Boy and 1 Girl to book your Couple Ticket.');
        return;
      }
    }

    if (!isAuthenticated) {
      const returnPath = category && slug ? `/events/${category}/${slug}` : `/events/${currentEventId}`;
      navigate('/login', { state: { from: { pathname: returnPath } } });
      return;
    }

    if (selectedSeatIds.length === 0) {
      setSeatError('Please select at least 1 seat on the map to hold.');
      return;
    }

    try {
      setActionLoading(true);
      setSeatError('');
      setSuccessMessage('');

      const res = await holdApi.createHold(currentEventId, selectedSeatIds, {
        isCoupleBooking: isCoupleMode,
        coupleDisclaimerAccepted: isCoupleMode ? coupleDisclaimerAgreed : false
      });
      if (res.success) {
        setActiveHold(res.data);
        setSelectedSeatIds([]);
        setSuccessMessage('Seats successfully held for 120 seconds! Please confirm your booking.');
        await fetchSeatsAndDetails(true);
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Failed to hold selected seats.';
      setSeatError(msg);
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
        const bookedCount = activeHold.seats ? activeHold.seats.length : 0;
        setUserBookedCount((prev) => prev + bookedCount);
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
  const isMaxSeatsReached = userBookedCount >= 4 && !isGroupMode;
  const canBook = !isCompleted && !isSoldOut && (!isMaxSeatsReached || isGroupMode);

  // Calculate pricing & seat data (with Group Discount for 10+ seats, or Couple Discount for 2 seats)
  const isCoupleBookingAvailable = event?.isCoupleTicketEnabled !== false;
  const coupleDiscountPct = event?.coupleDiscountPercentage != null ? event.coupleDiscountPercentage : 40;

  const myHeldSeatIds = activeHold ? activeHold.seats.map((s) => s.id || s._id) : [];
  const selectedSeatCount = activeHold ? myHeldSeatIds.length : selectedSeatIds.length;

  const isGroupApplied = Boolean(
    activeHold?.isGroupBooking ||
    (isGroupBookingAvailable && (selectedSeatCount >= groupMinQuota || (isGroupMode && selectedSeatCount >= groupMinQuota)))
  );

  const isCoupleApplied = Boolean(
    activeHold?.isCoupleBooking ||
    (isCoupleBookingAvailable && isCoupleMode && selectedSeatCount === 2)
  );

  const pricePerSeat = event?.pricePerSeat || 0;
  const originalTotalPrice = activeHold?.originalAmount || (selectedSeatCount * pricePerSeat);
  
  let activeDiscountPct = 0;
  if (isGroupApplied) {
    activeDiscountPct = activeHold?.discountPercentage || groupDiscountPct;
  } else if (isCoupleApplied) {
    activeDiscountPct = activeHold?.discountPercentage || coupleDiscountPct;
  }

  const discountAmount = (isGroupApplied || isCoupleApplied)
    ? (activeHold?.discountAmount || Math.round((originalTotalPrice * activeDiscountPct) / 100))
    : 0;
  const totalPrice = activeHold?.totalAmount != null
    ? activeHold.totalAmount
    : (originalTotalPrice - discountAmount);

  const selectedSeatObjects = activeHold
    ? activeHold.seats
    : seats.filter((s) => selectedSeatIds.includes(s._id));

  // Handle Book Now button click -> Opens BookingModal with summary
  const handleBookNow = () => {
    setSeatError('');

    if (eventStatus === 'Completed') {
      setSeatError('Completed Event! Bookings are closed for this event.');
      return;
    }

    if (isOverTime) {
      setSeatError(`Event Time Over! Booking time has ended. This event closed at ${timing.closeTime}.`);
      return;
    }

    if (!isGroupMode && userBookedCount >= 4) {
      setSeatError('You already booked your max seats for this event. Maximum limit is 4 seats per event.');
      return;
    }

    const remainingQuota = Math.max(0, 4 - userBookedCount);
    if (!isGroupMode && selectedSeatIds.length > remainingQuota) {
      setSeatError(`You can only book up to ${remainingQuota} more seat(s) for this event. Maximum limit is 4 seats per event.`);
      return;
    }

    if (isGroupMode && selectedSeatIds.length < groupMinQuota) {
      setSeatError(`Please select ${groupMinQuota} seats on the grid to complete your Group Booking (currently selected: ${selectedSeatIds.length}/${groupMinQuota}).`);
      return;
    }

    if (isCoupleMode) {
      if (!coupleDisclaimerAgreed) {
        setShowCoupleModal(true);
        return;
      }
      if (selectedSeatIds.length !== 2) {
        setSeatError('Please select exactly 2 seats on the grid for 1 Boy and 1 Girl to book your Couple Ticket.');
        return;
      }
    }

    if (!canBook) return;

    if (!isAuthenticated) {
      const returnPath = category && slug ? `/events/${category}/${slug}` : `/events/${event?._id || effectiveEventId}`;
      navigate('/login', { state: { from: { pathname: returnPath } } });
      return;
    }

    if (selectedSeatIds.length === 0) {
      setSeatError('Please select at least 1 seat on the grid to book tickets.');
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

      const res = await bookingApi.createBooking(currentEventId, selectedSeatIds, {
        isCoupleBooking: isCoupleMode,
        coupleDisclaimerAccepted: isCoupleMode ? coupleDisclaimerAgreed : false
      });
      if (res.success && res.data) {
        setConfirmedBooking(res.data);
        const bookedCount = res.data.seats ? res.data.seats.length : selectedSeatIds.length;
        setUserBookedCount((prev) => prev + bookedCount);
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
    <div
      className={`space-y-8 animate-fadeIn relative transition-all duration-700 ${
        isCoupleMode
          ? 'bg-gradient-to-b from-rose-50/80 via-pink-50/40 to-rose-100/50 -mx-2 sm:-mx-4 px-2 sm:px-4 py-4 rounded-3xl'
          : ''
      }`}
    >
      {/* Floating Hearts & Ambient Romantic Background when Couple Mode is active */}
      {isCoupleMode && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-12 left-10 w-80 h-80 bg-rose-300/20 rounded-full blur-3xl animate-pulseRomantic" />
          <div className="absolute bottom-12 right-10 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl animate-pulseRomantic" />
          {[...Array(12)].map((_, i) => (
            <span
              key={i}
              className="absolute text-rose-400/40 select-none pointer-events-none animate-floatSlow"
              style={{
                left: `${(i * 8.2 + 3) % 94}%`,
                bottom: '-24px',
                animationDelay: `${(i * 0.45) % 4}s`,
                fontSize: `${16 + (i % 4) * 8}px`
              }}
            >
              {i % 3 === 0 ? '❤️' : i % 3 === 1 ? '💖' : '💕'}
            </span>
          ))}
        </div>
      )}

      {/* Back button link */}
      <div className="relative z-10">
        <Link
          to={category ? `/events/${category.toLowerCase()}` : '/events'}
          className={`inline-flex items-center gap-1.5 text-xs font-bold transition ${
            isCoupleMode
              ? 'text-rose-700 hover:text-rose-900'
              : 'text-slate-500 hover:text-sky-600'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>
            {category
              ? `Back to ${category.charAt(0).toUpperCase() + category.slice(1)} Events`
              : 'Back to All Events'}
          </span>
        </Link>
      </div>

      {/* Romantic Couple Mode Top Banner */}
      {isCoupleMode && (
        <div className="relative z-10 overflow-hidden rounded-3xl bg-gradient-to-r from-rose-950 via-pink-900 to-rose-900 text-white p-5 sm:p-6 shadow-xl border border-rose-300/40 animate-fadeIn">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/10 rounded-2xl border border-white/20 text-rose-300 shadow-inner shrink-0 animate-pulse">
                <Heart className="w-6 h-6 fill-rose-400 text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider bg-rose-500 text-white px-2.5 py-0.5 rounded-full border border-rose-300 shadow-xs">
                    💖 Couple Love Edition
                  </span>
                  <span className="text-xs font-bold text-rose-200">
                    Special Date Night Offer • {coupleDiscountPct}% OFF
                  </span>
                </div>
                <p className="text-sm font-semibold text-rose-100 mt-1 italic">
                  "Two souls, one rhythm, and an unforgettable evening under the lights. Celebrate your love tonight!" 💑✨
                </p>
              </div>
            </div>
            <div className="px-3.5 py-1.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-xs font-bold text-rose-200 self-start sm:self-center shrink-0">
              <span>Strictly 1 Boy + 1 Girl at Gate</span>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />
        </div>
      )}

      {/* Event Header Card */}
      <div
        className={`relative z-10 rounded-3xl border overflow-hidden shadow-md transition-all duration-500 ${
          isCoupleMode
            ? 'bg-white/95 border-rose-300 shadow-rose-400/20 ring-2 ring-rose-200/50'
            : 'bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-slate-200/40'
        }`}
      >
        {event.imageUrl && (
          <div className="relative h-48 sm:h-72 w-full overflow-hidden bg-slate-950">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-5 left-6 right-6 flex items-center justify-between text-white">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-xs font-bold border border-white/20 shadow-inner">
                <Tag className="w-3.5 h-3.5 text-sky-400" />
                <span>{event.category || 'General Event'}</span>
              </span>
              <span className="text-xl sm:text-2xl font-black bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-white/20 shadow-inner">
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

              {/* Event Attributes Badges: Date, Open Time, Close Time, Venue, Price, Seats, Rating */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-slate-700 pt-1">
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 px-3 py-1.5 rounded-xl border border-amber-200">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
                  <span className="font-bold">
                    {event.averageRating > 0 ? `${event.averageRating.toFixed(1)} / 5` : '⭐ Reviews'}
                  </span>
                  {event.totalReviews > 0 ? (
                    <span className="text-xs text-amber-700">({event.totalReviews})</span>
                  ) : (
                    <span className="text-[11px] text-amber-600">Be first to rate</span>
                  )}
                </div>

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

      {/* Maximum Seat Limit Banner */}
      {isMaxSeatsReached && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shadow-sm">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <span>Maximum Limit Reached</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                4 / 4 Seats Booked
              </span>
            </h4>
            <p className="text-xs text-amber-800 mt-1">
              You already booked your max seats for this event. Maximum limit is 4 seats per event.
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
        <div
          className={`lg:col-span-2 rounded-3xl border p-6 sm:p-8 space-y-6 transition-all duration-500 ${
            isCoupleMode
              ? 'bg-white/95 border-rose-300 shadow-xl shadow-rose-300/25 ring-2 ring-rose-200/50'
              : 'bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-md shadow-slate-200/40'
          }`}
        >
          {/* Special Offers & Mode Switcher (Group & Couple Tickets) */}
          {(isGroupBookingAvailable || isCoupleBookingAvailable) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50 to-sky-50 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 ${
                  isCoupleMode
                    ? 'bg-rose-500 text-white shadow-rose-500/20'
                    : isGroupMode
                    ? 'bg-amber-500 text-white shadow-amber-500/20'
                    : 'bg-sky-500 text-white shadow-sky-500/20'
                }`}>
                  {isCoupleMode ? (
                    <Heart className="w-5 h-5 fill-white" />
                  ) : isGroupMode ? (
                    <Users className="w-5 h-5" />
                  ) : (
                    <Ticket className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {isCoupleMode
                        ? 'Couple Ticket Mode'
                        : isGroupMode
                        ? 'Group Booking Offer'
                        : 'Choose Booking Option'}
                    </span>
                    {isCoupleMode && coupleDiscountPct > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs">
                        {coupleDiscountPct}% COUPLE OFF
                      </span>
                    )}
                    {isGroupMode && groupDiscountPct > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-xs">
                        {groupDiscountPct}% GROUP OFF
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {isCoupleMode ? (
                      <span>Strictly <strong>1 Boy + 1 Girl</strong> • Must arrive together at gate for entry</span>
                    ) : isGroupMode ? (
                      <span>Book <strong>{groupMinQuota} seats</strong> & get <strong>{groupDiscountPct}% OFF</strong> on your tickets!</span>
                    ) : (
                      <span>Select Standard, Couple Pass, or Group Booking for special admission offers</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Mode Toggle Pills */}
              <div className="inline-flex p-1 bg-white/90 rounded-xl border border-slate-200/90 shadow-xs shrink-0 self-start sm:self-auto flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsCoupleMode(false);
                    setIsGroupMode(false);
                    setSeatError('');
                    if (selectedSeatIds.length > 4) {
                      setSelectedSeatIds(selectedSeatIds.slice(0, 4));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    !isGroupMode && !isCoupleMode
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Standard (1–4)
                </button>

                {isCoupleBookingAvailable && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!coupleDisclaimerAgreed) {
                        setShowCoupleModal(true);
                      } else {
                        setIsCoupleMode(true);
                        setIsGroupMode(false);
                        setSeatError('');
                        if (selectedSeatIds.length > 2) {
                          setSelectedSeatIds(selectedSeatIds.slice(0, 2));
                        }
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isCoupleMode
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isCoupleMode ? 'fill-white' : 'text-rose-600 fill-rose-600'}`} />
                    <span>Couple (1 Boy + 1 Girl)</span>
                  </button>
                )}

                {isGroupBookingAvailable && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCoupleMode(false);
                      setIsGroupMode(true);
                      setSeatError('');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isGroupMode
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Group ({groupMinQuota} People)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Couple Mode Mandatory Warning Alert Box */}
          {isCoupleMode && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-200/70 rounded-xl shrink-0 mt-0.5">
                  <Heart className="w-5 h-5 text-rose-700 fill-rose-700" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider flex items-center gap-2">
                    <span>⚠️ Couple Ticket Entry Condition: Must be 1 Boy & 1 Girl</span>
                  </h4>
                  <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                    This ticket is only for a couple. When you buy this ticket and reach the event venue, if you do not have a girl standing with you, <strong>NO ENTRY</strong> will be permitted inside the event under any circumstance!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCoupleModal(true)}
                className="px-3 py-1.5 rounded-xl bg-white text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition shrink-0"
              >
                Read Gate Policy
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isCoupleMode
                  ? 'Couple Ticket (Select 2 Seats for 1 Boy + 1 Girl)'
                  : isGroupMode
                  ? `Group Booking (${groupMinQuota} Seats)`
                  : 'Select Seats'}
              </h2>
              <p className="text-xs text-slate-500">
                {canBook
                  ? isCoupleMode
                    ? 'Select exactly 2 seats on the grid for your couple pass (1 Boy & 1 Girl required at gate)'
                    : isGroupMode
                    ? `Select ${groupMinQuota} available seats on the map to unlock your ${groupDiscountPct}% group discount`
                    : 'Click up to 4 available seats to book tickets'
                  : 'Seat selection is closed for this event'}
              </p>
            </div>
            <SeatLegend isCoupleMode={isCoupleMode} />
          </div>

          {/* In-place Seat Selection Error Alert */}
          {seatError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold text-rose-950 block">Seat Limit / Selection Alert</span>
                  <span className="font-semibold text-rose-800">{seatError}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSeatError('')}
                className="text-rose-700 hover:text-rose-900 text-xs font-bold p-1 rounded-lg hover:bg-rose-100 transition shrink-0"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Seat Grid */}
          <div className="py-2">
            <SeatGrid
              seats={seats}
              selectedSeatIds={selectedSeatIds}
              onToggleSeat={handleToggleSeat}
              myHeldSeatIds={myHeldSeatIds}
              disabled={!canBook || Boolean(activeHold) || actionLoading || isBooking}
              isCoupleMode={isCoupleMode}
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
          <div
            className={`rounded-3xl border p-6 shadow-lg space-y-6 transition-all duration-500 ${
              isCoupleMode
                ? 'bg-gradient-to-b from-white via-rose-50/40 to-pink-50/50 border-2 border-rose-300 shadow-rose-300/30 ring-1 ring-rose-200'
                : 'bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-slate-200/50'
            }`}
          >
            <h3
              className={`text-base font-bold border-b pb-3 flex items-center justify-between ${
                isCoupleMode
                  ? 'text-rose-950 border-rose-100'
                  : 'text-slate-900 border-slate-100'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {isCoupleMode && <Heart className="w-4 h-4 fill-rose-500 text-rose-500 animate-pulse" />}
                <span>{isCoupleMode ? 'Couple Date Reservation' : 'Reservation Summary'}</span>
              </span>
              <span className={`text-xs font-semibold ${isCoupleMode ? 'text-rose-700' : 'text-slate-400'}`}>
                {isGroupMode
                  ? `${selectedSeatCount} / ${groupMinQuota} group seats`
                  : isCoupleMode
                  ? `${selectedSeatCount} / 2 couple seats`
                  : `${userBookedCount > 0 ? `${userBookedCount}/4 booked • ` : ''}${selectedSeatCount} / ${Math.max(0, 4 - userBookedCount)} seats`}
              </span>
            </h3>

            {/* In-place Seat Error Alert inside Summary */}
            {seatError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 animate-fadeIn">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{seatError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSeatError('')}
                  className="text-rose-600 hover:text-rose-800 font-bold text-xs p-0.5"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            )}

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
                  <span className="font-medium text-slate-500">Base Calculation:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedSeatCount} × {formatCurrency(event.pricePerSeat)} = {formatCurrency(originalTotalPrice)}
                  </span>
                </div>
              )}

              {/* Group or Couple Discount Deduction Row */}
              {isGroupApplied && discountAmount > 0 && (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 animate-fadeIn">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Group Offer ({activeDiscountPct}% OFF):</span>
                  </span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              {isCoupleApplied && discountAmount > 0 && (
                <div className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 animate-fadeIn">
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600 shrink-0" />
                    <span>Couple Offer ({activeDiscountPct}% OFF):</span>
                  </span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              {/* Couple Romantic Message & Policy Banner in Summary */}
              {isCoupleMode && (
                <div className="p-3.5 bg-gradient-to-r from-rose-50 via-pink-50 to-rose-100/70 border border-rose-300/80 rounded-2xl text-xs text-rose-950 space-y-2 animate-fadeIn shadow-2xs">
                  <div className="flex items-center gap-1.5 font-black text-rose-900">
                    <Heart className="w-4 h-4 text-rose-600 fill-rose-600 shrink-0 animate-pulse" />
                    <span>A Special Night Made For Two ❤️</span>
                  </div>
                  <p className="text-[11px] text-rose-800 italic leading-relaxed">
                    "Every moment spent together becomes a treasured memory. May this evening bring your hearts even closer!" 💑✨
                  </p>
                  <div className="pt-1.5 border-t border-rose-200/70 flex items-center justify-between text-[10px] text-rose-700 font-extrabold">
                    <span>⚡ 40% Couple Offer Applied</span>
                    <span>1 Boy + 1 Girl Mandatory</span>
                  </div>
                </div>
              )}

              {/* Celebration Banner for Group Mode */}
              {isGroupMode && selectedSeatCount < groupMinQuota && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-semibold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Select {groupMinQuota - selectedSeatCount} more seat(s) to unlock {groupDiscountPct}% discount!</span>
                </div>
              )}

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <div>
                  <span className="text-base font-bold text-slate-900 block">Total Amount</span>
                  <span className="text-[11px] text-slate-400">
                    {discountAmount > 0
                      ? isCoupleMode
                        ? `Saved ${formatCurrency(discountAmount)} with 40% Couple Discount`
                        : `Saved ${formatCurrency(discountAmount)} with Group Discount`
                      : 'Server verified price'}
                  </span>
                </div>
                <span
                  className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${
                    isCoupleMode
                      ? 'from-rose-600 via-pink-600 to-rose-600'
                      : 'from-sky-600 to-indigo-600'
                  }`}
                >
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {isMaxSeatsReached ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-amber-900 bg-amber-100 border border-amber-300 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span>You already booked your max seat (4/4)</span>
                </button>
              ) : eventStatus === 'Completed' ? (
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
                  <div className={`text-xs font-semibold flex items-center gap-1.5 px-1 pb-0.5 ${
                    isCoupleMode ? 'text-rose-700' : 'text-emerald-700'
                  }`}>
                    <span className={`w-2 h-2 rounded-full animate-ping shrink-0 ${
                      isCoupleMode ? 'bg-rose-500' : 'bg-emerald-500'
                    }`} />
                    <span>
                      {isCoupleMode
                        ? `Couple seats open! Special 40% discount applied.`
                        : `Seat bookings open now! Closes at ${timing.closeTime}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleBookNow}
                    disabled={selectedSeatIds.length === 0 || actionLoading || isBooking}
                    className={`w-full py-3.5 px-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${
                      isCoupleMode
                        ? 'text-white bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:from-rose-500 hover:to-pink-500 shadow-lg shadow-rose-600/30 ring-2 ring-rose-300/40'
                        : 'text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-lg shadow-sky-600/25'
                    }`}
                  >
                    {isBooking ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {isCoupleMode ? (
                          <Heart className="w-4 h-4 fill-white" />
                        ) : (
                          <Ticket className="w-4 h-4" />
                        )}
                        <span>
                          {isCoupleMode
                            ? selectedSeatCount === 2
                              ? `Book Couple Pass (${formatCurrency(totalPrice)})`
                              : 'Select 2 Seats for Couple Pass'
                            : selectedSeatCount > 0
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
                    className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${
                      isCoupleMode
                        ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                        : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80'
                    }`}
                  >
                    {isCoupleMode ? (
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                    )}
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
                    className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
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
                    className="w-full py-2.5 px-4 rounded-2xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all disabled:opacity-50 active:scale-[0.98]"
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

      {/* Customer Reviews & Ratings Section */}
      <EventReviews eventId={event?._id || effectiveEventId} eventTitle={event?.title} />

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
        originalPrice={originalTotalPrice}
        isGroupBooking={isGroupApplied}
        isCoupleBooking={isCoupleApplied || isCoupleMode || Boolean(activeHold?.isCoupleBooking)}
        discountAmount={discountAmount}
        discountPercentage={activeDiscountPct}
        onConfirmBooking={handleConfirmDirectBooking}
        isConfirming={isBooking}
        error={bookingError}
        confirmedBooking={confirmedBooking}
        onViewMyBookings={() => navigate('/my-bookings')}
        onExploreEvents={() => navigate('/events')}
        activeHold={activeHold}
      />

      {/* Strict Couple Admission Condition Modal */}
      {showCoupleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-lg w-full overflow-hidden transition-all duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                  <Heart className="w-5 h-5 text-white fill-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">Strict Couple Ticket Policy</h3>
                  <span className="text-[11px] text-rose-100 font-semibold block -mt-0.5">1 Boy + 1 Girl Entry Requirement</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCoupleModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Important Warning Banner */}
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 space-y-2">
                <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>CONDITION: MUST BE 1 GIRL && 1 BOY • NO OTHER ENTRY ALLOWED</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-rose-900 leading-relaxed">
                  This ticket is strictly for a couple (1 Boy + 1 Girl). Single attendees, all-male groups, or other combinations are not permitted to book or enter with this ticket.
                </p>
              </div>

              {/* Strict Gate Notice */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 space-y-2 text-xs sm:text-sm">
                <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                  <span>Gate Admission Rule:</span>
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  When you buy this ticket and reach the event venue, both partners must stand together at the gate.
                  <strong className="text-rose-700 block mt-1.5 p-2 bg-rose-100/70 rounded-xl border border-rose-200">
                    If you arrive at the event and do not have a girl standing with you, NO ENTRY will be permitted inside the event under any circumstance, and no refund will be issued!
                  </strong>
                </p>
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200 cursor-pointer hover:bg-rose-50 transition">
                <input
                  type="checkbox"
                  checked={coupleDisclaimerAgreed}
                  onChange={(e) => setCoupleDisclaimerAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 shrink-0 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 leading-tight">
                  I understand and agree that this is strictly a couple ticket (1 Boy & 1 Girl). I confirm I will reach the venue with a female companion, and understand entry will be denied without her with NO refund.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCoupleModal(false);
                    setIsCoupleMode(false);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancel / Choose Standard Ticket
                </button>
                <button
                  type="button"
                  disabled={!coupleDisclaimerAgreed}
                  onClick={() => {
                    setIsCoupleMode(true);
                    setIsGroupMode(false);
                    setShowCoupleModal(false);
                    setSeatError('');
                    if (selectedSeatIds.length > 2) {
                      setSelectedSeatIds(selectedSeatIds.slice(0, 2));
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-rose-600/25 transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Heart className="w-4 h-4 fill-white" />
                  <span>I Agree & Select Couple Seats (2 Seats)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetails;
