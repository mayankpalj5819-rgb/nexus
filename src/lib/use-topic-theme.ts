"use client";

import * as React from "react";

/**
 * Sets `--topic-color` CSS variable on :root so any child element can
 * reference it via `var(--topic-color)`. Useful for theming the UI to
 * match the topic being viewed (e.g. Physics = blue, Philosophy = purple).
 *
 * Call this in any topic-scoped page with the topic's hex color.
 * Pass null/undefined to clear.
 */
export function useTopicTheme(color: string | null | undefined) {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (color) {
      root.style.setProperty("--topic-color", color);
    } else {
      root.style.removeProperty("--topic-color");
    }
    return () => {
      root.style.removeProperty("--topic-color");
    };
  }, [color]);
}
