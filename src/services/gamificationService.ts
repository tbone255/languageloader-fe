/**
 * Gamification Service — Streak + XP + Gems + Daily Goals
 *
 * Design decision: streak resets if no activity for >1 calendar day (not 24h rolling window).
 * This matches Duolingo behavior users expect.
 *
 * XP formula: base 50 XP per lesson + accuracy bonus (up to +25 XP).
 *
 * Daily goal tiers:
 *   Casual  = 50 XP  (1 lesson)
 *   Regular = 100 XP (2 lessons or 1 lesson + review)
 *   Serious = 200 XP (4 lessons or equivalent)
 *
 * Gems: separate hard currency earned from milestones.
 *   - 1 gem per completed lesson
 *   - 3 gems for 7-day streak milestone
 *   - 5 gems for 100% accuracy lesson
 *   Reserved for future: streak freezes purchasable with gems.
 *
 * Design decision: no hearts/lives, no punitive systems. Positive reinforcement only.
 */

const STORAGE_KEY = 'languageloader_gamification_v1';

export type DailyGoalTier = 'casual' | 'regular' | 'serious';
export const DAILY_GOAL_XP: Record<DailyGoalTier, number> = {
  casual: 50,
  regular: 100,
  serious: 200,
};

export type SessionMode = 'quick' | 'standard' | 'extended';
// Quick = up to 5 exercises, Standard = all, Extended = all + bonus drill
const SESSION_MODE_KEY = 'languageloader_session_mode';

export interface GamificationState {
  streak: number;
  lastActivityDate: string; // ISO date YYYY-MM-DD
  xp: number;               // lifetime XP
  xpToday: number;          // resets at midnight
  lastXpResetDate: string;  // ISO date, used to detect day rollover
  streakFreezeCount: number;
  gems: number;             // hard currency
  dailyGoal: DailyGoalTier;
  dailyGoalMetDate: string; // ISO date when goal was last met
}

export interface RecordLessonResult {
  xpEarned: number;
  gemsEarned: number;
  streakUpdated: boolean;
  freezeUsed: boolean;
  newStreak: number;
  goalMet: boolean;
  goalJustMet: boolean;  // true if this lesson pushed XP over the daily goal
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
    gems: 0,
    dailyGoal: 'regular',
    dailyGoalMetDate: '',
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
      this.state.streak += 1;
    } else if (last) {
      const daysBefore = new Date();
      daysBefore.setDate(daysBefore.getDate() - 2);
      const twoDaysAgoISO = daysBefore.toISOString().slice(0, 10);

      if (last >= twoDaysAgoISO && this.state.streakFreezeCount > 0) {
        this.state.streakFreezeCount -= 1;
        this.state.lastActivityDate = today;
        return { updated: true, freezeUsed: true };
      }
      this.state.streak = 1;
    } else {
      this.state.streak = 1;
    }

    this.state.lastActivityDate = today;
    return { updated: true, freezeUsed: false };
  }

  /** Award a streak freeze (at 7-day milestones). */
  awardStreakFreeze(): void {
    if (this.state.streakFreezeCount < 2) {
      this.state.streakFreezeCount += 1;
      this.save();
    }
  }

  setDailyGoal(goal: DailyGoalTier): void {
    this.state.dailyGoal = goal;
    this.save();
  }

  getDailyGoalProgress(): { xpToday: number; goalXp: number; met: boolean; pct: number } {
    this.rolloverIfNeeded();
    const goalXp = DAILY_GOAL_XP[this.state.dailyGoal];
    const met = this.state.xpToday >= goalXp;
    const pct = Math.min(1, this.state.xpToday / goalXp);
    return { xpToday: this.state.xpToday, goalXp, met, pct };
  }

  recordLessonComplete(accuracyPct: number): RecordLessonResult {
    this.rolloverIfNeeded();

    const goalXpBefore = this.state.xpToday;

    // XP: base 50 + up to 25 accuracy bonus
    const accuracyBonus = Math.round(accuracyPct * 25);
    const xpEarned = 50 + accuracyBonus;

    this.state.xp += xpEarned;
    this.state.xpToday += xpEarned;

    // Gems: 1 per lesson, +5 for perfect accuracy
    let gemsEarned = 1;
    if (accuracyPct >= 1.0) gemsEarned += 5;
    this.state.gems += gemsEarned;

    const { updated: streakUpdated, freezeUsed } = this.updateStreak();

    // Award freeze + gems at 7-day streak milestones
    if (this.state.streak > 0 && this.state.streak % 7 === 0) {
      this.awardStreakFreeze();
      this.state.gems += 3; // 3 gems for streak milestone
      gemsEarned += 3;
    }

    // Check if daily goal was just met
    const goalXp = DAILY_GOAL_XP[this.state.dailyGoal];
    const goalMet = this.state.xpToday >= goalXp;
    const goalJustMet = goalMet && goalXpBefore < goalXp;
    if (goalJustMet) {
      this.state.dailyGoalMetDate = todayISO();
    }

    this.save();
    return {
      xpEarned,
      gemsEarned,
      streakUpdated,
      freezeUsed,
      newStreak: this.state.streak,
      goalMet,
      goalJustMet,
    };
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

  spendGems(amount: number): boolean {
    if (this.state.gems < amount) return false;
    this.state.gems -= amount;
    this.save();
    return true;
  }

  getState(): GamificationState {
    this.rolloverIfNeeded();
    return { ...this.state };
  }

  /** Session mode — stored separately (UI preference, not progress data). */
  getSessionMode(): SessionMode {
    return (localStorage.getItem(SESSION_MODE_KEY) as SessionMode) ?? 'standard';
  }

  setSessionMode(mode: SessionMode): void {
    localStorage.setItem(SESSION_MODE_KEY, mode);
  }
}

export const gamificationService = new GamificationService();
