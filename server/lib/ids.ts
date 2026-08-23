import { randomBytes } from 'node:crypto';

/**
 * Base58 — the digits and letters minus the four that are easy to confuse when read
 * aloud or retyped (0, O, I, l). Group IDs end up in shared URLs, so legibility matters.
 */
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Rejection sampling keeps the distribution uniform. Taking `byte % 58` directly would
 * bias the first 24 characters of the alphabet, shrinking the effective keyspace.
 */
function randomString(length: number): string {
  const limit = 256 - (256 % ALPHABET.length);
  const out: string[] = [];
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < limit) {
        out.push(ALPHABET[byte % ALPHABET.length]);
        if (out.length === length) break;
      }
    }
  }
  return out.join('');
}

/**
 * A group ID is the only thing protecting a split — anyone holding it can read and write
 * the group. 22 base58 characters is ~129 bits, which is not enumerable. The old
 * `split-${Date.now()}` scheme was guessable in a few thousand tries.
 *
 * No prefix: this is a whole URL path segment, and the existing route parser in
 * src/utils/storage.ts treats the first segment as the group ID.
 */
export const newGroupId = (): string => randomString(22);

/** Internal IDs never appear in URLs, so a prefix is free and helps when reading logs. */
export const newMemberId = (): string => `m_${randomString(16)}`;
export const newExpenseId = (): string => `x_${randomString(16)}`;
export const newSettlementId = (): string => `s_${randomString(16)}`;
