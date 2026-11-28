/**
 * FindingsCell — FINDINGS column of the PR list + its hover/focus preview card.
 * Spec: client/specs/pr-list-findings-column.md.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrMeta } from "@/lib/types";
import type { ReviewRecord } from "@devdigest/shared";
import { finding, review } from "@/test/fixtures/findings";
import messages from "../../../../../../../messages/en/prReview.json";
import { FindingsCell } from "./FindingsCell";

const reviewsState = vi.hoisted(() => ({
  data: undefined as ReviewRecord[] | undefined,
  isLoading: false,
  isError: false,
  calls: [] as unknown[],
}));
vi.mock("@/lib/hooks/reviews", () => ({
  usePrReviews: (prId: string) => {
    reviewsState.calls.push(prId);
    return reviewsState;
  },
}));

beforeEach(() => {
  vi.useFakeTimers();
  reviewsState.data = undefined;
  reviewsState.isLoading = false;
  reviewsState.isError = false;
  reviewsState.calls = [];
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const pr = (findings_counts: PrMeta["findings_counts"]) =>
  ({ id: "pr-1", number: 482, findings_counts }) as PrMeta;

function renderCell(p: PrMeta) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <FindingsCell pr={p} />
    </NextIntlClientProvider>,
  );
}

const trigger = () => screen.getByRole("button", { name: /^Findings:/ });
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("FindingsCell — cell", () => {
  it("shows '—' when the PR was never reviewed (null)", () => {
    renderCell(pr(null));
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a muted 0 and no preview when reviewed with no findings", () => {
    renderCell(pr({ CRITICAL: 0, WARNING: 0, SUGGESTION: 0 }));
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a count per level with findings, in contract order; zero levels hidden", () => {
    const { container } = renderCell(pr({ CRITICAL: 2, WARNING: 0, SUGGESTION: 4 }));
    const levels = [...container.querySelectorAll("[data-level]")].map((el) => [
      el.getAttribute("data-level"),
      el.textContent,
    ]);
    expect(levels).toEqual([
      ["CRITICAL", "2"],
      ["SUGGESTION", "4"],
    ]);
    expect(trigger()).toHaveAccessibleName(
      "Findings: 2 critical, 0 warning, 4 suggestion. Show preview",
    );
  });

  it("does not fetch reviews just by rendering", () => {
    renderCell(pr({ CRITICAL: 1, WARNING: 0, SUGGESTION: 0 }));
    expect(reviewsState.calls).toEqual([]);
  });
});

describe("FindingsCell — preview card", () => {
  const twoAgents = () => [
    review("a-old", "Security", "2026-11-27T09:00:00Z", [finding("old", "CRITICAL")]),
    review("a-new", "Security", "2026-11-27T12:00:00Z", [
      finding("c1", "CRITICAL", {
        title: "Hardcoded Stripe secret key",
        category: "security",
        file: "src/config.ts",
        start_line: 12,
        end_line: 12,
        confidence: 0.98,
        rationale: "\nLine 12 contains a literal sk_live_ key.\nMore detail.",
      }),
      finding("s1", "SUGGESTION", { title: "Extract magic number" }),
    ]),
    review("b-new", "Perf", "2026-11-27T11:00:00Z", [
      finding("w1", "WARNING", { title: "N+1 query", file: "src/users.ts", start_line: 45, end_line: 52 }),
      finding("w2", "WARNING", { title: "Unbounded loop" }),
    ]),
  ];

  it("opens on hover after 150 ms with 'N findings in this run', agents and top 3", () => {
    reviewsState.data = twoAgents();
    renderCell(pr({ CRITICAL: 1, WARNING: 2, SUGGESTION: 1 }));
    fireEvent.mouseEnter(trigger());
    advance(100);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    advance(60);

    const card = screen.getByRole("tooltip");
    expect(trigger()).toHaveAttribute("aria-describedby", card.id);
    expect(card).toHaveTextContent("4 findings in this run");
    expect(card).toHaveTextContent("Security Reviewer · Perf Reviewer");
    // Older review of the same agent is not included.
    expect(card).not.toHaveTextContent("Finding old");
    // Top 3: CRITICAL first, then the two WARNINGs; the SUGGESTION is cut.
    expect(card).toHaveTextContent("Hardcoded Stripe secret key");
    expect(card).toHaveTextContent("src/config.ts:12");
    expect(card).toHaveTextContent("98% conf");
    expect(card).toHaveTextContent("Line 12 contains a literal sk_live_ key.");
    expect(card).not.toHaveTextContent("More detail.");
    expect(card).toHaveTextContent("src/users.ts:45-52");
    expect(card).not.toHaveTextContent("Extract magic number");
    expect(card).toHaveTextContent("+1 more — open the PR");
  });

  it("opens on keyboard focus and closes on Esc", () => {
    reviewsState.data = twoAgents();
    renderCell(pr({ CRITICAL: 1, WARNING: 2, SUGGESTION: 1 }));
    fireEvent.focus(trigger());
    advance(150);
    expect(screen.getByRole("tooltip")).toHaveTextContent("4 findings in this run");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(trigger()).not.toHaveAttribute("aria-describedby");
  });

  it("no '+K more' line when N ≤ 3; singular header", () => {
    reviewsState.data = [review("a", "Security", "2026-11-27T12:00:00Z", [finding("c", "CRITICAL")])];
    renderCell(pr({ CRITICAL: 1, WARNING: 0, SUGGESTION: 0 }));
    fireEvent.mouseEnter(trigger());
    advance(150);
    const card = screen.getByRole("tooltip");
    expect(card).toHaveTextContent("1 finding in this run");
    expect(card).not.toHaveTextContent(/more — open the PR/);
  });

  it("while loading, the header uses the list counts", () => {
    reviewsState.isLoading = true;
    renderCell(pr({ CRITICAL: 2, WARNING: 3, SUGGESTION: 0 }));
    fireEvent.mouseEnter(trigger());
    advance(150);
    expect(screen.getByRole("tooltip")).toHaveTextContent("5 findings in this run");
    expect(screen.getByTestId("findings-preview-loading")).toBeInTheDocument();
    expect(reviewsState.calls).toContain("pr-1");
  });

  it("closes on mouseleave", () => {
    reviewsState.data = twoAgents();
    renderCell(pr({ CRITICAL: 1, WARNING: 2, SUGGESTION: 1 }));
    fireEvent.mouseEnter(trigger());
    advance(150);
    fireEvent.mouseLeave(trigger());
    advance(200);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
