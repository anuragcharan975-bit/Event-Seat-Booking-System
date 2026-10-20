import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import {
  Ticket,
  LogIn,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import ErrorMessage from '../components/ErrorMessage';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Enter email, 2: Enter OTP & new password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotDevOtp, setForgotDevOtp] = useState('');
  const [forgotCountdown, setForgotCountdown] = useState(0);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  // Countdown timer for Forgot Password OTP resend
  useEffect(() => {
    let timer;
    if (forgotCountdown > 0) {
      timer = setTimeout(() => setForgotCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [forgotCountdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessNotice('');

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgotModal = () => {
    setForgotEmail(email || '');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotError('');
    setForgotSuccess('');
    setForgotDevOtp('');
    setForgotStep(1);
    setShowForgotModal(true);
  };

  const handleSendForgotOtp = async (e) => {
    e?.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmail || !forgotEmail.trim()) {
      setForgotError('Please enter your registered email address.');
      return;
    }

    try {
      setForgotLoading(true);
      const res = await authApi.sendOtp({
        email: forgotEmail.trim(),
        purpose: 'password_reset'
      });

      if (res.success) {
        setForgotStep(2);
        setForgotSuccess(`A 4-digit verification code was sent to ${forgotEmail.trim()}`);
        if (res.devOtp) {
          setForgotDevOtp(res.devOtp);
        }
        setForgotCountdown(60);
      }
    } catch (err) {
      setForgotError(
        err.response?.data?.message || 'No account found with this email. Please check and try again.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const cleanOtp = forgotOtp.trim();
    if (!cleanOtp) {
      setForgotError('Please enter the 4-digit verification code.');
      return;
    }
    if (cleanOtp.length !== 4) {
      setForgotError('Verification code must be exactly 4 digits.');
      return;
    }
    if (!forgotNewPassword) {
      setForgotError('Please enter your new password.');
      return;
    }
    if (forgotNewPassword.length > 6) {
      setForgotError('New password cannot be more than 6 characters (not above 6 characters).');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    try {
      setForgotLoading(true);
      const res = await authApi.changePassword({
        email: forgotEmail.trim(),
        otp: cleanOtp,
        newPassword: forgotNewPassword
      });

      if (res.success) {
        // Success: update main login form state and notify user
        setEmail(forgotEmail.trim());
        setPassword(forgotNewPassword);
        setShowForgotModal(false);
        setSuccessNotice('Your password has been reset successfully! You can now sign in.');
      }
    } catch (err) {
      setForgotError(
        err.response?.data?.message || 'Failed to reset password. Please verify the 4-digit code.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-sky-50 text-sky-600 rounded-2xl mb-3 shadow-inner">
            <Ticket className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
          <p className="text-sm text-slate-500 mt-1">Sign in to your account to book seats</p>
        </div>

        {successNotice && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {error && <ErrorMessage message={error} className="mb-6" />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={handleOpenForgotModal}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline transition"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              maxLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value.slice(0, 6))}
              placeholder="Max 6 characters"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-semibold text-sky-600 hover:underline">
            Register here
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Reset Password</h3>
                  <p className="text-xs text-slate-500">
                    {forgotStep === 1
                      ? 'Verify your email to receive a 4-digit code'
                      : 'Enter 4-digit code and set new password'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error / Success Feedback */}
            {forgotSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{forgotSuccess}</span>
              </div>
            )}
            {forgotError && <ErrorMessage message={forgotError} />}

            {/* Dev helper code */}
            {forgotDevOtp && (
              <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                <span>
                  🛠️ Verification Code: <strong className="font-mono text-sm tracking-widest text-amber-900">{forgotDevOtp}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setForgotOtp(forgotDevOtp)}
                  className="px-2 py-0.5 text-[11px] font-bold bg-amber-200 hover:bg-amber-300 rounded text-amber-900 transition"
                >
                  Auto Fill
                </button>
              </div>
            )}

            {/* Step 1: Request OTP */}
            {forgotStep === 1 ? (
              <form onSubmit={handleSendForgotOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Your Registered Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    We will send an email with a 4-digit OTP valid for 10 minutes.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotEmail}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-xl shadow-sm transition flex items-center gap-1.5"
                  >
                    {forgotLoading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Send 4-Digit OTP</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Enter 4-Digit OTP & New Password */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      4-Digit OTP Code
                    </label>
                    <button
                      type="button"
                      onClick={handleSendForgotOtp}
                      disabled={forgotLoading || forgotCountdown > 0}
                      className="text-[11px] font-semibold text-sky-600 hover:underline disabled:text-slate-400"
                    >
                      {forgotCountdown > 0 ? `Resend code in ${forgotCountdown}s` : 'Resend Code'}
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="e.g. 1234"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono tracking-widest text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Sent to: <span className="font-semibold text-slate-600">{forgotEmail}</span>
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      New Password (max 6 characters)
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {forgotNewPassword.length}/6
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      maxLength={6}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value.slice(0, 6))}
                      placeholder="Max 6 chars"
                      required
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Maximum 6 characters (not above 6)</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Confirm New Password
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {forgotConfirmPassword.length}/6
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showForgotConfirmPassword ? 'text' : 'password'}
                      maxLength={6}
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value.slice(0, 6))}
                      placeholder="Max 6 chars"
                      required
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Must match new password</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
                  >
                    &larr; Change Email
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading || forgotOtp.length !== 4 || !forgotNewPassword}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl shadow-sm transition flex items-center gap-1.5"
                    >
                      {forgotLoading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Reset Password</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
