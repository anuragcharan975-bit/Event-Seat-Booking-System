import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { ticketApi } from '../api/ticketApi';
import { useAuth } from '../context/AuthContext';
import { downloadTicketPdf } from '../utils/ticketPdfGenerator';
import { formatDate } from '../utils/formatDate';
import { formatCurrency } from '../utils/formatCurrency';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import {
  QrCode,
  Calendar,
  MapPin,
  Ticket,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Download,
  Copy,
  Check,
  ArrowLeft,
  ShieldCheck,
  Clock,
  Sparkles,
  ExternalLink,
  Users,
  Heart
} from 'lucide-react';

const TicketDetails = () => {
  const { bookingReference } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fetchTicket = async () => {
    if (!bookingReference) {
      setError('No booking reference provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await ticketApi.verifyTicket(bookingReference);
      if (response.success && response.data) {
        setTicket(response.data);
        generateQrCode(response.data.bookingReference);
      } else {
        setError('Ticket information could not be retrieved.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Unable to load ticket details. Please verify the booking reference.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const generateQrCode = async (ref) => {
    try {
      // Encode verification URL so any standard scanner opens the verification page directly
      const verifyUrl = `${window.location.origin}/verify-ticket?ref=${encodeURIComponent(ref)}`;
      const url = await QRCode.toDataURL(verifyUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 320,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(url);
    } catch (qrErr) {
      console.error('Failed to generate QR code data URL:', qrErr);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [bookingReference]);

  const handleCopy = () => {
    if (!ticket?.bookingReference) return;
    navigator.clipboard.writeText(ticket.bookingReference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!ticket) return;
    try {
      setDownloadingPdf(true);
      await downloadTicketPdf({
        booking: {
          bookingReference: ticket.bookingReference,
          amount: ticket.totalAmount,
          isCoupleBooking: Boolean(ticket.isCoupleBooking),
          createdAt: ticket.bookingDate,
          status: ticket.ticketStatus === 'Invalid' ? 'CANCELLED' : 'CONFIRMED',
          seats: (ticket.bookedSeats || []).map((num) => ({ seatNumber: num })),
          event: {
            title: ticket.eventName,
            venue: ticket.eventVenue,
            startTime: ticket.eventDate,
            endTime: ticket.eventEndDate,
            category: ticket.eventCategory,
            imageUrl: ticket.eventImageUrl
          }
        },
        user
      });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loading message="Loading ticket details..." />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
            <AlertCircle className="w-9 h-9" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Ticket Not Found</h2>
            <p className="text-sm text-slate-600 mt-2">
              {error || `We couldn't find an admission ticket for reference "${bookingReference}".`}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>
            <Link
              to="/verify-ticket"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition shadow-md shadow-sky-600/25 flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>Go to Ticket Verification</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Derive status badge styling
  const getStatusBadge = () => {
    switch (ticket.ticketStatus) {
      case 'Valid':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          label: 'Valid Ticket • Admission Ready',
          desc: 'This ticket is confirmed and ready for gate admission.'
        };
      case 'Already Used':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          icon: <Clock className="w-4 h-4 text-amber-600" />,
          label: 'Already Used • Checked In',
          desc: ticket.checkedInAt
            ? `Admitted on ${formatDate(ticket.checkedInAt)}${ticket.checkedInBy?.name ? ` by ${ticket.checkedInBy.name}` : ''}.`
            : 'This ticket has already been used for gate entry.'
        };
      case 'Invalid':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          icon: <XCircle className="w-4 h-4 text-rose-600" />,
          label: 'Invalid • Reservation Cancelled',
          desc: 'This booking has been cancelled and cannot be used for admission.'
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          icon: <AlertCircle className="w-4 h-4 text-slate-500" />,
          label: ticket.ticketStatus || 'Pending',
          desc: 'Status under review.'
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-700 ${
        ticket.isCoupleBooking
          ? 'bg-gradient-to-b from-rose-50/80 via-pink-50/50 to-rose-100/60'
          : 'bg-gradient-to-b from-slate-50 via-white to-slate-50'
      }`}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/my-bookings')}
            className={`inline-flex items-center gap-2 text-xs font-bold transition ${
              ticket.isCoupleBooking
                ? 'text-rose-700 hover:text-rose-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Bookings</span>
          </button>

          <Link
            to={`/verify-ticket?ref=${encodeURIComponent(ticket.bookingReference)}`}
            className={`inline-flex items-center gap-1.5 text-xs font-bold transition px-3 py-1.5 rounded-xl border ${
              ticket.isCoupleBooking
                ? 'text-rose-700 hover:text-rose-900 bg-rose-50 border-rose-200'
                : 'text-sky-600 hover:text-sky-800 bg-sky-50 border-sky-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify at Gate</span>
          </Link>
        </div>

        {/* Master Ticket Container */}
        <div
          className={`bg-white rounded-3xl overflow-hidden transition-all duration-500 ${
            ticket.isCoupleBooking
              ? 'border-2 border-rose-300 shadow-2xl shadow-rose-500/25 ring-1 ring-rose-200'
              : 'border border-slate-200/90 shadow-2xl'
          }`}
        >
          {/* Ticket Header Banner */}
          <div
            className={`p-6 sm:p-8 text-white relative overflow-hidden ${
              ticket.isCoupleBooking
                ? 'bg-gradient-to-r from-rose-950 via-pink-950 to-rose-900'
                : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900'
            }`}
          >
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-pink-500/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border mb-2 ${
                    ticket.isCoupleBooking
                      ? 'bg-rose-500/30 text-rose-200 border-rose-400/40'
                      : 'bg-white/10 text-sky-300 border-white/10'
                  }`}
                >
                  {ticket.isCoupleBooking ? (
                    <>
                      <Heart className="w-3 h-3 fill-rose-300 text-rose-300" />
                      <span>{ticket.eventCategory} • Official Couple Love Edition Pass</span>
                    </>
                  ) : (
                    `${ticket.eventCategory} • Official E-Ticket`
                  )}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {ticket.eventName}
                </h1>
              </div>

              {/* Status Pill in Header */}
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold backdrop-blur-md self-start sm:self-center shadow-lg ${statusBadge.bg}`}
              >
                {statusBadge.icon}
                <span>{statusBadge.label}</span>
              </div>
            </div>
          </div>

          {/* Ticket Body: Two-Column layout (Left: Details, Right: QR Code) */}
          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Left 2 Columns: Event & Booking Details */}
            <div className="md:col-span-2 space-y-6">
              {/* Event Date & Venue */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      ticket.isCoupleBooking
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-sky-50 text-sky-600'
                    }`}
                  >
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                      Event Date & Time
                    </span>
                    <p className="text-sm font-bold text-slate-900">
                      {ticket.eventDate ? formatDate(ticket.eventDate) : 'Date to be announced'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      ticket.isCoupleBooking
                        ? 'bg-pink-50 text-pink-600'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                      Venue Location
                    </span>
                    <p className="text-sm font-bold text-slate-900">{ticket.eventVenue}</p>
                  </div>
                </div>
              </div>

              {/* Reserved Seats List */}
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <Ticket className="w-4 h-4 text-rose-600" />
                    <span>Reserved Seats ({ticket.seatCount})</span>
                  </div>
                  {ticket.isCoupleBooking && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                      <Heart className="w-3 h-3 text-rose-600 fill-rose-600" />
                      <span>Couple Pass (1 Boy + 1 Girl)</span>
                    </span>
                  )}
                  {ticket.isGroupBooking && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      <Users className="w-3 h-3" />
                      <span>Group Booking</span>
                    </span>
                  )}
                </div>

                {/* Romantic Couple Message Card */}
                {ticket.isCoupleBooking && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-pink-50 to-rose-100/70 border border-rose-200/90 shadow-xs flex items-center gap-3.5">
                    <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-md shadow-rose-500/25 shrink-0 animate-pulse">
                      <Heart className="w-5 h-5 fill-white" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                        <span>A Special Night Made for Two ❤️</span>
                      </h4>
                      <p className="text-xs text-rose-800 italic mt-0.5 leading-relaxed">
                        "Two hearts, one rhythm, and an unforgettable evening under the starlit sky. May your love grow with every melody and beat tonight!" 💑✨
                      </p>
                    </div>
                  </div>
                )}

                {ticket.isCoupleBooking && (
                  <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 space-y-1">
                    <div className="flex items-center gap-1.5 font-black text-rose-800 text-xs">
                      <Heart className="w-4 h-4 text-rose-600 fill-rose-600 shrink-0" />
                      <span>COUPLE PASS • 1 BOY + 1 GIRL MANDATORY AT GATE</span>
                    </div>
                    <p className="text-[11px] text-rose-700 leading-snug">
                      Both boy and girl must arrive together at the admission gate. If you reach the event venue without a female companion, <strong>NO ENTRY</strong> will be permitted inside the event.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {(ticket.bookedSeats || []).map((seat) => (
                    <span
                      key={seat}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-black shadow-xs flex items-center gap-1.5 ${
                        ticket.isCoupleBooking
                          ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-rose-600/20'
                          : 'bg-slate-900 text-white'
                      }`}
                    >
                      {ticket.isCoupleBooking && <Heart className="w-3 h-3 fill-white text-white shrink-0" />}
                      <span>Seat {seat}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Booking Reference Code with Copy button */}
              <div className="border-t border-slate-100 pt-5">
                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-1.5">
                  Booking Reference
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-lg text-slate-900 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    {ticket.bookingReference}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
                    title="Copy Reference"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  {copied && (
                    <span className="text-xs font-bold text-emerald-600 animate-fadeIn">
                      Copied!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: High-Res QR Code Card */}
            <div
              className={`flex flex-col items-center justify-center p-6 rounded-2xl border text-center space-y-3 ${
                ticket.isCoupleBooking
                  ? 'bg-gradient-to-b from-rose-50/60 via-pink-50/30 to-rose-100/40 border-rose-200'
                  : 'bg-slate-50/80 border-slate-200/80'
              }`}
            >
              <span
                className={`text-[11px] font-black uppercase tracking-widest ${
                  ticket.isCoupleBooking ? 'text-rose-600' : 'text-slate-400'
                }`}
              >
                {ticket.isCoupleBooking ? '💖 Gate QR Pass' : 'Gate QR Code'}
              </span>

              {qrCodeUrl ? (
                <div
                  className={`p-3 bg-white rounded-2xl shadow-md border ${
                    ticket.isCoupleBooking ? 'border-rose-200' : 'border-slate-200/80'
                  }`}
                >
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code for ${ticket.bookingReference}`}
                    className="w-44 h-44 object-contain"
                  />
                </div>
              ) : (
                <div className="w-44 h-44 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                  <QrCode className="w-12 h-12 animate-pulse" />
                </div>
              )}

              <p className="text-[11px] text-slate-500 leading-tight max-w-[200px]">
                Scan at gate admission reader or camera to verify entry.
              </p>

              {/* Quick status note */}
              <div className="w-full pt-1">
                <p className="text-[11px] font-medium text-slate-600 italic">
                  {statusBadge.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Ticket Footer Action Bar */}
          <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              <span>Total Paid: </span>
              <span
                className={`font-black ${
                  ticket.isCoupleBooking ? 'text-rose-700' : 'text-slate-900'
                }`}
              >
                {formatCurrency(ticket.totalAmount)}
              </span>
              {ticket.isCoupleBooking && (
                <span className="text-[11px] font-bold text-rose-600 ml-2">
                  (40% Couple Offer Applied)
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleDownload}
                disabled={downloadingPdf}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 ${
                  ticket.isCoupleBooking
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-600/30'
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {downloadingPdf ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download {ticket.isCoupleBooking ? 'Couple PDF Ticket' : 'PDF Ticket'}</span>
                  </>
                )}
              </button>

              <Link
                to={`/verify-ticket?ref=${encodeURIComponent(ticket.bookingReference)}`}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  ticket.isCoupleBooking
                    ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                    : 'text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Verify Gate Entry</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetails;
