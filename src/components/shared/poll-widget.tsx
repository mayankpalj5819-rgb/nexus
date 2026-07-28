"use client";

import * as React from "react";
import { useAuth, supabase } from "@/lib/auth";
import { motion } from "framer-motion";
import { BarChart3, Check } from "lucide-react";
import { clsx, formatNumber } from "@/lib/helpers";
import { toast } from "sonner";

interface PollWidgetProps {
  postId: string;
}

// Shape returned by supabase for the `polls` table select.
interface PollRow {
  id: string;
  question: string;
  options: string[];
  created_at: string;
}

// Shape returned by supabase for the `poll_votes` table select.
interface VoteRow {
  option_index: number;
  user_id: string;
}

/**
 * PollWidget — inline poll embedded in a post detail page.
 *
 * Fetches the poll attached to `postId` from the `polls` table. If no poll
 * exists for this post, renders nothing (returns null).
 *
 * Voting flow:
 *   - Authenticated user clicks an option → optimistic insert into
 *     `poll_votes` (poll_id, user_id, option_index) → refetch for accurate
 *     counts.
 *   - Unauthenticated click → toast prompt to sign in.
 *
 * Once the user has voted (or after a successful optimistic update), options
 * become read-only result bars with animated width fills (framer-motion) and
 * percentage + count labels. The user's own choice is highlighted with a
 * primary border and a Check icon.
 *
 * Schema:
 *   polls:        id uuid PK, post_id uuid, question text,
 *                 options jsonb (string[]), created_at timestamptz
 *   poll_votes:   poll_id uuid, user_id uuid, option_index int, created_at
 *                 timestamptz — PK (poll_id, user_id)
 */
export function PollWidget({ postId }: PollWidgetProps) {
  const { user } = useAuth();

  const [poll, setPoll] = React.useState<PollRow | null>(null);
  const [voteCounts, setVoteCounts] = React.useState<number[]>([]);
  const [userVote, setUserVote] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [voting, setVoting] = React.useState(false);

  // ── Fetch poll + all votes for this post ──────────────────────────────────
  const fetchPoll = React.useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 1. Look up the poll row for this post (at most one).
    const { data: pollData, error: pollErr } = await supabase
      .from("polls")
      .select("id, question, options, created_at")
      .eq("post_id", postId)
      .maybeSingle();

    if (pollErr) {
      console.error("[poll-widget] fetch poll error:", pollErr);
      setLoading(false);
      return;
    }

    if (!pollData) {
      // No poll for this post — render nothing.
      setPoll(null);
      setLoading(false);
      return;
    }

    const row = pollData as PollRow;

    // 2. Pull every vote for this poll so we can compute per-option counts
    //    and detect the current user's choice in one round-trip.
    const { data: voteData, error: voteErr } = await supabase
      .from("poll_votes")
      .select("option_index, user_id")
      .eq("poll_id", row.id);

    if (voteErr) {
      console.error("[poll-widget] fetch votes error:", voteErr);
      // Preserve any existing optimistic state on refetch failure; only the
      // poll row is updated so the widget still renders.
      setPoll(row);
      setLoading(false);
      return;
    }

    const votes = (voteData ?? []) as VoteRow[];
    const counts = new Array<number>(row.options.length).fill(0);
    let myVote: number | null = null;
    const myId = user?.id;
    for (const v of votes) {
      if (v.option_index >= 0 && v.option_index < counts.length) {
        counts[v.option_index]++;
      }
      if (myId && v.user_id === myId) {
        myVote = v.option_index;
      }
    }

    setPoll(row);
    setVoteCounts(counts);
    setUserVote(myVote);
    setLoading(false);
  }, [postId, user?.id]);

  React.useEffect(() => {
    void fetchPoll();
  }, [fetchPoll]);

  // ── Vote on an option (optimistic) ─────────────────────────────────────────
  const handleVote = async (optionIndex: number) => {
    if (!user) {
      toast.error("Sign in to vote");
      return;
    }
    if (!supabase || !poll || userVote !== null || voting) return;

    const prevCounts = voteCounts;
    const prevUserVote = userVote;

    // Apply optimistic update so the user sees their vote immediately.
    const nextCounts = [...voteCounts];
    if (optionIndex >= 0 && optionIndex < nextCounts.length) {
      nextCounts[optionIndex]++;
    }
    setVoteCounts(nextCounts);
    setUserVote(optionIndex);
    setVoting(true);

    try {
      const { error } = await supabase.from("poll_votes").insert({
        poll_id: poll.id,
        user_id: user.id,
        option_index: optionIndex,
      });
      if (error) throw error;
      // Refetch to sync server-side counts (other votes may have arrived).
      void fetchPoll();
    } catch (e) {
      console.error("[poll-widget] vote failed:", e);
      setVoteCounts(prevCounts);
      setUserVote(prevUserVote);
      toast.error("Vote failed");
    } finally {
      setVoting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  // While loading or when there is no poll for this post, render nothing so
  // the parent layout doesn't reserve empty space.
  if (loading || !poll) return null;

  const total = voteCounts.reduce((a, b) => a + b, 0);
  const hasVoted = userVote !== null;

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Poll
        </span>
      </div>

      {/* Question */}
      <h3 className="text-base font-semibold mb-3 leading-snug">
        {poll.question}
      </h3>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((option, i) => {
          const count = voteCounts[i] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          const isMine = userVote === i;
          const clickable = !hasVoted && !voting;

          return (
            <motion.button
              key={`${i}-${option}`}
              type="button"
              whileTap={clickable ? { scale: 0.99 } : undefined}
              onClick={clickable ? () => handleVote(i) : undefined}
              disabled={!clickable}
              aria-pressed={isMine}
              className={clsx(
                "w-full relative overflow-hidden text-left px-3 py-2.5 rounded-xl border transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isMine
                  ? "border-primary/60 bg-primary/5"
                  : "border-border bg-card/40",
                clickable &&
                  "hover:bg-accent hover:border-primary/40 cursor-pointer",
                !clickable && "cursor-default"
              )}
            >
              {/* Animated bar fill — mounts only when results are visible so
                  its `initial` width: 0 plays the width transition once. */}
              {hasVoted && (
                <motion.div
                  className={clsx(
                    "absolute inset-y-0 left-0",
                    isMine ? "bg-primary/15" : "bg-muted-foreground/10"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  aria-hidden
                />
              )}

              {/* Content layer sits above the bar fill. */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium">
                  {isMine && (
                    <Check className="shrink-0 w-3.5 h-3.5 text-primary" />
                  )}
                  <span className="min-w-0 break-words">{option}</span>
                </span>
                {hasVoted && (
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {pct.toFixed(0)}% · {formatNumber(count)}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Total vote count */}
      <div className="mt-3 text-xs text-muted-foreground">
        {formatNumber(total)} {total === 1 ? "vote" : "votes"}
      </div>
    </div>
  );
}
