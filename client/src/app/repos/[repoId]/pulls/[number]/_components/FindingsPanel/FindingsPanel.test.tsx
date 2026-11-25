import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { FindingRecord } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/prReview.json";

const mutate = vi.fn();
vi.mock("../../../../../../../lib/hooks/reviews", () => ({
  useFindingAction: () => ({ mutate, isPending: false }),
}));

import { FindingsPanel } from "./FindingsPanel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mutate.mockClear();
});

function finding(over: Partial<FindingRecord> & Pick<FindingRecord, "id" | "severity" | "title" | "confidence">): FindingRecord {
  return {
    category: "bug",
    file: "src/a.ts",
    start_line: 1,
    end_line: 1,
    rationale: "Rationale.",
    suggestion: null,
    kind: "finding",
    trifecta_components: null,
    evidence: null,
    review_id: "r1",
    accepted_at: null,
    dismissed_at: null,
    ...over,
  };
}

const FINDINGS: FindingRecord[] = [
  finding({ id: "f1", severity: "CRITICAL", category: "security", title: "Hardcoded secret", confidence: 0.95 }),
  finding({ id: "f2", severity: "WARNING", title: "N+1 query", confidence: 0.86 }),
  finding({ id: "f3", severity: "WARNING", title: "Flaky retry", confidence: 0.4 }),
];

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const counter = (name: string) => screen.getByRole("button", { name });
const pressed = () =>
  screen.getAllByRole("button").filter((b) => b.getAttribute("aria-pressed") === "true");

describe("FindingsPanel (smoke)", () => {
  it("renders the toolbar + a finding card", () => {
    renderWithIntl(<FindingsPanel findings={FINDINGS} prId="pr1" />);
    expect(screen.getByText("Hide low confidence")).toBeInTheDocument();
    expect(screen.getByText("Hardcoded secret")).toBeInTheDocument();
  });

  it("shows the empty state and zeroed counters when the run has no findings", () => {
    renderWithIntl(<FindingsPanel findings={[]} prId="pr1" />);
    expect(screen.getByText("No findings match")).toBeInTheDocument();
    expect(counter("0 CRITICAL")).toBeInTheDocument();
    expect(counter("0 WARNING")).toBeInTheDocument();
    expect(counter("0 SUGGESTION")).toBeInTheDocument();
  });
});

describe("FindingsPanel severity counters", () => {
  it("shows a count for every contract level, none pressed", () => {
    renderWithIntl(<FindingsPanel findings={FINDINGS} prId="pr1" />);
    for (const name of ["1 CRITICAL", "2 WARNING", "0 SUGGESTION"]) {
      expect(counter(name)).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("filters the list to the clicked level", () => {
    renderWithIntl(<FindingsPanel findings={FINDINGS} prId="pr1" />);
    fireEvent.click(counter("2 WARNING"));
    expect(screen.getByText("N+1 query")).toBeInTheDocument();
    expect(screen.getByText("Flaky retry")).toBeInTheDocument();
    expect(screen.queryByText("Hardcoded secret")).not.toBeInTheDocument();
    expect(counter("2 WARNING")).toHaveAttribute("aria-pressed", "true");
    expect(counter("1 CRITICAL")).toHaveAttribute("aria-pressed", "false");
  });

  it("clears the filter on a second click of the active level", () => {
    renderWithIntl(<FindingsPanel findings={FINDINGS} prId="pr1" />);
    fireEvent.click(counter("2 WARNING"));
    fireEvent.click(counter("2 WARNING"));
    for (const title of ["Hardcoded secret", "N+1 query", "Flaky retry"]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(pressed()).toHaveLength(0);
  });

  it("keeps one level active at a time", () => {
    renderWithIntl(<FindingsPanel findings={FINDINGS} prId="pr1" />);
    fireEvent.click(counter("1 CRITICAL"));
    fireEvent.click(counter("2 WARNING"));
    expect(screen.queryByText("Hardcoded secret")).not.toBeInTheDocument();
    expect(screen.getByText("N+1 query")).toBeInTheDocument();
    expect(pressed()).toEqual([counter("2 WARNING")]);
  });

  it("counts and filters after Hide low confidence (both conditions apply)", () => {
    renderWithIntl(<FindingsPanel findings={FINDINGS} prId="pr1" />);
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(counter("1 WARNING"));
    expect(screen.getByText("N+1 query")).toBeInTheDocument();
    expect(screen.queryByText("Flaky retry")).not.toBeInTheDocument();
    expect(screen.queryByText("Hardcoded secret")).not.toBeInTheDocument();
  });

  it("shows the empty state for a zero level and keeps all three counters", () => {
    renderWithIntl(<FindingsPanel findings={FINDINGS} prId="pr1" />);
    fireEvent.click(counter("0 SUGGESTION"));
    expect(screen.getByText("No findings match")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Filter by severity" }).querySelectorAll("button")).toHaveLength(3);
  });

  it("makes no request and runs no action on click", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderWithIntl(<FindingsPanel findings={FINDINGS} prId="pr1" />);
    fireEvent.click(counter("1 CRITICAL"));
    fireEvent.click(counter("1 CRITICAL"));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });
});
