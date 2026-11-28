import { describe, it, expect } from "vitest";
import type { Severity } from "@devdigest/shared";
import { finding, review } from "@/test/fixtures/findings";
import { countBySeverity, latestReviewPerAgent, topFindings, totalCount } from "./findings";

describe("latestReviewPerAgent", () => {
  it("keeps only the newest review of each agent, newest first", () => {
    const out = latestReviewPerAgent([
      review("a-old", "Security", "2026-11-27T10:00:00Z", []),
      review("b-new", "Perf", "2026-11-27T11:00:00Z", []),
      review("a-new", "Security", "2026-11-27T12:00:00Z", []),
      review("b-old", "Perf", "2026-11-27T09:00:00Z", []),
    ]);
    expect(out.map((r) => r.id)).toEqual(["a-new", "b-new"]);
  });

  it("ignores summaries and treats null agent_id as one agent", () => {
    const out = latestReviewPerAgent([
      review("sum", "Security", "2026-11-27T13:00:00Z", [], { kind: "summary" }),
      review("n1", null, "2026-11-27T10:00:00Z", []),
      review("n2", null, "2026-11-27T11:00:00Z", []),
    ]);
    expect(out.map((r) => r.id)).toEqual(["n2"]);
  });
});

describe("topFindings", () => {
  it("sorts by severity, then confidence desc, and limits to n", () => {
    const out = topFindings(
      [
        finding("s", "SUGGESTION", { confidence: 0.99 }),
        finding("w-lo", "WARNING", { confidence: 0.5 }),
        finding("c", "CRITICAL", { confidence: 0.6 }),
        finding("w-hi", "WARNING", { confidence: 0.8 }),
      ],
      3,
    );
    expect(out.map((f) => f.id)).toEqual(["c", "w-hi", "w-lo"]);
  });

  it("drops levels outside the contract", () => {
    expect(topFindings([finding("i", "INFO" as Severity)], 3)).toEqual([]);
  });
});

describe("totalCount", () => {
  it("sums the contract levels", () => {
    expect(
      totalCount(countBySeverity([finding("a", "WARNING"), finding("b", "CRITICAL")])),
    ).toBe(2);
  });
});
