import { Router } from 'express';
import { expenseSchema, parseBody } from '../lib/validate';
import { createExpense, deleteExpense, replaceExpense } from '../services/groupRepo';
import { asyncHandler, respondWithGroup } from './helpers';

export const expensesRouter = Router({ mergeParams: true });

interface Params {
  groupId: string;
  expenseId: string;
}

expensesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { groupId } = req.params as unknown as Params;
    const input = parseBody(expenseSchema, req.body);
    respondWithGroup(req, res, await createExpense(groupId, input), 201);
  })
);

/** PUT, not PATCH: an edit replaces the expense and its splits wholesale. */
expensesRouter.put(
  '/:expenseId',
  asyncHandler(async (req, res) => {
    const { groupId, expenseId } = req.params as unknown as Params;
    const input = parseBody(expenseSchema, req.body);
    respondWithGroup(req, res, await replaceExpense(groupId, expenseId, input));
  })
);

expensesRouter.delete(
  '/:expenseId',
  asyncHandler(async (req, res) => {
    const { groupId, expenseId } = req.params as unknown as Params;
    respondWithGroup(req, res, await deleteExpense(groupId, expenseId));
  })
);
