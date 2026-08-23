import { Router } from 'express';
import { ApiError } from '../lib/errors';
import { importGroupSchema, parseBody } from '../lib/validate';
import { subscribe } from '../services/events';
import { loadGroup, replaceGroupContents } from '../services/groupRepo';
import { asyncHandler, clientIdOf, respondWithGroup } from './helpers';

/**
 * DEPRECATED. The previous build POSTed the entire group on every keystroke-level change
 * and read it back from these paths. They are kept so a browser tab left open across the
 * deploy keeps working rather than throwing; new code must use /api/groups.
 *
 * Delete this router once no client has been on the old build for a while.
 */
export const compatRouter = Router();

compatRouter.get(
  '/:groupId',
  asyncHandler(async (req, res) => {
    const loaded = await loadGroup(req.params.groupId);
    if (!loaded) throw ApiError.notFound('Split');
    res.json({
      id: loaded.group.id,
      group: loaded.group,
      updatedAt: loaded.group.updatedAt,
    });
  })
);

compatRouter.post(
  '/:groupId',
  asyncHandler(async (req, res) => {
    const input = parseBody(importGroupSchema, { ...req.body, id: req.params.groupId });
    const loaded = await replaceGroupContents(req.params.groupId, input);
    respondWithGroup(req, res, loaded);
  })
);

compatRouter.get(
  '/:groupId/stream',
  asyncHandler(async (req, res) => {
    const loaded = await loadGroup(req.params.groupId);
    const unsubscribe = subscribe(req.params.groupId, res, clientIdOf(req), loaded);
    req.on('close', unsubscribe);
  })
);

/** The old poll compared ISO timestamp strings rather than a revision counter. */
compatRouter.get(
  '/:groupId/poll',
  asyncHandler(async (req, res) => {
    const loaded = await loadGroup(req.params.groupId);
    if (!loaded) throw ApiError.notFound('Split');

    const since = String(req.query.since ?? '');
    if (since && since === loaded.group.updatedAt) {
      res.json({ updated: false, updatedAt: loaded.group.updatedAt });
      return;
    }

    res.json({
      updated: true,
      group: loaded.group,
      updatedAt: loaded.group.updatedAt,
    });
  })
);
