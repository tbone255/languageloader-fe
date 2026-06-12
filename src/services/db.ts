/**
 * Dexie (IndexedDB) database definition.
 *
 * All persistent storage goes through this DB.
 * srsItemService uses the srs_cards table as its backing store.
 * syncService uses review_events to flush unsynced events to the server API.
 */

import Dexie, { type Table } from 'dexie';

export interface DBSRSCard {
  srs_id: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
}

export interface ReviewEvent {
  id: string;           // client-generated UUID
  srs_id: string;
  rating: 1 | 2 | 3 | 4;
  reviewed_at: string;  // ISO timestamp
  device_id: string;
  synced_at?: string;   // undefined until confirmed synced to the server
}

export interface DBLessonProgress {
  lesson_id: string;
  completed: boolean;
  completed_at?: string;
  exercises_completed: string[];
}

export interface DBOnboarding {
  key: string;          // singleton row key = 'v1'
  complete: boolean;
  daily_goal_minutes: number;
  experience_level: 'none' | 'some' | 'intermediate';
  motivation?: string;
}

export interface DBBadge {
  id: string;
  earned_at: string;    // ISO timestamp
}

let _deviceId: string | null = null;
export function getDeviceId(): string {
  if (_deviceId) return _deviceId;
  const stored = localStorage.getItem('languageloader_device_id');
  if (stored) { _deviceId = stored; return stored; }
  const id = crypto.randomUUID();
  localStorage.setItem('languageloader_device_id', id);
  _deviceId = id;
  return id;
}

class LanguageLoaderDB extends Dexie {
  srs_cards!: Table<DBSRSCard, string>;
  review_events!: Table<ReviewEvent, string>;
  lesson_progress!: Table<DBLessonProgress, string>;
  onboarding!: Table<DBOnboarding, string>;
  badges!: Table<DBBadge, string>;

  constructor() {
    super('LanguageLoaderDB');
    this.version(1).stores({
      srs_cards: 'srs_id',
      review_events: 'id, srs_id, reviewed_at, synced_at',
      lesson_progress: 'lesson_id',
      onboarding: 'key',
      badges: 'id',
    });
  }
}

export const db = new LanguageLoaderDB();

/**
 * Migrate legacy localStorage data into Dexie on first run.
 * Called once at app startup before any service is used.
 */
export async function migrateFromLocalStorage(): Promise<void> {
  // SRS cards migration
  const srsRaw = localStorage.getItem('languageloader_srs_items_v1');
  if (srsRaw) {
    try {
      const parsed = JSON.parse(srsRaw) as DBSRSCard[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const existing = await db.srs_cards.count();
        if (existing === 0) {
          await db.srs_cards.bulkPut(parsed);
        }
      }
    } catch { /* ignore */ }
  }

  // Lesson progress migration
  const progressRaw = localStorage.getItem('languageloader_lesson_progress');
  if (progressRaw) {
    try {
      const parsed = JSON.parse(progressRaw) as Record<string, DBLessonProgress>;
      const existing = await db.lesson_progress.count();
      if (existing === 0) {
        await db.lesson_progress.bulkPut(Object.values(parsed));
      }
    } catch { /* ignore */ }
  }
}
