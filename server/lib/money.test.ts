import { describe, expect, it } from 'vitest';
import { fromMinor, fromMinorOrUndefined, toMinor } from './money';

describe('money', () => {
  it('round-trips ordinary amounts', () => {
    for (const n of [0, 0.01, 1, 12.34, 99.99, 1000, 8.5]) {
      expect(fromMinor(toMinor(n))).toBe(n);
    }
  });

  it('stores zero-decimal currencies at the same fixed scale', () => {
    // 1200 JPY is not 12 yen — the scale is a storage detail, not a currency claim.
    expect(toMinor(1200)).toBe(120_000);
    expect(fromMinor(120_000)).toBe(1200);
  });

  it('rounds half away from zero rather than truncating', () => {
    expect(toMinor(0.005)).toBe(1);
    expect(toMinor(1.005)).toBe(101);
  });

  it('makes split totals exact where floats are not', () => {
    const splits = [33.33, 33.33, 33.34].map(toMinor);
    expect(splits.reduce((a, b) => a + b, 0)).toBe(toMinor(100));
  });

  it('removes the drift that makes float sums miss their total', () => {
    // A real case: ten people splitting $1.00 does not add back up in floats.
    const tenth = 0.1;
    const floatSum = Array.from({ length: 10 }, () => tenth).reduce((a, b) => a + b, 0);
    expect(floatSum).not.toBe(1);

    const minorSum = Array.from({ length: 10 }, () => toMinor(tenth)).reduce(
      (a, b) => a + b,
      0
    );
    expect(minorSum).toBe(toMinor(1));
  });

  it('accepts the string form node-postgres returns for bigint', () => {
    expect(fromMinor('12345')).toBe(123.45);
  });

  it('distinguishes absent from zero', () => {
    expect(fromMinorOrUndefined(null)).toBeUndefined();
    expect(fromMinorOrUndefined(undefined)).toBeUndefined();
    expect(fromMinorOrUndefined(0)).toBe(0);
    expect(fromMinor(null)).toBe(0);
  });

  it('rejects values that are not finite numbers', () => {
    expect(() => toMinor(Number.NaN)).toThrow(RangeError);
    expect(() => toMinor(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => toMinor(1e18)).toThrow(RangeError);
  });
});
