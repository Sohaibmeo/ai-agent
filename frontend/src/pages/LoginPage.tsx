import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 border border-emerald-400/30">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-100">ChefBot • Meal Planning</span>
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-50">Welcome back</h1>
          <p className="mt-1 text-xs text-slate-400">Log in to view and tweak your weekly plan.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-6 shadow-xl shadow-emerald-500/5"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50
                           focus:outline-none focus:ring-1 focus:ring-emerald-400/70 focus:border-emerald-400/60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50
                           focus:outline-none focus:ring-1 focus:ring-emerald-400/70 focus:border-emerald-400/60"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950
                       hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="mt-4 text-center text-[11px] text-slate-400">
            Don&apos;t have an account?{' '}
            <Link to="/auth/register" className="text-emerald-300 hover:text-emerald-200">
              Create one
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
