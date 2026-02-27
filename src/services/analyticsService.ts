/**
 * Analytics Service — PostHog
 *
 * Design decision: anonymous by default, no PII collected.
 * User IDs are random UUIDs generated on first load and stored in localStorage.
 * Events are batched and sent async — no impact on exercise UX timing.
 *
 * Key events:
 * - lesson_started { lesson_id, lesson_order }
 * - exercise_completed { exercise_type, correct, attempt_number }
 * - lesson_completed { lesson_id, accuracy, xp_earned, duration_ms }
 * - review_card_graded { srs_type, rating }
 * - streak_updated { new_streak }
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
