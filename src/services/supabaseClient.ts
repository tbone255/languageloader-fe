/**
 * Supabase client — used only for auth (signup / login / password reset).
 *
 * App data lives in our own Postgres behind the Express API, not Supabase.
 * The browser authenticates here with the publishable key (safe to ship),
 * gets a JWT, and sends it as a Bearer token to our API.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && publishableKey);
}

export const supabase: SupabaseClient | null =
  url && publishableKey ? createClient(url, publishableKey) : null;

/** The current access token (JWT) for Authorization headers, or null if signed out. */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
