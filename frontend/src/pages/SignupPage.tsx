import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { requestAccessLink } from '../api/auth';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'reset' ? 'reset' : 'access';
  const isResetMode = mode === 'reset';
  const heading = isResetMode ? 'Reset your password' : 'Request access';
  const description = isResetMode
    ? 'Enter the email for your account and we will send you a secure reset link.'
    : "Send us your email and we'll give you an access link.";
  const buttonLabel = isResetMode ? 'Send reset link' : 'Send me an access link';
  const alternateLink = isResetMode ? '/auth/signup?mode=access' : '/auth/signup?mode=reset';
  const alternateLabel = isResetMode ? 'Need access instead?' : 'Forgot password?';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const { flow } = await requestAccessLink(email.trim());
      if (!isResetMode && flow === 'access') {
        setMessage('If that email is new, we sent an access link so you can set a password.');
        toast.success('Access link sent (if the email exists).');
      } else {
        setMessage('If that email already has an account, we sent a password reset link.');
        toast.success('Password reset link sent.');
      }
    } catch (error: any) {
      const text = error?.message || 'Unable to send the access link.';
      setMessage(text);
      toast.error('Could not send access link.');
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
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900
                           focus:outline-none focus:ring-1 focus:ring-emerald-300 focus:border-emerald-300"
              />
            </div>
            {message && <p className="text-xs text-slate-600">{message}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white
                       hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {submitting ? 'Sending link…' : buttonLabel}
          </button>

          <div className="mt-4 text-center text-[11px] text-slate-600 space-y-1">
            <div>
              <Link to="/auth/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
                Sign in here.
              </Link>
            </div>
            <div>
              <Link to={alternateLink} className="font-semibold text-emerald-600 hover:text-emerald-700">
                {alternateLabel}
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
