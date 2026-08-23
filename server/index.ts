import 'dotenv/config';
import path from 'node:path';
import { createApp } from './app';
import { pool } from './db/client';

const PORT = Number(process.env.PORT ?? 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function start() {
  const app = createApp();

  if (isProduction) {
    const distPath = path.join(process.cwd(), 'dist');
    const express = (await import('express')).default;
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `nooswise server on http://localhost:${PORT} (${process.env.NODE_ENV ?? 'development'})`
    );
  });

  // SSE connections stay open indefinitely; without this a redeploy would hang waiting
  // for them to drain.
  server.keepAliveTimeout = 65_000;

  const shutdown = (signal: string) => {
    console.log(`\n${signal} received, shutting down`);
    server.close(() => {
      pool.end().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
