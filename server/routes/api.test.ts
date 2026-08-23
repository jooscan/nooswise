import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app';

let app: Express;
beforeAll(() => {
  app = createApp();
});

async function newGroup(names = ['Joyce', 'Sam', 'Alex']) {
  const res = await request(app)
    .post('/api/groups')
    .send({ name: 'Trip', currency: 'CAD', members: names.map((name) => ({ name })) })
    .expect(201);
  return {
    id: res.body.group.id as string,
    memberIds: res.body.group.members.map((m: { id: string }) => m.id) as string[],
    revision: res.body.revision as number,
  };
}

const expenseBody = (payer: string, splits: Array<[string, number]>, amount: number) => ({
  title: 'Dinner',
  amount,
  currency: 'CAD',
  paidByMemberId: payer,
  category: 'food',
  date: 'Today',
  splitType: 'exact',
  splits: splits.map(([memberId, a]) => ({ memberId, amount: a })),
});

describe('API', () => {
  it('reports health with a live database check', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('404s an unknown api path as JSON, not HTML', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.code).toBe('not_found');
  });

  describe('groups', () => {
    it('creates a group and returns it with a revision', async () => {
      const res = await request(app)
        .post('/api/groups')
        .send({ name: 'Tokyo', members: [{ name: 'Joyce' }] })
        .expect(201);
      expect(res.body.group.name).toBe('Tokyo');
      expect(res.body.group.id).toHaveLength(22);
      expect(res.body.revision).toBeGreaterThan(0);
    });

    it('rejects a group with no members', async () => {
      await request(app).post('/api/groups').send({ name: 'Empty', members: [] }).expect(400);
    });

    it('rejects a blank name', async () => {
      await request(app)
        .post('/api/groups')
        .send({ name: '   ', members: [{ name: 'Joyce' }] })
        .expect(400);
    });

    it('patches name, currency and archive state', async () => {
      const { id } = await newGroup();
      const res = await request(app)
        .patch(`/api/groups/${id}`)
        .send({ name: 'Renamed', currency: 'USD', isArchived: true })
        .expect(200);
      expect(res.body.group.name).toBe('Renamed');
      expect(res.body.group.currency).toBe('USD');
      expect(res.body.group.isArchived).toBe(true);
      expect(res.body.group.archivedAt).toBeTruthy();
    });

    it('rejects an empty patch', async () => {
      const { id } = await newGroup();
      await request(app).patch(`/api/groups/${id}`).send({}).expect(400);
    });

    it('deletes a group and keeps it deleted', async () => {
      const { id } = await newGroup();
      await request(app).delete(`/api/groups/${id}`).expect(204);
      await request(app).get(`/api/groups/${id}`).expect(404);
      // The bug this fixes: on main, a deleted split reappears on the next fetch.
      await request(app).get(`/api/groups/${id}`).expect(404);
    });

    it('404s an unknown group id', async () => {
      await request(app).get('/api/groups/doesnotexist').expect(404);
    });
  });

  describe('members', () => {
    it('adds a member', async () => {
      const { id } = await newGroup();
      const res = await request(app)
        .post(`/api/groups/${id}/members`)
        .send({ name: 'Pat' })
        .expect(201);
      expect(res.body.group.members.map((m: { name: string }) => m.name)).toContain('Pat');
    });

    it('updates payment details', async () => {
      const { id, memberIds } = await newGroup();
      const res = await request(app)
        .patch(`/api/groups/${id}/members/${memberIds[0]}`)
        .send({ paymentHandle: 'joyce@example.com', email: 'joyce@example.com' })
        .expect(200);
      expect(res.body.group.members[0].paymentHandle).toBe('joyce@example.com');
    });

    it('404s a member from another group', async () => {
      const a = await newGroup();
      const b = await newGroup();
      await request(app)
        .patch(`/api/groups/${a.id}/members/${b.memberIds[0]}`)
        .send({ name: 'Nope' })
        .expect(404);
    });

    it('409s removing someone still in an expense, and says why', async () => {
      const { id, memberIds } = await newGroup();
      await request(app)
        .post(`/api/groups/${id}/expenses`)
        .send(expenseBody(memberIds[0], [[memberIds[0], 10]], 10))
        .expect(201);

      const res = await request(app)
        .delete(`/api/groups/${id}/members/${memberIds[0]}`)
        .expect(409);
      expect(res.body.details.expenses).toContain('Dinner');
    });
  });

  describe('expenses', () => {
    it('creates an expense with an uneven split', async () => {
      const { id, memberIds } = await newGroup();
      const res = await request(app)
        .post(`/api/groups/${id}/expenses`)
        .send(
          expenseBody(
            memberIds[0],
            [
              [memberIds[0], 33.33],
              [memberIds[1], 33.33],
              [memberIds[2], 33.34],
            ],
            100
          )
        )
        .expect(201);
      expect(res.body.group.expenses[0].splits).toHaveLength(3);
    });

    it('rejects splits that do not add up, naming both totals', async () => {
      const { id, memberIds } = await newGroup();
      const res = await request(app)
        .post(`/api/groups/${id}/expenses`)
        .send(expenseBody(memberIds[0], [[memberIds[0], 60]], 100))
        .expect(400);
      expect(res.body.details.expenseAmount).toBe(100);
      expect(res.body.details.splitTotal).toBe(60);
    });

    it('rejects an unknown category', async () => {
      const { id, memberIds } = await newGroup();
      await request(app)
        .post(`/api/groups/${id}/expenses`)
        .send({ ...expenseBody(memberIds[0], [[memberIds[0], 10]], 10), category: 'yachts' })
        .expect(400);
    });

    it('rejects a negative amount', async () => {
      const { id, memberIds } = await newGroup();
      await request(app)
        .post(`/api/groups/${id}/expenses`)
        .send(expenseBody(memberIds[0], [[memberIds[0], -10]], -10))
        .expect(400);
    });

    it('replaces an expense on PUT', async () => {
      const { id, memberIds } = await newGroup();
      const created = await request(app)
        .post(`/api/groups/${id}/expenses`)
        .send(expenseBody(memberIds[0], [[memberIds[0], 10]], 10))
        .expect(201);
      const expenseId = created.body.group.expenses[0].id;

      const res = await request(app)
        .put(`/api/groups/${id}/expenses/${expenseId}`)
        .send({ ...expenseBody(memberIds[1], [[memberIds[1], 20]], 20), title: 'Lunch' })
        .expect(200);
      expect(res.body.group.expenses).toHaveLength(1);
      expect(res.body.group.expenses[0].title).toBe('Lunch');
      expect(res.body.group.expenses[0].amount).toBe(20);
    });

    it('deletes an expense', async () => {
      const { id, memberIds } = await newGroup();
      const created = await request(app)
        .post(`/api/groups/${id}/expenses`)
        .send(expenseBody(memberIds[0], [[memberIds[0], 10]], 10))
        .expect(201);

      const res = await request(app)
        .delete(`/api/groups/${id}/expenses/${created.body.group.expenses[0].id}`)
        .expect(200);
      expect(res.body.group.expenses).toHaveLength(0);
    });
  });

  describe('settlements', () => {
    it('records and undoes a settlement', async () => {
      const { id, memberIds } = await newGroup();
      const created = await request(app)
        .post(`/api/groups/${id}/settlements`)
        .send({
          fromMemberId: memberIds[1],
          toMemberId: memberIds[0],
          amount: 33.33,
          currency: 'CAD',
          date: 'Today',
          paymentMethod: 'etransfer',
        })
        .expect(201);
      expect(created.body.group.settlements).toHaveLength(1);

      const undone = await request(app)
        .delete(`/api/groups/${id}/settlements/${created.body.group.settlements[0].id}`)
        .expect(200);
      expect(undone.body.group.settlements).toHaveLength(0);
    });

    it('rejects paying yourself', async () => {
      const { id, memberIds } = await newGroup();
      await request(app)
        .post(`/api/groups/${id}/settlements`)
        .send({
          fromMemberId: memberIds[0],
          toMemberId: memberIds[0],
          amount: 5,
          currency: 'CAD',
          date: 'Today',
        })
        .expect(400);
    });
  });

  describe('poll', () => {
    it('reports no change at the current revision and a change at a stale one', async () => {
      const { id } = await newGroup();
      const current = (await request(app).get(`/api/groups/${id}`).expect(200)).body.revision;

      const same = await request(app).get(`/api/groups/${id}/poll?since=${current}`).expect(200);
      expect(same.body.updated).toBe(false);
      expect(same.body.group).toBeUndefined();

      const stale = await request(app).get(`/api/groups/${id}/poll?since=0`).expect(200);
      expect(stale.body.updated).toBe(true);
      expect(stale.body.group.id).toBe(id);
    });
  });

  describe('deprecated /api/splits aliases', () => {
    it('serves the old response shape for a group', async () => {
      const { id } = await newGroup();
      const res = await request(app).get(`/api/splits/${id}`).expect(200);
      expect(res.body).toHaveProperty('id', id);
      expect(res.body).toHaveProperty('updatedAt');
      expect(res.body.group.id).toBe(id);
    });

    it('accepts a whole-document push from an old client', async () => {
      const { id, memberIds } = await newGroup(['Joyce', 'Sam']);
      const res = await request(app)
        .post(`/api/splits/${id}`)
        .send({
          id,
          name: 'Pushed',
          currency: 'CAD',
          members: [
            { id: memberIds[0], name: 'Joyce', isCurrentUser: true },
            { id: memberIds[1], name: 'Sam' },
          ],
          expenses: [],
          settlements: [],
        })
        .expect(200);
      expect(res.body.group.name).toBe('Pushed');
      // isCurrentUser must not survive a round trip through the server.
      expect(res.body.group.members.every((m: { isCurrentUser: boolean }) => !m.isCurrentUser)).toBe(true);
    });
  });
});
