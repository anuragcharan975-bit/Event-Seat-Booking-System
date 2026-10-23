import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  RotateCcw,
  Clock,
  HelpCircle,
  CheckCircle2,
  Calendar
} from 'lucide-react';

const RefundPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Breadcrumb Navigation */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-white p-8 sm:p-12 shadow-2xl border border-sky-500/20 text-center sm:text-left">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/15 text-sky-300 text-xs font-semibold mb-4 border border-sky-400/30 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Official Platform Terms & Conditions</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-3 leading-tight">
            Refund & <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-300">Cancellation Policy</span>
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl">
            Please read this policy carefully before completing any ticket bookings or seat reservations on SeatSpot.
          </p>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-6 pt-5 border-t border-white/10 text-xs text-slate-300">
            <span className="font-semibold text-sky-300">Last Updated: October 23, 2026</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span>Version 2.4 — Live Booking Engine</span>
          </div>
        </div>

        {/* Ambient background glow decoration */}
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -top-10 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Policy Content Card */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-md shadow-slate-200/40 space-y-8">
        {/* Section 1: No Refund Policy */}
        <section className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              1. Non-Refundable Ticket Policy
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-10">
            All ticket bookings and seat reservations made through the SeatSpot platform are final and non-refundable. Once a booking is confirmed and seats are allocated, transactions cannot be reversed or refunded for change of mind, scheduling conflicts, accidental reservations, or non-attendance, except where specifically required by applicable statutory consumer protection laws.
          </p>
        </section>

        {/* Section 2: No Payment Returns or Seat Exchanges */}
        <section className="space-y-2 border-t border-slate-100 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 shadow-2xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              2. Seat Exclusivity & No Exchanges
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-10">
            Because seats are atomically locked to each customer's user account using ACID-compliant database transactions to guarantee zero double-bookings, seats cannot be swapped, transferred, or exchanged after confirmation. Please review your seat coordinates and event timings thoroughly before concluding payment.
          </p>
        </section>

        {/* Section 3: Booking Cancellation Behavior */}
        <section className="space-y-2 border-t border-slate-100 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              3. Booking Cancellation Mechanics
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-10">
            Customers may cancel confirmed tickets from their <strong>My Bookings</strong> dashboard. Cancelling a reservation immediately releases the allocated seats back to the general public inventory for other attendees. Voluntary cancellation does not trigger a financial refund.
          </p>
        </section>

        {/* Section 4: Accuracy of Customer Details */}
        <section className="space-y-2 border-t border-slate-100 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              4. Accuracy of Booking Information
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-10">
            Customers are strictly responsible for confirming the accuracy of attendee names, email addresses, event dates, and venue details prior to completing checkout. Inaccurate personal information does not entitle the purchaser to a refund or free rebooking.
          </p>
        </section>

        {/* Section 5: Duplicate or Deducted Payment Issues */}
        <section className="space-y-2 border-t border-slate-100 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              5. Duplicate Charges & Failed Transactions
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-10">
            In rare instances where a payment was successfully debited from your bank account or payment provider but the corresponding ticket was not confirmed (e.g. network disconnect before atomic confirmation), the banking system will automatically reverse the provisional authorization within standard banking timeframes (typically 3 to 7 business days).
          </p>
        </section>

        {/* Section 6: Contact & Support */}
        <section className="space-y-2 border-t border-slate-100 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl border border-slate-200 shadow-2xs">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              6. Support & Inquiries
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-10">
            For questions or discrepancies regarding your booking references, please contact our support team with your booking reference ID, event title, and account email.
          </p>
        </section>

        {/* Important Notice Alert Card */}
        <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-5 sm:p-6 flex items-start gap-3.5 shadow-2xs">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-black text-amber-950">Important Notice Before Booking</h4>
            <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
              By confirming your seat selection and placing a reservation order, you explicitly agree to these Refund & Cancellation Terms. All ticket sales are final and non-refundable.
            </p>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            to="/"
            className="text-xs font-bold text-slate-600 hover:text-sky-600 transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </Link>

          <Link
            to="/events"
            className="px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-md shadow-sky-600/25 transition active:scale-95 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Browse Available Events</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
