import { Severity } from '@devdigest/shared';

/** Pure helpers for the pulls module (no IO — unit-tested in test/pulls-helpers.test.ts). */

export type FindingsCounts = Record<Severity, number>;

const emptyCounts = (): FindingsCounts =>
  Object.fromEntries(Severity.options.map((lv) => [lv, 0])) as FindingsCounts;

/**
 * Fold (PR, severity, n) rows into per-PR severity counts for the FINDINGS
 * column. Any row for a PR — even one with severity null (a reviewed-but-clean
 * review from the LEFT JOIN) — yields an entry with zeros; values outside the
 * contract (e.g. INFO) are ignored. PRs without rows stay absent (→ null, "—").
 */
export function foldFindingsCounts(
  rows: { prId: string; severity: string | null; n: number }[],
): Map<string, FindingsCounts> {
  const byPr = new Map<string, FindingsCounts>();
  for (const row of rows) {
    let counts = byPr.get(row.prId);
    if (!counts) {
      counts = emptyCounts();
      byPr.set(row.prId, counts);
    }
    const lv = Severity.safeParse(row.severity);
    if (lv.success) counts[lv.data] += row.n;
  }
  return byPr;
}
