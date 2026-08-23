import { Router } from 'express';
import { createMemberSchema, parseBody, patchMemberSchema } from '../lib/validate';
import { addMember, patchMember, removeMember } from '../services/groupRepo';
import { asyncHandler, respondWithGroup } from './helpers';

export const membersRouter = Router({ mergeParams: true });

interface Params {
  groupId: string;
  memberId: string;
}

membersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { groupId } = req.params as unknown as Params;
    const input = parseBody(createMemberSchema, req.body);
    respondWithGroup(req, res, await addMember(groupId, input), 201);
  })
);

membersRouter.patch(
  '/:memberId',
  asyncHandler(async (req, res) => {
    const { groupId, memberId } = req.params as unknown as Params;
    const patch = parseBody(patchMemberSchema, req.body);
    respondWithGroup(req, res, await patchMember(groupId, memberId, patch));
  })
);

membersRouter.delete(
  '/:memberId',
  asyncHandler(async (req, res) => {
    const { groupId, memberId } = req.params as unknown as Params;
    respondWithGroup(req, res, await removeMember(groupId, memberId));
  })
);
