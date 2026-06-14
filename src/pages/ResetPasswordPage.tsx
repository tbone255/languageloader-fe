/**
 * ResetPasswordPage — landing for the "reset password" email link.
 *
 * Supabase (detectSessionInUrl) parses the recovery token from the URL and
 * fires a PASSWORD_RECOVERY event, establishing a short-lived session that
 * authorizes a single password change via updateUser().
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    // A recovery session may already be present (token parsed on load), or the
    // PASSWORD_RECOVERY event arrives momentarily after.
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase!.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate('/languages'), 1200);
    } catch (err) {
      setError((err as Error).message ?? 'Could not update password.');
    } finally {
      setBusy(false);
    }
  };

  if (!isSupabaseConfigured() || !supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Link to="/languages" className="btn btn-primary btn-sm">Continue</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-md max-w-sm w-full">
        <div className="card-body">
          <h1 className="text-xl font-semibold text-center mb-4">Set a new password</h1>
          {done ? (
            <div className="alert alert-success py-2 text-sm">Password updated. Redirecting…</div>
          ) : !ready ? (
            <p className="text-sm opacity-60 text-center">
              Open this page from the reset link in your email. Waiting for a valid reset session…
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              {error && <div className="alert alert-error py-2 text-sm">{error}</div>}
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="input input-bordered w-full"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="submit" className={`btn btn-primary w-full ${busy ? 'btn-disabled' : ''}`}>
                {busy ? <span className="loading loading-spinner loading-sm" /> : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
