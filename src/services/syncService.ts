/**
 * Sync Service — offline-first review event sync to Supabase.
 *
 * Architecture (product plan §18.3):
 * - Every card grade writes a ReviewEvent to Dexie locally (instant, offline-safe)
 * - On reconnect / app foreground: flush unsynced events to Supabase review_events
 * - Cross-device sync: pull server events newer than last sync cursor,
 *   replay against local card state
 * - Conflict rule: last-write-wins per card using reviewed_at timestamp
 *
 * Sync is triggered by:
 *   - App coming online (navigator.onLine event)
 *   - User signing in (flush all guest events with new user_id)
 *   - Explicit call to syncNow()
 */

import { db, type ReviewEvent, getDeviceId } from './db';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const LAST_SYNC_KEY = 'languageloader_last_sync';

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

export async function syncNow(userId?: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  const { data: { session } } = await supabase.auth.getSession();
  const uid = userId ?? session?.user?.id;
  if (!uid) return; // Not signed in — nothing to sync

  // --- Push unsynced events ---
  const unsynced = await db.review_events
    .filter((e) => !e.synced_at)
    .toArray();

  if (unsynced.length > 0) {
    const rows = unsynced.map((e) => ({
      id: e.id,
      user_id: uid,
      srs_id: e.srs_id,
      rating: e.rating,
      reviewed_at: e.reviewed_at,
      device_id: e.device_id,
    }));

    const { error } = await supabase
      .from('review_events')
      .upsert(rows, { onConflict: 'id' });

    if (!error) {
      const now = new Date().toISOString();
      await db.review_events.bulkPut(
        unsynced.map((e) => ({ ...e, synced_at: now }))
      );
      localStorage.setItem(LAST_SYNC_KEY, now);
    }
  }

  // --- Pull events from other devices ---
  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  const since = lastSync ?? '1970-01-01T00:00:00Z';

  const { data: remoteEvents } = await supabase
    .from('review_events')
    .select('*')
    .eq('user_id', uid)
    .neq('device_id', getDeviceId())
    .gt('reviewed_at', since)
    .order('reviewed_at', { ascending: true });

  if (remoteEvents && remoteEvents.length > 0) {
    // Store remote events locally (they're already synced)
    await db.review_events.bulkPut(
      remoteEvents.map((e) => ({
        id: e.id,
        srs_id: e.srs_id,
        rating: e.rating as 1 | 2 | 3 | 4,
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
}

/** Wire up online event listener. Call once at app startup. */
export function initSync(): void {
  window.addEventListener('online', () => { syncNow().catch(() => {}); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncNow().catch(() => {});
  });
}
