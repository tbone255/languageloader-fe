/**
 * Supabase auth — verify the JWT the browser obtained from Supabase.
 *
 * The frontend signs in via supabase-js (email + password) and gets a JWT;
 * it sends that as `Authorization: Bearer <token>` on API calls. We verify
 * the signature here and trust the `sub` (user id) + `email` claims. No
 * password ever touches this server, and no Supabase secret is required:
 * verification uses Supabase's public keys (JWKS).
 *
 * Config: SUPABASE_URL (falls back to VITE_SUPABASE_URL, which Render already
 * has for the frontend build). Optional SUPABASE_JWT_SECRET enables the legacy
 * HS256 path for projects not yet on asymmetric signing keys.
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import type { Request, RequestHandler } from 'express';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

export const isAuthConfigured = Boolean(SUPABASE_URL);

const ISSUER = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : undefined;
const AUDIENCE = 'authenticated';

// Asymmetric verification (preferred): fetch + cache Supabase's public keys.
const jwks: JWTVerifyGetKey | null = SUPABASE_URL
  ? createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
  : null;
// Legacy HS256 fallback if a shared secret is configured.
const hsKey = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null;

export interface AuthUser {
  id: string;
  email: string | null;
}

async function verifyToken(token: string): Promise<JWTPayload> {
  const opts = { issuer: ISSUER, audience: AUDIENCE };
  if (hsKey) {
    return (await jwtVerify(token, hsKey, opts)).payload;
  }
  if (jwks) {
    return (await jwtVerify(token, jwks, opts)).payload;
  }
  throw new Error('auth_not_configured');
}

function bearer(req: Request): string | null {
  const h = req.headers.authorization;
  return h && h.startsWith('Bearer ') ? h.slice(7) : null;
}

interface AuthedRequest extends Request {
  authUser?: AuthUser;
}

/** Gate for API routes: requires a valid Supabase JWT. */
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!isAuthConfigured) {
    res.status(503).json({ error: 'auth_not_configured' });
    return;
  }
  const token = bearer(req);
  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    const payload = await verifyToken(token);
    const email = typeof payload.email === 'string' ? payload.email : null;
    (req as AuthedRequest).authUser = { id: String(payload.sub), email };
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
};

export function currentUser(req: Request): AuthUser | null {
  return (req as AuthedRequest).authUser ?? null;
}

export function currentUserId(req: Request): string | null {
  return (req as AuthedRequest).authUser?.id ?? null;
}
