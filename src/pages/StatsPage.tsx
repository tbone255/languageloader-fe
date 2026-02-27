/**
 * StatsPage — SRS Statistics Dashboard
 *
 * Shows retention rate, card distribution by state,
 * stability histogram, and daily goal progress.
 */

import { useEffect, useState } from 'react';
import { srsItemService } from '../services/srsItemService';
import { gamificationService, DAILY_GOAL_XP } from '../services/gamificationService';
import { getAllLessons } from '../services/lessonService';
import { Link } from 'react-router-dom';

interface Stats {
  total: number;
  new: number;
  learning: number;
  review: number;
  relearning: number;
  due: number;
  avgStability: number;
  avgRetention: number;
  totalReviews: number;
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const gamState = gamificationService.getState();
  const { xpToday, goalXp, pct: goalPct } = gamificationService.getDailyGoalProgress();

  useEffect(() => {
    async function load() {
      await srsItemService.loadFromDexie();
      const lessons = await getAllLessons();
      for (const l of lessons) srsItemService.registerItemData(l.srs);

      const all = srsItemService.getAllCards();
      const srsStats = srsItemService.getStats();

      // FSRS states: 0=New, 1=Learning, 2=Review, 3=Relearning
      let newCards = 0, learning = 0, review = 0, relearning = 0;
      let stabilitySum = 0, retentionSum = 0, retentionCount = 0;

      for (const c of all) {
        const state = c.card.state;
        if (state === 0) newCards++;
        else if (state === 1) learning++;
        else if (state === 2) review++;
        else if (state === 3) relearning++;

        if (state > 0) {
          stabilitySum += c.card.stability;
          // FSRS retrievability approximation: e^(-elapsed/stability)
          const lastReviewMs = c.card.last_review ? new Date(c.card.last_review).getTime() : Date.now();
          const elapsed = (Date.now() - lastReviewMs) / 86400000; // days
          const ret = Math.exp(-elapsed / Math.max(c.card.stability, 0.1));
          retentionSum += ret;
          retentionCount++;
        }
      }

      const avgStability = all.length > 0 ? stabilitySum / Math.max(all.length - newCards, 1) : 0;
      const avgRetention = retentionCount > 0 ? retentionSum / retentionCount : 0;

      setStats({
        total: all.length,
        new: newCards,
        learning,
        review,
        relearning,
        due: srsStats.due,
        avgStability,
        avgRetention,
        totalReviews: all.reduce((sum, c) => sum + (c.card.reps ?? 0), 0),
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!stats) return null;

  const retentionPct = Math.round(stats.avgRetention * 100);
  const stabilityDisplay = stats.avgStability.toFixed(1);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">Statistics</h1>
        <p className="text-base-content/70">Your learning progress at a glance</p>
      </div>

      {/* Daily goal */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg mb-3">Daily Goal</h2>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize">{gamState.dailyGoal} ({goalXp} XP)</span>
                <span>{Math.min(xpToday, goalXp)} / {goalXp} XP</span>
              </div>
              <progress
                className={`progress w-full ${xpToday >= goalXp ? 'progress-success' : 'progress-primary'}`}
                value={Math.min(xpToday, goalXp)}
                max={goalXp}
              />
            </div>
            <div className="text-2xl font-bold text-primary">{Math.round(goalPct * 100)}%</div>
          </div>
          <div className="flex gap-3 text-sm flex-wrap">
            {Object.entries(DAILY_GOAL_XP).map(([tier, xp]) => (
              <span
                key={tier}
                className={`badge ${gamState.dailyGoal === tier ? 'badge-primary' : 'badge-ghost'}`}
              >
                {tier}: {xp} XP
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* XP & streak overview */}
      <div className="stats stats-vertical sm:stats-horizontal shadow w-full bg-base-100">
        <div className="stat">
          <div className="stat-figure text-warning text-3xl">🔥</div>
          <div className="stat-title">Streak</div>
          <div className="stat-value text-warning">{gamState.streak}</div>
          <div className="stat-desc">days</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-primary text-3xl">⭐</div>
          <div className="stat-title">Total XP</div>
          <div className="stat-value text-primary">{gamState.xp}</div>
          <div className="stat-desc">lifetime</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-info text-3xl">💎</div>
          <div className="stat-title">Gems</div>
          <div className="stat-value text-info">{gamState.gems}</div>
          <div className="stat-desc">earned</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-3xl">🛡️</div>
          <div className="stat-title">Streak Freezes</div>
          <div className="stat-value">{gamState.streakFreezeCount}</div>
          <div className="stat-desc">available</div>
        </div>
      </div>

      {/* Card breakdown */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">Card States</h2>

          <div className="stats stats-vertical sm:stats-horizontal shadow w-full mb-4">
            <div className="stat">
              <div className="stat-title">Total Cards</div>
              <div className="stat-value text-2xl">{stats.total}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Due Now</div>
              <div className={`stat-value text-2xl ${stats.due > 0 ? 'text-error' : 'text-success'}`}>
                {stats.due}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">Total Reviews</div>
              <div className="stat-value text-2xl">{stats.totalReviews}</div>
            </div>
          </div>

          {/* State distribution bar */}
          {stats.total > 0 && (
            <div className="mb-4">
              <p className="text-sm opacity-60 mb-2">Distribution</p>
              <div className="flex h-4 rounded-full overflow-hidden">
                {stats.new > 0 && (
                  <div
                    className="bg-base-300"
                    style={{ width: `${(stats.new / stats.total) * 100}%` }}
                    title={`New: ${stats.new}`}
                  />
                )}
                {stats.learning > 0 && (
                  <div
                    className="bg-warning"
                    style={{ width: `${(stats.learning / stats.total) * 100}%` }}
                    title={`Learning: ${stats.learning}`}
                  />
                )}
                {stats.review > 0 && (
                  <div
                    className="bg-success"
                    style={{ width: `${(stats.review / stats.total) * 100}%` }}
                    title={`Review: ${stats.review}`}
                  />
                )}
                {stats.relearning > 0 && (
                  <div
                    className="bg-error"
                    style={{ width: `${(stats.relearning / stats.total) * 100}%` }}
                    title={`Relearning: ${stats.relearning}`}
                  />
                )}
              </div>
              <div className="flex gap-4 mt-2 text-xs flex-wrap">
                <span><span className="inline-block w-3 h-3 rounded-sm bg-base-300 mr-1"></span>New: {stats.new}</span>
                <span><span className="inline-block w-3 h-3 rounded-sm bg-warning mr-1"></span>Learning: {stats.learning}</span>
                <span><span className="inline-block w-3 h-3 rounded-sm bg-success mr-1"></span>Review: {stats.review}</span>
                <span><span className="inline-block w-3 h-3 rounded-sm bg-error mr-1"></span>Relearning: {stats.relearning}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FSRS metrics */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">Memory Metrics</h2>

          <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-title">Avg Retention</div>
              <div className={`stat-value text-2xl ${retentionPct >= 85 ? 'text-success' : retentionPct >= 70 ? 'text-warning' : 'text-error'}`}>
                {retentionPct}%
              </div>
              <div className="stat-desc">Target: 90%</div>
            </div>
            <div className="stat">
              <div className="stat-title">Avg Stability</div>
              <div className="stat-value text-2xl">{stabilityDisplay}d</div>
              <div className="stat-desc">Higher = stronger memory</div>
            </div>
          </div>

          {retentionPct > 0 && retentionPct < 85 && (
            <div className="alert alert-warning mt-4">
              <div>
                <p className="font-semibold">Retention below target</p>
                <p className="text-sm">Review your due cards regularly to keep retention above 85%.</p>
              </div>
              <Link to="/review" className="btn btn-sm btn-warning">Review Now</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
