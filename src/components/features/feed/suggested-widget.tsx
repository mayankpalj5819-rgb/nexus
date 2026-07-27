"use client";

import * as React from "react";
import { useAuth, supabase, type Profile } from "@/lib/auth";
import { fetchTopics, followTopic, followUser, type Topic } from "@/lib/data";
import { useUIStore } from "@/lib/ui-store";
import { formatNumber } from "@/lib/helpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Hash, ArrowRight } from "lucide-react";

const DISPLAY_COUNT = 5;
const POOL_LIMIT = 50;

export function SuggestedWidget() {
  const { profile } = useAuth();
  const setView = useUIStore((s) => s.setView);

  const [topicPool, setTopicPool] = React.useState<Topic[]>([]);
  const [peoplePool, setPeoplePool] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pendingTopicId, setPendingTopicId] = React.useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = React.useState<string | null>(null);

  // ── Load suggestions whenever the current user changes ──
  React.useEffect(() => {
    let mounted = true;
    const userId = profile?.id;

    if (!userId || !supabase) {
      setLoading(false);
      setTopicPool([]);
      setPeoplePool([]);
      return;
    }

    setLoading(true);

    (async () => {
      const client = supabase;
      const [allTopics, followedTopicsRes, followedUsersRes, usersRes] =
        await Promise.all([
          fetchTopics(),
          client
            .from("topic_followers")
            .select("topic_id")
            .eq("user_id", userId),
          client
            .from("user_followers")
            .select("followee_id")
            .eq("follower_id", userId),
          client
            .from("users")
            .select("*")
            .neq("id", userId)
            .order("reputation", { ascending: false })
            .limit(POOL_LIMIT),
        ]);

      if (!mounted) return;

      const followedTopicIds = new Set(
        (followedTopicsRes.data ?? []).map(
          (r: { topic_id: string }) => r.topic_id
        )
      );
      const followedUserIds = new Set(
        (followedUsersRes.data ?? []).map(
          (r: { followee_id: string }) => r.followee_id
        )
      );

      const suggestedTopics = allTopics.filter(
        (t) => t.parent_id === null && !followedTopicIds.has(t.id)
      );
      const suggestedPeople = ((usersRes.data ?? []) as Profile[]).filter(
        (u) => !followedUserIds.has(u.id)
      );

      setTopicPool(suggestedTopics);
      setPeoplePool(suggestedPeople);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  const visibleTopics = topicPool.slice(0, DISPLAY_COUNT);
  const visiblePeople = peoplePool.slice(0, DISPLAY_COUNT);
  const isEmpty =
    !loading && visibleTopics.length === 0 && visiblePeople.length === 0;

  const handleFollowTopic = async (topicId: string) => {
    if (!profile?.id) return;
    setPendingTopicId(topicId);
    try {
      await followTopic(topicId, profile.id);
      setTopicPool((prev) => prev.filter((t) => t.id !== topicId));
    } finally {
      setPendingTopicId(null);
    }
  };

  const handleFollowUser = async (userId: string) => {
    if (!profile?.id) return;
    setPendingUserId(userId);
    try {
      await followUser(profile.id, userId);
      setPeoplePool((prev) => prev.filter((u) => u.id !== userId));
    } finally {
      setPendingUserId(null);
    }
  };

  const goToTopic = (topicId: string) => setView({ name: "topic", topicId });
  const goToProfile = (userId: string) => setView({ name: "profile", userId });
  const goToTopics = () => setView({ name: "topics" });

  return (
    <div className="glass-card rounded-2xl p-4 space-y-5">
      {loading ? (
        <SuggestedSkeleton />
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <>
          {visibleTopics.length > 0 && (
            <section>
              <header className="flex items-center justify-between mb-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Hash className="w-4 h-4 text-primary" />
                  Topics to follow
                </h2>
                <button
                  type="button"
                  onClick={goToTopics}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Browse all
                  <ArrowRight className="w-3 h-3" />
                </button>
              </header>
              <ul className="space-y-0.5">
                {visibleTopics.map((topic) => (
                  <TopicRow
                    key={topic.id}
                    topic={topic}
                    pending={pendingTopicId === topic.id}
                    onNavigate={() => goToTopic(topic.id)}
                    onFollow={() => handleFollowTopic(topic.id)}
                  />
                ))}
              </ul>
            </section>
          )}

          {visiblePeople.length > 0 && (
            <section>
              <header className="flex items-center justify-between mb-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="w-4 h-4 text-primary" />
                  People to follow
                </h2>
              </header>
              <ul className="space-y-0.5">
                {visiblePeople.map((user) => (
                  <PersonRow
                    key={user.id}
                    user={user}
                    pending={pendingUserId === user.id}
                    onNavigate={() => goToProfile(user.id)}
                    onFollow={() => handleFollowUser(user.id)}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row components
// ---------------------------------------------------------------------------

function TopicRow({
  topic,
  pending,
  onNavigate,
  onFollow,
}: {
  topic: Topic;
  pending: boolean;
  onNavigate: () => void;
  onFollow: () => void;
}) {
  const icon = topic.icon || "📚";
  const color = topic.color || "#6366f1";
  const followerCount = topic.follower_count ?? 0;

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
        className="group flex items-center gap-3 rounded-xl px-2 py-2 cursor-pointer hover:bg-accent/60 transition-colors"
      >
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-base"
          style={{ background: `${color}22` }}
          aria-hidden
        >
          <span>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">
            {topic.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatNumber(followerCount)} followers
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={(e) => {
            e.stopPropagation();
            onFollow();
          }}
          className="h-7 px-3 text-xs"
        >
          {pending ? "…" : "Follow"}
        </Button>
      </div>
    </li>
  );
}

function PersonRow({
  user,
  pending,
  onNavigate,
  onFollow,
}: {
  user: Profile;
  pending: boolean;
  onNavigate: () => void;
  onFollow: () => void;
}) {
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
        className="group flex items-center gap-3 rounded-xl px-2 py-2 cursor-pointer hover:bg-accent/60 transition-colors"
      >
        <Avatar className="size-9">
          {user.avatar_url ? (
            <AvatarImage src={user.avatar_url} alt={user.name} />
          ) : null}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">
            {user.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            @{user.username} · {formatNumber(user.reputation)} rep
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={(e) => {
            e.stopPropagation();
            onFollow();
          }}
          className="h-7 px-3 text-xs"
        >
          {pending ? "…" : "Follow"}
        </Button>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

function SuggestedSkeleton() {
  return (
    <div className="space-y-5">
      <section>
        <Skeleton className="h-4 w-32 mb-2" />
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <Skeleton className="size-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </section>
      <section>
        <Skeleton className="h-4 w-32 mb-2" />
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-accent/60 text-accent-foreground">
        <Users className="w-5 h-5" />
      </div>
      <p className="text-sm font-medium">You&apos;re all caught up!</p>
      <p className="mt-1 text-xs text-muted-foreground">
        No more suggestions right now — check back later.
      </p>
    </div>
  );
}
