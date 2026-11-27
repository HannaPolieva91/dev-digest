/* HoverCard — small accessible hover/focus preview. No popover primitive exists in
   @devdigest/ui (vendored, left untouched), so this is the minimal one we need:
   - opens `openDelay` ms after mouseenter OR keyboard focus on the trigger button;
   - closes on mouseleave / blur (short grace so the pointer can move into the card)
     and immediately on Esc, scroll or resize;
   - content is rendered only while open (so lazy data fetching starts on open), in a
     portal on document.body with fixed positioning, so table/card overflow can't clip it;
   - trigger gets aria-describedby → the role="tooltip" panel while open. */
"use client";

import React from "react";
import { createPortal } from "react-dom";
import { CARD_GAP, CARD_WIDTH, VIEWPORT_MARGIN, place } from "./helpers";
import { s } from "./styles";

export interface HoverCardProps {
  /** Visible trigger content (rendered inside a <button type="button">). */
  trigger: React.ReactNode;
  /** Accessible name for the trigger button. */
  label: string;
  /** Card content; mounted only while open. */
  children: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
  width?: number;
}

export function HoverCard({
  trigger,
  label,
  children,
  openDelay = 150,
  closeDelay = 120,
  width = CARD_WIDTH,
}: HoverCardProps) {
  const id = React.useId();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pos, setPos] = React.useState<React.CSSProperties | null>(null);
  const open = pos != null;

  const clear = () => clearTimeout(timer.current);
  const closeNow = React.useCallback(() => {
    clearTimeout(timer.current);
    setPos(null);
  }, []);
  const scheduleOpen = () => {
    clear();
    timer.current = setTimeout(() => {
      const el = triggerRef.current;
      if (!el) return;
      setPos(
        place(el.getBoundingClientRect(), {
          width,
          gap: CARD_GAP,
          margin: VIEWPORT_MARGIN,
          vw: window.innerWidth,
          vh: window.innerHeight,
        }),
      );
    }, openDelay);
  };
  const scheduleClose = () => {
    clear();
    timer.current = setTimeout(() => setPos(null), closeDelay);
  };

  React.useEffect(() => clear, []);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNow();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", closeNow, true);
    window.addEventListener("resize", closeNow);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", closeNow, true);
      window.removeEventListener("resize", closeNow);
    };
  }, [open, closeNow]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={scheduleOpen}
        onBlur={scheduleClose}
        style={s.trigger}
      >
        {trigger}
      </button>
      {open &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            onMouseEnter={clear}
            onMouseLeave={scheduleClose}
            style={{ ...s.card(width), ...pos }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
