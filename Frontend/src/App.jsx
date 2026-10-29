import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import MyBookings from './pages/MyBookings';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ChangePassword from './pages/ChangePassword';
import RefundPolicy from './pages/RefundPolicy';
import TicketDetails from './pages/TicketDetails';
import TicketVerification from './pages/TicketVerification';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:category" element={<Events />} />
            <Route path="events/:category/:slug" element={<EventDetails />} />
            <Route path="events/id/:eventId" element={<EventDetails />} />
            <Route path="events/legacy/:eventId" element={<EventDetails />} />
            <Route
              path="my-bookings"
              element={
                <ProtectedRoute>
                  <MyBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="system-console-r6t8" element={<AdminDashboard />} />
            <Route path="admin" element={<NotFound />} />
            <Route path="refundpolicy" element={<RefundPolicy />} />
            <Route path="refund-policy" element={<RefundPolicy />} />
            <Route path="tickets/:bookingReference" element={<TicketDetails />} />
            <Route path="ticket/:bookingReference" element={<TicketDetails />} />
            <Route path="verify-ticket" element={<TicketVerification />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="forgot-password" element={<ChangePassword />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
