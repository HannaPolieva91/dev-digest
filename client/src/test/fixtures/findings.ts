/* Test fixtures for FindingRecord / ReviewRecord. */
import type { FindingRecord, ReviewRecord, Severity } from "@devdigest/shared";

export function finding(id: string, severity: Severity, o: Partial<FindingRecord> = {}): FindingRecord {
  return {
    id,
    severity,
    category: "bug",
    title: `Finding ${id}`,
    file: "src/a.ts",
    start_line: 1,
    end_line: 1,
    rationale: "",
    suggestion: null,
    confidence: 0.9,
    kind: "finding",
    trifecta_components: null,
    evidence: null,
    review_id: "r1",
    accepted_at: null,
    dismissed_at: null,
    ...o,
  };
}

export function review(
  id: string,
  agent: string | null,
  createdAt: string,
  findings: FindingRecord[],
  o: Partial<ReviewRecord> = {},
): ReviewRecord {
  return {
    id,
    pr_id: "pr-1",
    agent_id: agent,
    run_id: null,
    agent_name: agent ? `${agent} Reviewer` : null,
    kind: "review",
    verdict: null,
    summary: null,
    score: 50,
    model: null,
    grounding: null,
    created_at: createdAt,
    findings,
    ...o,
  };
}
