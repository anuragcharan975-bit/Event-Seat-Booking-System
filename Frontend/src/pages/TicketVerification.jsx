import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ticketApi } from '../api/ticketApi';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatDate';
import { formatCurrency } from '../utils/formatCurrency';
import {
  QrCode,
  Camera,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Calendar,
  MapPin,
  Ticket,
  UserCheck,
  RotateCcw,
  ExternalLink,
  Users,
  Copy,
  Check,
  AlertTriangle,
  Heart
} from 'lucide-react';

const TicketVerification = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, isAdmin } = useAuth();

  // Search and Verification State
  const [referenceInput, setReferenceInput] = useState('');
  const [verifiedTicket, setVerifiedTicket] = useState(null);
  const [ticketStatus, setTicketStatus] = useState(null); // 'Valid' | 'Already Used' | 'Invalid' | 'Ticket Not Found'
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Gate Check-in Action State
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState('');
  const [checkInError, setCheckInError] = useState('');

  // Camera Scanner State
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);

  // Copied indicator
  const [copied, setCopied] = useState(false);

  // Is current logged in user authorized for check-in?
  const isAuthorizedStaff =
    isAuthenticated &&
    (isAdmin ||
      user?.role === 'staff' ||
      user?.role === 'admin' ||
      user?.email === 'anuragcharan975@gmail.com' ||
      user?.email === 'admin909@gmail.com');

  /**
   * Helper to parse scanned QR content (raw reference, JSON payload, or full verification URL)
   */
  const parseBookingReference = (rawContent) => {
    if (!rawContent || typeof rawContent !== 'string') return '';
    const trimmed = rawContent.trim();

    // 1. Check if it's a URL with ?ref= parameter
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const urlObj = new URL(trimmed);
        const paramRef = urlObj.searchParams.get('ref');
        if (paramRef) return paramRef.trim().toUpperCase();

        // Check if URL ends with tickets/BK-...
        const match = trimmed.match(/tickets\/([A-Za-z0-9_-]+)/);
        if (match && match[1]) return match[1].trim().toUpperCase();
      }
    } catch {
      // not a standard URL, continue
    }

    // 2. Check if it's a JSON payload
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.reference) return String(parsed.reference).trim().toUpperCase();
        if (parsed.bookingReference) return String(parsed.bookingReference).trim().toUpperCase();
      } catch {
        // invalid JSON, treat as raw
      }
    }

    // 3. Raw booking reference
    return trimmed.toUpperCase();
  };

  /**
   * Execute ticket verification
   */
  const handleVerify = async (refToVerify) => {
    const targetRef = refToVerify || referenceInput;
    const cleanRef = parseBookingReference(targetRef);

    if (!cleanRef) {
      setErrorMessage('Please enter or scan a valid booking reference.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      setCheckInSuccess('');
      setCheckInError('');
      setVerifiedTicket(null);
      setTicketStatus(null);

      // Keep input synchronized
      setReferenceInput(cleanRef);
      setSearchParams({ ref: cleanRef });

      const response = await ticketApi.verifyTicket(cleanRef);

      if (response.success && response.data) {
        setVerifiedTicket(response.data);
        setTicketStatus(response.data.ticketStatus);
        setStatusMessage(
          response.data.ticketStatus === 'Valid'
            ? 'Confirmed ticket ready for gate admission.'
            : response.data.ticketStatus === 'Already Used'
            ? 'This ticket has already been used for gate admission.'
            : 'This ticket reservation has been cancelled.'
        );
      }
    } catch (err) {
      const status = err.response?.data?.ticketStatus || 'Ticket Not Found';
      const msg =
        err.response?.data?.message ||
        'Ticket Not Found: No reservation exists for this booking reference.';
      setTicketStatus(status);
      setErrorMessage(msg);
      setStatusMessage(msg);
      setVerifiedTicket(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle atomic check-in admission
   */
  const handleCheckIn = async () => {
    if (!verifiedTicket?.bookingReference) return;

    if (!isAuthorizedStaff) {
      setCheckInError('Authorized event staff or admin credentials required to check in tickets.');
      return;
    }

    try {
      setCheckingIn(true);
      setCheckInError('');
      setCheckInSuccess('');

      const response = await ticketApi.checkInTicket(verifiedTicket.bookingReference);

      if (response.success) {
        setCheckInSuccess('Ticket checked in successfully! Gate admission verified.');
        setTicketStatus('Already Used');
        setVerifiedTicket((prev) => ({
          ...prev,
          ticketStatus: 'Already Used',
          checkInStatus: 'CHECKED_IN',
          checkedInAt: response.data?.checkedInAt || new Date().toISOString(),
          checkedInBy: response.data?.checkedInBy || { name: user?.name || 'Staff' }
        }));
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || 'Check-in failed. Please verify ticket status.';
      setCheckInError(errorMsg);

      // If already checked in
      if (err.response?.status === 409) {
        setTicketStatus('Already Used');
        setVerifiedTicket((prev) => (prev ? { ...prev, ticketStatus: 'Already Used' } : null));
      }
    } finally {
      setCheckingIn(false);
    }
  };

  /**
   * Camera QR Scanner Controls
   */
  const startScanner = async () => {
    setScannerError('');
    setIsScannerActive(true);

    try {
      // Small tick to ensure DOM element exists
      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode('qr-reader-container');
          scannerRef.current = html5QrCode;
          isScanningRef.current = true;

          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          };

          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              // Successfully decoded
              const ref = parseBookingReference(decodedText);
              if (ref) {
                stopScanner();
                handleVerify(ref);
              }
            },
            () => {
              // Ignore frame-by-frame parse failures
            }
          );
        } catch (err) {
          console.error('Failed to start camera scanner:', err);
          setScannerError(
            'Could not access camera. Please allow camera permissions or enter the booking reference manually.'
          );
          setIsScannerActive(false);
          isScanningRef.current = false;
        }
      }, 100);
    } catch (outerErr) {
      setScannerError('Unable to initialize scanner.');
      setIsScannerActive(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current && isScanningRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (err) {
      console.warn('Error stopping scanner:', err);
    } finally {
      scannerRef.current = null;
      isScanningRef.current = false;
      setIsScannerActive(false);
    }
  };

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Auto-verify if ?ref= param is present in URL
  useEffect(() => {
    const urlRef = searchParams.get('ref');
    if (urlRef) {
      const clean = parseBookingReference(urlRef);
      setReferenceInput(clean);
      handleVerify(clean);
    }
  }, [searchParams]);

  const handleCopyRef = () => {
    if (!verifiedTicket?.bookingReference) return;
    navigator.clipboard.writeText(verifiedTicket.bookingReference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-sky-50 text-sky-700 border border-sky-100 text-xs font-bold mb-1 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Admission Gatekeeper Portal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Ticket Verification & Check-In
          </h1>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Scan attendee QR code or enter booking reference to verify authenticity and admit guests.
          </p>
        </div>

        {/* Verification Control Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6">
          {/* Manual Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(referenceInput);
            }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter Booking Reference (e.g., BK-20261029-XXXXXX)"
                value={referenceInput}
                onChange={(e) => setReferenceInput(e.target.value.toUpperCase())}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition font-mono font-bold text-slate-900 placeholder:text-slate-400 text-sm tracking-wider"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                disabled={loading || !referenceInput.trim()}
                className="flex-1 sm:flex-none px-6 py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-sky-600/25 transition active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Verify Ticket</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={isScannerActive ? stopScanner : startScanner}
                className={`px-5 py-3.5 rounded-2xl font-bold text-sm border transition flex items-center justify-center gap-2 ${
                  isScannerActive
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{isScannerActive ? 'Stop Camera' : 'Scan QR'}</span>
              </button>
            </div>
          </form>

          {/* Camera Scanner Viewport */}
          {isScannerActive && (
            <div className="border-2 border-dashed border-sky-400/80 rounded-3xl p-6 bg-slate-950/5 text-center space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Camera Scanner Active
                </span>
                <button
                  onClick={stopScanner}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Close Camera
                </button>
              </div>

              {/* Html5Qrcode target element */}
              <div
                id="qr-reader-container"
                className="max-w-sm mx-auto overflow-hidden rounded-2xl border border-slate-300 shadow-inner bg-black min-h-[250px]"
              />

              <p className="text-xs text-slate-500">
                Point device camera directly at the booking admission QR code.
              </p>
            </div>
          )}

          {scannerError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-medium text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{scannerError}</span>
            </div>
          )}
        </div>

        {/* Verification Result Card */}
        {ticketStatus && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden transition-all animate-fadeIn">
            {/* Top Status Banner */}
            <div
              className={`p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                ticketStatus === 'Valid'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white'
                  : ticketStatus === 'Already Used'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                  : 'bg-gradient-to-r from-rose-600 to-rose-700 text-white'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shrink-0">
                  {ticketStatus === 'Valid' && <CheckCircle2 className="w-8 h-8 text-white" />}
                  {ticketStatus === 'Already Used' && <Clock className="w-8 h-8 text-white" />}
                  {(ticketStatus === 'Invalid' || ticketStatus === 'Ticket Not Found') && (
                    <XCircle className="w-8 h-8 text-white" />
                  )}
                </div>
                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white mb-1">
                    Ticket Status
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{ticketStatus}</h2>
                </div>
              </div>

              {/* Status explanation pill */}
              <div className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-white/95 max-w-sm">
                {ticketStatus === 'Valid' &&
                  'Confirmed reservation. Valid for gate entry & admission.'}
                {ticketStatus === 'Already Used' &&
                  'This ticket was already checked in. Duplicate entry disallowed.'}
                {ticketStatus === 'Invalid' &&
                  'This booking has been cancelled and cannot be admitted.'}
                {ticketStatus === 'Ticket Not Found' &&
                  'No booking found matching this reference in system records.'}
              </div>
            </div>

            {/* Check-in Notification Banners */}
            {checkInSuccess && (
              <div className="m-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-bold flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{checkInSuccess}</span>
              </div>
            )}

            {checkInError && (
              <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-semibold flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{checkInError}</span>
              </div>
            )}

            {/* Ticket Details Body (Only present if ticket exists in database) */}
            {verifiedTicket && (
              <div className="p-6 sm:p-8 space-y-6">
                {/* Gatekeeper Couple Ticket Alert */}
                {verifiedTicket.isCoupleBooking && (
                  <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 flex items-start gap-3 animate-fadeIn">
                    <Heart className="w-6 h-6 text-rose-600 fill-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-rose-950 flex items-center gap-2">
                        <span>⚠️ Couple Pass Admission Check: 1 Boy + 1 Girl Mandatory</span>
                      </h4>
                      <p className="text-xs text-rose-800 leading-relaxed font-medium">
                        Ensure <strong>1 Boy and 1 Girl are both physically standing together at the gate</strong>. If the attendee does not have a female companion, <strong>STRICTLY DENY GATE ENTRY</strong>!
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Event info */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Event
                      </span>
                      <h3 className="text-xl font-black text-slate-900 mt-0.5">
                        {verifiedTicket.eventName}
                      </h3>
                      <span className="inline-block text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 mt-1">
                        {verifiedTicket.eventCategory}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                        <span>
                          {verifiedTicket.eventDate
                            ? formatDate(verifiedTicket.eventDate)
                            : 'Date to be announced'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                        <span>{verifiedTicket.eventVenue}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Seats & Reference */}
                  <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Booked Seats ({verifiedTicket.seatCount})
                        </span>
                        {verifiedTicket.isCoupleBooking && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            <Heart className="w-3 h-3 text-rose-600 fill-rose-600" />
                            <span>Couple Ticket</span>
                          </span>
                        )}
                        {verifiedTicket.isGroupBooking && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            <Users className="w-3 h-3" />
                            <span>Group Reservation</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(verifiedTicket.bookedSeats || []).map((seat) => (
                          <span
                            key={seat}
                            className="px-3 py-1 rounded-xl text-xs font-mono font-black bg-slate-900 text-white shadow-2xs"
                          >
                            Seat {seat}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                        Reference Number
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          {verifiedTicket.bookingReference}
                        </span>
                        <button
                          onClick={handleCopyRef}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 transition"
                          title="Copy Reference"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checked-In Audit Trail (if checked in) */}
                {verifiedTicket.checkedInAt && (
                  <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        Admitted at <strong>{formatDate(verifiedTicket.checkedInAt)}</strong>
                        {verifiedTicket.checkedInBy?.name && (
                          <>
                            {' '}
                            by <strong>{verifiedTicket.checkedInBy.name}</strong>
                          </>
                        )}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-bold uppercase text-[10px]">
                      Checked In
                    </span>
                  </div>
                )}

                {/* Staff / Admin Gatekeeper Action Bar */}
                <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    {isAuthorizedStaff ? (
                      <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Logged in as Staff / Admin ({user?.name || 'Authorized'})</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Gatekeeper check-in requires Staff or Admin login.</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* View E-Ticket Link */}
                    <Link
                      to={`/tickets/${verifiedTicket.bookingReference}`}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Full E-Ticket</span>
                    </Link>

                    {/* Atomic Gate Check-In Button */}
                    {ticketStatus === 'Valid' ? (
                      <button
                        onClick={handleCheckIn}
                        disabled={checkingIn || !isAuthorizedStaff}
                        className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/25 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        title={
                          !isAuthorizedStaff
                            ? 'Please sign in with staff or admin account to check in tickets'
                            : 'Check in attendee'
                        }
                      >
                        {checkingIn ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Admitting Attendee...</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4" />
                            <span>Admit & Check In Attendee</span>
                          </>
                        )}
                      </button>
                    ) : ticketStatus === 'Already Used' ? (
                      <button
                        disabled
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 opacity-80 cursor-not-allowed flex items-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Already Admitted</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-100 border border-rose-300 opacity-80 cursor-not-allowed flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Entry Denied (Invalid)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketVerification;
