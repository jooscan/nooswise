import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ApiError } from '../lib/errors';
import {
  createGroupSchema,
  importSchema,
  parseBody,
  patchGroupSchema,
} from '../lib/validate';
import { publishDeleted } from '../services/events';
import {
  createGroup,
  importGroups,
  loadGroup,
  patchGroup,
  softDeleteGroup,
} from '../services/groupRepo';
import { asyncHandler, clientIdOf, respondWithGroup } from './helpers';

export const groupsRouter = Router();

/**
 * A group ID is the only thing protecting a split, so reads are rate limited to make
 * guessing IDs impractical even though 22 base58 characters already makes it hopeless.
 */
const readLimiter = rateLimit({
  windowMs: 60_000,
  limit: 240,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'rate_limited' },
});

// Declared before '/:id' so the literal path is not swallowed by the parameter route.
groupsRouter.post(
  '/import',
  asyncHandler(async (req, res) => {
    const input = parseBody(importSchema, req.body);
    const result = await importGroups(input);
    res.json(result);
  })
);

groupsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(createGroupSchema, req.body);
    const loaded = await createGroup(input);
    respondWithGroup(req, res, loaded, 201);
  })
);

groupsRouter.get(
  '/:groupId',
  readLimiter,
  asyncHandler(async (req, res) => {
    const loaded = await loadGroup(req.params.groupId);
    if (!loaded) throw ApiError.notFound();
    res.json({ group: loaded.group, revision: loaded.revision });
  })
);

groupsRouter.patch(
  '/:groupId',
  asyncHandler(async (req, res) => {
    const patch = parseBody(patchGroupSchema, req.body);
    const loaded = await patchGroup(req.params.groupId, patch);
    respondWithGroup(req, res, loaded);
  })
);

groupsRouter.delete(
  '/:groupId',
  asyncHandler(async (req, res) => {
    await softDeleteGroup(req.params.groupId);
    publishDeleted(req.params.groupId, clientIdOf(req));
    res.status(204).end();
  })
);

/**
 * Lightweight change check for the polling fallback. Compares an integer revision rather
 * than the client-generated timestamp string the old endpoint used, which could go
 * backwards when two devices had different clocks.
 */
groupsRouter.get(
  '/:groupId/poll',
  readLimiter,
  asyncHandler(async (req, res) => {
    const loaded = await loadGroup(req.params.groupId);
    if (!loaded) throw ApiError.notFound();

    const since = Number(req.query.since);
    if (Number.isFinite(since) && since === loaded.revision) {
      res.json({ updated: false, revision: loaded.revision });
      return;
    }

    res.json({ updated: true, group: loaded.group, revision: loaded.revision });
  })
);
