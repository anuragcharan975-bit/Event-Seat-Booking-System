import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';
import ScrollToTop from './components/ScrollToTop';

// Page-level code splitting with React.lazy
const Home = lazy(() => import('./pages/Home'));
const Events = lazy(() => import('./pages/Events'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const RefundPolicy = lazy(() => import('./pages/RefundPolicy'));
const TicketDetails = lazy(() => import('./pages/TicketDetails'));
const TicketVerification = lazy(() => import('./pages/TicketVerification'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
              <Loading message="Loading SeatSpot..." size="lg" />
            </div>
          }
        >
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
