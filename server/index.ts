/**
 * LanguageLoader server — serves the built SPA and the /api routes.
 *
 * Replaces the static `serve -s dist` deployment: same SPA fallback
 * behaviour, plus Replit Auth and the sync/telemetry API backed by
 * Replit's Postgres (LIVE-TEXTBOOK §14).
 *
 * Degrades cleanly: without DATABASE_URL/REPL_ID (local dev) it is a
 * plain static server and the app runs guest-only.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ensureSchema, isDbConfigured } from './db.js';
import { setupAuth, isAuthConfigured } from './replitAuth.js';
import { registerRoutes } from './routes.js';

const DIST_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

async function main(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  await ensureSchema();
  await setupAuth(app);
  registerRoutes(app);

  app.use(express.static(DIST_DIR));
  // SPA fallback: any non-API GET serves the app shell.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(
      `[server] listening on :${port} (db=${isDbConfigured ? 'on' : 'off'}, auth=${isAuthConfigured ? 'on' : 'off'})`,
    );
  });
}

main().catch((err) => {
  console.error('[server] fatal:', err);
  process.exit(1);
});
