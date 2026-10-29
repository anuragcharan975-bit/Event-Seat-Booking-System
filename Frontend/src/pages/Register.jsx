import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserPlus, User, Mail, Lock, ShieldCheck } from "lucide-react";
import ErrorMessage from "../components/ErrorMessage";

// Shared high-resolution Event Booking venue background image (arena concert / live event seating)
const AUTH_EVENT_BG_IMAGE =
  'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=2000&q=80';

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter a password.");
      return;
    }
    if (password.length > 6) {
      setError(
        "Password cannot be more than 6 characters (not above 6 characters).",
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await register(name, email, password);
      navigate("/", { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message || "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden bg-slate-950">
      {/* Background Image - Clean & Clearly Visible */}
      <div className="absolute inset-0 z-0">
        <img
          src={AUTH_EVENT_BG_IMAGE}
          alt="Live Event Arena Seating"
          className="w-full h-full object-cover object-center"
        />
        {/* Light subtle overlay so the event venue, crowd and stage lighting remain clearly visible */}
        <div className="absolute inset-0 bg-slate-950/40" />
      </div>

      {/* Main Register Card */}
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/60 border border-white/60 p-7 sm:p-9 space-y-6">
        <div className="text-center">
          <div className="inline-flex p-3.5 bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 text-white rounded-2xl mb-3 shadow-lg shadow-sky-600/30">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Create Account
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Join to reserve seats, group passes & couple tickets
          </p>
        </div>

        {error && <ErrorMessage message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alice Developer"
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200/90 bg-white/90 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@example.com"
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200/90 bg-white/90 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition shadow-2xs"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password (max 6 characters)
              </label>
              <span className="text-[11px] font-semibold text-slate-400 font-mono">
                {password.length}/6
              </span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                maxLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value.slice(0, 6))}
                placeholder="Max 6 characters"
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200/90 bg-white/90 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition shadow-2xs"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Confirm Password
              </label>
              <span className="text-[11px] font-semibold text-slate-400 font-mono">
                {confirmPassword.length}/6
              </span>
            </div>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                maxLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value.slice(0, 6))}
                placeholder="Max 6 characters"
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200/90 bg-white/90 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition shadow-2xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:via-indigo-500 hover:to-purple-500 shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
          Already registered?{" "}
          <Link
            to="/login"
            className="font-bold text-sky-600 hover:text-sky-700 hover:underline"
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
