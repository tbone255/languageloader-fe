/**
 * Auth state from the server session (Replit Auth via /api).
 *
 * Three states matter to the UI:
 * - authAvailable=false — no backend (local dev, or deployment without
 *   auth env). Hide sign-in affordances entirely; the app is guest-only.
 * - user=null           — backend present, not signed in.
 * - user                — signed in; sync is active.
 *
 * Sign-in/out are full-page redirects through the server's OIDC routes.
 */

import { createContext, useContext, useEffect, useState } from 'react';

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  authAvailable: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true, authAvailable: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, authAvailable: false });

  useEffect(() => {
    fetch('/api/auth/user', { credentials: 'same-origin' })
      .then(async (res) => {
        if (res.ok) {
          const user = (await res.json()) as AuthUser;
          setState({ user, loading: false, authAvailable: true });
        } else {
          // 401 = signed out but auth works; 503 = no auth backend
          setState({ user: null, loading: false, authAvailable: res.status === 401 });
        }
      })
      .catch(() => setState({ user: null, loading: false, authAvailable: false }));
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  return useContext(AuthContext);
}

// eslint-disable-next-line react-refresh/only-export-components
export function signIn(): void {
  window.location.href = '/api/login';
}

// eslint-disable-next-line react-refresh/only-export-components
export function signOut(): void {
  window.location.href = '/api/logout';
}
