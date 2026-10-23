import React from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Ticket, ShieldCheck, Clock, Sparkles } from "lucide-react";

const MainLayout = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/system-console-r6t8");
  const isAuthRoute =
    location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-slate-100/40 to-slate-50 text-slate-800 antialiased selection:bg-sky-500 selection:text-white">
      {!isAdminRoute && <Navbar />}

      <main
        className={`flex-1 w-full ${isAdminRoute || isAuthRoute ? "" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10"}`}
      >
        <Outlet />
      </main>

      {!isAdminRoute && !isAuthRoute && (
        <footer className="bg-white/90 backdrop-blur-md border-t border-slate-200/80 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-100">
              {/* Brand Col */}
              <div className="md:col-span-2 space-y-3">
                <Link to="/" className="inline-flex items-center gap-2.5 group">
                  <div className="p-2 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-xl text-white shadow-md shadow-sky-600/20 group-hover:scale-105 transition-all">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-lg text-slate-900 tracking-tight leading-tight">
                      Seat<span className="text-sky-600">Spot</span>
                    </span>
                    <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase -mt-0.5">
                      Live Reservation Engine
                    </span>
                  </div>
                </Link>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  Next-generation event seat reservation platform with atomic
                  120-second seat holds, real-time visual seat grids, and
                  guaranteed zero double-bookings.
                </p>
                <div className="flex items-center gap-2 pt-1 text-[11px] font-bold text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>All reservation services live and operational</span>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Quick Navigation
                </h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li>
                    <Link to="/" className="hover:text-sky-600 transition">
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/events"
                      className="hover:text-sky-600 transition"
                    >
                      All Events Catalog
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/my-bookings"
                      className="hover:text-sky-600 transition"
                    >
                      My Bookings & E-Tickets
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/refund-policy"
                      className="hover:text-sky-600 transition"
                    >
                      Refund Policy
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Trust Badges */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Platform Guarantees
                </h4>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>120s Atomic Seat Lock</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Zero Double-Booking Guarantee</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Real-time Interactive Grid</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <Link to="/refund-policy" className="hover:text-sky-600 transition">
                      Official Refund Terms
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <p>
                © {new Date().getFullYear()} SeatSpot — High-Concurrency Ticket
                Allocation Engine
              </p>
              <p className="text-[11px] text-slate-400">
                Powered by Node.js, Express, MongoDB Transactions & Tailwind CSS
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default MainLayout;
