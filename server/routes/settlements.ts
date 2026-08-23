import { Router } from 'express';
import { parseBody, settlementSchema } from '../lib/validate';
import { createSettlement, deleteSettlement } from '../services/groupRepo';
import { asyncHandler, respondWithGroup } from './helpers';

export const settlementsRouter = Router({ mergeParams: true });

interface Params {
  groupId: string;
  settlementId: string;
}

settlementsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { groupId } = req.params as unknown as Params;
    const input = parseBody(settlementSchema, req.body);
    respondWithGroup(req, res, await createSettlement(groupId, input), 201);
  })
);

settlementsRouter.delete(
  '/:settlementId',
  asyncHandler(async (req, res) => {
    const { groupId, settlementId } = req.params as unknown as Params;
    respondWithGroup(req, res, await deleteSettlement(groupId, settlementId));
  })
);
