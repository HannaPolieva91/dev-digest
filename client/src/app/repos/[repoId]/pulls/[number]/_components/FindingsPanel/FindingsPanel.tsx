/* FindingsPanel — severity counters/filter + hide-low-confidence + j/k navigation +
   FindingCard list, wiring the accept/dismiss action hook (A2).
   Spec: client/specs/severity-counters.md */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Toggle, EmptyState, Icon, SEV } from "@devdigest/ui";
import type { FindingRecord } from "@devdigest/shared";
import { Severity } from "@devdigest/shared/contracts/findings"; // runtime value — see helpers.ts
import { FindingCard } from "../FindingCard";
import { useFindingAction } from "../../../../../../../lib/hooks/reviews";
import { KEY_TO_ACTION } from "./constants";
import { countBySeverity, filterBySeverity, visibleFindings } from "./helpers";
import { s } from "./styles";

export function FindingsPanel({
  findings,
  prId,
  repoFullName,
  headSha,
}: {
  findings: FindingRecord[];
  prId: string;
  repoFullName?: string | null;
  headSha?: string | null;
}) {
  const t = useTranslations("prReview");
  const action = useFindingAction();
  const [hideLow, setHideLow] = React.useState(false);
  const [severity, setSeverity] = React.useState<Severity | null>(null);
  const [focusIdx, setFocusIdx] = React.useState(0);

  // Counts follow the confidence filter but not the severity filter, so clicking
  // "N LEVEL" always shows exactly N cards.
  const confident = React.useMemo(() => visibleFindings(findings, hideLow), [findings, hideLow]);
  const counts = React.useMemo(() => countBySeverity(confident), [confident]);
  const shown = React.useMemo(() => filterBySeverity(confident, severity), [confident, severity]);

  const toggleSeverity = (level: Severity) => {
    setSeverity((cur) => (cur === level ? null : level));
    setFocusIdx(0);
  };

  // j/k navigation + a/d shortcuts on the focused finding (keyboard).
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "j") setFocusIdx((i) => Math.min(i + 1, shown.length - 1));
      else if (e.key === "k") setFocusIdx((i) => Math.max(i - 1, 0));
      else if (KEY_TO_ACTION[e.key] && shown[focusIdx]) {
        action.mutate({ findingId: shown[focusIdx]!.id, action: KEY_TO_ACTION[e.key]!, prId });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shown, focusIdx, action, prId]);

  return (
    <div>
      <div style={s.toolbar}>
        <div role="group" aria-label={t("panel.severity.groupLabel")} style={s.counters}>
          {Severity.options.map((level, i) => {
            const I = Icon[SEV[level].icon];
            const active = severity === level;
            return (
              <React.Fragment key={level}>
                {i > 0 && (
                  <span aria-hidden="true" style={s.separator}>
                    ·
                  </span>
                )}
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSeverity(level)}
                  style={s.counter(level, active ? "active" : severity ? "muted" : "idle")}
                >
                  <I size={12.5} aria-hidden="true" />
                  {t("panel.severity.counter", {
                    count: counts[level],
                    label: t(`panel.severity.${level}`),
                  })}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div style={s.toggleGroup}>
          {t("panel.hideLowConfidence")}
          <Toggle on={hideLow} onChange={setHideLow} size={16} />
        </div>
      </div>

      <div style={s.list}>
        {shown.length === 0 ? (
          <EmptyState icon="Filter" title={t("panel.noMatchTitle")} body={t("panel.noMatchBody")} />
        ) : (
          shown.map((f, i) => (
            <FindingCard
              key={f.id}
              f={f}
              focused={i === focusIdx}
              defaultExpanded={i === 0}
              pending={action.isPending}
              repoFullName={repoFullName}
              headSha={headSha}
              onAction={(act) => action.mutate({ findingId: f.id, action: act, prId })}
            />
          ))
        )}
      </div>
    </div>
  );
}
