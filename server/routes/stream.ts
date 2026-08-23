import { Router } from 'express';
import { subscribe } from '../services/events';
import { loadGroup } from '../services/groupRepo';
import { asyncHandler, clientIdOf } from './helpers';

export const streamRouter = Router({ mergeParams: true });

/**
 * The live channel. Sends the current state on connect so a reconnecting client does not
 * need a separate fetch, then one message per change.
 */
streamRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { groupId } = req.params as unknown as { groupId: string };
    const loaded = await loadGroup(groupId);

    const unsubscribe = subscribe(groupId, res, clientIdOf(req), loaded);
    req.on('close', unsubscribe);
  })
);
