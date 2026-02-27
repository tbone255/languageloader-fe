/**
 * Onboarding Service
 *
 * Manages user onboarding state in Dexie.
 * Determines whether to redirect to /onboarding on first visit.
 */

import { db, type DBOnboarding } from './db';

const DEFAULT: DBOnboarding = {
  key: 'v1',
  complete: false,
  daily_goal_minutes: 10,
  experience_level: 'none',
};

export async function getOnboarding(): Promise<DBOnboarding> {
  const row = await db.onboarding.get('v1');
  return row ?? DEFAULT;
}

export async function saveOnboarding(data: Partial<DBOnboarding>): Promise<void> {
  const current = await getOnboarding();
  await db.onboarding.put({ ...current, ...data, key: 'v1' });
}

export async function isOnboardingComplete(): Promise<boolean> {
  const row = await db.onboarding.get('v1');
  return row?.complete ?? false;
}

export async function completeOnboarding(
  data: Pick<DBOnboarding, 'daily_goal_minutes' | 'experience_level' | 'motivation'>
): Promise<void> {
  await db.onboarding.put({ key: 'v1', complete: true, ...data });
}
