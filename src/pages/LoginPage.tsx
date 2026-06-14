/**
 * LoginPage — email + password auth via Supabase (no social).
 *
 * Three modes on one screen: sign in, sign up (sends a confirmation email),
 * and forgot-password (sends a reset link → /reset-password). The password
 * goes browser → Supabase only; it never touches our server.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

type Mode = 'signin' | 'signup' | 'forgot';

const TITLES: Record<Mode, string> = {
  signin: 'Welcome back',
  signup: 'Create your account',
  forgot: 'Reset your password',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (!isSupabaseConfigured() || !supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card bg-base-100 shadow-md max-w-sm w-full">
          <div className="card-body items-center text-center">
            <h1 className="text-xl font-bold">Sign-in unavailable</h1>
            <p className="text-sm opacity-60">Accounts aren't configured for this build. The app works without one — your progress is saved on this device.</p>
            <Link to="/languages" className="btn btn-primary btn-sm mt-2">Continue</Link>
          </div>
        </div>
      </div>
    );
  }

  const switchMode = (m: Mode) => { setMode(m); setError(''); setNotice(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/languages');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setNotice('Check your email to confirm your account, then sign in.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice('If that email has an account, a reset link is on its way.');
        setMode('signin');
      }
    } catch (err) {
      setError((err as Error).message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-md max-w-sm w-full">
        <div className="card-body">
          <Link to="/welcome" className="text-lg font-bold text-center mb-2">LanguageLoader</Link>
          <h1 className="text-xl font-semibold text-center mb-4">{TITLES[mode]}</h1>

          {notice && <div className="alert alert-info py-2 text-sm mb-3">{notice}</div>}
          {error && <div className="alert alert-error py-2 text-sm mb-3">{error}</div>}

          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              required
              autoComplete="email"
              className="input input-bordered w-full"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {mode !== 'forgot' && (
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="input input-bordered w-full"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
            <button type="submit" className={`btn btn-primary w-full ${busy ? 'btn-disabled' : ''}`}>
              {busy ? <span className="loading loading-spinner loading-sm" /> : (
                mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'
              )}
            </button>
          </form>

          <div className="text-sm text-center mt-4 space-y-1">
            {mode === 'signin' && (
              <>
                <p>
                  <button className="link link-primary" onClick={() => switchMode('forgot')}>Forgot password?</button>
                </p>
                <p className="opacity-70">
                  No account?{' '}
                  <button className="link link-primary" onClick={() => switchMode('signup')}>Sign up</button>
                </p>
              </>
            )}
            {mode === 'signup' && (
              <p className="opacity-70">
                Already have an account?{' '}
                <button className="link link-primary" onClick={() => switchMode('signin')}>Sign in</button>
              </p>
            )}
            {mode === 'forgot' && (
              <button className="link link-primary" onClick={() => switchMode('signin')}>Back to sign in</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
