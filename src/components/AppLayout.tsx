/**
 * AppLayout
 *
 * Persistent navigation shell. Desktop: top navbar. Mobile: bottom tab bar.
 * Includes streak/XP display and auth button (Replit Auth via useAuth).
 */

import { NavLink } from 'react-router-dom';
import { useAuth, signOut } from '../hooks/useAuth';
import ThemeSwitcher from './ThemeSwitcher';
import StreakBar from './StreakBar';
import BadgeToast from './BadgeToast';
import { ParticleAnimationProvider } from '../contexts/AnimationContext';
import OfflineBanner from './OfflineBanner';

interface AppLayoutProps {
  children: React.ReactNode;
}

function AuthButton() {
  const { user, authAvailable } = useAuth();

  if (user) {
    return (
      <div className="dropdown dropdown-end">
        <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
          <div className="bg-primary text-primary-content rounded-full w-8">
            <span className="text-sm">{user.email?.[0]?.toUpperCase() ?? '?'}</span>
          </div>
        </div>
        <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-50 mt-3 w-48 p-2 shadow">
          <li><NavLink to="/profile">Profile</NavLink></li>
          <li><NavLink to="/settings">Settings</NavLink></li>
          <li><NavLink to="/stats">Statistics</NavLink></li>
          <li><button onClick={() => signOut()}>Sign out</button></li>
        </ul>
      </div>
    );
  }

  if (authAvailable) {
    return (
      <NavLink to="/login" className="btn btn-primary btn-sm">
        Sign in
      </NavLink>
    );
  }

  // No auth backend (guest-only) — show profile link only
  return (
    <NavLink to="/profile" className="btn btn-ghost btn-sm">
      Profile
    </NavLink>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <ParticleAnimationProvider>
      <div className="min-h-screen flex flex-col pb-16 md:pb-0">
        {/* Top navbar */}
        <div className="navbar bg-base-200 sticky top-0 z-40">
          <div className="navbar-start">
            <NavLink to="/languages" className="btn btn-ghost text-lg font-bold">
              LanguageLoader
            </NavLink>
          </div>

          {/* Desktop nav links */}
          <div className="navbar-center hidden md:flex">
            <ul className="menu menu-horizontal px-1">
              <li><NavLink to="/languages" className={({ isActive }) => isActive ? 'active' : ''}>Languages</NavLink></li>
              <li><NavLink to="/review" className={({ isActive }) => isActive ? 'active' : ''}>Review</NavLink></li>
              <li><NavLink to="/stats" className={({ isActive }) => isActive ? 'active' : ''}>Stats</NavLink></li>
              <li><NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>Profile</NavLink></li>
              <li><NavLink to="/pro" className={({ isActive }) => `${isActive ? 'active' : ''} text-primary font-medium`}>Pro ✨</NavLink></li>
            </ul>
          </div>

          <div className="navbar-end gap-2">
            <StreakBar />
            <ThemeSwitcher />
            <AuthButton />
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 container mx-auto p-4 max-w-4xl">{children}</main>

        {/* Mobile bottom tab bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-base-200 border-t border-base-300">
          <div className="flex justify-around items-center py-2">
            <NavLink
              to="/languages"
              className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs transition-colors
                ${isActive ? 'text-primary font-semibold' : 'opacity-60'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Languages
            </NavLink>
            <NavLink
              to="/review"
              className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs transition-colors
                ${isActive ? 'text-primary font-semibold' : 'opacity-60'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Review
            </NavLink>
            <NavLink
              to="/stats"
              className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs transition-colors
                ${isActive ? 'text-primary font-semibold' : 'opacity-60'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Stats
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs transition-colors
                ${isActive ? 'text-primary font-semibold' : 'opacity-60'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </NavLink>
          </div>
        </div>

        <BadgeToast />
        <OfflineBanner />
      </div>
    </ParticleAnimationProvider>
  );
}
