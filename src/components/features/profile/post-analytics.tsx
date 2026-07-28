"use client";

import * as React from "react";
import { motion, type Variants } from "framer-motion";
import {
  TrendingUp,
  Eye,
  ArrowBigUp,
  MessageSquare,
  FileText,
  Award,
  Calendar,
  Flame,
} from "lucide-react";
import { supabase } from "@/lib/auth";
import { formatNumber } from "@/lib/helpers";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface PostAnalyticsProps {
  userId: string;
}

/**
 * Raw shape of a row returned by the aggregate Supabase query below.
 *
 * The `upvote_count` / `downvote_count` / `comment_count` come back as
 * single-element arrays of `{ count: number }` thanks to PostgREST's
 * `foreign_key(count)` aggregate syntax (matches the pattern used by
 * `fetchPosts` in `@/lib/data`). The array may be empty/`null` when the post
 * has zero matching rows.
 */
interface PostRow {
  id: string;
  title: string;
  views: number;
  created_at: string;
  upvote_count: { count: number }[] | null;
  downvote_count: { count: number }[] | null;
  comment_count: { count: number }[] | null;
  post_topics: { topic_id: string }[] | null;
}

interface BestPost {
  id: string;
  title: string;
  upvotes: number;
}

interface TopTopic {
  name: string;
  count: number;
}

interface Analytics {
  totalPosts: number;
  totalViews: number;
  totalUpvotes: number;
  totalComments: number;
  avgUpvotes: number;
  bestPost: BestPost | null;
  postsThisWeek: number;
  postsThisMonth: number;
  /** Full weekday name (e.g. "Wednesday"), or "—" when there are no posts. */
  mostActiveDay: string;
  /** 7 counts, Monday-first (index 0 = Monday, index 6 = Sunday). */
  dayCounts: number[];
  topTopic: TopTopic | null;
}

// ----------------------------------------------------------------------------
// Day helpers
// ----------------------------------------------------------------------------

/** Short labels for the day-of-week bar chart, Monday-first. */
const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Long weekday names used for the "most active day" stat, Monday-first. */
const DAY_FULL = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** Returns a Date clamped to midnight on the Monday of `d`'s week. */
function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const jsDay = date.getDay(); // 0 = Sun .. 6 = Sat
  const mondayOffset = (jsDay + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - mondayOffset);
  return date;
}

/** Returns a Date clamped to midnight on the first day of `d`'s month. */
function startOfMonth(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(1);
  return date;
}

// ----------------------------------------------------------------------------
// Analytics computation
// ----------------------------------------------------------------------------

function computeAnalytics(
  rows: PostRow[],
  topicNames: Map<string, string>
): Analytics {
  let totalViews = 0;
  let totalUpvotes = 0;
  let totalComments = 0;
  let bestPost: BestPost | null = null;

  const now = new Date();
  const weekStart = startOfWeek(now).getTime();
  const monthStart = startOfMonth(now).getTime();
  let postsThisWeek = 0;
  let postsThisMonth = 0;

  const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Monday-first
  const topicCounts = new Map<string, number>();

  for (const r of rows) {
    const upvotes = r.upvote_count?.[0]?.count ?? 0;
    const comments = r.comment_count?.[0]?.count ?? 0;
    const views = r.views ?? 0;

    totalViews += views;
    totalUpvotes += upvotes;
    totalComments += comments;

    // Tie-break: the first post encountered with the current max wins.
    if (!bestPost || upvotes > bestPost.upvotes) {
      bestPost = { id: r.id, title: r.title, upvotes };
    }

    const created = new Date(r.created_at);
    const createdMs = created.getTime();
    if (createdMs >= weekStart) postsThisWeek++;
    if (createdMs >= monthStart) postsThisMonth++;

    // JS getDay(): 0=Sun..6=Sat → convert to a Monday-first index.
    const mondayIdx = (created.getDay() + 6) % 7;
    dayCounts[mondayIdx]++;

    for (const pt of r.post_topics ?? []) {
      if (pt.topic_id) {
        topicCounts.set(pt.topic_id, (topicCounts.get(pt.topic_id) ?? 0) + 1);
      }
    }
  }

  const totalPosts = rows.length;
  const avgUpvotes = totalPosts > 0 ? totalUpvotes / totalPosts : 0;

  // Most active day — pick the day with the highest count.
  let mostActiveIdx = 0;
  for (let i = 1; i < 7; i++) {
    if (dayCounts[i] > dayCounts[mostActiveIdx]) mostActiveIdx = i;
  }
  const mostActiveDay = totalPosts > 0 ? DAY_FULL[mostActiveIdx] : "—";

  // Top topic — pick the topic_id with the highest post count.
  let topTopic: TopTopic | null = null;
  for (const [topicId, count] of topicCounts) {
    if (!topTopic || count > topTopic.count) {
      topTopic = {
        name: topicNames.get(topicId) ?? "Unknown topic",
        count,
      };
    }
  }

  return {
    totalPosts,
    totalViews,
    totalUpvotes,
    totalComments,
    avgUpvotes,
    bestPost,
    postsThisWeek,
    postsThisMonth,
    mostActiveDay,
    dayCounts,
    topTopic,
  };
}

// ----------------------------------------------------------------------------
// Framer Motion variants
// ----------------------------------------------------------------------------

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 28 },
  },
};

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent: string;
}

function StatCard({ icon, value, label, accent }: StatCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="glass-card rounded-2xl p-4 flex flex-col gap-3"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: accent }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold tracking-tight tabular-nums truncate">
          {value}
        </div>
        <div className="text-xs text-muted-foreground leading-tight mt-0.5">
          {label}
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-4 shimmer h-[110px]" />
      ))}
    </div>
  );
}

function DayOfWeekChart({ counts }: { counts: number[] }) {
  const max = Math.max(1, ...counts);
  return (
    <div className="flex items-end justify-between gap-2 h-24">
      {DAY_ABBR.map((day, i) => {
        const c = counts[i] ?? 0;
        const heightPct = (c / max) * 100;
        return (
          <div
            key={day}
            className="flex-1 flex flex-col items-center gap-1.5 h-full"
          >
            <div className="flex-1 w-full flex items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{
                  delay: 0.1 + i * 0.05,
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                }}
                className="w-full rounded-md bg-primary/80 min-h-[2px]"
                title={`${day}: ${c} ${c === 1 ? "post" : "posts"}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main component
// ----------------------------------------------------------------------------

export function PostAnalytics({ userId }: PostAnalyticsProps) {
  const [loading, setLoading] = React.useState(true);
  const [analytics, setAnalytics] = React.useState<Analytics | null>(null);
  const [error, setError] = React.useState<string | null>(null);

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
        // Fetch all non-removed posts by this user, with FK-count aggregates
        // for votes / comments and a join to `post_topics` for topic analysis.
        // Mirrors the select shape used by `fetchPosts` in `@/lib/data`.
        const { data: postRows, error: postErr } = await supabase
          .from("posts")
          .select(
            `
            id, title, views, created_at,
            upvote_count:post_votes!post_votes_post_id_fkey(count),
            downvote_count:post_votes!post_votes_post_id_fkey(count),
            comment_count:comments!comments_post_id_fkey(count),
            post_topics(topic_id)
            `
          )
          .eq("author_id", userId)
          .eq("removed", false)
          .order("created_at", { ascending: false });

        if (postErr) throw postErr;

        const rows = (postRows ?? []) as PostRow[];

        // Resolve every referenced topic_id → topic name in one shot so the
        // "top topic" card can show a human-readable label.
        const topicIds = new Set<string>();
        for (const r of rows) {
          for (const pt of r.post_topics ?? []) {
            if (pt.topic_id) topicIds.add(pt.topic_id);
          }
        }
        const topicNames = new Map<string, string>();
        if (topicIds.size > 0) {
          const { data: topicRows } = await supabase
            .from("topics")
            .select("id, name")
            .in("id", [...topicIds]);
          for (const t of (topicRows ?? []) as { id: string; name: string }[]) {
            topicNames.set(t.id, t.name);
          }
        }

        if (!mounted) return;
        setAnalytics(computeAnalytics(rows, topicNames));
      } catch (e) {
        console.error("[PostAnalytics] fetch error:", e);
        if (mounted) setError("Failed to load analytics");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [userId]);

  // Most-active-day display: 3-letter abbreviation keeps the stat card width
  // consistent with the numeric values.
  const dayValue =
    analytics && analytics.mostActiveDay !== "—"
      ? analytics.mostActiveDay.slice(0, 3)
      : "—";

  return (
    <section className="glass-card rounded-3xl p-5 md:p-6">
      <header className="flex items-center gap-2 mb-5">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">
          📈 Your analytics
        </h2>
      </header>

      {loading ? (
        <SkeletonGrid />
      ) : error ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          {error}
        </div>
      ) : !analytics || analytics.totalPosts === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-2" aria-hidden="true">
            ✍️
          </div>
          <p className="text-sm text-muted-foreground">
            Start posting to see your analytics!
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Stat grid: 2x4 on desktop, 2 cols on mobile */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            <StatCard
              icon={<FileText className="w-4 h-4 text-white" />}
              value={formatNumber(analytics.totalPosts)}
              label="Total posts"
              accent="var(--primary)"
            />
            <StatCard
              icon={<Eye className="w-4 h-4 text-white" />}
              value={formatNumber(analytics.totalViews)}
              label="Total views"
              accent="oklch(0.55 0.22 265)"
            />
            <StatCard
              icon={<ArrowBigUp className="w-4 h-4 text-white" />}
              value={formatNumber(analytics.totalUpvotes)}
              label="Upvotes received"
              accent="oklch(0.72 0.18 162)"
            />
            <StatCard
              icon={<MessageSquare className="w-4 h-4 text-white" />}
              value={formatNumber(analytics.totalComments)}
              label="Comments received"
              accent="oklch(0.77 0.19 70)"
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4 text-white" />}
              value={analytics.avgUpvotes.toFixed(1)}
              label="Avg upvotes / post"
              accent="oklch(0.63 0.26 304)"
            />
            <StatCard
              icon={<Calendar className="w-4 h-4 text-white" />}
              value={formatNumber(analytics.postsThisWeek)}
              label="Posts this week"
              accent="oklch(0.65 0.25 16)"
            />
            <StatCard
              icon={<Flame className="w-4 h-4 text-white" />}
              value={formatNumber(analytics.postsThisMonth)}
              label="Posts this month"
              accent="oklch(0.7 0.22 22)"
            />
            <StatCard
              icon={<Award className="w-4 h-4 text-white" />}
              value={dayValue}
              label="Most active day"
              accent="oklch(0.7 0.22 280)"
            />
          </motion.div>

          {/* Best post + Top topic — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="show"
              className="glass-card rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <Award className="w-3.5 h-3.5" />
                Best post
              </div>
              {analytics.bestPost ? (
                <>
                  <div className="text-sm font-medium line-clamp-2 leading-snug">
                    {analytics.bestPost.title}
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <ArrowBigUp className="w-4 h-4 fill-current" />
                    {formatNumber(analytics.bestPost.upvotes)} upvotes
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No posts yet</div>
              )}
            </motion.div>

            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="show"
              className="glass-card rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5" />
                Top topic
              </div>
              {analytics.topTopic ? (
                <>
                  <div className="text-sm font-medium leading-snug">
                    {analytics.topTopic.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {analytics.topTopic.count}{" "}
                    {analytics.topTopic.count === 1 ? "post" : "posts"}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No topics yet
                </div>
              )}
            </motion.div>
          </div>

          {/* Posting rhythm — 7-bar day-of-week chart, Monday → Sunday */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="show"
            className="glass-card rounded-2xl p-4"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <Calendar className="w-3.5 h-3.5" />
              Posting rhythm
            </div>
            <DayOfWeekChart counts={analytics.dayCounts} />
          </motion.div>
        </div>
      )}
    </section>
  );
}
