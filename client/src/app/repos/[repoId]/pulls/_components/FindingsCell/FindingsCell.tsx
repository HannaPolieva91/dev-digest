/* FindingsCell — FINDINGS column of the PR list: SEV icon + count per level with
   count > 0 (zero levels hidden), "—" when never reviewed, muted "0" when reviewed
   with nothing found. Hover/focus opens a lazy preview of the top findings.
   Spec: client/specs/pr-list-findings-column.md. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon, SEV } from "@devdigest/ui";
// Runtime value: import the contract file directly (barrel breaks the Next build).
import { Severity } from "@devdigest/shared/contracts/findings";
import type { PrMeta } from "@/lib/types";
import { HoverCard } from "@/components/hover-card";
import { totalCount } from "@/lib/findings";
import { FindingsPreview } from "./_components/FindingsPreview";
import { s } from "./styles";

export function FindingsCell({ pr }: { pr: PrMeta }) {
  const t = useTranslations("prReview");
  const counts = pr.findings_counts;
  if (counts == null) return <span style={s.muted}>—</span>;

  const total = totalCount(counts);
  if (total === 0)
    return (
      <span style={s.muted} title={t("list.findings.none")}>
        0
      </span>
    );

  const icons = (
    <span style={s.levels} aria-hidden>
      {Severity.options
        .filter((level) => counts[level] > 0)
        .map((level) => {
          const I = Icon[SEV[level].icon];
          return (
            <span key={level} data-level={level} style={s.level(SEV[level].c)}>
              <I size={13} />
              {counts[level]}
            </span>
          );
        })}
    </span>
  );
  if (!pr.id) return icons;

  return (
    <HoverCard
      label={t("list.findings.label", {
        critical: counts.CRITICAL,
        warning: counts.WARNING,
        suggestion: counts.SUGGESTION,
      })}
      trigger={icons}
    >
      <FindingsPreview prId={pr.id} total={total} />
    </HoverCard>
  );
}
