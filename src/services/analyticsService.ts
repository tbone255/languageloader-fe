/**
 * Analytics Service — first-party telemetry.
 *
 * No third-party analytics (PostHog removed 2026-06-10). Events batch to
 * our own POST /api/telemetry (anonymous anon_id; the server attaches
 * user_id when a session exists) and feed the content quarantine loop
 * (docs/LIVE-TEXTBOOK.md §10). Best-effort by design: the server may not
 * have a database (local dev) and the request may never land — the app
 * never waits on or reacts to telemetry.
 *
 * Event schema (issue #72):
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

const FLUSH_INTERVAL_MS = 5000;
const FLUSH_BATCH_SIZE = 20;
const MAX_PER_POST = 50; // server-enforced cap

let queue: Array<{ event: string; props: Record<string, unknown> }> = [];
let flushTimer: number | null = null;

function flush(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;
  const batch = queue.slice(0, MAX_PER_POST);
  queue = queue.slice(MAX_PER_POST);
  fetch('/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ anon_id: getAnonId(), events: batch }),
    keepalive: true, // survives page unload
  }).catch(() => {});
  if (queue.length > 0) flush();
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
  });
}

export function trackEvent(event: string, props?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.debug('[analytics]', event, props ?? {});
  }
  queue.push({ event, props: props ?? {} });
  if (queue.length >= FLUSH_BATCH_SIZE) {
    flush();
  } else if (flushTimer === null) {
    flushTimer = window.setTimeout(flush, FLUSH_INTERVAL_MS);
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
