/**
 * Sync Service — offline-first review event sync to our server API.
 *
 * Architecture (product plan §18.3):
 * - Every card grade writes a ReviewEvent to Dexie locally (instant, offline-safe)
 * - On reconnect / app foreground: flush unsynced events to POST /api/sync/review-events
 * - Cross-device sync: pull server events newer than last sync cursor,
 *   replay against local card state
 * - Conflict rule: last-write-wins per card using reviewed_at timestamp
 *
 * Auth is the server session cookie (Replit Auth). 401/503 responses mean
 * "guest mode / no backend" and are silently ignored — events stay queued
 * in Dexie until a sign-in succeeds.
 *
 * Sync is triggered by:
 *   - App coming online (navigator.onLine event)
 *   - App returning to foreground
 *   - Explicit call to syncNow() (e.g. after sign-in)
 */

import { db, type ReviewEvent, getDeviceId } from './db';
import { getAccessToken } from './supabaseClient';

const LAST_SYNC_KEY = 'languageloader_last_sync';

/** Authorization header for the signed-in user, or empty (guest). */
async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface RemoteReviewEvent {
  id: string;
  srs_id: string;
  rating: 1 | 2 | 3 | 4;
  reviewed_at: string;
  device_id: string;
}

export async function appendReviewEvent(
  srsId: string,
  rating: 1 | 2 | 3 | 4,
): Promise<void> {
  const event: ReviewEvent = {
    id: crypto.randomUUID(),
    srs_id: srsId,
    rating,
    reviewed_at: new Date().toISOString(),
    device_id: getDeviceId(),
  };
  await db.review_events.put(event);
  // Best-effort immediate sync if online
  if (navigator.onLine) syncNow().catch(() => {});
}

export async function syncNow(): Promise<void> {
  // --- Push unsynced events ---
  const unsynced = await db.review_events
    .filter((e) => !e.synced_at)
    .toArray();

  if (unsynced.length > 0) {
    const res = await fetch('/api/sync/review-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      credentials: 'same-origin',
      body: JSON.stringify({
        events: unsynced.map((e) => ({
          id: e.id,
          srs_id: e.srs_id,
          rating: e.rating,
          reviewed_at: e.reviewed_at,
          device_id: e.device_id,
        })),
      }),
    });
    if (!res.ok) return; // not signed in / no backend — keep events queued

    const now = new Date().toISOString();
    await db.review_events.bulkPut(
      unsynced.map((e) => ({ ...e, synced_at: now }))
    );
    localStorage.setItem(LAST_SYNC_KEY, now);
  }

  // --- Pull events from other devices ---
  const since = localStorage.getItem(LAST_SYNC_KEY) ?? '1970-01-01T00:00:00Z';
  const params = new URLSearchParams({
    since,
    exclude_device: getDeviceId(),
  });
  const res = await fetch(`/api/sync/review-events?${params}`, {
    headers: { ...(await authHeaders()) },
    credentials: 'same-origin',
  });
  if (!res.ok) return;

  const { events: remoteEvents } = (await res.json()) as { events: RemoteReviewEvent[] };
  if (remoteEvents && remoteEvents.length > 0) {
    // Store remote events locally (they're already synced)
    await db.review_events.bulkPut(
      remoteEvents.map((e) => ({
        id: e.id,
        srs_id: e.srs_id,
        rating: e.rating,
        reviewed_at: e.reviewed_at,
        device_id: e.device_id,
        synced_at: new Date().toISOString(),
      }))
    );
    // Replay remote events against local srsItemService
    // Circular import is harmless here — both modules are already in the bundle
    const { srsItemService } = await import('./srsItemService');
    const { Rating } = await import('ts-fsrs');
    const ratingMap: Record<number, number> = { 1: Rating.Again, 2: Rating.Hard, 3: Rating.Good, 4: Rating.Easy };
    for (const e of remoteEvents) {
      srsItemService.gradeCard(e.srs_id, ratingMap[e.rating] ?? Rating.Good);
    }
  }
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

/** Wire up online event listener. Call once at app startup. */
export function initSync(): void {
  window.addEventListener('online', () => { syncNow().catch(() => {}); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncNow().catch(() => {});
  });
}
