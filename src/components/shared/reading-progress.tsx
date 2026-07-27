"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ReadingProgressBar
 *
 * A thin fixed bar pinned to the very top of the viewport that fills as the
 * user scrolls through a long post. Hidden (opacity 0) when the page is at
 * the very top. Updates are throttled with requestAnimationFrame for smooth,
 * jank-free scrolling.
 */
export function ReadingProgressBar() {
  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    let rafId: number | null = null;

    const compute = () => {
      rafId = null;
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      setProgress(pct);
      setVisible(scrollTop > 8);
    };

    const onScroll = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(compute);
      }
    };

    // Set initial state (covers SSR → client mount and fresh navigations).
    compute();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 z-50 pointer-events-none"
      aria-hidden="true"
    >
      <motion.div
        className="h-full origin-left rounded-r-full bg-gradient-to-r from-primary/50 via-primary to-primary shadow-glow"
        initial={false}
        animate={{
          width: `${progress * 100}%`,
          opacity: visible ? 1 : 0,
        }}
        transition={{
          width: { duration: 0.12, ease: "easeOut" },
          opacity: { duration: 0.25, ease: "easeOut" },
        }}
      />
    </div>
  );
}

/**
 * BackToTopButton
 *
 * A floating glassmorphism button that appears after the user scrolls down
 * 500px. Smooth-scrolls to the top of the page on click. Stacks above any
 * existing bottom-right affordances (uses `bottom-20 right-6`).
 */
export function BackToTopButton() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    let rafId: number | null = null;

    const compute = () => {
      rafId = null;
      setVisible(window.scrollY > 500);
    };

    const onScroll = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(compute);
      }
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const scrollToTop = React.useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="back-to-top"
          type="button"
          aria-label="Back to top"
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.6, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className={cn(
            "fixed bottom-20 right-6 z-40",
            "flex items-center justify-center",
            "w-11 h-11 rounded-full",
            "glass-strong shadow-soft",
            "text-foreground/80 hover:text-primary",
            "transition-colors duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          <ArrowUp className="w-5 h-5" strokeWidth={2.25} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
