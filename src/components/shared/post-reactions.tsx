"use client";

import * as React from "react";
import { useAuth, supabase } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Smile } from "lucide-react";
import { clsx, formatNumber } from "@/lib/helpers";
import { toast } from "sonner";

// ── Reaction catalog ──────────────────────────────────────────────────────
const REACTIONS = ["👍", "👎", "❤️", "🎉", "😄", "🤔"] as const;
type ReactionEmoji = (typeof REACTIONS)[number];

interface PostReactionsProps {
  postId: string;
}

// Shape returned by supabase for `post_reactions` selects.
interface ReactionRow {
  emoji: string;
  user_id: string;
}

/**
 * PostReactions — GitHub-style emoji reaction picker for a post.
 *
 * Renders a compact "React" trigger in the post action bar. On hover or
 * click, a glass-card pill floats above the trigger with 6 emoji buttons,
 * each showing its live count. Clicking an emoji toggles the current
 * user's reaction (a user may react with multiple emojis).
 *
 * Reactions are stored in the `post_reactions` table:
 *   (post_id uuid, user_id uuid, emoji text, created_at timestamptz)
 *   PRIMARY KEY (post_id, user_id, emoji)
 */
export function PostReactions({ postId }: PostReactionsProps) {
  const { user } = useAuth();

  // emoji → total count for this post
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  // set of emojis the current user has reacted with
  const [mine, setMine] = React.useState<Set<string>>(new Set());
  // picker visibility
  const [open, setOpen] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch all reactions for this post + which ones are mine ──────────────
  React.useEffect(() => {
    let cancelled = false;
    if (!supabase) return;

    (async () => {
      const { data, error } = await supabase
        .from("post_reactions")
        .select("emoji, user_id")
        .eq("post_id", postId);
      if (cancelled || error || !data) return;

      const rows = data as ReactionRow[];
      const nextCounts: Record<string, number> = {};
      const nextMine = new Set<string>();
      const myId = user?.id;
      for (const r of rows) {
        nextCounts[r.emoji] = (nextCounts[r.emoji] ?? 0) + 1;
        if (myId && r.user_id === myId) nextMine.add(r.emoji);
      }
      setCounts(nextCounts);
      setMine(nextMine);
    })();

    return () => {
      cancelled = true;
    };
  }, [postId, user?.id]);

  // ── Close on outside click ───────────────────────────────────────────────
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // ── Cleanup hover-close timer on unmount ─────────────────────────────────
  React.useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const openPicker = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  };

  // ── Toggle a reaction (optimistic) ───────────────────────────────────────
  const toggleReaction = async (emoji: ReactionEmoji) => {
    if (!user) {
      toast.error("Sign in to react");
      return;
    }
    if (!supabase) return;

    const had = mine.has(emoji);
    const prevCounts = counts;
    const prevMine = mine;

    // Apply optimistic update
    const nextMine = new Set(mine);
    const nextCounts = { ...counts };
    if (had) {
      nextMine.delete(emoji);
      const c = (nextCounts[emoji] ?? 0) - 1;
      if (c <= 0) delete nextCounts[emoji];
      else nextCounts[emoji] = c;
    } else {
      nextMine.add(emoji);
      nextCounts[emoji] = (nextCounts[emoji] ?? 0) + 1;
    }
    setCounts(nextCounts);
    setMine(nextMine);

    try {
      if (had) {
        const { error } = await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .eq("emoji", emoji);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_reactions")
          .insert({ post_id: postId, user_id: user.id, emoji });
        if (error) throw error;
      }
    } catch (e) {
      console.error("[post-reactions] toggle failed:", e);
      setCounts(prevCounts);
      setMine(prevMine);
      toast.error("Reaction failed");
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={openPicker}
      onMouseLeave={scheduleClose}
    >
      {/* Trigger — matches the ActionButton styling from post-card.tsx */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors",
          open
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Smile className="w-4 h-4" />
        <span className="text-xs font-medium">React</span>
        {total > 0 && (
          <span className="text-xs font-semibold tabular-nums">
            {formatNumber(total)}
          </span>
        )}
      </button>

      {/* Picker pill — floats above the trigger */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Reaction picker"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full mb-2 left-0 z-30 glass-card rounded-full px-1.5 py-1 flex items-center gap-0.5"
          >
            {REACTIONS.map((emoji) => {
              const count = counts[emoji] ?? 0;
              const active = mine.has(emoji);
              return (
                <motion.button
                  key={emoji}
                  type="button"
                  whileTap={{ scale: 0.8 }}
                  whileHover={{ scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  onClick={() => toggleReaction(emoji)}
                  className={clsx(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full transition-colors",
                    active
                      ? "bg-primary/15 text-primary"
                      : "hover:bg-accent text-foreground"
                  )}
                  aria-pressed={active}
                  aria-label={`React with ${emoji}`}
                >
                  <span className="text-base leading-none">{emoji}</span>
                  {count > 0 && (
                    <span className="text-xs font-semibold tabular-nums">
                      {formatNumber(count)}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Fetch aggregated reaction counts for a post.
 *
 * Returns a map of emoji → count. Runs no client-side state — safe to call
 * from server components or data loaders.
 */
export async function getPostReactions(
  postId: string
): Promise<Record<string, number>> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("post_reactions")
    .select("emoji")
    .eq("post_id", postId);
  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data as { emoji: string }[]) {
    counts[row.emoji] = (counts[row.emoji] ?? 0) + 1;
  }
  return counts;
}
