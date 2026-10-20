import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Ticket,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
  Clock,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

const BookingModal = ({
  isOpen,
  onClose,
  event,
  selectedSeats = [],
  totalPrice = 0,
  onConfirmBooking,
  isConfirming = false,
  error = '',
  confirmedBooking = null,
  onViewMyBookings,
  onExploreEvents,
  activeHold = null
}) => {
  const [copiedRef, setCopiedRef] = useState(false);

  if (!isOpen) return null;

  const isSuccess = Boolean(confirmedBooking);

  const handleCopyReference = (ref) => {
    if (!ref) return;
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  const seatCount = selectedSeats.length;
  const pricePerSeat = event?.pricePerSeat || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden transition-all duration-300 my-8">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl text-white ${
                isSuccess
                  ? 'bg-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-sky-600 shadow-md shadow-sky-600/20'
              }`}
            >
              {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {isSuccess ? 'Booking Confirmed' : 'Booking Summary'}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors disabled:opacity-50"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {!isSuccess ? (
            /* ========================================================================= */
            /* 1. BOOKING SUMMARY BEFORE CONFIRMATION                                    */
            /* ========================================================================= */
            <>
              {/* Event Name & Category */}
              <div className="space-y-1 border-b border-slate-100 pb-4">
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                  {event?.category || 'Live Event'}
                </span>
                <h4 className="text-xl font-black text-slate-900 tracking-tight mt-1">
                  {event?.title}
                </h4>
              </div>

              {/* Event Details: Date & Venue */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700 block">Date & Time</span>
                    <span>{formatDate(event?.startTime)}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700 block">Venue</span>
                    <span className="truncate block">{event?.venue}</span>
                  </div>
                </div>
              </div>

              {/* Selected Seats Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                  <span>Selected Seats ({seatCount})</span>
                  <span className="text-slate-400">Reserved for your booking</span>
                </div>

                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {selectedSeats.length > 0 ? (
                    selectedSeats.map((s) => (
                      <span
                        key={s._id || s.id || s.seatNumber}
                        className="px-3 py-1 bg-sky-600 text-white font-mono font-bold text-xs rounded-lg shadow-xs"
                      >
                        {s.seatNumber}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No seats selected</span>
                  )}
                </div>
              </div>

              {/* Price Calculation Table */}
              <div className="space-y-2.5 text-xs sm:text-sm border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Ticket Price per Seat</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(pricePerSeat)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Number of Seats</span>
                  <span className="font-semibold text-slate-900">{seatCount} {seatCount === 1 ? 'Seat' : 'Seats'}</span>
                </div>

                <div className="flex justify-between items-center text-slate-500 text-xs italic">
                  <span>Calculation</span>
                  <span>{seatCount} × {formatCurrency(pricePerSeat)}</span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-base">
                  <span className="font-bold text-slate-900">Total Amount</span>
                  <span className="text-2xl font-black text-sky-600">
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Error Banner if confirmation fails */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {error}
                </div>
              )}

              {/* Action Buttons: Confirm Booking & Back */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isConfirming}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={onConfirmBooking}
                  disabled={isConfirming || seatCount === 0}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConfirming ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Confirming Booking...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Booking ({formatCurrency(totalPrice)})</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* ========================================================================= */
            /* 2. SUCCESS SCREEN WITH BOOKING ID                                         */
            /* ========================================================================= */
            <div className="text-center space-y-5 py-2">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                  Booking Confirmed Successfully!
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Your seats have been permanently reserved and confirmed.
                </p>
              </div>

              {/* Booking Reference Card */}
              <div className="p-4 bg-emerald-50/70 border-2 border-dashed border-emerald-300 rounded-2xl max-w-sm mx-auto space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                  Your Booking ID
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono font-black text-xl text-slate-900 tracking-wider">
                    {confirmedBooking.bookingReference}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyReference(confirmedBooking.bookingReference)}
                    className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-lg transition"
                    title="Copy Booking ID"
                  >
                    {copiedRef ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {copiedRef && (
                  <span className="text-[11px] font-semibold text-emerald-700 block">
                    Copied to clipboard!
                  </span>
                )}
              </div>

              {/* Booking Quick Details */}
              <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-left space-y-2 max-w-sm mx-auto">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Event:</span>
                  <span className="font-bold text-slate-800 text-right truncate max-w-[200px]">
                    {event?.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Seats Booked:</span>
                  <span className="font-mono font-bold text-sky-700">
                    {(confirmedBooking.seats || selectedSeats).map((s) => s.seatNumber).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                  <span>Amount Paid:</span>
                  <span className="text-emerald-700">{formatCurrency(confirmedBooking.amount || totalPrice)}</span>
                </div>
              </div>

              {/* Post-Booking Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onViewMyBookings}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Receipt className="w-4 h-4" />
                  <span>View in My Bookings</span>
                </button>

                <button
                  type="button"
                  onClick={onExploreEvents}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  <span>Book Another Event</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
