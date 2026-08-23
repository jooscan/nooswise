import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * The five tables that replace the single JSON blob per split.
 *
 * Two conventions run through all of them:
 *   - Money lives in `*_minor` columns as integers (see server/lib/money.ts). Never floats.
 *   - Categories and enums are `text` with a CHECK rather than a Postgres enum type,
 *     because widening a CHECK is a one-line constraint swap while ALTER TYPE is not.
 */

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const groups = pgTable(
  'groups',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    currency: text('currency').notNull().default('CAD'),
    myETransferEmail: text('my_etransfer_email'),
    isArchived: boolean('is_archived').notNull().default(false),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    /**
     * Soft delete. A hard DELETE would cascade away expenses that other members may still
     * be looking at, and "deleted" here means "the person who pressed delete stopped
     * caring", not "this never happened".
     */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    /**
     * Bumped on every write to the group or anything under it. The SSE stream and the
     * poll endpoint compare this instead of a wall-clock timestamp, which the old client
     * generated locally and could therefore report out of order.
     */
    revision: integer('revision').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index('groups_deleted_at_idx').on(t.deletedAt),
    check('groups_name_not_blank', sql`length(btrim(${t.name})) > 0`),
  ]
);

export const members = pgTable(
  'members',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email'),
    paymentHandle: text('payment_handle'),
    avatarUrl: text('avatar_url'),
    avatarBg: text('avatar_bg'),
    avatarEmoji: text('avatar_emoji'),
    characterName: text('character_name'),
    initials: text('initials'),
    /**
     * The UI shows members in a stable order with the creator first. Ordering by
     * created_at alone would be ambiguous for members inserted in the same statement.
     */
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index('members_group_id_idx').on(t.groupId),
    check('members_name_not_blank', sql`length(btrim(${t.name})) > 0`),
  ]
);

export const expenses = pgTable(
  'expenses',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    currency: text('currency').notNull(),
    originalAmountMinor: bigint('original_amount_minor', { mode: 'number' }),
    originalCurrency: text('original_currency'),
    exchangeRate: numeric('exchange_rate', { precision: 18, scale: 8 }),
    /**
     * RESTRICT, not CASCADE: deleting the person who paid for dinner must not silently
     * delete the dinner. The members route turns this into a 409 the UI can explain.
     */
    paidByMemberId: text('paid_by_member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'restrict' }),
    category: text('category').notNull(),
    /** Free-form, because the app stores values like 'Today' alongside real dates. */
    date: text('date').notNull(),
    splitType: text('split_type').notNull(),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [
    index('expenses_group_id_created_at_idx').on(t.groupId, t.createdAt.desc()),
    check('expenses_amount_positive', sql`${t.amountMinor} > 0`),
    check(
      'expenses_category_valid',
      sql`${t.category} IN ('food', 'travel', 'home', 'drinks', 'entertainment', 'other')`
    ),
    check(
      'expenses_split_type_valid',
      sql`${t.splitType} IN ('equally', 'exact', 'percentage', 'shares')`
    ),
  ]
);

export const expenseSplits = pgTable(
  'expense_splits',
  {
    id: serial('id').primaryKey(),
    expenseId: text('expense_id')
      .notNull()
      .references(() => expenses.id, { onDelete: 'cascade' }),
    memberId: text('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'restrict' }),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    originalAmountMinor: bigint('original_amount_minor', { mode: 'number' }),
    percentage: numeric('percentage', { precision: 9, scale: 4 }),
    shares: numeric('shares', { precision: 9, scale: 4 }),
  },
  (t) => [
    uniqueIndex('expense_splits_expense_member_idx').on(t.expenseId, t.memberId),
    /**
     * Zero is allowed — a member can legitimately owe nothing on an itemised bill.
     * Negative is not.
     */
    check('expense_splits_amount_non_negative', sql`${t.amountMinor} >= 0`),
  ]
);

export const settlements = pgTable(
  'settlements',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    fromMemberId: text('from_member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'restrict' }),
    toMemberId: text('to_member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'restrict' }),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    currency: text('currency').notNull(),
    date: text('date').notNull(),
    note: text('note'),
    paymentMethod: text('payment_method'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('settlements_group_id_created_at_idx').on(t.groupId, t.createdAt.desc()),
    check('settlements_amount_positive', sql`${t.amountMinor} > 0`),
    check('settlements_distinct_members', sql`${t.fromMemberId} <> ${t.toMemberId}`),
  ]
);

export type GroupRow = typeof groups.$inferSelect;
export type MemberRow = typeof members.$inferSelect;
export type ExpenseRow = typeof expenses.$inferSelect;
export type ExpenseSplitRow = typeof expenseSplits.$inferSelect;
export type SettlementRow = typeof settlements.$inferSelect;
