import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  RefreshCw
} from 'lucide-react';

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

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
      const data = await eventApi.getEventSeats(eventId);
      if (data.success) {
        setEvent(data.event);
        setSeats(data.seats || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load event seat map.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [eventId]);

  // Check for active hold restoration on page load / refresh
  const restoreActiveHold = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await holdApi.getMyHold(eventId);
      if (res.success && res.data) {
        setActiveHold(res.data);
      } else {
        setActiveHold(null);
      }
    } catch (err) {
      // No active hold or expired, ignore
      setActiveHold(null);
    }
  }, [eventId, isAuthenticated]);

  useEffect(() => {
    const initialize = async () => {
      await fetchSeatsAndDetails();
      await restoreActiveHold();
    };
    initialize();
  }, [fetchSeatsAndDetails, restoreActiveHold]);

  // Handle seat toggle
  const handleToggleSeat = (seat) => {
    if (activeHold) return; // Prevent modifying selection while hold is active
    setError('');

    const seatId = seat._id;
    if (selectedSeatIds.includes(seatId)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seatId));
    } else {
      if (selectedSeatIds.length >= 4) {
        setError('You may select a maximum of 4 seats per booking.');
        return;
      }
      setSelectedSeatIds((prev) => [...prev, seatId]);
    }
  };

  // Hold Selected Seats
  const handleHoldSeats = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/events/${eventId}` } } });
      return;
    }

    if (selectedSeatIds.length === 0) {
      setError('Please select at least 1 seat to hold.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccessMessage('');

      const res = await holdApi.createHold(eventId, selectedSeatIds);
      if (res.success) {
        setActiveHold(res.data);
        setSelectedSeatIds([]);
        setSuccessMessage('Seats successfully held! Please confirm within 120 seconds.');
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
        // Successfully confirmed
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
        setSuccessMessage('Held seats have been released back to availability.');
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
    setError('Your 120-second seat hold has expired. The seats have been released.');
    fetchSeatsAndDetails(true);
  };

  if (loading) {
    return <Loading message="Loading event details and seat map..." size="lg" />;
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <ErrorMessage message={error || 'Event not found.'} />
      </div>
    );
  }

  // Calculate pricing
  const myHeldSeatIds = activeHold ? activeHold.seats.map((s) => s.id || s._id) : [];
  const selectedSeatCount = activeHold ? myHeldSeatIds.length : selectedSeatIds.length;
  const totalPrice = activeHold
    ? activeHold.totalAmount
    : selectedSeatCount * (event.pricePerSeat || 0);

  // Selected seat numbers for display
  const selectedSeatLabels = activeHold
    ? activeHold.seats.map((s) => s.seatNumber).join(', ')
    : seats
        .filter((s) => selectedSeatIds.includes(s._id))
        .map((s) => s.seatNumber)
        .join(', ');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Event Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              <span>ACID Transactional Seat Booking</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                <span>{formatDate(event.startTime)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                <span>{event.venue}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="font-semibold text-slate-900">
                  {formatCurrency(event.pricePerSeat)}
                </span>
                <span className="text-xs text-slate-500">/seat</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => fetchSeatsAndDetails(false)}
            title="Refresh availability"
            className="self-start lg:self-center px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Map</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && <ErrorMessage message={error} onRetry={() => fetchSeatsAndDetails(true)} />}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {/* Main Grid & Checkout Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Seat Map */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Select Your Seats</h2>
              <p className="text-xs text-slate-500">Choose 1 to 4 available seats</p>
            </div>
            <SeatLegend />
          </div>

          {/* Seat Grid */}
          <div className="py-4">
            <SeatGrid
              seats={seats}
              selectedSeatIds={selectedSeatIds}
              onToggleSeat={handleToggleSeat}
              myHeldSeatIds={myHeldSeatIds}
              disabled={Boolean(activeHold) || actionLoading}
            />
          </div>
        </div>

        {/* Right Column: Reservation / Hold Panel */}
        <div className="space-y-6 sticky top-24">
          {/* Active Hold Countdown Card */}
          {activeHold && (
            <CountdownTimer
              expiresAt={activeHold.expiresAt}
              serverTime={activeHold.serverTime}
              onExpire={handleHoldExpired}
            />
          )}

          {/* Booking Summary Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Booking Summary
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-slate-600">
                <span>Selected Seats:</span>
                <span className="font-semibold text-slate-900">
                  {selectedSeatLabels || 'None'}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Seat Count:</span>
                <span className="font-semibold text-slate-900">
                  {selectedSeatCount} {selectedSeatCount === 1 ? 'seat' : 'seats'}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Price per seat:</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(event.pricePerSeat)}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="text-base font-bold text-slate-900">Total Amount:</span>
                <span className="text-2xl font-black text-sky-600">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              {!activeHold ? (
                // Step 1: Hold Seats Button
                <button
                  type="button"
                  onClick={handleHoldSeats}
                  disabled={selectedSeatIds.length === 0 || actionLoading}
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      <span>
                        {isAuthenticated
                          ? `Hold ${selectedSeatCount || ''} Seats (120s)`
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
                    className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Pay {formatCurrency(totalPrice)}</span>
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
              Seats are held for exactly 120 seconds. If confirmation is not completed before expiry,
              seats are atomically released.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Releasing Seats */}
      <ConfirmDialog
        isOpen={showReleaseDialog}
        title="Release Held Seats?"
        message="Are you sure you want to release your held seats? They will immediately become available for other customers."
        confirmText="Yes, Release"
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
