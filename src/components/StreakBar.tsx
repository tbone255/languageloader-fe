/**
 * StreakBar — shows streak count and daily XP progress in the navbar.
 * Reads from gamificationService directly (cheap sync read).
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { gamificationService, type GamificationState } from '../services/gamificationService';

const GOAL_XP_PER_MIN = 5; // rough estimate

export default function StreakBar() {
  const location = useLocation();
  const [state, setState] = useState<GamificationState>(() => gamificationService.getState());
  const [goalMinutes] = useState(() => {
    try {
      const raw = localStorage.getItem('languageloader_onboarding_goal');
      return raw ? parseInt(raw, 10) : 10;
    } catch { return 10; }
  });

  // Refresh on navigation. NB: getState() returns a fresh object each call, so
  // this MUST stay keyed to location — a bare useEffect (no deps) re-sets state
  // every render and infinite-loops, which throttles React and freezes routing.
  useEffect(() => {
    setState(gamificationService.getState());
  }, [location.pathname]);

  const goalXP = goalMinutes * GOAL_XP_PER_MIN;
  const progress = Math.min(state.xpToday / goalXP, 1);
  const pct = Math.round(progress * 100);

  return (
    <div className="flex items-center gap-3">
      {/* Streak */}
      <div className="flex items-center gap-1 text-sm font-semibold" title={`${state.streak}-day streak`}>
        <span className={state.streak > 0 ? 'text-warning' : 'opacity-40'}>🔥</span>
        <span className={state.streak > 0 ? '' : 'opacity-40'}>{state.streak}</span>
      </div>

      {/* XP bar */}
      <div className="hidden sm:flex items-center gap-2">
        <span className="text-xs opacity-60">{state.xpToday}/{goalXP} XP</span>
        <div className="w-20 bg-base-300 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
