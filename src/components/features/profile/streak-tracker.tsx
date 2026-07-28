"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Flame, Trophy, Calendar, Check } from "lucide-react";
import { supabase } from "@/lib/auth";
import { useUIStore } from "@/lib/ui-store";
import { Button } from "@/components/ui/button";
import { formatNumber, clsx } from "@/lib/helpers";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface StreakTrackerProps {
  userId: string;
}

/** Computed streak summary shown to the user. */
interface StreakData {
  /** Consecutive active days ending today (or yesterday, with one day of grace). */
  currentStreak: number;
  /** Longest run of consecutive active days ever recorded. */
  longestStreak: number;
  /** Distinct calendar days with at least one post or comment. */
  totalActiveDays: number;
  /** "YYYY-MM-DD" of the most recent active day, or null if never active. */
  lastActiveDate: string | null;
  /** 7 booleans, Monday-first — true if user was active that day this week. */
  weekActivity: boolean[];
  /** Monday-first index (0–6) of today's cell in the weekly grid. */
  todayIndex: number;
}

// ----------------------------------------------------------------------------
// Constants & day helpers
// ----------------------------------------------------------------------------

/** Single-letter day labels for the compact weekly grid, Monday-first. */
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;

/** Full weekday abbreviations used for the `title` tooltip, Monday-first. */
const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Local-time "YYYY-MM-DD" key — stable for Set/Map lookups. */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Inverse of {@link dayKey} — parse "YYYY-MM-DD" into a local Date at midnight. */
function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Returns a Date clamped to midnight on the Monday of `d`'s week. */
function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const jsDay = date.getDay(); // 0 = Sun .. 6 = Sat
  const mondayOffset = (jsDay + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - mondayOffset);
  return date;
}

// ----------------------------------------------------------------------------
// Streak computation
// ----------------------------------------------------------------------------

interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  lastActiveDate: string | null;
}

/**
 * Pure function — derives all streak stats from a set of active-day keys.
 *
 * "Current streak" walks back from today. If today isn't active yet we grant
 * one day of grace and start from yesterday, so "I haven't posted today" doesn't
 * reset a long streak to zero the moment midnight ticks over. If neither today
 * nor yesterday is active, the streak is broken.
 *
 * "Longest streak" walks the sorted day list counting consecutive-day runs
 * (diff of exactly 1 day) and keeps the max.
 */
function computeStreaks(activeDays: Set<string>, now: Date): StreakSummary {
  if (activeDays.size === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalActiveDays: 0,
      lastActiveDate: null,
    };
  }

  // Sorted ascending — lexicographic order == chronological for YYYY-MM-DD.
  const sorted = [...activeDays].sort();
  const lastActiveDate = sorted[sorted.length - 1] ?? null;

  // ── Current streak ──
  let currentStreak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!activeDays.has(dayKey(cursor))) {
    // Today not active — give one day of grace, start the count from yesterday.
    cursor.setDate(cursor.getDate() - 1);
  }
  while (activeDays.has(dayKey(cursor))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // ── Longest streak ──
  let longestStreak = 1;
  let runLength = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseDayKey(sorted[i - 1]);
    const curr = parseDayKey(sorted[i]);
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) {
      runLength++;
      if (runLength > longestStreak) longestStreak = runLength;
    } else {
      runLength = 1;
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalActiveDays: activeDays.size,
    lastActiveDate,
  };
}

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

interface BadgeProps {
  emoji: string;
  label: string;
}

function CelebrationBadge({ emoji, label }: BadgeProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary whitespace-nowrap"
    >
      <span aria-hidden="true">{emoji}</span>
      {label}
    </motion.span>
  );
}

interface WeeklyGridProps {
  active: boolean[];
  todayIndex: number;
}

function WeeklyGrid({ active, todayIndex }: WeeklyGridProps) {
  return (
    <div className="flex items-center justify-between gap-1">
      {DAY_LETTERS.map((letter, i) => {
        const isActive = active[i] ?? false;
        const isToday = i === todayIndex;
        return (
          <div
            key={i}
            title={`${DAY_ABBR[i]}${isActive ? " — active" : ""}`}
            className={clsx(
              "flex-1 aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors",
              isActive
                ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                : "bg-muted/40 border border-border/40 text-muted-foreground/60",
              isToday && "ring-2 ring-primary/50 ring-offset-0"
            )}
          >
            <span className="text-[9px] font-medium leading-none opacity-80">
              {letter}
            </span>
            {isActive ? (
              <Check className="w-3 h-3" strokeWidth={3} />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SkeletonState() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl shimmer bg-muted/40" />
        <div className="space-y-1.5">
          <div className="h-5 w-16 rounded shimmer bg-muted/40" />
          <div className="h-3 w-12 rounded shimmer bg-muted/40" />
        </div>
      </div>
      <div className="flex justify-between gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 aspect-square rounded-lg shimmer bg-muted/40"
          />
        ))}
      </div>
      <div className="h-3 w-full rounded shimmer bg-muted/40" />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main component
// ----------------------------------------------------------------------------

export function StreakTracker({ userId }: StreakTrackerProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<StreakData | null>(null);
  const setView = useUIStore((s) => s.setView);

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      if (!supabase) {
        if (mounted) {
          setError("Database not configured");
          setLoading(false);
        }
        return;
      }

      try {
        // Pull only the timestamps we need — keeping the payload tiny even for
        // prolific users. A day counts as active if the user posted OR
        // commented that day, so we union the two sets of timestamps.
        const [postsRes, commentsRes] = await Promise.all([
          supabase
            .from("posts")
            .select("created_at")
            .eq("author_id", userId)
            .eq("removed", false),
          supabase
            .from("comments")
            .select("created_at")
            .eq("author_id", userId)
            .eq("removed", false),
        ]);

        if (postsRes.error) throw postsRes.error;
        if (commentsRes.error) throw commentsRes.error;

        const activeDays = new Set<string>();
        for (const row of (postsRes.data ?? []) as { created_at: string }[]) {
          if (row.created_at) activeDays.add(dayKey(new Date(row.created_at)));
        }
        for (const row of (commentsRes.data ?? []) as { created_at: string }[]) {
          if (row.created_at) activeDays.add(dayKey(new Date(row.created_at)));
        }

        const now = new Date();
        const summary = computeStreaks(activeDays, now);

        // Build the weekly grid: Monday → Sunday of the current week. Days
        // later than today show as muted (future), past days reflect actual
        // activity. Today gets a highlight ring so the user can orient.
        const monday = startOfWeek(now);
        const weekActivity: boolean[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          weekActivity.push(activeDays.has(dayKey(d)));
        }
        const todayIndex = (now.getDay() + 6) % 7; // 0 = Monday

        if (!mounted) return;
        setData({ ...summary, weekActivity, todayIndex });
      } catch (e) {
        console.error("[StreakTracker] fetch error:", e);
        if (mounted) setError("Failed to load streak");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [userId]);

  // Format "last active" as a friendly relative string. Kept inline to avoid
  // pulling in extra helpers — the values here are all small integers.
  const lastActiveLabel = React.useMemo(() => {
    if (!data?.lastActiveDate) return null;
    const last = parseDayKey(data.lastActiveDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return "1 week ago";
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return last.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [data?.lastActiveDate]);

  return (
    <section className="glass-card rounded-3xl p-5">
      <header className="flex items-center gap-2 mb-4">
        <Flame className="w-4 h-4 text-orange-500" strokeWidth={2.5} />
        <h3 className="text-sm font-semibold tracking-tight">
          <span aria-hidden="true">🔥 </span>Streak
        </h3>
      </header>

      {loading ? (
        <SkeletonState />
      ) : error ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          {error}
        </div>
      ) : !data ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          No streak data
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Streak hero ── */}
          {data.currentStreak > 0 ? (
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="shrink-0 w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center"
              >
                <Flame
                  className="w-6 h-6 text-orange-500"
                  strokeWidth={2.5}
                  fill="currentColor"
                  fillOpacity={0.2}
                />
              </motion.div>
              <div className="min-w-0">
                <div className="text-3xl font-bold tracking-tight tabular-nums leading-none gradient-text">
                  {formatNumber(data.currentStreak)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {data.currentStreak === 1 ? "day" : "days"}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 py-1">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-muted/40 border border-border/40 flex items-center justify-center">
                  <Flame
                    className="w-6 h-6 text-muted-foreground/60"
                    strokeWidth={2}
                  />
                </div>
                <p className="text-sm font-medium leading-snug">
                  Start your streak today!
                </p>
              </div>
              <Button
                size="sm"
                className="w-full rounded-xl"
                onClick={() => setView({ name: "editor" })}
              >
                New Post
              </Button>
            </div>
          )}

          {/* ── Celebration badges (stack all unlocked tiers) ── */}
          {(data.currentStreak >= 7 ||
            data.currentStreak >= 30 ||
            data.currentStreak >= 100) && (
            <div className="flex flex-wrap gap-1.5">
              {data.currentStreak >= 7 && (
                <CelebrationBadge emoji="🎉" label="Week streak!" />
              )}
              {data.currentStreak >= 30 && (
                <CelebrationBadge emoji="🏆" label="Month streak!" />
              )}
              {data.currentStreak >= 100 && (
                <CelebrationBadge emoji="💯" label="Century!" />
              )}
            </div>
          )}

          {/* ── Weekly grid ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                This week
              </span>
              {lastActiveLabel && (
                <span className="text-[11px] text-muted-foreground">
                  Last: {lastActiveLabel}
                </span>
              )}
            </div>
            <WeeklyGrid active={data.weekActivity} todayIndex={data.todayIndex} />
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 min-w-0">
              <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate">
                Longest:{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {formatNumber(data.longestStreak)}
                </span>{" "}
                days
              </span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate">
                Total:{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {formatNumber(data.totalActiveDays)}
                </span>{" "}
                active
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
