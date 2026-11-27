import type { FindingRecord } from "@devdigest/shared";
import type { Severity } from "@devdigest/shared/contracts/findings";
import { LOW_CONFIDENCE_THRESHOLD, SEVERITY_ORDER } from "./constants";

// Shared with the PR list's FINDINGS column — lives in lib/findings.ts.
export { countBySeverity, type SeverityCounts } from "@/lib/findings";

/** Optionally drop low-confidence findings and sort by severity. */
export function visibleFindings(findings: FindingRecord[], hideLow: boolean): FindingRecord[] {
  let shown = findings;
  if (hideLow) shown = shown.filter((f) => f.confidence >= LOW_CONFIDENCE_THRESHOLD);
  return [...shown].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  );
}

/** `null` = no filter (returns the input); otherwise keeps only that level, order preserved. */
export function filterBySeverity(
  findings: FindingRecord[],
  level: Severity | null,
): FindingRecord[] {
  return level ? findings.filter((f) => f.severity === level) : findings;
}
