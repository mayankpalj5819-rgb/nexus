"use client";

import * as React from "react";
import { useUIStore, type FeedTab } from "@/lib/ui-store";
import { useAuth } from "@/lib/auth";
import { fetchPosts, type Post } from "@/lib/data";
import { PostCard } from "@/components/shared/post-card";
import { motion } from "framer-motion";
import { Flame, Clock, TrendingUp, UserCheck, Sparkles, ArrowRight, Shuffle, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrendingTopicsBar } from "@/components/features/topics/trending-topics-bar";

const TABS: { id: FeedTab; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: "trending", label: "Trending", icon: Flame, description: "Hot posts across all topics right now" },
  { id: "week", label: "Best of Week", icon: CalendarDays, description: "Top posts from the last 7 days" },
  { id: "latest", label: "Latest", icon: Clock, description: "Fresh off the press" },
  { id: "popular", label: "Popular", icon: TrendingUp, description: "All-time most upvoted" },
  { id: "following", label: "Following", icon: UserCheck, description: "From topics you follow" },
];

export function HomePage() {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const { profile } = useAuth();

  const feedTab: FeedTab = (view as { feed?: FeedTab }).feed ?? "trending";
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [visibleCount, setVisibleCount] = React.useState(8);

  React.useEffect(() => {
    setLoading(true);
    let mounted = true;
    (async () => {
      const data = await fetchPosts({
        sort: feedTab,
        limit: 30,
        currentUserId: profile?.id,
      });
      if (mounted) {
        setPosts(data);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [feedTab, profile?.id]);

  React.useEffect(() => {
    setVisibleCount(8);
  }, [feedTab]);

  // Infinite scroll
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + 6, posts.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [posts.length]);

  const visiblePosts = posts.slice(0, visibleCount);
  const hasMore = visibleCount < posts.length;

  return (
    <div className="max-w-3xl mx-auto">
      {feedTab === "trending" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="glass-card rounded-3xl p-6 lg:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                <Sparkles className="w-3 h-3" />
                {profile ? `Welcome back, ${profile.name.split(" ")[0]}` : "Welcome to Nexus"}
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
                Today on Nexus
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg">
                Ideas worth following, organized by topic. Jump into the discussion, share knowledge, and follow the topics that matter to you.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Trending topics bar */}
      <div className="mb-4">
        <TrendingTopicsBar />
      </div>

      <div className="sticky top-16 z-10 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3 glass-strong border-b border-border/40 mb-4">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const active = feedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setView({ name: "home", feed: tab.id })}
                className={cn(
                  "relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="feed-tab"
                    className="absolute inset-0 rounded-xl bg-accent border border-border/50"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <tab.icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4 px-1 text-xs text-muted-foreground">
        {TABS.find((t) => t.id === feedTab)?.description}
        {feedTab === "following" && !profile && (
          <span className="ml-2 text-primary">· Sign in to follow topics.</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <PostCardSkeleton key={i} />)}
        </div>
      ) : visiblePosts.length === 0 ? (
        <EmptyFeed tab={feedTab} />
      ) : (
        <div className="space-y-4">
          {visiblePosts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
            >
              <PostCard post={post} />
            </motion.div>
          ))}

          {hasMore && <div ref={sentinelRef} className="h-4" />}

          {!hasMore && posts.length > 4 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              You&apos;ve reached the end · {posts.length} posts in this feed
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PostCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <Skeleton className="w-7 h-7 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="w-32 h-3" />
          <Skeleton className="w-20 h-2.5" />
        </div>
      </div>
      <Skeleton className="w-full h-5 mb-2" />
      <Skeleton className="w-3/4 h-5 mb-3" />
      <Skeleton className="w-full h-3 mb-1" />
      <Skeleton className="w-5/6 h-3 mb-4" />
      <div className="flex gap-3">
        <Skeleton className="w-24 h-8 rounded-xl" />
        <Skeleton className="w-20 h-8 rounded-lg" />
      </div>
    </div>
  );
}

function EmptyFeed({ tab }: { tab: FeedTab }) {
  const setView = useUIStore((s) => s.setView);
  return (
    <div className="glass-card rounded-3xl p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/50 flex items-center justify-center">
        {tab === "following" ? <UserCheck className="w-7 h-7 text-primary" /> : <Flame className="w-7 h-7 text-primary" />}
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {tab === "following" ? "Your following feed is empty" : tab === "trending" ? "No trending posts yet" : tab === "latest" ? "No posts yet" : "No popular posts yet"}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        {tab === "following"
          ? "Follow some topics to start seeing posts tailored to your interests here."
          : "Be the first to share something on Nexus. Your post could be the one that kicks off the conversation."}
      </p>
      <div className="flex items-center justify-center gap-2">
        <Button onClick={() => setView({ name: "topics" })} variant="outline" className="rounded-xl gap-1.5">
          Explore topics <ArrowRight className="w-3.5 h-3.5" />
        </Button>
        <Button onClick={() => setView({ name: "editor" })} className="rounded-xl">
          Create the first post
        </Button>
      </div>
    </div>
  );
}
