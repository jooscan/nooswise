import express from 'express';
import { toErrorResponse } from './lib/errors';
import { compatRouter } from './routes/compat';
import { expensesRouter } from './routes/expenses';
import { groupsRouter } from './routes/groups';
import { membersRouter } from './routes/members';
import { settlementsRouter } from './routes/settlements';
import { streamRouter } from './routes/stream';
import { subscriberCount } from './services/events';
import { pool } from './db/client';

/**
 * The API half of the server, with no listener and no static-file serving, so tests can
 * mount it directly and the entry point can wrap it in Vite or express.static.
 */
export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1); // behind Caddy in production
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({
        status: 'ok',
        time: new Date().toISOString(),
        sseClients: subscriberCount(),
      });
    } catch (err) {
      res.status(503).json({
        status: 'degraded',
        error: 'database unavailable',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Nested routers mount before the group router's own '/:groupId' routes so the more
  // specific paths win.
  app.use('/api/groups/:groupId/members', membersRouter);
  app.use('/api/groups/:groupId/expenses', expensesRouter);
  app.use('/api/groups/:groupId/settlements', settlementsRouter);
  app.use('/api/groups/:groupId/stream', streamRouter);
  app.use('/api/groups', groupsRouter);

  app.use('/api/splits', compatRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Unknown endpoint', code: 'not_found' });
  });

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const { status, body } = toErrorResponse(err);
      if (status >= 500) console.error('[api]', err);
      res.status(status).json(body);
    }
  );

  return app;
}
