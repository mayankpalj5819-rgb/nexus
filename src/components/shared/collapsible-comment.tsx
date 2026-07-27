"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

// ── CollapsibleWrapper ─────────────────────────────────────────────────────

interface CollapsibleWrapperProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  replyCount?: number;
}

/**
 * CollapsibleWrapper — wraps a comment thread with collapse/expand behavior.
 *
 * Expanded state renders a small "collapse thread" toggle above the children.
 * Collapsed state hides the children (unmounted via AnimatePresence) and the
 * toggle becomes a "[N replies]" affordance to expand the thread again —
 * mirroring GitHub's collapsed-thread pattern.
 *
 * The toggle's ChevronDown rotates -90deg while collapsed (points right) and
 * back to 0deg when expanded (points down), giving a clear visual cue.
 */
export function CollapsibleWrapper({
  children,
  defaultCollapsed = false,
  replyCount,
}: CollapsibleWrapperProps) {
  const [collapsed, setCollapsed] = React.useState<boolean>(defaultCollapsed);
  const contentId = React.useId();

  const count = Math.max(0, replyCount ?? 0);
  const replyLabel = count === 1 ? "1 reply" : `${count} replies`;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-controls={contentId}
        className="inline-flex items-center gap-1.5 self-start rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <motion.span
          aria-hidden="true"
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="inline-flex"
        >
          <ChevronDown className="size-3.5" />
        </motion.span>
        <span>{collapsed ? replyLabel : "collapse thread"}</span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="thread-content"
            id={contentId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── CommentSearchBar ───────────────────────────────────────────────────────

interface CommentSearchBarProps {
  value: string;
  onChange: (v: string) => void;
  resultCount: number;
}

/**
 * CommentSearchBar — compact inline search input for filtering comments.
 *
 * Renders the shadcn Input prefixed with a Search icon. When the query is
 * non-empty, a "N matches" pill and an X clear button fade in on the
 * trailing side. Clicking X resets the value via `onChange("")`.
 */
export function CommentSearchBar({
  value,
  onChange,
  resultCount,
}: CommentSearchBarProps) {
  const hasQuery = value.trim().length > 0;
  const matchLabel = resultCount === 1 ? "1 match" : `${resultCount} matches`;

  return (
    <div className="relative flex items-center">
      <Search className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />

      <Input
        type="search"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        placeholder="Search comments…"
        aria-label="Search comments"
        className="h-8 pl-8 pr-20 text-xs"
      />

      <AnimatePresence>
        {hasQuery && (
          <motion.div
            key="search-trailing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute right-1.5 flex items-center gap-0.5"
          >
            <span className="rounded px-1 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {matchLabel}
            </span>
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Clear search"
              className="inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
