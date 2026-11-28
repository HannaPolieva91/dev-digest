import type { CSSProperties } from "react";

export const s = {
  trigger: {
    background: "none",
    border: 0,
    padding: "2px 0",
    margin: 0,
    font: "inherit",
    color: "inherit",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 4,
  } satisfies CSSProperties,
  card: (width: number): CSSProperties => ({
    position: "fixed",
    zIndex: 1000,
    width,
    maxWidth: "calc(100vw - 16px)",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,.35)",
    padding: 12,
    cursor: "default",
  }),
} as const;
