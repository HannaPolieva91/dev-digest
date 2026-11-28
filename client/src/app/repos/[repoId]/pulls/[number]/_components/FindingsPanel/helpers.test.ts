import { describe, it, expect } from "vitest";
import type { FindingRecord, Severity } from "@devdigest/shared";
import { countBySeverity, filterBySeverity } from "./helpers";

function finding(id: string, severity: Severity): FindingRecord {
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
  };
}

const MIXED = [
  finding("a", "WARNING"),
  finding("b", "CRITICAL"),
  finding("c", "WARNING"),
];

describe("countBySeverity", () => {
  it("returns all three contract levels at 0 for an empty list", () => {
    expect(countBySeverity([])).toEqual({ CRITICAL: 0, WARNING: 0, SUGGESTION: 0 });
  });

  it("counts each level", () => {
    expect(countBySeverity(MIXED)).toEqual({ CRITICAL: 1, WARNING: 2, SUGGESTION: 0 });
  });

  it("ignores values outside the contract (e.g. the UI kit's INFO)", () => {
    const counts = countBySeverity([...MIXED, finding("d", "INFO" as Severity)]);
    expect(counts).toEqual({ CRITICAL: 1, WARNING: 2, SUGGESTION: 0 });
    expect(Object.keys(counts)).not.toContain("INFO");
  });
});

describe("filterBySeverity", () => {
  it("returns the input unchanged when no level is selected", () => {
    expect(filterBySeverity(MIXED, null)).toBe(MIXED);
  });

  it("keeps only the selected level, preserving order", () => {
    expect(filterBySeverity(MIXED, "WARNING").map((f) => f.id)).toEqual(["a", "c"]);
  });

  it("returns an empty list for a level with no findings", () => {
    expect(filterBySeverity(MIXED, "SUGGESTION")).toEqual([]);
  });
});
