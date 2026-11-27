import type { CSSProperties } from "react";

export const s = {
  muted: { color: "var(--text-muted)", fontSize: 13 } satisfies CSSProperties,
  levels: { display: "inline-flex", alignItems: "center", gap: 10 } satisfies CSSProperties,
  level: (color: string): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    color,
    fontSize: 13,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
  }),
} as const;
