import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Event Seat Booking System — High-Concurrency Ticket Allocation Engine</p>
          <p className="mt-1 text-slate-400">
            Powered by Node.js, Express MVC, MongoDB Replica-Set Transactions, React, and Tailwind CSS.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
