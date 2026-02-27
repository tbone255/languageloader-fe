/**
 * Gamification Service — Streak + XP
 *
 * Design decision: streak resets if no activity for >1 calendar day (not 24h rolling window).
 * This matches Duolingo behavior users expect.
 *
 * XP formula: base 50 XP per lesson + accuracy bonus (up to +25 XP).
 *
 * Design decision: no hearts/lives, no punitive systems. Positive reinforcement only.
 */

const STORAGE_KEY = 'languageloader_gamification_v1';

export interface GamificationState {
  streak: number;
  lastActivityDate: string; // ISO date YYYY-MM-DD
  xp: number;               // lifetime XP
  xpToday: number;          // resets at midnight
  lastXpResetDate: string;  // ISO date, used to detect day rollover
  streakFreezeCount: number; // reserved for future use
}

interface RecordLessonResult {
  xpEarned: number;
  streakUpdated: boolean;
  freezeUsed: boolean;
  newStreak: number;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultState(): GamificationState {
  const today = todayISO();
  return {
    streak: 0,
    lastActivityDate: '',
    xp: 0,
    xpToday: 0,
    lastXpResetDate: today,
    streakFreezeCount: 0,
  };
}

class GamificationService {
  private state: GamificationState;

  constructor() {
    this.state = this.load();
    this.rolloverIfNeeded();
  }

  private load(): GamificationState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return { ...defaultState(), ...JSON.parse(raw) };
    } catch {
      return defaultState();
    }
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  private rolloverIfNeeded(): void {
    const today = todayISO();
    if (this.state.lastXpResetDate !== today) {
      this.state.xpToday = 0;
      this.state.lastXpResetDate = today;
      this.save();
    }
  }

  private updateStreak(): { updated: boolean; freezeUsed: boolean } {
    const today = todayISO();
    const last = this.state.lastActivityDate;

    if (last === today) {
      return { updated: false, freezeUsed: false };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().slice(0, 10);

    if (last === yesterdayISO) {
      // Consecutive day
      this.state.streak += 1;
    } else if (last) {
      // Missed at least one day — try streak freeze
      const daysBefore = new Date();
      daysBefore.setDate(daysBefore.getDate() - 2);
      const twoDaysAgoISO = daysBefore.toISOString().slice(0, 10);

      if (last >= twoDaysAgoISO && this.state.streakFreezeCount > 0) {
        // Gap of exactly 1 missed day + freeze available — protect streak
        this.state.streakFreezeCount -= 1;
        this.state.lastActivityDate = today;
        return { updated: true, freezeUsed: true };
      }
      // Reset
      this.state.streak = 1;
    } else {
      this.state.streak = 1;
    }

    this.state.lastActivityDate = today;
    return { updated: true, freezeUsed: false };
  }

  /** Award a streak freeze (e.g. at 7-day milestones). */
  awardStreakFreeze(): void {
    if (this.state.streakFreezeCount < 2) {
      this.state.streakFreezeCount += 1;
      this.save();
    }
  }

  recordLessonComplete(accuracyPct: number): RecordLessonResult {
    this.rolloverIfNeeded();

    // XP: base 50 + up to 25 accuracy bonus
    const accuracyBonus = Math.round(accuracyPct * 25);
    const xpEarned = 50 + accuracyBonus;

    this.state.xp += xpEarned;
    this.state.xpToday += xpEarned;

    const { updated: streakUpdated, freezeUsed } = this.updateStreak();

    // Award freeze at 7-day milestones
    if (this.state.streak > 0 && this.state.streak % 7 === 0) {
      this.awardStreakFreeze();
    }

    this.save();
    return { xpEarned, streakUpdated, freezeUsed, newStreak: this.state.streak };
  }

  recordReviewSession(cardsReviewed: number): { xpEarned: number } {
    this.rolloverIfNeeded();

    // 5 XP per card reviewed
    const xpEarned = cardsReviewed * 5;
    this.state.xp += xpEarned;
    this.state.xpToday += xpEarned;
    this.updateStreak();
    this.save();

    return { xpEarned };
  }

  getState(): GamificationState {
    this.rolloverIfNeeded();
    return { ...this.state };
  }
}

export const gamificationService = new GamificationService();
