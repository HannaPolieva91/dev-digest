import type { CSSProperties } from "react";

export const CARD_WIDTH = 380;
export const CARD_GAP = 6;
export const VIEWPORT_MARGIN = 8;

/**
 * Fixed-position coordinates for the card: below the trigger, left-aligned with it,
 * clamped to the viewport horizontally; flips above when the lower half is smaller.
 */
export function place(
  r: Pick<DOMRect, "top" | "bottom" | "left">,
  o: { width: number; gap: number; margin: number; vw: number; vh: number },
): CSSProperties {
  const left = Math.max(o.margin, Math.min(r.left, o.vw - o.width - o.margin));
  const spaceBelow = o.vh - r.bottom;
  return spaceBelow >= r.top
    ? { left, top: r.bottom + o.gap }
    : { left, bottom: o.vh - r.top + o.gap };
}
