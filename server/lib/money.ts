/**
 * Money is stored in the database as integer minor units so that
 * `sum(splits) === expense.amount` is an exact, enforceable invariant. Floats cannot
 * offer that — the client-side balance code in src/utils/debtSimplification.ts already
 * needs a 0.009 epsilon to paper over the drift.
 *
 * The domain types in src/types.ts keep using `number`, so conversion happens only here,
 * at the API boundary.
 *
 * The scale is a fixed 2 for every currency, including zero-decimal ones like JPY. That
 * is deliberate: the scale is an internal storage detail, not a claim about how a
 * currency subdivides, and keeping it uniform avoids a per-currency lookup on every row.
 */

/** Largest amount we accept, in minor units — 1 trillion major units. */
const MAX_MINOR = 100_000_000_000_000;

export function toMinor(amount: number): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new RangeError(`Amount is not a finite number: ${amount}`);
  }
  // `amount * 100` is not enough on its own: 1.005 is stored as 1.00499999999999989,
  // so multiplying gives 100.49999999999999 and Math.round would yield 100 rather than
  // the 101 a person reading "$1.005" expects. Normalising through toFixed first
  // discards the representation error before rounding.
  const minor = Math.round(Number((amount * 100).toFixed(6)));
  if (Math.abs(minor) > MAX_MINOR) {
    throw new RangeError(`Amount out of range: ${amount}`);
  }
  return minor;
}

/**
 * node-postgres returns bigint columns as strings to avoid precision loss, so this
 * accepts both. Every value we store is far below Number.MAX_SAFE_INTEGER.
 */
export function fromMinor(minor: number | string | bigint | null | undefined): number {
  if (minor === null || minor === undefined) return 0;
  const n = typeof minor === 'number' ? minor : Number(minor);
  if (!Number.isFinite(n)) {
    throw new RangeError(`Stored amount is not a finite number: ${String(minor)}`);
  }
  return n / 100;
}

/** Optional variant: preserves null/undefined instead of collapsing it to 0. */
export function fromMinorOrUndefined(
  minor: number | string | bigint | null | undefined
): number | undefined {
  if (minor === null || minor === undefined) return undefined;
  return fromMinor(minor);
}
