import type { CSSProperties } from "react";

const ellipsis: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

export const s = {
  root: { display: "flex", flexDirection: "column", gap: 8, fontSize: 12 } satisfies CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
  } satisfies CSSProperties,
  agents: ({ ...ellipsis, color: "var(--text-muted)", marginTop: -4 } as CSSProperties),
  list: { display: "flex", flexDirection: "column", gap: 10 } satisfies CSSProperties,
  item: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0 } satisfies CSSProperties,
  titleRow: { display: "flex", alignItems: "center", gap: 6, minWidth: 0 } satisfies CSSProperties,
  sevIcon: (color: string): CSSProperties => ({ color, flexShrink: 0 }),
  title: ({
    ...ellipsis,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
    minWidth: 0,
  } as CSSProperties),
  category: { color: "var(--text-muted)", flexShrink: 0 } satisfies CSSProperties,
  meta: { display: "flex", gap: 10, color: "var(--text-muted)" } satisfies CSSProperties,
  file: ({ ...ellipsis, color: "var(--accent-text)", minWidth: 0 } as CSSProperties),
  rationale: ({ ...ellipsis, color: "var(--text-secondary)" } as CSSProperties),
  muted: { color: "var(--text-muted)" } satisfies CSSProperties,
} as const;
