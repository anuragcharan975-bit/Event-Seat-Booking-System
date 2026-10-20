import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 animate-fadeIn">
      <div className="p-4 bg-sky-50 text-sky-600 rounded-3xl mb-4">
        <Compass className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">404 - Page Not Found</h1>
      <p className="text-sm text-slate-500 max-w-md mt-2 mb-6">
        The page you are looking for doesn't exist or has been moved to another location.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
        >
          <Home className="w-4 h-4" />
          <span>Go to Home</span>
        </Link>
        <Link
          to="/events"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md shadow-sky-600/20 transition"
        >
          <span>Browse Events</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
