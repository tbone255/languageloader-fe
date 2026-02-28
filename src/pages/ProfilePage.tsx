/**
 * ProfilePage
 *
 * Shows user stats, earned badges, and settings.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { gamificationService, DAILY_GOAL_XP } from '../services/gamificationService';
import { srsItemService } from '../services/srsItemService';
import { ALL_BADGES, getEarnedBadgeIds } from '../services/badgeService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { syncNow } from '../services/syncService';

export default function ProfilePage() {
  const gamState = gamificationService.getState();
  const srsStats = srsItemService.getStats();
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const { xpToday, goalXp, pct: goalPct } = gamificationService.getDailyGoalProgress();

  // Auth / migration state
  const [signedIn, setSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [magicEmail, setMagicEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    getEarnedBadgeIds().then(setEarnedIds);

    // Check existing Supabase session
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setSignedIn(true);
          setUserEmail(session.user.email ?? '');
        }
      });
      // Listen for auth state changes (e.g. magic link redirect)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setSignedIn(true);
          setUserEmail(session.user.email ?? '');
          // Auto-migrate guest data on first sign-in
          handleMigrate();
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSendMagicLink = async () => {
    if (!supabase || !magicEmail.trim()) return;
    setAuthError('');
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail.trim(),
      options: { emailRedirectTo: window.location.href },
    });
    if (error) setAuthError(error.message);
    else setMagicSent(true);
  };

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      await syncNow();
      setMigrated(true);
    } catch { /* ignore */ }
    setMigrating(false);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSignedIn(false);
    setUserEmail('');
  };

  const handleReset = () => {
    if (!window.confirm('Reset ALL progress? This cannot be undone.')) return;
    srsItemService.clear();
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Profile</h1>

      {/* Daily goal progress */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <h2 className="card-title text-lg">Today's Goal</h2>
            <span className="text-sm opacity-60 capitalize">{gamState.dailyGoal} ({DAILY_GOAL_XP[gamState.dailyGoal]} XP)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>{xpToday} XP earned today</span>
                <span>{Math.round(goalPct * 100)}%</span>
              </div>
              <progress
                className={`progress w-full ${xpToday >= goalXp ? 'progress-success' : 'progress-primary'}`}
                value={Math.min(xpToday, goalXp)}
                max={goalXp}
              />
            </div>
          </div>
          {xpToday >= goalXp && (
            <p className="text-success text-sm mt-2 font-medium">Daily goal reached!</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">Your Stats</h2>
          <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-figure text-warning text-2xl">🔥</div>
              <div className="stat-title">Streak</div>
              <div className="stat-value text-warning">{gamState.streak}</div>
              <div className="stat-desc">days</div>
            </div>
            <div className="stat">
              <div className="stat-figure text-primary text-2xl">⭐</div>
              <div className="stat-title">Total XP</div>
              <div className="stat-value text-primary">{gamState.xp}</div>
              <div className="stat-desc">lifetime</div>
            </div>
            <div className="stat">
              <div className="stat-figure text-info text-2xl">💎</div>
              <div className="stat-title">Gems</div>
              <div className="stat-value text-info">{gamState.gems}</div>
              <div className="stat-desc">earned</div>
            </div>
            <div className="stat">
              <div className="stat-title">Cards</div>
              <div className="stat-value">{srsStats.total}</div>
              <div className="stat-desc">{srsStats.due} due</div>
            </div>
          </div>
          <div className="mt-3 text-right">
            <Link to="/stats" className="btn btn-ghost btn-sm">Full statistics →</Link>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">
            Badges
            <span className="badge badge-primary ml-2">{earnedIds.size} / {ALL_BADGES.length}</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ALL_BADGES.map((badge) => {
              const earned = earnedIds.has(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`card bg-base-200 p-4 text-center transition-all ${
                    earned ? 'border border-warning shadow-md' : 'opacity-40 grayscale'
                  }`}
                >
                  <div className="text-3xl mb-1">{badge.icon}</div>
                  <p className="font-semibold text-sm">{badge.label}</p>
                  <p className="text-xs opacity-60">{badge.description}</p>
                  {earned && <div className="badge badge-warning badge-xs mt-2 mx-auto">Earned</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/settings" className="btn btn-outline btn-sm">Settings</Link>
            <Link to="/review/browse" className="btn btn-outline btn-sm">Browse Cards</Link>
            <Link to="/placement" className="btn btn-outline btn-sm">Placement Quiz</Link>
            <Link to="/pro" className="btn btn-outline btn-sm text-primary">Pro ✨</Link>
          </div>
        </div>
      </div>

      {/* Sync / Sign in */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg mb-1">Sync Progress</h2>
          {!isSupabaseConfigured() ? (
            <div>
              <p className="text-sm opacity-60 mb-3">
                Sign in to back up your progress and sync across devices.
              </p>
              <div className="badge badge-outline">Coming soon</div>
            </div>
          ) : signedIn ? (
            <div className="space-y-3">
              <p className="text-sm opacity-70">Signed in as <span className="font-semibold">{userEmail}</span></p>
              {!migrated ? (
                <button
                  className={`btn btn-primary btn-sm ${migrating ? 'loading' : ''}`}
                  onClick={handleMigrate}
                  disabled={migrating}
                >
                  {migrating ? 'Syncing...' : 'Sync local progress to cloud'}
                </button>
              ) : (
                <div className="alert alert-success py-2 text-sm">Progress synced successfully.</div>
              )}
              <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
            </div>
          ) : magicSent ? (
            <div>
              <div className="alert alert-info py-2 text-sm mb-3">
                Check your email for a sign-in link. Click it to sign in and sync your progress.
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setMagicSent(false)}>Use different email</button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm opacity-60">
                Sign in with your email to save progress to the cloud and sync across devices.
                Your local progress will be preserved.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  className="input input-bordered input-sm flex-1"
                  placeholder="you@example.com"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMagicLink()}
                />
                <button className="btn btn-primary btn-sm" onClick={handleSendMagicLink}>
                  Send link
                </button>
              </div>
              {authError && <p className="text-error text-xs">{authError}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div className="card bg-base-100 shadow-md border border-error/30">
        <div className="card-body">
          <h2 className="card-title text-error text-lg">Danger Zone</h2>
          <p className="text-sm opacity-60 mb-4">
            Permanently erase all local progress, streaks, and card data. Cannot be undone.
          </p>
          <button className="btn btn-error btn-outline btn-sm w-fit" onClick={handleReset}>
            Reset all progress
          </button>
        </div>
      </div>
    </div>
  );
}
