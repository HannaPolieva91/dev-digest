import type { FindingRecord } from "@devdigest/shared";
// Runtime value: import the contract file directly — the barrel's `.js` re-exports
// don't resolve under Next's webpack (type-only barrel imports are erased, so they're fine).
import { Severity } from "@devdigest/shared/contracts/findings";
import { LOW_CONFIDENCE_THRESHOLD, SEVERITY_ORDER } from "./constants";

export type SeverityCounts = Record<Severity, number>;

/** Optionally drop low-confidence findings and sort by severity. */
export function visibleFindings(findings: FindingRecord[], hideLow: boolean): FindingRecord[] {
  let shown = findings;
  if (hideLow) shown = shown.filter((f) => f.confidence >= LOW_CONFIDENCE_THRESHOLD);
  return [...shown].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  );
}

/** One count per contract level, zero-filled; values outside the contract are ignored. */
export function countBySeverity(findings: FindingRecord[]): SeverityCounts {
  const counts = Object.fromEntries(Severity.options.map((l) => [l, 0])) as SeverityCounts;
  for (const f of findings) {
    if (f.severity in counts) counts[f.severity] += 1;
  }
  return counts;
}

/** `null` = no filter (returns the input); otherwise keeps only that level, order preserved. */
export function filterBySeverity(
  findings: FindingRecord[],
  level: Severity | null,
): FindingRecord[] {
  return level ? findings.filter((f) => f.severity === level) : findings;
}
