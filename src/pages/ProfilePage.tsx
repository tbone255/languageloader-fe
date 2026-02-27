/**
 * ProfilePage
 *
 * Shows user stats, earned badges, and settings.
 */

import { useEffect, useState } from 'react';
import { gamificationService } from '../services/gamificationService';
import { srsItemService } from '../services/srsItemService';
import { ALL_BADGES, getEarnedBadgeIds } from '../services/badgeService';

export default function ProfilePage() {
  const gamState = gamificationService.getState();
  const srsStats = srsItemService.getStats();
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getEarnedBadgeIds().then(setEarnedIds);
  }, []);

  const handleReset = () => {
    if (!window.confirm('Reset ALL progress? This cannot be undone.')) return;
    srsItemService.clear();
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Profile</h1>

      {/* Stats */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">Your Stats</h2>
          <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-title">Streak</div>
              <div className="stat-value text-warning">{gamState.streak}</div>
              <div className="stat-desc">days</div>
            </div>
            <div className="stat">
              <div className="stat-title">Total XP</div>
              <div className="stat-value text-primary">{gamState.xp}</div>
              <div className="stat-desc">lifetime</div>
            </div>
            <div className="stat">
              <div className="stat-title">Cards</div>
              <div className="stat-value">{srsStats.total}</div>
              <div className="stat-desc">{srsStats.due} due</div>
            </div>
            <div className="stat">
              <div className="stat-title">Streak Freezes</div>
              <div className="stat-value">{gamState.streakFreezeCount}</div>
              <div className="stat-desc">available</div>
            </div>
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

      {/* Settings */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Theme</span>
              <span className="text-sm opacity-60">Use the Theme picker in the nav</span>
            </div>
          </div>
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
