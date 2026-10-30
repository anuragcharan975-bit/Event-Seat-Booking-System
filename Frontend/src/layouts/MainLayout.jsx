import React, { Suspense } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Loading from "../components/Loading";
import { Ticket, ShieldCheck, Clock, Sparkles, Heart, CheckCircle2, ArrowRight } from "lucide-react";

const MainLayout = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/system-console-r6t8");
  const isAuthRoute =
    location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-sky-500 selection:text-white relative">
      {!isAdminRoute && <Navbar />}

      <main
        className={`flex-1 w-full ${isAdminRoute || isAuthRoute ? "" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10"}`}
      >
        <Suspense
          fallback={
            <div className="min-h-[45vh] flex items-center justify-center p-8">
              <Loading message="Loading page..." size="md" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      {!isAdminRoute && !isAuthRoute && (
        <footer className="relative mt-20 border-t border-slate-200/80 bg-white/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-100">
              {/* Brand Col */}
              <div className="md:col-span-2 space-y-3.5">
                <Link to="/" className="inline-flex items-center gap-2.5 group">
                  <div className="p-2.5 bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 rounded-2xl text-white shadow-md shadow-sky-600/25 group-hover:scale-105 group-hover:shadow-sky-600/40 transition-all duration-300">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-xl text-slate-900 tracking-tight leading-tight flex items-center gap-0.5">
                      Seat<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">Spot</span>
                    </span>
                    <span className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase -mt-0.5">
                      Live Reservation Engine
                    </span>
                  </div>
                </Link>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm leading-relaxed">
                  Next-generation event seat reservation platform with atomic
                  120-second seat holds, real-time visual seat grids, couple date passes, and
                  guaranteed zero double-bookings.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Real-time Concurrency Engine Active</span>
                </div>
              </div>

              {/* Quick Navigation */}
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3.5">
                  Navigation
                </h4>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                  <li>
                    <Link to="/" className="hover:text-sky-600 transition flex items-center gap-1.5">
                      <span>Home</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/events" className="hover:text-sky-600 transition flex items-center gap-1.5">
                      <span>Browse Events Catalog</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/verify-ticket" className="hover:text-sky-600 transition flex items-center gap-1.5">
                      <span>Gate Ticket Verification</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/my-bookings" className="hover:text-sky-600 transition flex items-center gap-1.5">
                      <span>My Bookings & Passes</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/refund-policy" className="hover:text-sky-600 transition flex items-center gap-1.5">
                      <span>Refund & Gate Policies</span>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Platform Guarantees */}
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3.5">
                  Platform Guarantees
                </h4>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-slate-700">120s Atomic Seat Lock</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-slate-700">Zero Overbooking Protection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                      <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                    </div>
                    <span className="font-semibold text-slate-700">40% Couple Date Passes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-slate-700">Instant PDF & QR Tickets</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
              <p>© {new Date().getFullYear()} SeatSpot Inc. All rights reserved. High-concurrency event seating.</p>
              <div className="flex items-center gap-6">
                <Link to="/refund-policy" className="hover:text-slate-600 transition">
                  Terms of Admission
                </Link>
                <Link to="/refund-policy" className="hover:text-slate-600 transition">
                  Privacy Policy
                </Link>
                <Link to="/verify-ticket" className="hover:text-slate-600 transition">
                  Staff Verification Portal
                </Link>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default MainLayout;
