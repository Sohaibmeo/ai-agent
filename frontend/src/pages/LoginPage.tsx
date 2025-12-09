import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, resetPassword } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await login(email.trim(), password);
      setAuth(res.token, res.user);
      navigate(res.user.hasProfile ? '/plans' : '/onboarding');
    } catch (err: any) {
      setError(err?.message || 'Could not log in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setResetMessage(null);
    try {
      await resetPassword(resetEmail.trim());
      setResetMessage('If that email exists we sent a temporary password.');
      toast.success('Temporary password sent if the address exists.');
    } catch (err: any) {
      setResetMessage(err?.message || 'Could not send reset email');
      toast.error('Unable to send reset email.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">ChefBot • Meal Planning</span>
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-xs text-slate-500">Log in to view and tweak your weekly plan.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-xl"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900
                           focus:outline-none focus:ring-1 focus:ring-emerald-300 focus:border-emerald-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900
                           focus:outline-none focus:ring-1 focus:ring-emerald-300 focus:border-emerald-300"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white
                       hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="mt-4 text-center text-[11px] text-slate-600">
            Need an account? Ask the admin to create one for you.
          </div>
          <div className="mt-2 text-right text-xs">
            <button
              type="button"
              onClick={() => setShowReset((prev) => !prev)}
              className="text-emerald-600 hover:text-emerald-700"
            >
              {showReset ? 'Hide' : 'Forgot password?'}
            </button>
          </div>
          {showReset && (
            <div className="mt-3 space-y-3 rounded-2xl bg-emerald-50/40 px-5 py-4 text-xs text-slate-700">
              <p className="text-[11px] text-slate-500">
                Enter your email and we’ll send a temporary password to sign in.
              </p>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-900"
              />
              {resetMessage && <p className="text-[11px] text-slate-600">{resetMessage}</p>}
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-[11px] font-semibold text-emerald-600 hover:border-emerald-400 disabled:opacity-50"
              >
                {resetting ? 'Sending…' : 'Email temporary password'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
