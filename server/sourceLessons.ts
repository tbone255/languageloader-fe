/** Authenticated, allowlisted gateway to the Python source-lesson service. */
import type { Express } from 'express';
import { isAuthenticated, currentUserId } from './auth.js';

export function registerSourceLessons(app: Express): void {
  app.use('/api/source-lessons', isAuthenticated, async (req, res) => {
    const base = process.env.LL_PIPELINE_URL;
    const key = process.env.LL_LEARNER_GATEWAY_KEY;
    if (!base || !key) { res.status(503).json({ detail: 'Source lessons are not connected to the pipeline yet.' }); return; }
    const path = req.path;
    const allowed = (req.method === 'GET' && (/^\/lessons$/.test(path) || /^\/sessions\/[a-f0-9]+$/.test(path))) ||
      (req.method === 'POST' && (/^\/lessons\/[a-f0-9]+\/(sessions|review-enrollment)$/.test(path) || /^\/sessions\/[a-f0-9]+\/events$/.test(path)));
    if (!allowed) { res.status(404).json({ detail: 'Unknown source-lesson action' }); return; }
    try {
      const response = await fetch(`${base.replace(/\/$/, '')}/api/v2/learner${path}`, {
        method: req.method,
        headers: { 'Content-Type': 'application/json', 'X-LL-Request': 'admin',
          'X-LL-Gateway-Key': key, 'X-LL-Learner': currentUserId(req)! },
        body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
        signal: AbortSignal.timeout(15000),
      });
      const text = await response.text();
      res.status(response.status).type('application/json').send(text);
    } catch { res.status(502).json({ detail: 'The lesson service is unavailable. Try again shortly.' }); }
  });
}
