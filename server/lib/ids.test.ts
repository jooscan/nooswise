import { describe, expect, it } from 'vitest';
import { newExpenseId, newGroupId, newMemberId, newSettlementId } from './ids';

describe('ids', () => {
  it('generates group ids long enough to be unguessable', () => {
    const id = newGroupId();
    // 22 base58 chars is ~129 bits. The old scheme was `split-${Date.now()}`.
    expect(id).toHaveLength(22);
    expect(id).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
  });

  it('does not collide across many draws', () => {
    const ids = new Set(Array.from({ length: 5000 }, newGroupId));
    expect(ids.size).toBe(5000);
  });

  it('prefixes internal ids so logs are readable', () => {
    expect(newMemberId()).toMatch(/^m_/);
    expect(newExpenseId()).toMatch(/^x_/);
    expect(newSettlementId()).toMatch(/^s_/);
  });

  it('uses an alphabet without visually ambiguous characters', () => {
    const sample = Array.from({ length: 200 }, newGroupId).join('');
    for (const ch of ['0', 'O', 'I', 'l']) {
      expect(sample).not.toContain(ch);
    }
  });
});
