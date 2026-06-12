/**
 * API routes.
 *
 * Sync contract mirrors src/services/syncService.ts on the client:
 * push  POST /api/sync/review-events   { events: [{id, srs_id, rating, reviewed_at, device_id}] }
 * pull  GET  /api/sync/review-events?since=ISO&exclude_device=ID
 *
 * Telemetry accepts anonymous batches (guests are most of the signal for
 * the content quarantine loop) and attaches user_id when signed in.
 */

import type { Express, Request, Response } from 'express';
import { pool, isDbConfigured } from './db.js';
import { isAuthConfigured, isAuthenticated, currentUserId, type SessionUser } from './replitAuth.js';

const MAX_EVENTS_PER_PUSH = 500;
const MAX_TELEMETRY_PER_POST = 50;
const PULL_LIMIT = 1000;

interface ReviewEventIn {
  id: string;
  srs_id: string;
  rating: number;
  reviewed_at: string;
  device_id: string;
}

function isValidReviewEvent(e: unknown): e is ReviewEventIn {
  if (typeof e !== 'object' || e === null) return false;
  const r = e as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.id) &&
    typeof r.srs_id === 'string' &&
    typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 4 &&
    typeof r.reviewed_at === 'string' && !Number.isNaN(Date.parse(r.reviewed_at)) &&
    typeof r.device_id === 'string'
  );
}

function requireDb(res: Response): boolean {
  if (!isDbConfigured) {
    res.status(503).json({ error: 'database_not_configured' });
    return false;
  }
  return true;
}

export function registerRoutes(app: Express): void {
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, db: isDbConfigured, auth: isAuthConfigured });
  });

  app.get('/api/auth/user', isAuthenticated, (req, res) => {
    const c = (req.user as SessionUser).claims!;
    res.json({
      id: c.sub,
      email: c.email ?? null,
      firstName: c.first_name ?? null,
      lastName: c.last_name ?? null,
      profileImageUrl: c.profile_image_url ?? null,
    });
  });

  app.post('/api/sync/review-events', isAuthenticated, async (req: Request, res: Response) => {
    if (!requireDb(res)) return;
    const userId = currentUserId(req)!;
    const events: unknown = (req.body as Record<string, unknown> | undefined)?.events;
    if (!Array.isArray(events) || events.length > MAX_EVENTS_PER_PUSH) {
      res.status(400).json({ error: 'invalid_events' });
      return;
    }
    const valid = events.filter(isValidReviewEvent);
    if (valid.length !== events.length) {
      res.status(400).json({ error: 'invalid_events' });
      return;
    }
    try {
      // Idempotent: client retries after flaky networks re-send the same ids.
      for (const e of valid) {
        await pool!.query(
          `INSERT INTO review_events (id, user_id, srs_id, rating, reviewed_at, device_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [e.id, userId, e.srs_id, e.rating, e.reviewed_at, e.device_id],
        );
      }
      res.json({ synced: valid.length });
    } catch {
      res.status(500).json({ error: 'sync_failed' });
    }
  });

  app.get('/api/sync/review-events', isAuthenticated, async (req: Request, res: Response) => {
    if (!requireDb(res)) return;
    const userId = currentUserId(req)!;
    const sinceRaw = typeof req.query.since === 'string' ? req.query.since : '';
    const since = !Number.isNaN(Date.parse(sinceRaw)) ? sinceRaw : '1970-01-01T00:00:00Z';
    const excludeDevice = typeof req.query.exclude_device === 'string' ? req.query.exclude_device : null;
    try {
      const { rows } = await pool!.query(
        `SELECT id, srs_id, rating, reviewed_at, device_id
           FROM review_events
          WHERE user_id = $1
            AND reviewed_at > $2
            AND ($3::text IS NULL OR device_id <> $3)
          ORDER BY reviewed_at ASC
          LIMIT ${PULL_LIMIT}`,
        [userId, since, excludeDevice],
      );
      res.json({ events: rows });
    } catch {
      res.status(500).json({ error: 'sync_failed' });
    }
  });

  app.post('/api/telemetry', async (req: Request, res: Response) => {
    // Never an error for the client — telemetry is best-effort by design.
    if (!isDbConfigured) {
      res.status(204).end();
      return;
    }
    const body = req.body as Record<string, unknown> | undefined;
    const anonId = typeof body?.anon_id === 'string' ? body.anon_id.slice(0, 64) : null;
    const events = Array.isArray(body?.events) ? body.events.slice(0, MAX_TELEMETRY_PER_POST) : [];
    if (!anonId || events.length === 0) {
      res.status(204).end();
      return;
    }
    const userId = currentUserId(req);
    try {
      for (const ev of events) {
        const e = ev as Record<string, unknown>;
        if (typeof e?.event !== 'string' || e.event.length > 128) continue;
        const props = typeof e.props === 'object' && e.props !== null ? e.props : {};
        await pool!.query(
          `INSERT INTO telemetry_events (anon_id, user_id, event, props)
           VALUES ($1, $2, $3, $4)`,
          [anonId, userId, e.event, JSON.stringify(props)],
        );
      }
    } catch {
      // swallow — see above
    }
    res.status(204).end();
  });

  // Unknown API path → JSON 404 (not the SPA shell).
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });
}
