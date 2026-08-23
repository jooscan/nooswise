import { z } from 'zod';
import { ApiError } from './errors';

/**
 * Every request body is parsed through one of these before it reaches the repo layer.
 * The old server accepted anything that was `typeof === 'object'`.
 *
 * Note what is deliberately loose: `date` is free text because the app stores 'Today'
 * next to real ISO strings, and `paymentHandle` is not email-validated because it also
 * holds things like '@sarah-j'. Tightening either would reject data the UI produces.
 */

const trimmed = (max: number) => z.string().trim().max(max);
const nonBlank = (max: number) => trimmed(max).min(1);

/** Codes ('CAD') and bare symbols ('$') both appear in existing data. */
const currency = nonBlank(8);
const money = z.number().finite();
const positiveMoney = money.positive();
const nonNegativeMoney = money.nonnegative();

const avatarFields = {
  avatarUrl: trimmed(2048).optional(),
  avatarBg: trimmed(256).optional(),
  avatarEmoji: trimmed(32).optional(),
  characterName: trimmed(128).optional(),
  initials: trimmed(8).optional(),
};

export const expenseCategory = z.enum([
  'food',
  'travel',
  'home',
  'drinks',
  'entertainment',
  'other',
]);

export const splitType = z.enum(['equally', 'exact', 'percentage', 'shares']);

const createMemberSchemaBase = z.object({
  name: nonBlank(80),
  email: trimmed(320).optional(),
  paymentHandle: trimmed(320).optional(),
  ...avatarFields,
});

export const createMemberSchema = createMemberSchemaBase;

/**
 * The first member in the array is the creator. The server has no notion of "you", so it
 * simply preserves the order it is given and returns members in that order; the client
 * reads members[0].id back and writes it to localStorage as the device identity.
 *
 * Avatars are chosen client-side (src/utils/avatars.ts picks a sprite and gradient), so
 * they arrive as plain fields here rather than being generated server-side.
 */
export const createGroupSchema = z.object({
  name: nonBlank(120),
  currency: currency.default('CAD'),
  members: z.array(createMemberSchemaBase).min(1).max(50),
});

export const patchGroupSchema = z
  .object({
    name: nonBlank(120).optional(),
    currency: currency.optional(),
    myETransferEmail: trimmed(320).optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export const patchMemberSchema = z
  .object({
    name: nonBlank(80).optional(),
    email: trimmed(320).optional(),
    paymentHandle: trimmed(320).optional(),
    ...avatarFields,
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export const expenseSplitSchema = z.object({
  memberId: nonBlank(64),
  amount: nonNegativeMoney,
  originalAmount: money.optional(),
  percentage: money.optional(),
  shares: money.optional(),
});

export const expenseSchema = z.object({
  title: nonBlank(200),
  amount: positiveMoney,
  currency,
  originalAmount: positiveMoney.optional(),
  originalCurrency: currency.optional(),
  exchangeRate: positiveMoney.optional(),
  paidByMemberId: nonBlank(64),
  category: expenseCategory,
  date: nonBlank(64),
  splitType,
  splits: z.array(expenseSplitSchema).min(1).max(50),
  notes: trimmed(2000).optional(),
});

export const settlementSchema = z
  .object({
    fromMemberId: nonBlank(64),
    toMemberId: nonBlank(64),
    amount: positiveMoney,
    currency,
    date: nonBlank(64),
    note: trimmed(500).optional(),
    paymentMethod: trimmed(64).optional(),
  })
  .refine((v) => v.fromMemberId !== v.toMemberId, {
    message: 'A settlement cannot go from a member to themselves',
    path: ['toMemberId'],
  });

/**
 * The import endpoint takes whole legacy Group documents straight out of localStorage,
 * so it has to tolerate the shapes the old client produced — including ids like
 * `split-1787491250435` and members carrying `isCurrentUser`.
 */
export const importGroupSchema = z.object({
  id: nonBlank(64),
  name: nonBlank(120),
  currency: currency.default('CAD'),
  myETransferEmail: trimmed(320).optional(),
  isArchived: z.boolean().optional(),
  archivedAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  members: z
    .array(
      z.object({
        id: nonBlank(64),
        name: nonBlank(80),
        email: trimmed(320).optional(),
        paymentHandle: trimmed(320).optional(),
        ...avatarFields,
      })
    )
    .min(1)
    .max(50),
  expenses: z
    .array(expenseSchema.extend({ id: nonBlank(64) }))
    .max(1000)
    .default([]),
  settlements: z
    .array(settlementSchema.safeExtend({ id: nonBlank(64) }))
    .max(1000)
    .default([]),
});

export const importSchema = z.object({
  groups: z.array(importGroupSchema).min(1).max(100),
});

/** Parses and rethrows as a 400 with per-field detail the client can surface. */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw ApiError.badRequest(
      'Request body failed validation',
      result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }))
    );
  }
  return result.data;
}
