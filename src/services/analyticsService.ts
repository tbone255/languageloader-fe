/**
 * Analytics Service — PostHog
 *
 * Design decision: anonymous by default, no PII collected.
 * User IDs are random UUIDs generated on first load and stored in localStorage.
 * Events are batched and sent async — no impact on exercise UX timing.
 *
 * Full event schema (issue #72):
 *
 * Lesson funnel:
 * - lesson_started          { lesson_id, lesson_order, session_mode }
 * - lesson_abandoned        { lesson_id, lesson_order, exercises_completed, reason? }
 * - exercise_completed      { exercise_type, correct, is_retry, attempt_number? }
 * - lesson_completed        { lesson_id, accuracy, xp_earned, gems_earned, duration_ms, session_mode }
 *
 * SRS:
 * - srs_card_reviewed       { srs_type, rating, stability_before, lapses, is_due }
 * - review_session_complete { cards_reviewed, xp_earned, duration_ms }
 * - drill_started           { card_count }
 * - drill_completed         { card_count, again_count }
 *
 * Gamification:
 * - streak_updated          { new_streak, was_freeze_used }
 * - daily_goal_met          { tier, xp_earned_today }
 * - badge_earned            { badge_id, badge_label }
 * - xp_milestone            { xp_total }
 *
 * Onboarding:
 * - onboarding_started
 * - onboarding_step_completed { step }
 * - onboarding_completed    { motivation, experience_level, daily_goal_tier }
 *
 * Navigation:
 * - placement_quiz_started
 * - placement_quiz_completed { score, lessons_unlocked }
 * - pro_page_viewed
 * - pro_waitlist_joined
 */

const ANON_ID_KEY = 'languageloader_anon_id';

function getAnonId(): string {
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

let posthogLoaded = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ph: any = null;

/**
 * Call once at app startup (from main.tsx).
 * No-ops if VITE_POSTHOG_KEY is not set.
 */
export async function initAnalytics(): Promise<void> {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key) return;

  try {
    const posthog = await import('posthog-js');
    ph = posthog.default;
    ph.init(key, {
      api_host: 'https://us.i.posthog.com',
      person_profiles: 'never',
      capture_pageview: true,
    });
    ph.identify(getAnonId());
    posthogLoaded = true;
  } catch {
    // PostHog unavailable — fail silently
  }
}

export function trackEvent(event: string, props?: Record<string, unknown>): void {
  if (!posthogLoaded || !ph) return;
  try {
    ph.capture(event, props);
  } catch {
    // Fail silently
  }
}

// --- Typed event helpers for the main event schema ---

export function trackLessonStarted(lessonId: string, lessonOrder: number) {
  trackEvent('lesson_started', {
    lesson_id: lessonId,
    lesson_order: lessonOrder,
  });
}

export function trackLessonAbandoned(lessonId: string, lessonOrder: number, exercisesCompleted: number) {
  trackEvent('lesson_abandoned', {
    lesson_id: lessonId,
    lesson_order: lessonOrder,
    exercises_completed: exercisesCompleted,
  });
}

export function trackExerciseCompleted(exerciseType: string, correct: boolean, isRetry: boolean) {
  trackEvent('exercise_completed', {
    exercise_type: exerciseType,
    correct,
    is_retry: isRetry,
  });
}

export function trackLessonCompleted(
  lessonId: string,
  accuracy: number,
  xpEarned: number,
  gemsEarned: number,
  durationMs: number,
) {
  trackEvent('lesson_completed', {
    lesson_id: lessonId,
    accuracy,
    xp_earned: xpEarned,
    gems_earned: gemsEarned,
    duration_ms: durationMs,
  });
}

export function trackSrsCardReviewed(
  srsType: string,
  rating: number,
  stabilityBefore: number,
  lapses: number,
) {
  trackEvent('srs_card_reviewed', {
    srs_type: srsType,
    rating,
    stability_before: stabilityBefore,
    lapses,
  });
}

export function trackReviewSessionComplete(cardsReviewed: number, xpEarned: number, durationMs: number) {
  trackEvent('review_session_complete', {
    cards_reviewed: cardsReviewed,
    xp_earned: xpEarned,
    duration_ms: durationMs,
  });
}

export function trackStreakUpdated(newStreak: number, wasFreezeUsed: boolean) {
  trackEvent('streak_updated', {
    new_streak: newStreak,
    was_freeze_used: wasFreezeUsed,
  });
}

export function trackDailyGoalMet(tier: string, xpEarnedToday: number) {
  trackEvent('daily_goal_met', { tier, xp_earned_today: xpEarnedToday });
}

export function trackBadgeEarned(badgeId: string, badgeLabel: string) {
  trackEvent('badge_earned', { badge_id: badgeId, badge_label: badgeLabel });
}

export function trackOnboardingCompleted(
  motivation: string,
  experienceLevel: string,
  dailyGoalTier: string,
) {
  trackEvent('onboarding_completed', {
    motivation,
    experience_level: experienceLevel,
    daily_goal_tier: dailyGoalTier,
  });
}

export function trackProPageViewed() {
  trackEvent('pro_page_viewed');
}

export function trackProWaitlistJoined() {
  trackEvent('pro_waitlist_joined');
}

export function trackPlacementQuizCompleted(score: number, lessonsUnlocked: number) {
  trackEvent('placement_quiz_completed', { score, lessons_unlocked: lessonsUnlocked });
}
