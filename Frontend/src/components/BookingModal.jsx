import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Receipt,
  Download,
  Users,
  QrCode,
  Heart
} from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { downloadTicketPdf } from '../utils/ticketPdfGenerator';
import { useAuth } from '../context/AuthContext';

const BookingModal = ({
  isOpen,
  onClose,
  event,
  selectedSeats = [],
  totalPrice = 0,
  originalPrice = 0,
  isGroupBooking = false,
  isCoupleBooking = false,
  discountAmount = 0,
  discountPercentage = 0,
  onConfirmBooking,
  isConfirming = false,
  error = '',
  confirmedBooking = null,
  onViewMyBookings,
  onExploreEvents,
  activeHold = null
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copiedRef, setCopiedRef] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!isOpen) return null;

  const isSuccess = Boolean(confirmedBooking);

  const handleCopyReference = (ref) => {
    if (!ref) return;
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  const handleDownloadPdf = async () => {
    if (!confirmedBooking) return;
    try {
      setDownloadingPdf(true);
      await downloadTicketPdf({
        booking: {
          ...confirmedBooking,
          event: event || confirmedBooking.event,
          seats: confirmedBooking.seats || selectedSeats
        },
        user,
        event
      });
    } catch (err) {
      console.error('Failed to generate ticket PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const seatCount = selectedSeats.length;
  const pricePerSeat = event?.pricePerSeat || 0;
  

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div
        className={`bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-300 my-8 ${
          isCoupleBooking
            ? 'border-2 border-rose-300 shadow-rose-500/20 ring-1 ring-rose-200'
            : 'border border-slate-100'
        }`}
      >
        {/* Modal Top Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between transition-colors ${
            isCoupleBooking
              ? 'bg-gradient-to-r from-rose-900 via-pink-900 to-rose-950 text-white border-rose-800/40'
              : 'bg-slate-50 border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl text-white ${
                isCoupleBooking
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : isSuccess
                  ? 'bg-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-sky-600 shadow-md shadow-sky-600/20'
              }`}
            >
              {isCoupleBooking ? (
                <Heart className="w-5 h-5 fill-white text-white" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Receipt className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3
                className={`text-base sm:text-lg font-black tracking-tight ${
                  isCoupleBooking ? 'text-white' : 'text-slate-900'
                }`}
              >
                {isCoupleBooking
                  ? isSuccess
                    ? '💖 Couple Reservation Confirmed!'
                    : '💖 Couple Love Edition Summary'
                  : isSuccess
                  ? 'Booking Confirmed'
                  : 'Booking Summary'}
              </h3>
              {isCoupleBooking && (
                <span className="text-[11px] text-rose-200 block -mt-0.5 font-semibold">
                  1 Boy + 1 Girl Date Night Pass (40% OFF)
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className={`p-1.5 rounded-xl transition-colors disabled:opacity-50 ${
              isCoupleBooking
                ? 'text-rose-200 hover:text-white hover:bg-white/10'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/60'
            }`}
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
                        className={`px-3 py-1 font-mono font-bold text-xs rounded-lg shadow-xs flex items-center gap-1 ${
                          isCoupleBooking
                            ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white'
                            : 'bg-sky-600 text-white'
                        }`}
                      >
                        {isCoupleBooking && <Heart className="w-3 h-3 fill-white text-white shrink-0" />}
                        <span>Seat {s.seatNumber}</span>
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
                  <span>{seatCount} × {formatCurrency(pricePerSeat)} {discountAmount > 0 ? `(-${formatCurrency(discountAmount)} ${isCoupleBooking ? '40% Couple Offer' : 'Group Discount'})` : ''}</span>
                </div>

                {discountAmount > 0 && (
                  <div className={`flex justify-between items-center px-3 py-2 rounded-xl border text-xs font-bold ${
                    isCoupleBooking
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      {isCoupleBooking ? (
                        <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600 shrink-0" />
                      ) : (
                        <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                      <span>{isCoupleBooking ? 'Couple Offer' : 'Group Discount'} ({discountPercentage || (isCoupleBooking ? 40 : 10)}% OFF)</span>
                    </span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-base">
                  <div>
                    <span className="font-bold text-slate-900 block">Total Amount</span>
                    {discountAmount > 0 && (
                      <span className={`text-[11px] font-semibold ${isCoupleBooking ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isCoupleBooking ? '⚡ 40% Couple Discount Applied' : 'Group Offer Applied'}
                      </span>
                    )}
                  </div>
                  <span className={`text-2xl font-black ${isCoupleBooking ? 'text-rose-600' : 'text-sky-600'}`}>
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Couple Romantic Love Note & Mandatory Admission Policy */}
              {isCoupleBooking && (
                <div className="p-3.5 bg-gradient-to-r from-rose-50 via-pink-50 to-rose-100/70 border-2 border-rose-200 rounded-2xl text-xs text-rose-950 space-y-2 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-black text-rose-900">
                    <Heart className="w-4 h-4 text-rose-600 fill-rose-600 shrink-0 animate-pulse" />
                    <span>A Special Night Made For Two ❤️ (Couple Date Pass)</span>
                  </div>
                  <p className="text-[11px] text-rose-800 italic leading-snug">
                    "Every moment spent together becomes a treasured memory. May this evening bring your hearts even closer!" 💑✨
                  </p>
                  <p className="text-[10px] text-rose-700 font-bold border-t border-rose-200/80 pt-1.5 leading-snug">
                    Gate Policy: 1 Boy + 1 Girl must both arrive together at the gate. If you reach without a female companion, entry is denied with no refund.
                  </p>
                </div>
              )}

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
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={onConfirmBooking}
                  disabled={isConfirming || seatCount === 0}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-white transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isCoupleBooking
                      ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:from-rose-500 hover:to-pink-500 shadow-lg shadow-rose-600/30'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/25'
                  }`}
                >
                  {isConfirming ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Confirming Booking...</span>
                    </>
                  ) : (
                    <>
                      {isCoupleBooking ? (
                        <Heart className="w-4 h-4 fill-white" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Confirm {isCoupleBooking ? 'Couple Booking' : 'Booking'} ({formatCurrency(totalPrice)})</span>
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
              <div
                className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-inner ${
                  confirmedBooking?.isCoupleBooking || isCoupleBooking
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {confirmedBooking?.isCoupleBooking || isCoupleBooking ? (
                  <Heart className="w-9 h-9 fill-rose-600 text-rose-600 animate-pulse" />
                ) : (
                  <CheckCircle2 className="w-9 h-9" />
                )}
              </div>

              <div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                  {confirmedBooking?.isCoupleBooking || isCoupleBooking
                    ? '💖 Couple Reservation Confirmed!'
                    : 'Booking Confirmed Successfully!'}
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {confirmedBooking?.isCoupleBooking || isCoupleBooking
                    ? 'Your couple date seats have been locked for an unforgettable night.'
                    : 'Your seats have been permanently reserved and confirmed.'}
                </p>
              </div>

              {/* Romantic Couple Message on Success */}
              {(confirmedBooking?.isCoupleBooking || isCoupleBooking) && (
                <div className="p-4 bg-gradient-to-r from-rose-50 via-pink-50 to-rose-100 border border-rose-300 rounded-2xl text-rose-950 space-y-1.5 max-w-sm mx-auto shadow-2xs text-center">
                  <div className="flex items-center justify-center gap-1.5 font-black text-rose-900 text-xs">
                    <Heart className="w-4 h-4 text-rose-600 fill-rose-600 shrink-0 animate-pulse" />
                    <span>Two Hearts, One Rhythm • Enjoy Your Date! ❤️</span>
                  </div>
                  <p className="text-[11px] text-rose-800 italic leading-relaxed">
                    "Your couple seats are officially confirmed! Cherish every laugh, melody, and memory together tonight." 💑✨
                  </p>
                  <p className="text-[10px] text-rose-700 font-bold border-t border-rose-200/70 pt-1.5">
                    Admission Rule: 1 Boy + 1 Girl must both arrive together at the gate.
                  </p>
                </div>
              )}

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

              {(confirmedBooking?.isCoupleBooking || isCoupleBooking) && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] font-bold text-rose-800 flex items-center justify-center gap-2 max-w-sm mx-auto shadow-2xs">
                  <Heart className="w-4 h-4 text-rose-600 fill-rose-600 shrink-0" />
                  <span>Couple Pass: Female companion required at the gate for entry!</span>
                </div>
              )}

              {/* Post-Booking Action Buttons */}
              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/tickets/${confirmedBooking.bookingReference}`);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-emerald-950 bg-emerald-100/70 hover:bg-emerald-200/80 border border-emerald-300 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <QrCode className="w-4 h-4 text-emerald-700" />
                  <span>View E-Ticket & QR</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {downloadingPdf ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Ticket (PDF)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onViewMyBookings}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Receipt className="w-4 h-4" />
                  <span>View in My Bookings</span>
                </button>

                <button
                  type="button"
                  onClick={onExploreEvents}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  <span>More Events</span>
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
