/**
 * User Languages Service — which languages the user is learning, and which
 * one is active.
 *
 * Deliberately separate from srsItemService / lessonService: enrollment is
 * new, not-yet-load-bearing state, so it lives in its own Dexie table
 * (`user_languages`) and its own server table — the core SRS/progress tables
 * stay free of a language dimension until real multi-language content exists.
 *
 * Guest-safe: everything works offline against Dexie. When signed in,
 * syncLanguages() best-effort mirrors enrollment to the server (same
 * 401/503-means-guest contract as syncService).
 */

import { db, type DBUserLanguage } from './db';
import { DEFAULT_LANGUAGE, getLanguage } from '../data/languages';
import { getAccessToken } from './supabaseClient';

const ACTIVE_KEY = 'languageloader_active_language';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Enrolled languages, most-recently-active first. */
export async function getMyLanguages(): Promise<DBUserLanguage[]> {
  const rows = await db.user_languages.toArray();
  return rows.sort((a, b) => b.last_active_at.localeCompare(a.last_active_at));
}

/** Enroll a language (idempotent). Bumps last_active_at if already enrolled. */
export async function addLanguage(code: string): Promise<void> {
  if (!getLanguage(code)) return; // unknown code — ignore
  const now = new Date().toISOString();
  const existing = await db.user_languages.get(code);
  await db.user_languages.put({
    code,
    added_at: existing?.added_at ?? now,
    last_active_at: now,
  });
  void syncLanguages();
}

/**
 * The active language code. Falls back to the most-recently-active enrolled
 * language, then to the default. Synchronous read from localStorage so
 * callers (LearnHomePage title, etc.) don't flash.
 */
export function getActiveLanguage(): string {
  return localStorage.getItem(ACTIVE_KEY) ?? DEFAULT_LANGUAGE;
}

/** Set the active language and bump its recency (enrolling if needed). */
export async function setActiveLanguage(code: string): Promise<void> {
  if (!getLanguage(code)) return;
  localStorage.setItem(ACTIVE_KEY, code);
  await addLanguage(code);
}

/**
 * Best-effort two-way sync with the server. Push local enrollments, then pull
 * the server's set and merge (union; latest last_active_at wins). Silent on
 * 401/503/offline — local Dexie stays the source of truth.
 */
export async function syncLanguages(): Promise<void> {
  let local: DBUserLanguage[];
  try {
    local = await db.user_languages.toArray();
  } catch {
    return;
  }

  // Push
  for (const lang of local) {
    try {
      const res = await fetch(`/api/languages/${encodeURIComponent(lang.code)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        credentials: 'same-origin',
        body: JSON.stringify({ added_at: lang.added_at, last_active_at: lang.last_active_at }),
      });
      if (!res.ok) return; // not signed in / no backend — keep local only
    } catch {
      return;
    }
  }

  // Pull + merge
  try {
    const res = await fetch('/api/languages', {
      headers: { ...(await authHeaders()) },
      credentials: 'same-origin',
    });
    if (!res.ok) return;
    const { languages } = (await res.json()) as {
      languages: Array<{ language_code: string; added_at: string; last_active_at: string }>;
    };
    if (!Array.isArray(languages)) return;
    const byCode = new Map(local.map((l) => [l.code, l]));
    for (const r of languages) {
      const cur = byCode.get(r.language_code);
      if (!cur || r.last_active_at > cur.last_active_at) {
        await db.user_languages.put({
          code: r.language_code,
          added_at: cur ? cur.added_at : r.added_at,
          last_active_at: r.last_active_at,
        });
      }
    }
  } catch {
    /* offline — local stays authoritative */
  }
}
