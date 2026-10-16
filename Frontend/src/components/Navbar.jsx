import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Ticket, User, LogOut, Calendar, BookmarkCheck, ShieldCheck } from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="p-2 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-xl text-white shadow-md shadow-sky-600/20 group-hover:scale-105 transition-all">
              <Ticket className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg text-slate-900 tracking-tight leading-tight">
                Seat<span className="text-sky-600">Spot</span>
              </span>
              <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase -mt-0.5">
                Live Reservation
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/"
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                isActive('/')
                  ? 'bg-sky-50 text-sky-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4 text-sky-600" />
              <span>Events</span>
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/my-bookings"
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    isActive('/my-bookings')
                      ? 'bg-sky-50 text-sky-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <BookmarkCheck className="w-4 h-4 text-sky-600" />
                  <span>My Bookings</span>
                </Link>

                <div className="h-6 w-px bg-slate-200 mx-1 sm:mx-2" />

                <div className="flex items-center gap-2">
                  <div
                    title={user?.email}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 max-w-[140px] sm:max-w-[200px]"
                  >
                    <div className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                      {(user?.name || user?.email || 'U')[0].toUpperCase()}
                    </div>
                    <span className="truncate">{user?.name || user?.email}</span>
                  </div>

                  <button
                    onClick={handleLogout}
                    title="Log Out"
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 pl-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-sky-600 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-sm shadow-sky-600/20 transition-all active:scale-95"
                >
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
