import { describe, expect, it } from 'vitest';
import { pool } from '../db/client';
import { ApiError } from '../lib/errors';
import {
  addMember,
  createExpense,
  createGroup,
  createSettlement,
  deleteExpense,
  importGroups,
  loadGroup,
  patchGroup,
  removeMember,
  replaceExpense,
  softDeleteGroup,
} from './groupRepo';

async function seed(memberNames = ['Joyce', 'Sam', 'Alex']) {
  const { group } = await createGroup({
    name: 'Test Trip',
    currency: 'CAD',
    members: memberNames.map((name) => ({ name })),
  });
  return { group, ids: group.members.map((m) => m.id) };
}

const expenseInput = (
  payer: string,
  splits: Array<{ memberId: string; amount: number }>,
  amount: number
) => ({
  title: 'Dinner',
  amount,
  currency: 'CAD',
  paidByMemberId: payer,
  category: 'food' as const,
  date: 'Today',
  splitType: 'exact' as const,
  splits,
});

describe('groupRepo', () => {
  describe('createGroup', () => {
    it('preserves the order members were given, creator first', async () => {
      const { group } = await seed(['Joyce', 'Sam', 'Alex']);
      expect(group.members.map((m) => m.name)).toEqual(['Joyce', 'Sam', 'Alex']);
    });

    it('never reports anyone as the current user', async () => {
      // isCurrentUser is device-local; persisting it is the bug where one person
      // claiming their identity overwrote everyone else's.
      const { group } = await seed();
      expect(group.members.every((m) => m.isCurrentUser === false)).toBe(true);
    });

    it('derives initials when the client does not send them', async () => {
      const { group } = await seed(['Joyce']);
      expect(group.members[0].initials).toBe('JO');
    });
  });

  describe('expense splits', () => {
    it('stores an uneven split whose parts total the expense exactly', async () => {
      const { group, ids } = await seed();
      const { group: updated } = await createExpense(
        group.id,
        expenseInput(
          ids[0],
          [
            { memberId: ids[0], amount: 33.33 },
            { memberId: ids[1], amount: 33.33 },
            { memberId: ids[2], amount: 33.34 },
          ],
          100
        )
      );

      const expense = updated.expenses[0];
      const total = expense.splits.reduce((sum, s) => sum + s.amount, 0);
      expect(Number(total.toFixed(2))).toBe(100);

      const { rows } = await pool.query(
        'select sum(amount_minor)::int as total from expense_splits where expense_id = $1',
        [expense.id]
      );
      expect(rows[0].total).toBe(10_000);
    });

    it('rejects splits that do not add up to the expense', async () => {
      const { group, ids } = await seed();
      await expect(
        createExpense(
          group.id,
          expenseInput(ids[0], [{ memberId: ids[0], amount: 60 }], 100)
        )
      ).rejects.toThrow(ApiError);
    });

    it('rejects a payer who belongs to a different split', async () => {
      const { group } = await seed();
      const other = await seed(['Stranger']);
      await expect(
        createExpense(
          group.id,
          expenseInput(
            other.ids[0],
            [{ memberId: other.ids[0], amount: 10 }],
            10
          )
        )
      ).rejects.toThrow(ApiError);
    });

    it('rejects the same person appearing twice in one split', async () => {
      const { group, ids } = await seed();
      await expect(
        createExpense(
          group.id,
          expenseInput(
            ids[0],
            [
              { memberId: ids[0], amount: 5 },
              { memberId: ids[0], amount: 5 },
            ],
            10
          )
        )
      ).rejects.toThrow(ApiError);
    });

    it('replaces splits wholesale on edit rather than merging them', async () => {
      const { group, ids } = await seed();
      const created = await createExpense(
        group.id,
        expenseInput(
          ids[0],
          [
            { memberId: ids[0], amount: 5 },
            { memberId: ids[1], amount: 5 },
          ],
          10
        )
      );
      const expenseId = created.group.expenses[0].id;

      const edited = await replaceExpense(
        group.id,
        expenseId,
        expenseInput(ids[2], [{ memberId: ids[2], amount: 10 }], 10)
      );

      expect(edited.group.expenses[0].splits).toHaveLength(1);
      expect(edited.group.expenses[0].splits[0].memberId).toBe(ids[2]);
      expect(edited.group.expenses[0].paidByMemberId).toBe(ids[2]);
    });

    it('cascade-deletes splits when the expense goes', async () => {
      const { group, ids } = await seed();
      const created = await createExpense(
        group.id,
        expenseInput(ids[0], [{ memberId: ids[0], amount: 10 }], 10)
      );
      const expenseId = created.group.expenses[0].id;

      await deleteExpense(group.id, expenseId);

      const { rows } = await pool.query(
        'select count(*)::int as n from expense_splits where expense_id = $1',
        [expenseId]
      );
      expect(rows[0].n).toBe(0);
    });
  });

  describe('removeMember', () => {
    it('refuses while the member still appears in an expense', async () => {
      const { group, ids } = await seed();
      await createExpense(
        group.id,
        expenseInput(ids[0], [{ memberId: ids[0], amount: 10 }], 10)
      );

      await expect(removeMember(group.id, ids[0])).rejects.toMatchObject({
        status: 409,
      });
    });

    it('refuses while the member still appears in a settlement', async () => {
      const { group, ids } = await seed();
      await createSettlement(group.id, {
        fromMemberId: ids[0],
        toMemberId: ids[1],
        amount: 10,
        currency: 'CAD',
        date: 'Today',
      });

      await expect(removeMember(group.id, ids[0])).rejects.toMatchObject({
        status: 409,
      });
    });

    it('removes a member nothing references', async () => {
      const { group, ids } = await seed();
      const { group: after } = await removeMember(group.id, ids[2]);
      expect(after.members.map((m) => m.id)).not.toContain(ids[2]);
    });

    it('refuses to empty the split completely', async () => {
      const { group, ids } = await seed(['Solo']);
      await expect(removeMember(group.id, ids[0])).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe('addMember ordering', () => {
    it('appends after the last member, not at a reused position', async () => {
      // The modal ticks the newly added person into the split by id, so a colliding
      // sort order (which count(*) would produce after a removal) must not scramble
      // which member reads as "the new one".
      const { group, ids } = await seed(['Joyce', 'Sam', 'Alex']);
      await removeMember(group.id, ids[1]);

      const { group: after } = await addMember(group.id, { name: 'Priya' });
      expect(after.members.map((m) => m.name)).toEqual(['Joyce', 'Alex', 'Priya']);
    });

    it('lets a just-added member be used in an expense straight away', async () => {
      const { group, ids } = await seed(['Joyce']);
      const { group: withPriya } = await addMember(group.id, { name: 'Priya' });
      const priya = withPriya.members.find((m) => m.name === 'Priya')!;

      const { group: withExpense } = await createExpense(
        group.id,
        expenseInput(
          ids[0],
          [
            { memberId: ids[0], amount: 5 },
            { memberId: priya.id, amount: 5 },
          ],
          10
        )
      );

      expect(withExpense.expenses[0].splits.map((s) => s.memberId)).toContain(priya.id);
    });
  });

  describe('revision', () => {
    it('advances on every write so pollers notice', async () => {
      const { group, ids } = await seed();
      const start = (await loadGroup(group.id))!.revision;

      await patchGroup(group.id, { name: 'Renamed' });
      const afterPatch = (await loadGroup(group.id))!.revision;
      expect(afterPatch).toBeGreaterThan(start);

      await addMember(group.id, { name: 'Pat' });
      const afterMember = (await loadGroup(group.id))!.revision;
      expect(afterMember).toBeGreaterThan(afterPatch);

      await createExpense(
        group.id,
        expenseInput(ids[0], [{ memberId: ids[0], amount: 1 }], 1)
      );
      expect((await loadGroup(group.id))!.revision).toBeGreaterThan(afterMember);
    });
  });

  describe('softDeleteGroup', () => {
    it('hides the group but keeps the row', async () => {
      const { group } = await seed();
      await softDeleteGroup(group.id);

      expect(await loadGroup(group.id)).toBeNull();

      const { rows } = await pool.query(
        'select deleted_at from groups where id = $1',
        [group.id]
      );
      expect(rows[0].deleted_at).not.toBeNull();
    });

    it('refuses to delete twice', async () => {
      const { group } = await seed();
      await softDeleteGroup(group.id);
      await expect(softDeleteGroup(group.id)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('importGroups', () => {
    const legacy = {
      id: 'split-1787491250435',
      name: 'Legacy Trip',
      currency: 'CAD',
      members: [
        { id: 'm-0-legacy', name: 'Joyce' },
        { id: 'm-1-legacy', name: 'Sam' },
      ],
      expenses: [
        {
          id: 'exp-legacy',
          title: 'Taxi',
          amount: 24,
          currency: 'CAD',
          paidByMemberId: 'm-0-legacy',
          category: 'travel' as const,
          date: 'Today',
          splitType: 'equally' as const,
          splits: [
            { memberId: 'm-0-legacy', amount: 12 },
            { memberId: 'm-1-legacy', amount: 12 },
          ],
        },
      ],
      settlements: [],
    };

    it('keeps original ids so existing share links still resolve', async () => {
      const result = await importGroups({ groups: [legacy] });
      expect(result.imported).toEqual(['split-1787491250435']);

      const loaded = await loadGroup('split-1787491250435');
      expect(loaded?.group.name).toBe('Legacy Trip');
      expect(loaded?.group.expenses[0].title).toBe('Taxi');
    });

    it('skips a group the server already has rather than clobbering it', async () => {
      await importGroups({ groups: [legacy] });
      await patchGroup(legacy.id, { name: 'Renamed On Server' });

      const second = await importGroups({ groups: [legacy] });
      expect(second.skipped).toEqual([legacy.id]);
      expect((await loadGroup(legacy.id))?.group.name).toBe('Renamed On Server');
    });

    it('absorbs a rounding drift rather than refusing the whole group', async () => {
      // Legacy float splits can be a cent short once rounded to minor units.
      const drifted = {
        ...legacy,
        id: 'split-drift',
        expenses: [
          {
            ...legacy.expenses[0],
            id: 'exp-drift',
            amount: 10,
            splits: [
              { memberId: 'm-0-legacy', amount: 3.33 },
              { memberId: 'm-1-legacy', amount: 3.33 },
            ],
          },
        ],
      };

      await importGroups({ groups: [drifted] });
      const loaded = await loadGroup('split-drift');
      const total = loaded!.group.expenses[0].splits.reduce((s, x) => s + x.amount, 0);
      expect(Number(total.toFixed(2))).toBe(10);
    });

    it('drops rows referencing people who no longer exist', async () => {
      const orphaned = {
        ...legacy,
        id: 'split-orphan',
        expenses: [
          { ...legacy.expenses[0], id: 'exp-orphan', paidByMemberId: 'm-deleted' },
        ],
      };

      await importGroups({ groups: [orphaned] });
      const loaded = await loadGroup('split-orphan');
      expect(loaded?.group.members).toHaveLength(2);
      expect(loaded?.group.expenses).toHaveLength(0);
    });
  });
});
