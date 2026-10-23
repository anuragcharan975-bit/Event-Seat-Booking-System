import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import { bookingApi } from '../api/bookingApi';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatDate } from '../utils/formatDate';
import {
  User,
  Mail,
  Shield,
  Calendar,
  BookmarkCheck,
  Ticket,
  LogOut,
  Edit2,
  Check,
  X,
  Copy,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Send
} from 'lucide-react';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Edit name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // Copy ID indicator
  const [copiedId, setCopiedId] = useState(false);

  // Change Password with Email OTP Verification
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  // Logout dialog
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    setNameInput(user?.name || '');
  }, [user?.name]);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        setLoadingBookings(true);
        const res = await bookingApi.getMyBookings();
        if (res.success && res.data) {
          setBookings(res.data);
        }
      } catch (err) {
        console.error('Failed to load user booking stats', err);
      } finally {
        setLoadingBookings(false);
      }
    };
    fetchUserStats();
  }, []);

  // Countdown timer for OTP resend (60s)
  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleCopyId = () => {
    if (!user?._id && !user?.id) return;
    const idToCopy = user._id || user.id;
    navigator.clipboard.writeText(idToCopy);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setSaveError('Name cannot be empty.');
      return;
    }

    try {
      setSavingName(true);
      setSaveError('');
      setSaveSuccess('');

      const res = await authApi.updateProfile({ name: nameInput.trim() });
      if (res.success && res.user) {
        updateUser(res.user);
        setIsEditingName(false);
        setSaveSuccess('Your name has been updated successfully!');
        setTimeout(() => setSaveSuccess(''), 3000);
      }
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to update name. Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  // Step 1: Verify Current Password and Send 6-Digit Email OTP
  const handleSendPasswordOtp = async (e) => {
    if (e) e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password to verify your account.');
      return;
    }

    try {
      setSendingOtp(true);
      // Calls POST /api/users/password-otp/send with { currentPassword }
      const res = await authApi.sendPasswordOtp({ currentPassword });
      if (res.success) {
        setOtpSent(true);
        setPasswordSuccess(
          res.message || `A 6-digit verification code has been sent to ${user?.email}. Code is valid for 5 minutes.`
        );
        setResendCountdown(60);
      }
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || 'Current password verification failed. Please try again.'
      );
    } finally {
      setSendingOtp(false);
    }
  };

  // Step 2: Verify 6-Digit OTP and Update Password
  const handleVerifyOtpAndChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setPasswordError('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    if (cleanOtp.length !== 6) {
      setPasswordError('Verification code must be exactly 6 numeric digits.');
      return;
    }
    if (!newPassword) {
      setPasswordError('Please enter your new password.');
      return;
    }
    if (newPassword.length > 6) {
      setPasswordError('Password cannot be more than 6 characters (not above 6 characters).');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      // Calls POST /api/users/password-otp/verify with { otp, newPassword, confirmPassword }
      const res = await authApi.verifyPasswordOtp({
        otp: cleanOtp,
        newPassword,
        confirmPassword
      });

      if (res.success) {
        // Requirement 14: Clear form after successful change and show success message
        setPasswordSuccess(
          res.message || 'Your password has been changed successfully! You can now use your new password.'
        );
        setCurrentPassword('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpSent(false);
        setTimeout(() => setPasswordSuccess(''), 6000);
      }
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || 'Failed to verify OTP or change password. Please check your OTP and try again.'
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutDialog(false);
    logout();
    navigate('/login');
  };

  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const cancelledCount = bookings.filter((b) => b.status === 'CANCELLED').length;
  const totalSeatsBooked = bookings.reduce(
    (sum, b) => (b.status === 'CONFIRMED' ? sum + (b.seats?.length || 0) : sum),
    0
  );

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link to="/" className="hover:text-slate-600 transition">
          Home
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">User Profile</span>
      </nav>

      {/* Profile Header Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-sky-900/40">
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with initial */}
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-black text-3xl sm:text-4xl shadow-lg shadow-sky-500/30 border-2 border-white/20">
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {user?.name || 'Customer User'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30 backdrop-blur-md">
                {user?.role === 'admin' ? 'Administrator' : 'Customer Account'}
              </span>
            </div>

            <p className="text-sm text-slate-300 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{user?.email}</span>
            </p>

            <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1.5 pt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>
                Member since {user?.createdAt ? formatDate(user.createdAt) : '2026'}
              </span>
            </p>
          </div>

          <button
            onClick={handleLogoutClick}
            className="self-center sm:self-start px-4 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 transition-all flex items-center gap-1.5 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Success / Error Banners */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2.5 shadow-sm text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {saveError && <ErrorMessage message={saveError} />}

      {/* Quick Booking Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
            <BookmarkCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Reservations
            </span>
            <span className="text-2xl font-black text-slate-900">
              {loadingBookings ? '...' : bookings.length}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Seats Confirmed
            </span>
            <span className="text-2xl font-black text-emerald-600">
              {loadingBookings ? '...' : totalSeatsBooked}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Confirmed Bookings
            </span>
            <span className="text-2xl font-black text-purple-600">
              {loadingBookings ? '...' : confirmedCount}
            </span>
          </div>
        </div>
      </div>

      {/* 1. Account Details & Settings Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-sky-600" />
            <span>Personal Information</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View and update your display name and registered account credentials
          </p>
        </div>

        <div className="space-y-4">
          {/* Name Field with Edit Mode */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 flex-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Display Name
              </span>
              {!isEditingName ? (
                <p className="font-semibold text-slate-900 text-sm">
                  {user?.name || 'Not set'}
                </p>
              ) : (
                <form onSubmit={handleSaveName} className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your full name"
                    className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 w-full max-w-xs"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={savingName}
                    className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition disabled:opacity-50"
                    title="Save name"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingName(false);
                      setNameInput(user?.name || '');
                    }}
                    className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition"
                    title="Cancel edit"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            {!isEditingName && (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="self-start sm:self-center px-3.5 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Name</span>
              </button>
            )}
          </div>

          {/* Email Field (Read-only) */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Email Address
              </span>
              <p className="font-semibold text-slate-900 text-sm mt-0.5">{user?.email}</p>
            </div>
            <span className="self-start sm:self-center inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              <span>Verified Account</span>
            </span>
          </div>

          {/* Account ID Field */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                User Account ID
              </span>
              <p className="font-mono text-xs text-slate-600 mt-0.5">
                {user?._id || user?.id || 'N/A'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyId}
              className="self-start sm:self-center px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition flex items-center gap-1.5"
              title="Copy User ID"
            >
              {copiedId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Link to My Bookings */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-sky-50/50 p-4 rounded-2xl border border-sky-100">
          <div className="space-y-0.5 text-center sm:text-left">
            <h4 className="font-bold text-slate-900 text-sm">Looking for your event tickets?</h4>
            <p className="text-xs text-slate-500">
              Manage all your reserved seats, view QR codes, and track booking confirmations.
            </p>
          </div>
          <Link
            to="/my-bookings"
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/20 transition flex items-center gap-1.5 shrink-0"
          >
            <span>Go to My Bookings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. Security & Change Password Section with Current Password & 6-Digit Email OTP */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-sky-600" />
              <span>Password & Security</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Securely update your password with current password verification and 6-digit email OTP
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/change-password"
              className="px-3.5 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change Password (OTP)</span>
            </Link>
            {!showPasswordSection && (
              <button
                type="button"
                onClick={() => {
                  setShowPasswordSection(true);
                  setPasswordError('');
                  setPasswordSuccess('');
                }}
                className="self-start sm:self-center px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Quick Reset</span>
              </button>
            )}
          </div>
        </div>

        {showPasswordSection && (
          <div className="space-y-5 animate-fadeIn">
            {/* Feedback Messages */}
            {passwordSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs sm:text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-2.5 text-xs sm:text-sm">
                <X className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {/* STEP 1: Enter Current Password to Request 6-Digit Email OTP */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">
                    Step 1: Current Password Authorization
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Enter your existing password. On verification, a 6-digit OTP will be sent to{' '}
                    <strong className="text-slate-900">{user?.email}</strong> (valid for 5 minutes).
                  </p>
                </div>
                {otpSent && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Authorized</span>
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value.slice(0, 6))}
                    maxLength={6}
                    disabled={otpSent}
                    placeholder="Enter current password (max 6 chars)"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-200 disabled:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSendPasswordOtp}
                  disabled={sendingOtp || !currentPassword || (otpSent && resendCountdown > 0)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm transition flex items-center justify-center gap-2 shrink-0"
                >
                  {sendingOtp ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying & Sending OTP...</span>
                    </>
                  ) : otpSent ? (
                    <>
                      <RefreshCw className={`w-3.5 h-3.5 ${resendCountdown > 0 ? 'animate-spin' : ''}`} />
                      <span>{resendCountdown > 0 ? `Resend OTP (${resendCountdown}s)` : 'Resend 6-Digit OTP'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Verify & Send 6-Digit OTP</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* STEP 2: Enter 6-Digit OTP & New Password (enabled once OTP is sent) */}
            {otpSent && (
              <form onSubmit={handleVerifyOtpAndChange} className="space-y-4 pt-2 border-t border-slate-100 animate-fadeIn">
                <div className="pb-1">
                  <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">
                    Step 2: Enter 6-Digit OTP & Set New Password
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Check your email inbox or spam folder. Maximum 5 verification attempts permitted.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* 6-Digit OTP Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="e.g. 123456"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono tracking-widest text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">6 digits (5 min validity)</p>
                  </div>

                  {/* New Password */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        New Password
                      </label>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {newPassword.length}/6
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        maxLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value.slice(0, 6))}
                        placeholder="Max 6 chars"
                        required
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Maximum 6 characters</p>
                  </div>

                  {/* Confirm Password */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Confirm Password
                      </label>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {confirmPassword.length}/6
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        maxLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value.slice(0, 6))}
                        placeholder="Max 6 chars"
                        required
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Must match new password</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={changingPassword || otp.length !== 6 || !newPassword}
                    className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
                  >
                    {changingPassword ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying & Updating...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm OTP & Change Password</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Change Current Password
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordSection(false);
                      setCurrentPassword('');
                      setOtpSent(false);
                      setOtp('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                      setPasswordSuccess('');
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-600 transition ml-auto"
                  >
                    Close
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

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
    </div>
  );
};

export default Profile;
