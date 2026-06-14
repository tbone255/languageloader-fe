/**
 * Postgres access via DATABASE_URL (Render managed Postgres, or any Postgres).
 *
 * When DATABASE_URL is unset (local dev without a DB), `pool` is null and
 * every API route that needs storage responds 503; the SPA runs guest-only.
 */

import pg from 'pg';

const CONNECTION_STRING = process.env.DATABASE_URL;

// Managed Postgres reached over the public internet needs TLS. Render's
// *internal* URL doesn't (same private network); its *external* URL
// (*.render.com) does, with a cert chain Node won't validate by default.
// Enable TLS for sslmode=require, an external Render host, or an explicit
// DATABASE_SSL=true override; leave it off for internal/local connections.
const useSsl =
  !!CONNECTION_STRING &&
  (/sslmode=require/i.test(CONNECTION_STRING) ||
    /\.render\.com/i.test(CONNECTION_STRING) ||
    process.env.DATABASE_SSL === 'true');

export const pool: pg.Pool | null = CONNECTION_STRING
  ? new pg.Pool({
      connectionString: CONNECTION_STRING,
      // Fail fast on an unreachable host so boot (and the deploy healthcheck)
      // isn't blocked waiting on a DB that will never answer.
      connectionTimeoutMillis: 5000,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    })
  : null;

export const isDbConfigured = pool !== null;

// True once the schema has been applied against a reachable DB. A DATABASE_URL
// can be *set* but unreachable (e.g. a deployment handed the dev database's
// in-workspace host) — in that case we run as if there were no DB.
export let dbReady = false;

// An unreachable DB or a dropped idle connection emits 'error' on the pool;
// with no listener Node would crash the whole process. Log and carry on.
pool?.on('error', (err) => {
  console.error('[db] pool error:', err.message);
});

// Idempotent DDL, applied on boot. Additive changes only — destructive
// migrations get their own script.
const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id varchar PRIMARY KEY,
    email text,
    first_name text,
    last_name text,
    profile_image_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  // Shape required by connect-pg-simple (createTableIfMissing is off so the
  // schema lives in one place).
  `CREATE TABLE IF NOT EXISTS sessions (
    sid varchar PRIMARY KEY,
    sess jsonb NOT NULL,
    expire timestamp(6) NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions (expire)`,
  // Append-only review event log — the durable source of truth for SRS
  // state; clients replay it (product plan §18.3).
  `CREATE TABLE IF NOT EXISTS review_events (
    id uuid PRIMARY KEY,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    srs_id text NOT NULL,
    rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 4),
    reviewed_at timestamptz NOT NULL,
    device_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_review_events_user_time
     ON review_events (user_id, reviewed_at)`,
  `CREATE TABLE IF NOT EXISTS lesson_progress (
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id text NOT NULL,
    completed boolean NOT NULL DEFAULT false,
    completed_at timestamptz,
    exercises_completed jsonb NOT NULL DEFAULT '[]',
    PRIMARY KEY (user_id, lesson_id)
  )`,
  // Which languages a user is learning. Separate table on purpose: keeps the
  // language dimension out of review_events/lesson_progress until real
  // multi-language content exists (then: add language_code there, backfill
  // existing = 'pus', join). See docs/LIVE-TEXTBOOK §14 + product scaffolding.
  `CREATE TABLE IF NOT EXISTS user_languages (
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language_code text NOT NULL,
    added_at timestamptz NOT NULL DEFAULT now(),
    last_active_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, language_code)
  )`,
  // Telemetry feed for the content quarantine loop (LIVE-TEXTBOOK §10).
  // Accepts anonymous events; user_id attached when a session exists.
  `CREATE TABLE IF NOT EXISTS telemetry_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anon_id text NOT NULL,
    user_id varchar,
    event text NOT NULL,
    props jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_events_event_time
     ON telemetry_events (event, created_at)`,
];

export async function ensureSchema(): Promise<void> {
  if (!pool) return;
  for (const stmt of SCHEMA) {
    await pool.query(stmt);
  }
  dbReady = true;
}

export interface UpsertUserInput {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

export async function upsertUser(u: UpsertUserInput): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO users (id, email, first_name, last_name, profile_image_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       profile_image_url = EXCLUDED.profile_image_url,
       updated_at = now()`,
    [u.id, u.email ?? null, u.firstName ?? null, u.lastName ?? null, u.profileImageUrl ?? null],
  );
}

export interface UserLanguageRow {
  language_code: string;
  added_at: string;
  last_active_at: string;
}

export async function getUserLanguages(userId: string): Promise<UserLanguageRow[]> {
  if (!pool) return [];
  const { rows } = await pool.query(
    `SELECT language_code, added_at, last_active_at
       FROM user_languages
      WHERE user_id = $1
      ORDER BY last_active_at DESC`,
    [userId],
  );
  return rows as UserLanguageRow[];
}

export async function upsertUserLanguage(
  userId: string,
  code: string,
  addedAt: string | null,
  lastActiveAt: string | null,
): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO user_languages (user_id, language_code, added_at, last_active_at)
     VALUES ($1, $2, COALESCE($3::timestamptz, now()), COALESCE($4::timestamptz, now()))
     ON CONFLICT (user_id, language_code) DO UPDATE SET
       last_active_at = GREATEST(user_languages.last_active_at, EXCLUDED.last_active_at)`,
    [userId, code, addedAt, lastActiveAt],
  );
}
