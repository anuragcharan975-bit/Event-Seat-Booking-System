import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';
import {
  Ticket,
  User,
  LogOut,
  Calendar,
  BookmarkCheck,
  ShieldCheck,
  Home,
  Menu,
  X,
  Sparkles,
  QrCode
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Automatically close mobile menu and ensure view resets on route changes
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
    setMobileMenuOpen(false);
  };

  const handleConfirmLogout = () => {
    setShowLogoutDialog(false);
    logout();
    navigate('/login');
  };

  const isHomeActive = location.pathname === '/';
  const isEventsActive = location.pathname === '/events' || location.pathname.startsWith('/events/');
  const isBookingsActive = location.pathname === '/my-bookings';
  const isProfileActive = location.pathname === '/profile';
  const isAdminActive = location.pathname.startsWith('/system-console-r6t8');
  const isVerifyActive = location.pathname === '/verify-ticket';

  const userInitial = (user?.name || 'U')[0].toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand with Modern Glow */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="p-2.5 bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 rounded-2xl text-white shadow-md shadow-sky-600/25 group-hover:scale-105 group-hover:shadow-sky-600/40 transition-all duration-300">
              <Ticket className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg text-slate-900 tracking-tight leading-tight flex items-center gap-0.5">
                Seat<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">Spot</span>
              </span>
              <span className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase -mt-0.5">
                Live Reservation
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                isHomeActive
                  ? 'bg-sky-50 text-sky-700 font-bold shadow-2xs border border-sky-100/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Home className="w-4 h-4 text-sky-600" />
              <span>Home</span>
            </Link>

            <Link
              to="/events"
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                isEventsActive
                  ? 'bg-sky-50 text-sky-700 font-bold shadow-2xs border border-sky-100/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Calendar className="w-4 h-4 text-sky-600" />
              <span>Events</span>
            </Link>

            <Link
              to="/verify-ticket"
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                isVerifyActive
                  ? 'bg-sky-50 text-sky-700 font-bold shadow-2xs border border-sky-100/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <QrCode className="w-4 h-4 text-sky-600" />
              <span>Verify Ticket</span>
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/my-bookings"
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                    isBookingsActive
                      ? 'bg-sky-50 text-sky-700 font-bold shadow-2xs border border-sky-100/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <BookmarkCheck className="w-4 h-4 text-sky-600" />
                  <span>My Bookings</span>
                </Link>

                <Link
                  to="/profile"
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                    isProfileActive
                      ? 'bg-sky-50 text-sky-700 font-bold shadow-2xs border border-sky-100/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shadow-xs ring-2 ring-white">
                    {userInitial}
                  </div>
                  <span>Profile</span>
                </Link>

                {isAdmin && (
                  <Link
                    to="/system-console-r6t8"
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                      isAdminActive
                        ? 'bg-purple-600 text-white shadow-purple-500/25'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 border border-purple-200/80'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-500" />
                    <span>Admin Panel</span>
                  </Link>
                )}

                <div className="h-6 w-px bg-slate-200 mx-1.5" />

                <button
                  onClick={handleLogoutClick}
                  title="Log Out"
                  className="px-3.5 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 pl-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-sky-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-indigo-500 rounded-xl shadow-md shadow-sky-600/20 transition-all hover:scale-[1.02] active:scale-98"
                >
                  Get Started
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center md:hidden gap-2">
            {isAuthenticated && (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                {userInitial}
              </div>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-xl px-4 py-4 space-y-2 shadow-xl animate-fadeIn">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition ${
              isHomeActive ? 'bg-sky-50 text-sky-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Home className="w-4 h-4 text-sky-600" />
            <span>Home</span>
          </Link>

          <Link
            to="/events"
            onClick={() => setMobileMenuOpen(false)}
            className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition ${
              isEventsActive ? 'bg-sky-50 text-sky-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>Events Catalog</span>
          </Link>

          <Link
            to="/verify-ticket"
            onClick={() => setMobileMenuOpen(false)}
            className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition ${
              isVerifyActive ? 'bg-sky-50 text-sky-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-4 h-4 text-sky-600" />
            <span>Verify Ticket</span>
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/my-bookings"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition ${
                  isBookingsActive ? 'bg-sky-50 text-sky-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <BookmarkCheck className="w-4 h-4 text-sky-600" />
                <span>My Bookings</span>
              </Link>

              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition ${
                  isProfileActive ? 'bg-sky-50 text-sky-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <User className="w-4 h-4 text-sky-600" />
                <span>My Profile</span>
              </Link>

              {isAdmin && (
                <Link
                  to="/system-console-r6t8"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2.5 transition ${
                    isAdminActive ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Admin Dashboard</span>
                </Link>
              )}

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="w-full px-4 py-2.5 text-left rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Logout Account</span>
                </button>
              </div>
            </>
          ) : (
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md transition"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutDialog}
        title="Confirm Log Out"
        message="Are you sure you want to log out of your account?"
        confirmText="Yes, Log Out"
        cancelText="Stay Logged In"
        isDanger={true}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </header>
  );
};

export default Navbar;
