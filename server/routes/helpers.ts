import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { LoadedGroup } from '../services/groupRepo';
import { publish } from '../services/events';

/** Identifies the browser that made the request, so SSE can skip echoing to it. */
export function clientIdOf(req: Request): string | null {
  const raw = req.header('X-Nooswise-Client');
  if (!raw) return null;
  return raw.slice(0, 64);
}

/**
 * Express 4 does not forward rejected promises to the error middleware, so every async
 * handler is wrapped rather than relying on each one to try/catch correctly.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * The single response shape for every write. Returning the whole hydrated group means
 * the client has exactly one way to apply server state, rather than a per-endpoint patch
 * to merge.
 */
export function respondWithGroup(
  req: Request,
  res: Response,
  loaded: LoadedGroup,
  status = 200
): void {
  publish(loaded.group.id, loaded.group, loaded.revision, clientIdOf(req));
  res.status(status).json({ group: loaded.group, revision: loaded.revision });
}
