import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { z } from 'zod';
import type {
  Expense,
  ExpenseSplit,
  Group,
  Member,
  SettlementRecord,
} from '../../src/types';
import { db, type Tx } from '../db/client';
import { expenseSplits, expenses, groups, members, settlements } from '../db/schema';
import { ApiError } from '../lib/errors';
import { newExpenseId, newGroupId, newMemberId, newSettlementId } from '../lib/ids';
import { fromMinor, fromMinorOrUndefined, toMinor } from '../lib/money';
import type {
  createGroupSchema,
  importGroupSchema,
  createMemberSchema,
  expenseSchema,
  importSchema,
  patchGroupSchema,
  patchMemberSchema,
  settlementSchema,
} from '../lib/validate';

type CreateGroupInput = z.infer<typeof createGroupSchema>;
type PatchGroupInput = z.infer<typeof patchGroupSchema>;
type CreateMemberInput = z.infer<typeof createMemberSchema>;
type PatchMemberInput = z.infer<typeof patchMemberSchema>;
type ExpenseInput = z.infer<typeof expenseSchema>;
type SettlementInput = z.infer<typeof settlementSchema>;
type ImportInput = z.infer<typeof importSchema>;

export interface LoadedGroup {
  group: Group;
  revision: number;
}

const numOrUndefined = (v: string | null): number | undefined =>
  v === null ? undefined : Number(v);

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

/**
 * Loads one group and everything under it, shaped as the `Group` object the React app
 * already renders. Four queries rather than a join, because joining expenses to their
 * splits would multiply expense rows and cost more to unpick than a second round trip.
 *
 * `isCurrentUser` is always false here. The server does not know or store which member
 * you are — that is device-local state in localStorage, and the client stamps it during
 * hydration. Persisting it server-side is the bug where one person claiming their
 * identity overwrote everyone else's.
 */
export async function loadGroup(
  id: string,
  runner: Tx | typeof db = db
): Promise<LoadedGroup | null> {
  const [groupRow] = await runner
    .select()
    .from(groups)
    .where(and(eq(groups.id, id), isNull(groups.deletedAt)))
    .limit(1);

  if (!groupRow) return null;

  // Sequential, not Promise.all: inside a transaction every query shares one client, and
  // node-postgres cannot have two statements in flight on the same connection.
  const memberRows = await runner
    .select()
    .from(members)
    .where(eq(members.groupId, id))
    .orderBy(asc(members.sortOrder), asc(members.createdAt));

  const expenseRows = await runner
    .select()
    .from(expenses)
    .where(eq(expenses.groupId, id))
    .orderBy(desc(expenses.createdAt));

  const settlementRows = await runner
    .select()
    .from(settlements)
    .where(eq(settlements.groupId, id))
    .orderBy(desc(settlements.createdAt));

  const expenseIds = expenseRows.map((e) => e.id);
  const splitRows = expenseIds.length
    ? await runner
        .select()
        .from(expenseSplits)
        .where(inArray(expenseSplits.expenseId, expenseIds))
    : [];

  const splitsByExpense = new Map<string, ExpenseSplit[]>();
  for (const row of splitRows) {
    const list = splitsByExpense.get(row.expenseId) ?? [];
    list.push({
      memberId: row.memberId,
      amount: fromMinor(row.amountMinor),
      originalAmount: fromMinorOrUndefined(row.originalAmountMinor),
      percentage: numOrUndefined(row.percentage),
      shares: numOrUndefined(row.shares),
    });
    splitsByExpense.set(row.expenseId, list);
  }

  const group: Group = {
    id: groupRow.id,
    name: groupRow.name,
    currency: groupRow.currency,
    myETransferEmail: groupRow.myETransferEmail ?? '',
    isArchived: groupRow.isArchived,
    archivedAt: groupRow.archivedAt?.toISOString(),
    createdAt: groupRow.createdAt.toISOString(),
    updatedAt: groupRow.updatedAt.toISOString(),
    members: memberRows.map(
      (m): Member => ({
        id: m.id,
        name: m.name,
        isCurrentUser: false,
        email: m.email ?? '',
        paymentHandle: m.paymentHandle ?? '',
        avatarUrl: m.avatarUrl ?? undefined,
        avatarBg: m.avatarBg ?? undefined,
        avatarEmoji: m.avatarEmoji ?? undefined,
        characterName: m.characterName ?? undefined,
        initials: m.initials ?? undefined,
      })
    ),
    expenses: expenseRows.map(
      (e): Expense => ({
        id: e.id,
        title: e.title,
        amount: fromMinor(e.amountMinor),
        currency: e.currency,
        originalAmount: fromMinorOrUndefined(e.originalAmountMinor),
        originalCurrency: e.originalCurrency ?? undefined,
        exchangeRate: numOrUndefined(e.exchangeRate),
        paidByMemberId: e.paidByMemberId,
        category: e.category as Expense['category'],
        date: e.date,
        splitType: e.splitType as Expense['splitType'],
        splits: splitsByExpense.get(e.id) ?? [],
        notes: e.notes ?? undefined,
      })
    ),
    settlements: settlementRows.map(
      (s): SettlementRecord => ({
        id: s.id,
        fromMemberId: s.fromMemberId,
        toMemberId: s.toMemberId,
        amount: fromMinor(s.amountMinor),
        currency: s.currency,
        date: s.date,
        note: s.note ?? undefined,
        paymentMethod: s.paymentMethod ?? undefined,
      })
    ),
  };

  return { group, revision: groupRow.revision };
}

async function requireGroup(tx: Tx, groupId: string) {
  const [row] = await tx
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)))
    .limit(1);
  if (!row) throw ApiError.notFound();
  return row;
}

/** Every write goes through here, so the SSE stream and poll always see a change. */
async function bumpRevision(tx: Tx, groupId: string): Promise<void> {
  await tx
    .update(groups)
    .set({ revision: sql`${groups.revision} + 1`, updatedAt: new Date() })
    .where(eq(groups.id, groupId));
}

/**
 * Reloads inside the same transaction so the caller sees exactly what it wrote, with no
 * window for another request to interleave.
 */
async function reload(tx: Tx, groupId: string): Promise<LoadedGroup> {
  const loaded = await loadGroup(groupId, tx);
  if (!loaded) throw ApiError.notFound();
  return loaded;
}

async function memberIdsOf(tx: Tx, groupId: string): Promise<Set<string>> {
  const rows = await tx
    .select({ id: members.id })
    .from(members)
    .where(eq(members.groupId, groupId));
  return new Set(rows.map((r) => r.id));
}

/* ------------------------------------------------------------------ *
 * Write helpers
 * ------------------------------------------------------------------ */

/**
 * The invariant the old JSON-blob store could not express. Because both sides are
 * integers, this is an exact equality rather than a tolerance check — if it fails, the
 * client's split maths is wrong and we would rather reject than persist a bill that
 * silently does not add up.
 */
function assertSplitsBalance(amountMinor: number, splitMinors: number[]): void {
  const total = splitMinors.reduce((sum, n) => sum + n, 0);
  if (total !== amountMinor) {
    throw ApiError.badRequest(
      `Splits add up to ${fromMinor(total).toFixed(2)}, but the expense is ${fromMinor(
        amountMinor
      ).toFixed(2)}`,
      { expenseAmount: fromMinor(amountMinor), splitTotal: fromMinor(total) }
    );
  }
}

function assertMembersInGroup(known: Set<string>, ids: string[], label: string): void {
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw ApiError.badRequest(`${label} not in this split`, { memberIds: unknown });
  }
}

async function writeExpenseRows(
  tx: Tx,
  groupId: string,
  expenseId: string,
  input: ExpenseInput
): Promise<void> {
  const known = await memberIdsOf(tx, groupId);
  assertMembersInGroup(known, [input.paidByMemberId], 'Payer is');

  const splitMemberIds = input.splits.map((s) => s.memberId);
  assertMembersInGroup(known, splitMemberIds, 'Some people in the split are');

  if (new Set(splitMemberIds).size !== splitMemberIds.length) {
    throw ApiError.badRequest('The same person appears twice in the split');
  }

  const amountMinor = toMinor(input.amount);
  const splitMinors = input.splits.map((s) => toMinor(s.amount));
  assertSplitsBalance(amountMinor, splitMinors);

  await tx
    .insert(expenses)
    .values({
      id: expenseId,
      groupId,
      title: input.title,
      amountMinor,
      currency: input.currency,
      originalAmountMinor:
        input.originalAmount === undefined ? null : toMinor(input.originalAmount),
      originalCurrency: input.originalCurrency ?? null,
      exchangeRate: input.exchangeRate === undefined ? null : String(input.exchangeRate),
      paidByMemberId: input.paidByMemberId,
      category: input.category,
      date: input.date,
      splitType: input.splitType,
      notes: input.notes ?? null,
    })
    .onConflictDoUpdate({
      target: expenses.id,
      set: {
        title: input.title,
        amountMinor,
        currency: input.currency,
        originalAmountMinor:
          input.originalAmount === undefined ? null : toMinor(input.originalAmount),
        originalCurrency: input.originalCurrency ?? null,
        exchangeRate:
          input.exchangeRate === undefined ? null : String(input.exchangeRate),
        paidByMemberId: input.paidByMemberId,
        category: input.category,
        date: input.date,
        splitType: input.splitType,
        notes: input.notes ?? null,
        updatedAt: new Date(),
      },
    });

  // Splits are replaced wholesale rather than diffed — an edit can add, drop, or
  // re-weight people, and rewriting a handful of rows is cheaper than working out which.
  await tx.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
  await tx.insert(expenseSplits).values(
    input.splits.map((s, i) => ({
      expenseId,
      memberId: s.memberId,
      amountMinor: splitMinors[i],
      originalAmountMinor:
        s.originalAmount === undefined ? null : toMinor(s.originalAmount),
      percentage: s.percentage === undefined ? null : String(s.percentage),
      shares: s.shares === undefined ? null : String(s.shares),
    }))
  );
}

/* ------------------------------------------------------------------ *
 * Group writes
 * ------------------------------------------------------------------ */

export async function createGroup(input: CreateGroupInput): Promise<LoadedGroup> {
  return db.transaction(async (tx) => {
    const groupId = newGroupId();

    await tx.insert(groups).values({
      id: groupId,
      name: input.name,
      currency: input.currency,
      revision: 1,
    });

    await tx.insert(members).values(
      input.members.map((m, i) => ({
        id: newMemberId(),
        groupId,
        name: m.name,
        email: m.email ?? null,
        paymentHandle: m.paymentHandle ?? null,
        avatarUrl: m.avatarUrl ?? null,
        avatarBg: m.avatarBg ?? null,
        avatarEmoji: m.avatarEmoji ?? null,
        characterName: m.characterName ?? null,
        initials: m.initials ?? m.name.slice(0, 2).toUpperCase(),
        sortOrder: i,
      }))
    );

    return reload(tx, groupId);
  });
}

export async function patchGroup(
  groupId: string,
  patch: PatchGroupInput
): Promise<LoadedGroup> {
  return db.transaction(async (tx) => {
    await requireGroup(tx, groupId);

    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.name !== undefined) set.name = patch.name;
    if (patch.currency !== undefined) set.currency = patch.currency;
    if (patch.myETransferEmail !== undefined) set.myETransferEmail = patch.myETransferEmail;
    if (patch.isArchived !== undefined) {
      set.isArchived = patch.isArchived;
      set.archivedAt = patch.isArchived ? new Date() : null;
    }

    await tx.update(groups).set(set).where(eq(groups.id, groupId));
    await bumpRevision(tx, groupId);
    return reload(tx, groupId);
  });
}

/**
 * Soft delete. The row stays so that anyone still holding the share link gets a clean
 * 404 instead of the group silently reappearing from someone else's cache — which is
 * exactly what happens today, since deletes never reached the server at all.
 */
export async function softDeleteGroup(groupId: string): Promise<void> {
  const result = await db
    .update(groups)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)))
    .returning({ id: groups.id });

  if (result.length === 0) throw ApiError.notFound();
}

/* ------------------------------------------------------------------ *
 * Member writes
 * ------------------------------------------------------------------ */

export async function addMember(
  groupId: string,
  input: CreateMemberInput
): Promise<LoadedGroup> {
  return db.transaction(async (tx) => {
    await requireGroup(tx, groupId);

    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(members)
      .where(eq(members.groupId, groupId));

    await tx.insert(members).values({
      id: newMemberId(),
      groupId,
      name: input.name,
      email: input.email ?? null,
      paymentHandle: input.paymentHandle ?? null,
      avatarUrl: input.avatarUrl ?? null,
      avatarBg: input.avatarBg ?? null,
      avatarEmoji: input.avatarEmoji ?? null,
      characterName: input.characterName ?? null,
      initials: input.initials ?? input.name.slice(0, 2).toUpperCase(),
      sortOrder: count,
    });

    await bumpRevision(tx, groupId);
    return reload(tx, groupId);
  });
}

export async function patchMember(
  groupId: string,
  memberId: string,
  patch: PatchMemberInput
): Promise<LoadedGroup> {
  return db.transaction(async (tx) => {
    await requireGroup(tx, groupId);

    const set: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of [
      'name',
      'email',
      'paymentHandle',
      'avatarUrl',
      'avatarBg',
      'avatarEmoji',
      'characterName',
      'initials',
    ] as const) {
      if (patch[key] !== undefined) set[key] = patch[key];
    }

    const updated = await tx
      .update(members)
      .set(set)
      .where(and(eq(members.id, memberId), eq(members.groupId, groupId)))
      .returning({ id: members.id });

    if (updated.length === 0) throw ApiError.notFound('Member');

    await bumpRevision(tx, groupId);
    return reload(tx, groupId);
  });
}

/**
 * Refuses rather than cascading. Removing someone who paid for things would either
 * delete their expenses or leave the balances wrong; the caller gets a 409 listing what
 * still points at them so the UI can say why.
 */
export async function removeMember(
  groupId: string,
  memberId: string
): Promise<LoadedGroup> {
  return db.transaction(async (tx) => {
    await requireGroup(tx, groupId);

    const [target] = await tx
      .select({ id: members.id, name: members.name })
      .from(members)
      .where(and(eq(members.id, memberId), eq(members.groupId, groupId)))
      .limit(1);

    if (!target) throw ApiError.notFound('Member');

    const remaining = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(members)
      .where(eq(members.groupId, groupId));

    if (remaining[0].count <= 1) {
      throw ApiError.conflict('A split needs at least one person in it');
    }

    const paidFor = await tx
      .select({ id: expenses.id, title: expenses.title })
      .from(expenses)
      .where(and(eq(expenses.groupId, groupId), eq(expenses.paidByMemberId, memberId)));

    const splitIn = await tx
      .select({ id: expenses.id, title: expenses.title })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
      .where(and(eq(expenses.groupId, groupId), eq(expenseSplits.memberId, memberId)));

    const settled = await tx
      .select({ id: settlements.id })
      .from(settlements)
      .where(
        and(
          eq(settlements.groupId, groupId),
          sql`(${settlements.fromMemberId} = ${memberId} OR ${settlements.toMemberId} = ${memberId})`
        )
      );

    const blockingExpenses = [...paidFor, ...splitIn];
    if (blockingExpenses.length > 0 || settled.length > 0) {
      const titles = [...new Set(blockingExpenses.map((e) => e.title))];
      throw ApiError.conflict(
        `${target.name} still appears in ${blockingExpenses.length} expense(s) and ${settled.length} settlement(s)`,
        { expenses: titles, settlementCount: settled.length }
      );
    }

    await tx.delete(members).where(eq(members.id, memberId));
    await bumpRevision(tx, groupId);
    return reload(tx, groupId);
  });
}

/* ------------------------------------------------------------------ *
 * Expense writes
 * ------------------------------------------------------------------ */

export async function createExpense(
  groupId: string,
  input: ExpenseInput
): Promise<LoadedGroup> {
  return db.transaction(async (tx) => {
    await requireGroup(tx, groupId);
    await writeExpenseRows(tx, groupId, newExpenseId(), input);
    await bumpRevision(tx, groupId);
    return reload(tx, groupId);
  });
}

export async function replaceExpense(
  groupId: string,
  expenseId: string,
  input: ExpenseInput
): Promise<LoadedGroup> {
  return db.transaction(async (tx) => {
    await requireGroup(tx, groupId);

    const [existing] = await tx
      .select({ id: expenses.id })
      .from(expenses)
      .where(and(eq(expenses.id, expenseId), eq(expenses.groupId, groupId)))
      .limit(1);

    if (!existing) throw ApiError.notFound('Expense');

    await writeExpenseRows(tx, groupId, expenseId, input);
    await bumpRevision(tx, groupId);
    return reload(tx, groupId);
  });
}

export async function deleteExpense(
  groupId: string,
  expenseId: string
): Promise<LoadedGroup> {
  return db.transaction(async (tx) => {
    await requireGroup(tx, groupId);

    const deleted = await tx
      .delete(expenses)
      .where(and(eq(expenses.id, expenseId), eq(expenses.groupId, groupId)))
      .returning({ id: expenses.id });

    if (deleted.length === 0) throw ApiError.notFound('Expense');

    await bumpRevision(tx, groupId);
    return reload(tx, groupId);
  });
}

/* ------------------------------------------------------------------ *
 * Settlement writes
 * ------------------------------------------------------------------ */

export async function createSettlement(
  groupId: string,
  input: SettlementInput
): Promise<LoadedGroup> {
  return db.transaction(async (tx) => {
    await requireGroup(tx, groupId);

    const known = await memberIdsOf(tx, groupId);
    assertMembersInGroup(known, [input.fromMemberId, input.toMemberId], 'Payer or payee is');

    await tx.insert(settlements).values({
      id: newSettlementId(),
      groupId,
      fromMemberId: input.fromMemberId,
      toMemberId: input.toMemberId,
      amountMinor: toMinor(input.amount),
      currency: input.currency,
      date: input.date,
      note: input.note ?? null,
      paymentMethod: input.paymentMethod ?? null,
    });

    await bumpRevision(tx, groupId);
    return reload(tx, groupId);
  });
}

export async function deleteSettlement(
  groupId: string,
  settlementId: string
): Promise<LoadedGroup> {
  return db.transaction(async (tx) => {
    await requireGroup(tx, groupId);

    const deleted = await tx
      .delete(settlements)
      .where(and(eq(settlements.id, settlementId), eq(settlements.groupId, groupId)))
      .returning({ id: settlements.id });

    if (deleted.length === 0) throw ApiError.notFound('Settlement');

    await bumpRevision(tx, groupId);
    return reload(tx, groupId);
  });
}

/* ------------------------------------------------------------------ *
 * One-time import of legacy localStorage groups
 * ------------------------------------------------------------------ */

/**
 * Legacy splits were stored as floats, so their per-person amounts can be a cent off the
 * total once rounded to minor units. Import nudges the last split to absorb the
 * difference rather than rejecting the whole group — refusing to import someone's real
 * trip because of a historical rounding artefact would be the wrong trade.
 */
function reconcileSplits(amountMinor: number, splitMinors: number[]): number[] {
  if (splitMinors.length === 0) return splitMinors;
  const total = splitMinors.reduce((sum, n) => sum + n, 0);
  const drift = amountMinor - total;
  if (drift === 0) return splitMinors;

  const adjusted = [...splitMinors];
  adjusted[adjusted.length - 1] += drift;
  if (adjusted[adjusted.length - 1] < 0) {
    throw ApiError.badRequest('Legacy expense splits cannot be reconciled', {
      expenseAmount: fromMinor(amountMinor),
      splitTotal: fromMinor(total),
    });
  }
  return adjusted;
}

const parseDate = (value: string | undefined): Date => {
  if (!value) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

export interface ImportResult {
  imported: string[];
  skipped: string[];
}

/**
 * Upserts whole legacy groups, keeping their original IDs so share links already in
 * circulation keep resolving. A group that already exists on the server is skipped, not
 * overwritten — the server is the source of truth, and a device coming back online with
 * a stale copy must not clobber what everyone else has since done.
 */
export async function importGroups(input: ImportInput): Promise<ImportResult> {
  return db.transaction(async (tx) => {
    const imported: string[] = [];
    const skipped: string[] = [];

    for (const g of input.groups) {
      const [existing] = await tx
        .select({ id: groups.id })
        .from(groups)
        .where(eq(groups.id, g.id))
        .limit(1);

      if (existing) {
        skipped.push(g.id);
        continue;
      }

      await tx.insert(groups).values({
        id: g.id,
        name: g.name,
        currency: g.currency,
        myETransferEmail: g.myETransferEmail ?? null,
        isArchived: g.isArchived ?? false,
        archivedAt: g.archivedAt ? parseDate(g.archivedAt) : null,
        revision: 1,
        createdAt: parseDate(g.createdAt),
        updatedAt: parseDate(g.updatedAt),
      });

      await tx.insert(members).values(
        g.members.map((m, i) => ({
          id: m.id,
          groupId: g.id,
          name: m.name,
          email: m.email ?? null,
          paymentHandle: m.paymentHandle ?? null,
          avatarUrl: m.avatarUrl ?? null,
          avatarBg: m.avatarBg ?? null,
          avatarEmoji: m.avatarEmoji ?? null,
          characterName: m.characterName ?? null,
          initials: m.initials ?? m.name.slice(0, 2).toUpperCase(),
          sortOrder: i,
        }))
      );

      const memberIds = new Set(g.members.map((m) => m.id));

      // Legacy data can reference people who were later removed by hand. Skip those rows
      // rather than failing the import; the alternative is losing the whole group.
      const usableExpenses = g.expenses.filter(
        (e) =>
          memberIds.has(e.paidByMemberId) &&
          e.splits.every((s) => memberIds.has(s.memberId))
      );

      for (const e of usableExpenses) {
        const amountMinor = toMinor(e.amount);
        const splitMinors = reconcileSplits(
          amountMinor,
          e.splits.map((s) => toMinor(s.amount))
        );

        await tx.insert(expenses).values({
          id: e.id,
          groupId: g.id,
          title: e.title,
          amountMinor,
          currency: e.currency,
          originalAmountMinor:
            e.originalAmount === undefined ? null : toMinor(e.originalAmount),
          originalCurrency: e.originalCurrency ?? null,
          exchangeRate: e.exchangeRate === undefined ? null : String(e.exchangeRate),
          paidByMemberId: e.paidByMemberId,
          category: e.category,
          date: e.date,
          splitType: e.splitType,
          notes: e.notes ?? null,
        });

        if (e.splits.length > 0) {
          await tx.insert(expenseSplits).values(
            e.splits.map((s, i) => ({
              expenseId: e.id,
              memberId: s.memberId,
              amountMinor: splitMinors[i],
              originalAmountMinor:
                s.originalAmount === undefined ? null : toMinor(s.originalAmount),
              percentage: s.percentage === undefined ? null : String(s.percentage),
              shares: s.shares === undefined ? null : String(s.shares),
            }))
          );
        }
      }

      const usableSettlements = g.settlements.filter(
        (s) => memberIds.has(s.fromMemberId) && memberIds.has(s.toMemberId)
      );

      if (usableSettlements.length > 0) {
        await tx.insert(settlements).values(
          usableSettlements.map((s) => ({
            id: s.id,
            groupId: g.id,
            fromMemberId: s.fromMemberId,
            toMemberId: s.toMemberId,
            amountMinor: toMinor(s.amount),
            currency: s.currency,
            date: s.date,
            note: s.note ?? null,
            paymentMethod: s.paymentMethod ?? null,
          }))
        );
      }

      imported.push(g.id);
    }

    return { imported, skipped };
  });
}

/**
 * Whole-document replace, backing the deprecated POST /api/splits/:id alias.
 *
 * This is the old last-write-wins behaviour, kept so a browser tab left open on the
 * previous build does not start erroring. Children are deleted and reinserted rather
 * than diffed: the caller is handing us the complete intended state, and the delete
 * order matters because expenses and settlements hold RESTRICT references to members.
 */
export async function replaceGroupContents(
  groupId: string,
  g: z.infer<typeof importGroupSchema>
): Promise<LoadedGroup> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: groups.id })
      .from(groups)
      .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)))
      .limit(1);

    if (existing) {
      await tx
        .update(groups)
        .set({
          name: g.name,
          currency: g.currency,
          myETransferEmail: g.myETransferEmail ?? null,
          isArchived: g.isArchived ?? false,
          archivedAt: g.archivedAt ? parseDate(g.archivedAt) : null,
          updatedAt: new Date(),
        })
        .where(eq(groups.id, groupId));
    } else {
      await tx.insert(groups).values({
        id: groupId,
        name: g.name,
        currency: g.currency,
        myETransferEmail: g.myETransferEmail ?? null,
        isArchived: g.isArchived ?? false,
        archivedAt: g.archivedAt ? parseDate(g.archivedAt) : null,
        revision: 0,
        createdAt: parseDate(g.createdAt),
      });
    }

    const expenseIdRows = await tx
      .select({ id: expenses.id })
      .from(expenses)
      .where(eq(expenses.groupId, groupId));

    if (expenseIdRows.length > 0) {
      await tx.delete(expenseSplits).where(
        inArray(
          expenseSplits.expenseId,
          expenseIdRows.map((r) => r.id)
        )
      );
    }
    await tx.delete(settlements).where(eq(settlements.groupId, groupId));
    await tx.delete(expenses).where(eq(expenses.groupId, groupId));
    await tx.delete(members).where(eq(members.groupId, groupId));

    await tx.insert(members).values(
      g.members.map((m, i) => ({
        id: m.id,
        groupId,
        name: m.name,
        email: m.email ?? null,
        paymentHandle: m.paymentHandle ?? null,
        avatarUrl: m.avatarUrl ?? null,
        avatarBg: m.avatarBg ?? null,
        avatarEmoji: m.avatarEmoji ?? null,
        characterName: m.characterName ?? null,
        initials: m.initials ?? m.name.slice(0, 2).toUpperCase(),
        sortOrder: i,
      }))
    );

    const memberIds = new Set(g.members.map((m) => m.id));

    for (const e of g.expenses) {
      if (!memberIds.has(e.paidByMemberId)) continue;
      if (!e.splits.every((s) => memberIds.has(s.memberId))) continue;

      const amountMinor = toMinor(e.amount);
      const splitMinors = reconcileSplits(
        amountMinor,
        e.splits.map((s) => toMinor(s.amount))
      );

      await tx.insert(expenses).values({
        id: e.id,
        groupId,
        title: e.title,
        amountMinor,
        currency: e.currency,
        originalAmountMinor:
          e.originalAmount === undefined ? null : toMinor(e.originalAmount),
        originalCurrency: e.originalCurrency ?? null,
        exchangeRate: e.exchangeRate === undefined ? null : String(e.exchangeRate),
        paidByMemberId: e.paidByMemberId,
        category: e.category,
        date: e.date,
        splitType: e.splitType,
        notes: e.notes ?? null,
      });

      if (e.splits.length > 0) {
        await tx.insert(expenseSplits).values(
          e.splits.map((s, i) => ({
            expenseId: e.id,
            memberId: s.memberId,
            amountMinor: splitMinors[i],
            originalAmountMinor:
              s.originalAmount === undefined ? null : toMinor(s.originalAmount),
            percentage: s.percentage === undefined ? null : String(s.percentage),
            shares: s.shares === undefined ? null : String(s.shares),
          }))
        );
      }
    }

    const usableSettlements = g.settlements.filter(
      (s) => memberIds.has(s.fromMemberId) && memberIds.has(s.toMemberId)
    );

    if (usableSettlements.length > 0) {
      await tx.insert(settlements).values(
        usableSettlements.map((s) => ({
          id: s.id,
          groupId,
          fromMemberId: s.fromMemberId,
          toMemberId: s.toMemberId,
          amountMinor: toMinor(s.amount),
          currency: s.currency,
          date: s.date,
          note: s.note ?? null,
          paymentMethod: s.paymentMethod ?? null,
        }))
      );
    }

    await bumpRevision(tx, groupId);
    return reload(tx, groupId);
  });
}
