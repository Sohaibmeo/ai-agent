import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { changePassword, setPasswordWithToken } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export function SetPasswordPage() {
  const { token, setAuth } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const accessToken = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken && !token) {
      navigate('/auth/login');
    }
  }, [accessToken, token, navigate]);

  const isLinkFlow = Boolean(accessToken);
  const heading = isLinkFlow ? 'Set a password' : 'Change password';
  const description = isLinkFlow
    ? 'Set a password for your account and you will be signed in automatically.'
    : 'Choose a new password while staying signed in.';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords must match');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isLinkFlow && accessToken) {
        const res = await setPasswordWithToken(accessToken, password);
        toast.success('Password saved, redirecting…');
        setAuth(res.token, res.user);
        navigate(res.user.hasProfile ? '/plans' : '/onboarding');
      } else if (token) {
        await changePassword(token, password);
        toast.success('Password updated');
        navigate('/plans');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">OverCooked • Meal Planning</span>
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">{heading}</h1>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-xl">
          <div className="space-y-4">
            <label className="space-y-1 text-xs text-slate-700">
              <span>New password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900
                           focus:outline-none focus:ring-1 focus:ring-emerald-300 focus:border-emerald-300"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-700">
              <span>Confirm password</span>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900
                           focus:outline-none focus:ring-1 focus:ring-emerald-300 focus:border-emerald-300"
              />
            </label>
            {isLinkFlow && (
              <p className="text-[11px] text-slate-500">
                The link expires in one hour. If it expires, you can request another one.
              </p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white
                       hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {submitting ? 'Saving…' : isLinkFlow ? 'Set password' : 'Update password'}
          </button>

          <div className="mt-4 text-center text-[11px] text-slate-600">
            <Link to="/auth/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
