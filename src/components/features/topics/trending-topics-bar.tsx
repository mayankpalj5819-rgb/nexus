"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Flame, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/auth";
import { useUIStore } from "@/lib/ui-store";
import { formatNumber } from "@/lib/helpers";

interface TrendingTopic {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  post_count: number;
  follower_count: number;
}

interface TopicRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  post_count: number;
}

interface FollowerRow {
  topic_id: string;
}

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
};

export function TrendingTopicsBar() {
  const setView = useUIStore((s) => s.setView);
  const [topics, setTopics] = React.useState<TrendingTopic[]>([]);
  const [loading, setLoading] = React.useState(true);

  // ── Fetch trending root topics (parent_id === null) by post_count desc ──
  React.useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let mounted = true;

    (async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, name, slug, icon, color, post_count")
        .is("parent_id", null)
        .order("post_count", { ascending: false })
        .limit(15);

      if (error) {
        console.error("[trending-topics] fetch error:", error);
        if (mounted) setLoading(false);
        return;
      }
      if (!mounted) return;

      const rows: TrendingTopic[] = (data ?? []).map((r: TopicRow) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        icon: r.icon,
        color: r.color,
        post_count: r.post_count ?? 0,
        follower_count: 0,
      }));
      setTopics(rows);

      // ── Fetch follower counts for each topic from topic_followers ──
      if (rows.length > 0) {
        const { data: fData } = await supabase
          .from("topic_followers")
          .select("topic_id")
          .in(
            "topic_id",
            rows.map((t) => t.id)
          );

        if (mounted && fData) {
          const counts = new Map<string, number>();
          for (const row of fData as FollowerRow[]) {
            counts.set(row.topic_id, (counts.get(row.topic_id) ?? 0) + 1);
          }
          setTopics((prev) =>
            prev.map((t) => ({ ...t, follower_count: counts.get(t.id) ?? 0 }))
          );
        }
      }

      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ── Loading state: 8 skeleton chips ──
  if (loading) {
    return (
      <div className="sticky top-16 z-30">
        <div className="glass-card rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2 mb-2.5">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Trending topics
            </span>
          </div>
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="shimmer shrink-0 h-9 w-32 rounded-full bg-muted/50"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state: render nothing ──
  if (topics.length === 0) return null;

  return (
    <div className="sticky top-16 z-30">
      <div className="glass-card rounded-2xl px-4 py-3">
        {/* Header row: label + see-all */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              🔥 Trending topics
            </span>
          </div>
          <button
            type="button"
            onClick={() => setView({ name: "topics" })}
            className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            See all
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Horizontally scrollable chips */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {topics.map((t) => (
            <motion.button
              key={t.id}
              variants={itemVariants}
              type="button"
              onClick={() => setView({ name: "topic", topicId: t.id })}
              className="group shrink-0 flex items-center gap-2 h-9 pl-2.5 pr-3 rounded-full border text-sm transition-transform hover:scale-[1.04] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{
                backgroundColor: `color-mix(in srgb, ${t.color} 14%, transparent)`,
                borderColor: `color-mix(in srgb, ${t.color} 32%, transparent)`,
              }}
              title={`${t.name} · ${formatNumber(t.post_count)} posts · ${formatNumber(t.follower_count)} followers`}
            >
              {t.icon ? (
                <span className="text-base leading-none">{t.icon}</span>
              ) : (
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
              )}
              <span className="font-medium whitespace-nowrap">{t.name}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatNumber(t.post_count)}
              </span>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
