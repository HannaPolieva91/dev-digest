/* lib/findings.ts — pure helpers over findings/reviews, shared by the PR page
   (FindingsPanel severity counters) and the PR list (FINDINGS column preview). */
import type { FindingRecord, ReviewRecord } from "@devdigest/shared";
// Runtime value: import the contract file directly — the barrel's `.js` re-exports
// don't resolve under Next's webpack (type-only barrel imports are erased, so they're fine).
import { Severity } from "@devdigest/shared/contracts/findings";

export type SeverityCounts = Record<Severity, number>;

/** One count per contract level, zero-filled; values outside the contract are ignored. */
export function countBySeverity(findings: Pick<FindingRecord, "severity">[]): SeverityCounts {
  const counts = Object.fromEntries(Severity.options.map((l) => [l, 0])) as SeverityCounts;
  for (const f of findings) {
    if (f.severity in counts) counts[f.severity] += 1;
  }
  return counts;
}

/** Sum of all levels. */
export function totalCount(counts: SeverityCounts): number {
  return Severity.options.reduce((n, l) => n + counts[l], 0);
}

/**
 * The latest `kind: 'review'` review of EACH agent, newest first. Reviews with a
 * null agent_id count as one agent. Same rule as the server's `findings_counts`
 * on GET /repos/:id/pulls (spec: client/specs/pr-list-findings-column.md).
 */
export function latestReviewPerAgent(reviews: ReviewRecord[]): ReviewRecord[] {
  const byAgent = new Map<string | null, ReviewRecord>();
  for (const r of reviews) {
    if (r.kind !== "review") continue;
    const prev = byAgent.get(r.agent_id);
    if (!prev || Date.parse(r.created_at) > Date.parse(prev.created_at)) byAgent.set(r.agent_id, r);
  }
  return [...byAgent.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

/**
 * Top `n` findings: contract levels only, by severity (`Severity.options` order),
 * then confidence descending.
 */
export function topFindings<F extends Pick<FindingRecord, "severity" | "confidence">>(
  findings: F[],
  n: number,
): F[] {
  const rank = (f: F) => Severity.options.indexOf(f.severity);
  return findings
    .filter((f) => rank(f) >= 0)
    .sort((a, b) => rank(a) - rank(b) || b.confidence - a.confidence)
    .slice(0, n);
}
