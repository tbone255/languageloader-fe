/**
 * Auth state from Supabase (email + password).
 *
 * Three states matter to the UI:
 * - authAvailable=false — Supabase not configured (no env). Hide sign-in;
 *   the app is guest-only.
 * - user=null           — configured, signed out.
 * - user                — signed in; sync is active.
 *
 * Login/signup/reset happen on /login (LoginPage) via supabase-js; this hook
 * just reflects the resulting session.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

export interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  authAvailable: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true, authAvailable: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    // No Supabase → nothing to load; the initial guest state is already final.
    loading: isSupabaseConfigured(),
    authAvailable: isSupabaseConfigured(),
  });

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setState({ user: u ? { id: u.id, email: u.email ?? null } : null, loading: false, authAvailable: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setState({ user: u ? { id: u.id, email: u.email ?? null } : null, loading: false, authAvailable: true });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  return useContext(AuthContext);
}

// eslint-disable-next-line react-refresh/only-export-components
export function signIn(): void {
  window.location.href = '/login';
}

// eslint-disable-next-line react-refresh/only-export-components
export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
