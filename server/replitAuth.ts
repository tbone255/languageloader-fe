/**
 * Replit Auth — OpenID Connect against replit.com/oidc.
 *
 * On Replit, the workspace/deployment provides REPL_ID (the OIDC client id)
 * and REPLIT_DOMAINS (comma-separated domains the app is reachable on).
 * End users sign in via Replit's hosted flow (Google / GitHub / Apple / X /
 * email); we receive sub, email, first_name, last_name, profile_image_url.
 *
 * Off Replit (or without a database) auth is unavailable: /api/login etc.
 * respond 503 and the frontend stays in guest mode. SESSION_SECRET must be
 * set as a deployment secret; a per-boot random fallback keeps dev working.
 */

import crypto from 'node:crypto';
import * as client from 'openid-client';
import { Strategy, type VerifyFunction } from 'openid-client/passport';
import passport from 'passport';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import type { Express, RequestHandler } from 'express';
import { pool, isDbConfigured, upsertUser } from './db.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const isAuthConfigured = Boolean(
  process.env.REPL_ID && process.env.REPLIT_DOMAINS && isDbConfigured,
);

export interface SessionClaims {
  sub: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  exp?: number;
}

export interface SessionUser {
  claims?: SessionClaims;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

let oidcConfig: Promise<client.Configuration> | null = null;
function getOidcConfig(): Promise<client.Configuration> {
  oidcConfig ??= client.discovery(
    new URL(process.env.ISSUER_URL ?? 'https://replit.com/oidc'),
    process.env.REPL_ID!,
  );
  return oidcConfig;
}

function getSessionMiddleware(): RequestHandler {
  const PgStore = connectPg(session);
  return session({
    secret: process.env.SESSION_SECRET ?? crypto.randomBytes(32).toString('hex'),
    store: pool
      ? new PgStore({ pool, tableName: 'sessions', createTableIfMissing: false, ttl: SESSION_TTL_MS / 1000 })
      : undefined, // MemoryStore — dev only
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL_MS,
    },
  });
}

function updateUserSession(
  user: SessionUser,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
): void {
  const claims = tokens.claims() as SessionClaims | undefined;
  user.claims = claims;
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token ?? user.refresh_token;
  user.expires_at = claims?.exp;
}

export async function setupAuth(app: Express): Promise<void> {
  app.set('trust proxy', 1);
  app.use(getSessionMiddleware());

  if (!isAuthConfigured) {
    app.get(['/api/login', '/api/callback', '/api/logout'], (_req, res) => {
      res.status(503).json({ error: 'auth_not_configured' });
    });
    return;
  }

  app.use(passport.initialize());
  app.use(passport.session());
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (tokens, verified) => {
    try {
      const user: SessionUser = {};
      updateUserSession(user, tokens);
      const c = user.claims;
      if (!c?.sub) return verified(new Error('missing sub claim'));
      await upsertUser({
        id: c.sub,
        email: c.email,
        firstName: c.first_name,
        lastName: c.last_name,
        profileImageUrl: c.profile_image_url,
      });
      verified(null, user);
    } catch (err) {
      verified(err as Error);
    }
  };

  for (const domain of process.env.REPLIT_DOMAINS!.split(',')) {
    passport.use(
      new Strategy(
        {
          name: `replitauth:${domain.trim()}`,
          config,
          scope: 'openid email profile offline_access',
          callbackURL: `https://${domain.trim()}/api/callback`,
        },
        verify,
      ),
    );
  }

  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get('/api/login', (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: 'login consent',
      successReturnToOrRedirect: '/',
      failureRedirect: '/api/login',
    })(req, res, next);
  });

  app.get('/api/callback', (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: '/profile',
      failureRedirect: '/api/login',
    })(req, res, next);
  });

  app.get('/api/logout', (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href,
      );
    });
  });
}

/** Gate for API routes. Refreshes the access token when expired. */
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!isAuthConfigured) {
    res.status(503).json({ error: 'auth_not_configured' });
    return;
  }
  const user = req.user as SessionUser | undefined;
  if (!req.isAuthenticated() || !user?.expires_at) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  if (Math.floor(Date.now() / 1000) <= user.expires_at) {
    next();
    return;
  }
  if (!user.refresh_token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    const tokens = await client.refreshTokenGrant(await getOidcConfig(), user.refresh_token);
    updateUserSession(user, tokens);
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
};

export function currentUserId(req: { user?: unknown }): string | null {
  return (req.user as SessionUser | undefined)?.claims?.sub ?? null;
}
