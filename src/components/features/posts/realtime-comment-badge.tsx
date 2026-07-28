"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/lib/auth";
import { cn } from "@/lib/utils";

export interface RealtimeCommentBadgeProps {
  /** The post whose comment count we're tracking. */
  postId: string;
  /** Initial count, hydrated from the server render. */
  initialCount: number;
}

/** How long the "new comment" pulse indicator stays active after an INSERT. */
const RECENT_WINDOW_MS = 5_000;

/**
 * RealtimeCommentBadge
 *
 * A compact, glass-styled badge that displays a live-updating comment count
 * for a single post. It subscribes to Supabase Realtime `postgres_changes`
 * events on the `comments` table (filtered by `post_id`) and keeps the
 * displayed count in sync without refetching.
 *
 * Visual feedback:
 *  - The count number pulses (scale + accent background flash) on every change.
 *  - A green "live" dot pulses for 5s after a new comment is inserted.
 *  - The whole badge gets a subtle emerald ring while "recent activity" is true.
 *
 * Subscription is torn down on unmount via `supabase.removeChannel`.
 */
export function RealtimeCommentBadge({ postId, initialCount }: RealtimeCommentBadgeProps) {
  const [count, setCount] = React.useState(initialCount);
  const [isRecent, setIsRecent] = React.useState(false);
  const recentTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Arm the "recent activity" indicator for {@link RECENT_WINDOW_MS}. */
  const flagRecent = React.useCallback(() => {
    setIsRecent(true);
    if (recentTimerRef.current) clearTimeout(recentTimerRef.current);
    recentTimerRef.current = setTimeout(() => {
      setIsRecent(false);
    }, RECENT_WINDOW_MS);
  }, []);

  // Clear any pending "recent" timer when the component unmounts.
  React.useEffect(() => {
    return () => {
      if (recentTimerRef.current) clearTimeout(recentTimerRef.current);
    };
  }, []);

  // ── Supabase Realtime subscription ──────────────────────────────────────
  React.useEffect(() => {
    // `supabase` is null when env vars are missing (e.g. during SSR build).
    // Capture into a local const so the non-null narrowing survives into the
    // cleanup closure below (imported bindings aren't narrowed across closures).
    const client = supabase;
    if (!client) return;

    const channel = client.channel(`realtime-comments-${postId}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        // `payload` type is inferred from the `postgres_changes` overload —
        // no need to import `RealtimePostgresChangesPayload` explicitly.
        (payload) => {
          if (payload.eventType === "INSERT") {
            setCount((c) => c + 1);
            flagRecent();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            // Clamp at 0 — a stray DELETE for a comment we never counted
            // (e.g. before mount) should never show a negative badge.
            setCount((c) => Math.max(0, c - 1));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      client.removeChannel(channel);
    };
  }, [postId, flagRecent]);

  return (
    <motion.div
      className={cn(
        "glass-card inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "text-xs font-medium tabular-nums transition-colors duration-300",
        isRecent
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground"
      )}
      initial={false}
      animate={
        isRecent
          ? { boxShadow: "0 0 0 2px oklch(0.72 0.18 162 / 35%)" }
          : { boxShadow: "0 0 0 0px oklch(0.72 0.18 162 / 0%)" }
      }
      transition={{ duration: 0.4, ease: "easeOut" }}
      aria-label={`${count} ${count === 1 ? "comment" : "comments"}`}
      role="status"
    >
      {/* Green pulse dot — visible for RECENT_WINDOW_MS after a new comment */}
      <AnimatePresence initial={false}>
        {isRecent && (
          <motion.span
            key="recent-dot"
            className="relative flex h-1.5 w-1.5"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </motion.span>
        )}
      </AnimatePresence>

      <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />

      {/* Count number — `key={count}` forces a remount so the scale + accent
          flash replays on every INSERT/DELETE without AnimatePresence juggling. */}
      <motion.span
        key={count}
        className="inline-block min-w-[1ch] rounded px-0.5 text-center"
        initial={{ scale: 1.4, backgroundColor: "oklch(0.72 0.18 162 / 35%)" }}
        animate={{ scale: 1, backgroundColor: "oklch(0.72 0.18 162 / 0%)" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {count}
      </motion.span>
    </motion.div>
  );
}

export default RealtimeCommentBadge;
