/**
 * Supabase client singleton.
 *
 * Supabase provides: Postgres (with auto-generated REST API), Auth, Storage,
 * and Realtime. No separate API server is needed.
 *
 * Env vars (set in Cloudflare Pages dashboard + GitHub secrets):
 *   VITE_SUPABASE_URL      — e.g. https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY — public anon key (safe to expose in frontend)
 *
 * SQL schema to run in Supabase SQL editor:
 *
 *   create table profiles (
 *     id uuid primary key references auth.users(id) on delete cascade,
 *     username text,
 *     created_at timestamptz default now()
 *   );
 *
 *   create table review_events (
 *     id uuid primary key,
 *     user_id uuid references auth.users(id) on delete cascade not null,
 *     srs_id text not null,
 *     rating smallint not null check (rating between 1 and 4),
 *     reviewed_at timestamptz not null,
 *     device_id text not null,
 *     created_at timestamptz default now()
 *   );
 *   create index on review_events (user_id, reviewed_at);
 *
 *   create table lesson_progress (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id uuid references auth.users(id) on delete cascade not null,
 *     lesson_id text not null,
 *     completed boolean default false,
 *     completed_at timestamptz,
 *     exercises_completed text[] default '{}',
 *     unique (user_id, lesson_id)
 *   );
 *
 *   -- Row-level security
 *   alter table profiles enable row level security;
 *   alter table review_events enable row level security;
 *   alter table lesson_progress enable row level security;
 *
 *   create policy "Users can manage own data" on profiles for all using (auth.uid() = id);
 *   create policy "Users can manage own events" on review_events for all using (auth.uid() = user_id);
 *   create policy "Users can manage own progress" on lesson_progress for all using (auth.uid() = user_id);
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Returns null if env vars not configured — all callers must handle this.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
