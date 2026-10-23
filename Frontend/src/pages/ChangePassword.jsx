import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import {
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles
} from 'lucide-react';

const ChangePassword = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Step 1: 'email' | Step 2: 'otp' | Step 3: 'password' | Step 4: 'success'
  const [step, setStep] = useState(1);

  // Form states
  const [email, setEmail] = useState(location.state?.email || user?.email || '');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status and feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Timers: 5-minute expiry countdown & 60-second resend cooldown
  const [expiryCountdown, setExpiryCountdown] = useState(300); // 5 minutes = 300s
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer effect
  useEffect(() => {
    let timer;
    if (step === 2 && expiryCountdown > 0) {
      timer = setInterval(() => {
        setExpiryCountdown((prev) => {
          if (prev <= 1) {
            setError('The 6-digit OTP has expired (5-minute validity). Please request a new code.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, expiryCountdown]);

  // Resend cooldown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // STEP 1: Send 6-digit OTP to registered email
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.sendOtp({ email: cleanEmail, purpose: 'change_password' });

      if (res.success) {
        setStep(2);
        setExpiryCountdown(300); // 5 minutes
        setResendCooldown(60); // 60s cooldown
        setSuccessMsg(res.message || `A 6-digit OTP has been sent to ${cleanEmail}. Valid for 5 minutes.`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setOtp('');
    setError('');
    await handleSendOtp();
  };

  // STEP 2: Verify 6-digit OTP (Fields for New Password remain HIDDEN until verified)
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (cleanOtp.length !== 6) {
      setError('Verification code must be exactly 6 numeric digits.');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.verifyOtp({
        email: email.trim().toLowerCase(),
        otp: cleanOtp
      });

      if (res.success) {
        setResetToken(res.resetToken || '');
        setStep(3); // UNLOCK STEP 3: Now show New Password & Confirm Password
        setSuccessMsg('OTP verified successfully! Please enter your new password.');
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Submit New Password & Confirm Password
  const handleUpdatePassword = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!newPassword) {
      setError('Please enter your new password.');
      return;
    }
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.changePassword({
        email: email.trim().toLowerCase(),
        resetToken,
        otp: otp.trim(),
        newPassword,
        confirmPassword
      });

      if (res.success) {
        setStep(4); // Success screen
        setSuccessMsg(res.message || 'Your password has been updated successfully!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 sm:py-12 animate-fadeIn">
      {/* Back button */}
      <div className="mb-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-xl space-y-6">
        {/* Header with Visual Stepper Indicator */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-sky-600/30">
            <KeyRound className="w-7 h-7" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Change Password
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            {step === 1 && 'Enter your registered email to receive a 6-digit verification code.'}
            {step === 2 && 'Enter the 6-digit OTP code sent to your registered email.'}
            {step === 3 && 'OTP verified! Set your secure new password.'}
            {step === 4 && 'Your password has been changed successfully!'}
          </p>

          {/* Stepper Pill Indicator */}
          {step <= 3 && (
            <div className="flex items-center justify-center gap-2 pt-3">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  step === 1
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                <span>1. Email</span>
              </div>
              <span className="text-slate-300">→</span>
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  step === 2
                    ? 'bg-sky-600 text-white shadow-xs'
                    : step > 2
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <span>2. Verify OTP</span>
              </div>
              <span className="text-slate-300">→</span>
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  step === 3
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <span>3. New Password</span>
              </div>
            </div>
          )}
        </div>

        {/* Global Feedback Banners */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm flex items-start gap-3 shadow-2xs animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Action Required</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {successMsg && step !== 4 && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm flex items-start gap-3 shadow-2xs animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Status</span>
              <span>{successMsg}</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: Enter Registered Email                                            */}
        {/* ========================================================================= */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Registered Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                We will send a 6-digit verification code to this email. Code will expire in 5 minutes.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-lg shadow-sky-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Verification Code to Email...</span>
                </>
              ) : (
                <>
                  <span>Send 6-Digit OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: Enter & Verify 6-digit OTP (New password fields strictly hidden)  */}
        {/* ========================================================================= */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block">Sent to your registered email:</span>
                  <span className="font-bold text-slate-900 text-sm">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setOtp('');
                    setError('');
                  }}
                  className="text-sky-600 hover:text-sky-800 font-semibold underline"
                >
                  Change Email
                </button>
              </div>
              <p className="text-[11px] text-slate-600 pt-2 border-t border-sky-200/70 flex items-center gap-1.5 font-medium">
                <Mail className="w-4 h-4 text-sky-600 shrink-0" />
                <span>The 6-digit verification code has been dispatched to your email inbox. Please check your email (and spam/junk folder) to enter the code.</span>
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Enter 6-Digit OTP Code
                </label>
                {/* 5-Minute Timer Display */}
                <div
                  className={`flex items-center gap-1 font-mono text-xs font-bold ${
                    expiryCountdown < 60 ? 'text-rose-600 animate-pulse' : 'text-sky-600'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expires in: {formatTime(expiryCountdown)}</span>
                </div>
              </div>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                className="w-full text-center text-2xl font-mono tracking-[8px] py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition shadow-2xs font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                Please enter the 6 numeric digits sent to your email.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading || otp.trim().length !== 6 || expiryCountdown === 0}
                className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-lg shadow-sky-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify Code & Continue</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="text-xs font-bold text-slate-600 hover:text-sky-600 disabled:opacity-40 transition"
                >
                  {resendCooldown > 0
                    ? `Resend OTP in ${resendCooldown}s`
                    : 'Didn’t receive code? Resend OTP'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: Set New Password (DISPLAYED ONLY AFTER OTP IS VERIFIED)            */}
        {/* ========================================================================= */}
        {step === 3 && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Identity verified for <strong>{email}</strong>. Create your new password below.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating Password in MongoDB...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: Success Screen with Direct Sign In Link                           */}
        {/* ========================================================================= */}
        {step === 4 && (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Password Changed Successfully!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Your new password has been securely encrypted with bcrypt and updated in your account. You can now log in with your updated credentials.
              </p>
            </div>

            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-lg shadow-sky-600/25 transition-all active:scale-[0.98]"
            >
              <span>Sign In with New Password</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangePassword;
