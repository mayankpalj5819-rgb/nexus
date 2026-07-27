"use client";

import * as React from "react";
import { supabase, type Profile } from "@/lib/auth";
import { useUIStore } from "@/lib/ui-store";
import { formatNumber } from "@/lib/helpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface TopicLeaderboardProps {
  topicId: string;
}

interface ContributorStats {
  postCount: number;
  upvotes: number;
}

interface Contributor {
  user: Profile;
  postCount: number;
  upvotes: number;
}

// Shape of a row returned by the aggregate Supabase query below.
interface PostWithVotes {
  id: string;
  author_id: string;
  post_topics: { topic_id: string }[];
  post_votes: { value: number }[];
}

const MEDALS = ["🥇", "🥈", "🥉"] as const;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TOP_N = 5;

/**
 * TopicLeaderboard — shows the top contributors for a topic this week.
 *
 * Ranks authors by total upvotes received on their posts in this topic over
 * the last 7 days (post count is the tiebreaker). Compact design tuned for
 * the topic sidebar.
 */
export function TopicLeaderboard({ topicId }: TopicLeaderboardProps) {
  const setView = useUIStore((s) => s.setView);
  const [contributors, setContributors] = React.useState<Contributor[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setContributors([]);
      return;
    }

    let mounted = true;
    setLoading(true);

    (async () => {
      const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();

      // Pull every post in this topic from the last 7 days along with its
      // votes. PostgREST can't GROUP BY, so we aggregate client-side.
      const { data: posts } = await supabase
        .from("posts")
        .select(
          `id,
           author_id,
           post_topics!inner(topic_id),
           post_votes(value)`
        )
        .eq("post_topics.topic_id", topicId)
        .gte("created_at", weekAgo)
        .eq("removed", false);

      if (!mounted) return;

      const stats = new Map<string, ContributorStats>();
      for (const post of (posts ?? []) as PostWithVotes[]) {
        const entry = stats.get(post.author_id) ?? {
          postCount: 0,
          upvotes: 0,
        };
        entry.postCount += 1;
        for (const vote of post.post_votes ?? []) {
          if (vote.value === 1) entry.upvotes += 1;
        }
        stats.set(post.author_id, entry);
      }

      // Rank: total upvotes desc, then post count desc as tiebreaker.
      const topIds = [...stats.entries()]
        .sort(
          (a, b) =>
            b[1].upvotes - a[1].upvotes || b[1].postCount - a[1].postCount
        )
        .slice(0, TOP_N)
        .map(([id]) => id);

      if (topIds.length === 0) {
        if (mounted) {
          setContributors([]);
          setLoading(false);
        }
        return;
      }

      const { data: users } = await supabase
        .from("users")
        .select("*")
        .in("id", topIds);

      if (!mounted) return;

      const userMap = new Map<string, Profile>(
        ((users ?? []) as Profile[]).map((u) => [u.id, u])
      );

      const ranked: Contributor[] = topIds
        .map((id) => {
          const user = userMap.get(id);
          const s = stats.get(id);
          if (!user || !s) return null;
          return { user, postCount: s.postCount, upvotes: s.upvotes };
        })
        .filter((c): c is Contributor => c !== null);

      if (mounted) {
        setContributors(ranked);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [topicId]);

  return (
    <div className="glass-card rounded-2xl p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
        <span className="text-base leading-none" aria-hidden>
          🏆
        </span>
        This week&apos;s top contributors
      </h2>

      {loading ? (
        <LeaderboardSkeleton />
      ) : contributors.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-0.5">
          {contributors.map((c, i) => (
            <ContributorRow
              key={c.user.id}
              contributor={c}
              rank={i + 1}
              onNavigate={() =>
                setView({
                  name: "profile",
                  userId: c.user.id,
                  tab: "posts",
                })
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function ContributorRow({
  contributor,
  rank,
  onNavigate,
}: {
  contributor: Contributor;
  rank: number;
  onNavigate: () => void;
}) {
  const { user, postCount, upvotes } = contributor;
  const medal = rank <= MEDALS.length ? MEDALS[rank - 1] : null;
  const initials = (user.name || user.username || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onNavigate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onNavigate();
          }
        }}
        className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-accent/60 transition-colors"
      >
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center text-xs font-semibold text-muted-foreground"
          aria-label={`Rank ${rank}`}
        >
          {medal ?? `#${rank}`}
        </span>
        <Avatar className="size-7">
          {user.avatar_url ? (
            <AvatarImage src={user.avatar_url} alt={user.name} />
          ) : null}
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium leading-tight">
            {user.name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground leading-tight">
            @{user.username}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end text-[11px] leading-tight">
          <span className="font-medium">{formatNumber(postCount)} posts</span>
          <span className="text-amber-500">▲ {formatNumber(upvotes)}</span>
        </div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

function LeaderboardSkeleton() {
  return (
    <ul className="space-y-0.5">
      {Array.from({ length: TOP_N }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
        >
          <Skeleton className="h-4 w-4" />
          <Skeleton className="size-7 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-2 w-16" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-2 w-10" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="py-6 text-center">
      <p className="text-xs text-muted-foreground">
        No posts this week yet. Be the first!
      </p>
    </div>
  );
}
