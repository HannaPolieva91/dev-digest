/* RunCostBadge — cost (and tokens) of an agent review run, as plain mono text
   that inherits size/colour from its container. Spec: client/specs/m1-cost-badge.md
     compact → "$0.014"               (PR list COST column, run drawer COST tile)
     full    → "9,119 tok · $0.0013"  (Agent runs timeline card)
   Missing data → "—", never "$0.00". */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { NO_DATA, formatTokenTotal, formatUsd } from "@/lib/format-cost";

export type RunCostBadgeProps = {
  costUsd: number | null | undefined;
  tokensIn?: number | null;
  tokensOut?: number | null;
  variant: "compact" | "full";
};

export function RunCostBadge({ variant, ...rest }: RunCostBadgeProps) {
  return variant === "compact" ? <CompactCost costUsd={rest.costUsd} /> : <FullCost {...rest} />;
}

// Compact needs no translations, so it renders under any intl namespace setup.
function CompactCost({ costUsd }: { costUsd: number | null | undefined }) {
  return <span className="mono tnum">{formatUsd(costUsd)}</span>;
}

function FullCost({ costUsd, tokensIn, tokensOut }: Omit<RunCostBadgeProps, "variant">) {
  const t = useTranslations("common");
  const hasTokens = (tokensIn ?? 0) + (tokensOut ?? 0) > 0;
  if (!hasTokens && costUsd == null) return <span className="mono">{NO_DATA}</span>;
  const cost = formatUsd(costUsd);
  return (
    <span className="mono tnum">
      {hasTokens
        ? `${t("costBadge.tokens", { count: formatTokenTotal(tokensIn, tokensOut) })} · ${cost}`
        : cost}
    </span>
  );
}
