import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus } from 'lucide-react';
import ErrorMessage from '../components/ErrorMessage';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password.length > 6) {
      setError('Password cannot be more than 6 characters (not above 6 characters).');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await register(name, email, password);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-sky-50 text-sky-600 rounded-2xl mb-3 shadow-inner">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create Account</h2>
          <p className="text-sm text-slate-500 mt-1">Join to book tickets and reserve seats</p>
        </div>

        {error && <ErrorMessage message={error} className="mb-6" />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alice Developer"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@example.com"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password (max 6 characters)
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                {password.length}/6
              </span>
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Confirm Password
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                {confirmPassword.length}/6
              </span>
            </div>
            <input
              type="password"
              maxLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value.slice(0, 6))}
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
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-sky-600 hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
