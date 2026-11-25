/**
 * RunCostBadge (M1) — compact "$0.014" / full "9,119 tok · $0.0013";
 * missing data is "—", never "$0.00".
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import common from "../../../messages/en/common.json";
import { formatUsd, formatTokenTotal } from "@/lib/format-cost";
import { RunCostBadge, type RunCostBadgeProps } from "./RunCostBadge";

afterEach(cleanup);

function renderBadge(props: RunCostBadgeProps) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ common }}>
      <RunCostBadge {...props} />
    </NextIntlClientProvider>,
  );
}

describe("formatUsd", () => {
  it.each([
    [0.014, "$0.014"],
    [0.06, "$0.060"],
    [0.0013, "$0.0013"],
    [0.00012, "$0.00012"],
    [1.234, "$1.23"],
    [0, "$0.00"],
    [1e-9, "<$0.000001"],
    // bracket edges: decided on the rounded value, no stray trailing zero
    [0.9996, "$1.00"],
    [0.00999, "$0.010"],
    [0.009996, "$0.010"],
    [0.000999, "$0.0010"],
  ])("%s → %s", (usd, out) => {
    expect(formatUsd(usd)).toBe(out);
  });

  it("null / undefined / NaN → '—'", () => {
    expect(formatUsd(null)).toBe("—");
    expect(formatUsd(undefined)).toBe("—");
    expect(formatUsd(Number.NaN)).toBe("—");
    expect(formatUsd(-0.002)).toBe("—");
  });
});

describe("formatTokenTotal", () => {
  it("sums in + out with a thousands separator", () => {
    expect(formatTokenTotal(8000, 1119)).toBe("9,119");
    expect(formatTokenTotal(null, 950)).toBe("950");
  });
});

describe("RunCostBadge", () => {
  it("compact renders just the cost", () => {
    renderBadge({ variant: "compact", costUsd: 0.012 });
    expect(screen.getByText("$0.012")).toBeInTheDocument();
  });

  it("compact without cost renders '—'", () => {
    renderBadge({ variant: "compact", costUsd: null });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("full renders tokens · cost", () => {
    renderBadge({ variant: "full", costUsd: 0.0013, tokensIn: 8000, tokensOut: 1119 });
    expect(screen.getByText("9,119 tok · $0.0013")).toBeInTheDocument();
  });

  it("full with tokens but unknown cost keeps tokens, cost is '—'", () => {
    renderBadge({ variant: "full", costUsd: null, tokensIn: 100, tokensOut: 50 });
    expect(screen.getByText("150 tok · —")).toBeInTheDocument();
  });

  it("full with no data at all renders a bare '—'", () => {
    renderBadge({ variant: "full", costUsd: null, tokensIn: 0, tokensOut: 0 });
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText(/\$0\.00/)).not.toBeInTheDocument();
  });
});
