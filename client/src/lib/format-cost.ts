/**
 * M1 cost badge — formatting for run cost (USD) and token totals.
 * Missing data renders as "—", never "$0.00" (a real $0 cost still shows $0.00).
 */
export const NO_DATA = "—";

/**
 * Display floor: non-zero costs under 10^-MAX_DECIMALS ($0.000001) render as "<$0.000001".
 * Values at or above it keep 2 significant digits, which can take 7 decimals ("$0.0000034").
 */
const MAX_DECIMALS = 6;

/**
 * USD cost: ≥ $1 → 2 decimals ("$1.23"); ≥ 1¢ → 3 decimals ("$0.014");
 * sub-cent → 2 significant digits ("$0.0013"). null/undefined/NaN → "—".
 */
export function formatUsd(usd: number | null | undefined): string {
  // Negative (e.g. a provider credit) is not a run cost we can show honestly → "—".
  if (usd == null || !Number.isFinite(usd) || usd < 0) return NO_DATA;
  if (usd === 0) return "$0.00";
  // Pick the bracket from the ROUNDED value, so 0.9996 → "$1.00", 0.00999 → "$0.010".
  if (Number(usd.toFixed(2)) >= 1) return `$${usd.toFixed(2)}`;
  if (Number(usd.toFixed(3)) >= 0.01) return `$${usd.toFixed(3)}`;
  const sig = Number(usd.toPrecision(2)); // 2 significant digits: 0.000999 → 0.001
  if (sig < 10 ** -MAX_DECIMALS) return `<$${(10 ** -MAX_DECIMALS).toFixed(MAX_DECIMALS)}`;
  return `$${sig.toFixed(1 - Math.floor(Math.log10(sig)))}`;
}

/** Total tokens (in + out) with an en-US thousands separator: "9,119". */
export function formatTokenTotal(
  tokensIn: number | null | undefined,
  tokensOut: number | null | undefined,
): string {
  return ((tokensIn ?? 0) + (tokensOut ?? 0)).toLocaleString("en-US");
}
