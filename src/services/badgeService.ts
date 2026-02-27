/**
 * Badge Service
 *
 * Awards badges for learning milestones. Checks conditions on each
 * relevant event and stores earned badges in Dexie.
 */

import { db } from './db';

export interface Badge {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export const ALL_BADGES: Badge[] = [
  { id: 'first_lesson',      label: 'First Step',        description: 'Complete your first lesson',               icon: '🎓' },
  { id: 'streak_3',          label: 'On a Roll',          description: 'Reach a 3-day streak',                     icon: '🔥' },
  { id: 'streak_7',          label: 'Week Warrior',       description: 'Reach a 7-day streak',                     icon: '⚡' },
  { id: 'streak_30',         label: 'Iron Habit',         description: 'Reach a 30-day streak',                    icon: '💪' },
  { id: 'xp_100',            label: 'XP Starter',         description: 'Earn 100 XP',                              icon: '⭐' },
  { id: 'xp_500',            label: 'XP Collector',       description: 'Earn 500 XP',                              icon: '🌟' },
  { id: 'xp_2000',           label: 'XP Legend',          description: 'Earn 2000 XP',                             icon: '💫' },
  { id: 'lessons_10',        label: 'Dedicated Learner',  description: 'Complete 10 lessons',                      icon: '📚' },
  { id: 'perfect_lesson',    label: 'Perfectionist',      description: 'Complete a lesson with 100% accuracy',     icon: '💯' },
  { id: 'cards_100',         label: 'Card Collector',     description: 'Review 100 cards',                         icon: '🃏' },
  { id: 'speed_lesson',      label: 'Speed Learner',      description: 'Complete a lesson in under 5 minutes',     icon: '⚡' },
  { id: 'freeze_used',       label: 'Safety Net',         description: 'Use a streak freeze',                      icon: '🛡️' },
];

type BadgeListener = (badge: Badge) => void;
const listeners: BadgeListener[] = [];

export function onBadgeEarned(fn: BadgeListener): () => void {
  listeners.push(fn);
  return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
}

async function award(id: string): Promise<void> {
  const existing = await db.badges.get(id);
  if (existing) return; // Already earned
  await db.badges.put({ id, earned_at: new Date().toISOString() });
  const badge = ALL_BADGES.find((b) => b.id === id);
  if (badge) listeners.forEach((fn) => fn(badge));
}

export async function getEarnedBadgeIds(): Promise<Set<string>> {
  const rows = await db.badges.toArray();
  return new Set(rows.map((r) => r.id));
}

// --- Condition checks (called from relevant events) ---

export async function checkLessonBadges(
  lessonsCompleted: number,
  accuracyPct: number,
  durationMs: number,
): Promise<void> {
  if (lessonsCompleted >= 1)  await award('first_lesson');
  if (lessonsCompleted >= 10) await award('lessons_10');
  if (accuracyPct >= 1.0)     await award('perfect_lesson');
  if (durationMs < 5 * 60 * 1000) await award('speed_lesson');
}

export async function checkStreakBadges(streak: number): Promise<void> {
  if (streak >= 3)  await award('streak_3');
  if (streak >= 7)  await award('streak_7');
  if (streak >= 30) await award('streak_30');
}

export async function checkXPBadges(totalXP: number): Promise<void> {
  if (totalXP >= 100)  await award('xp_100');
  if (totalXP >= 500)  await award('xp_500');
  if (totalXP >= 2000) await award('xp_2000');
}

export async function checkReviewBadges(totalReviewed: number): Promise<void> {
  if (totalReviewed >= 100) await award('cards_100');
}

export async function checkFreezeBadge(): Promise<void> {
  await award('freeze_used');
}
