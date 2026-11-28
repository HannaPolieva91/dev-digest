import type { CSSProperties } from "react";
import { SEV } from "@devdigest/ui";
import type { Severity } from "@devdigest/shared";

/** idle = no severity filter; active = this level selected; muted = another level selected. */
export type CounterState = "idle" | "active" | "muted";

/** Severity counter chip — metrics mirror SeverityBadge; colors from SEV. */
function counter(level: Severity, state: CounterState): CSSProperties {
  const sev = SEV[level];
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 9px",
    borderRadius: 5,
    font: "inherit",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.04em",
    color: sev.c,
    background: state === "muted" ? "transparent" : sev.bg,
    border: `1px solid ${state === "active" ? sev.c : "transparent"}`,
    opacity: state === "muted" ? 0.45 : 1,
    cursor: "pointer",
    transition: "opacity .15s, background .15s, border-color .15s",
  };
}

/** Co-located styles for FindingsPanel (extracted from inline styles). */
export const s = {
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  } satisfies CSSProperties,
  divider: {
    width: 1,
    height: 18,
    background: "var(--border)",
    margin: "0 2px",
  } satisfies CSSProperties,
  toggleGroup: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "var(--text-secondary)",
  } satisfies CSSProperties,
  list: { display: "flex", flexDirection: "column", gap: 12 } satisfies CSSProperties,
  counters: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  } satisfies CSSProperties,
  separator: { color: "var(--text-muted)", fontSize: 12 } satisfies CSSProperties,
  counter,
} as const;
