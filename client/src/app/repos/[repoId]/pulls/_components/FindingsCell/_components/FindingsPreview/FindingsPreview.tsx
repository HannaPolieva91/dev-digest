/* FindingsPreview — content of the FINDINGS hover card. Mounted only while the card
   is open, so GET /pulls/:id/reviews is fetched lazily (cache key ["reviews", prId],
   shared with the PR page). Same rule as the server's findings_counts: latest
   review of EACH agent, summed. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon, SEV, Skeleton } from "@devdigest/ui";
import { usePrReviews } from "@/lib/hooks/reviews";
import { countBySeverity, latestReviewPerAgent, topFindings, totalCount } from "@/lib/findings";
import { PREVIEW_LIMIT } from "./constants";
import { firstLine, lineRef } from "./helpers";
import { s } from "./styles";

export function FindingsPreview({ prId, total }: { prId: string; total: number }) {
  const t = useTranslations("prReview");
  const { data, isLoading, isError } = usePrReviews(prId);

  const latest = React.useMemo(() => (data ? latestReviewPerAgent(data) : []), [data]);
  const findings = React.useMemo(() => latest.flatMap((r) => r.findings), [latest]);
  // While loading, N comes from the list payload; once loaded, from the data itself.
  const n = data ? totalCount(countBySeverity(findings)) : total;
  const top = topFindings(findings, PREVIEW_LIMIT);
  const agents = latest.map((r) => r.agent_name || t("list.findings.unknownAgent")).join(" · ");

  return (
    <div style={s.root}>
      <div style={s.header}>
        <Icon.Info size={13} />
        {t("list.findings.header", { count: n })}
      </div>
      {agents && <div style={s.agents}>{agents}</div>}

      {isLoading && (
        <div style={s.list} data-testid="findings-preview-loading">
          {Array.from({ length: Math.min(total, PREVIEW_LIMIT) }, (_, i) => (
            <Skeleton key={i} height={34} />
          ))}
        </div>
      )}
      {isError && <div style={s.muted}>{t("list.findings.error")}</div>}

      {data && (
        <div style={s.list}>
          {top.map((f) => {
            const sev = SEV[f.severity];
            const I = Icon[sev.icon];
            return (
              <div key={f.id} style={s.item}>
                <div style={s.titleRow}>
                  <I size={13} style={s.sevIcon(sev.c)} />
                  <span style={s.title}>{f.title}</span>
                  <span style={s.category}>{f.category}</span>
                </div>
                <div style={s.meta}>
                  <span className="mono" style={s.file}>
                    {lineRef(f)}
                  </span>
                  <span>
                    {t("list.findings.confidence", { pct: Math.round(f.confidence * 100) })}
                  </span>
                </div>
                <div style={s.rationale}>{firstLine(f.rationale)}</div>
              </div>
            );
          })}
          {n > PREVIEW_LIMIT && (
            <div style={s.muted}>{t("list.findings.more", { count: n - PREVIEW_LIMIT })}</div>
          )}
        </div>
      )}
    </div>
  );
}
