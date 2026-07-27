"use client";

import * as React from "react";
import { useUIStore } from "@/lib/ui-store";
import { useAuth, supabase } from "@/lib/auth";
import { fetchTopic, fetchPosts, followTopic, unfollowTopic, type Topic, type Post } from "@/lib/data";
import { PostCard } from "@/components/shared/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Users, TrendingUp, ChevronRight, Check, Bell, BellOff } from "lucide-react";
import { formatNumber, timeAgo } from "@/lib/helpers";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Profile } from "@/lib/data";

export function TopicDetailPage({ topicId }: { topicId: string }) {
  const setView = useUIStore((s) => s.setView);
  const { profile } = useAuth();
  const [topic, setTopic] = React.useState<Topic | null>(null);
  const [followerCount, setFollowerCount] = React.useState(0);
  const [following, setFollowing] = React.useState(false);
  const [sort, setSort] = React.useState<"trending" | "latest" | "popular">("trending");
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [related, setRelated] = React.useState<Topic[]>([]);
  const [contributors, setContributors] = React.useState<{ user: Profile; count: number }[]>([]);
  const [childTopics, setChildTopics] = React.useState<Topic[]>([]);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      const t = await fetchTopic(topicId);
      if (!mounted) return;
      setTopic(t);
      if (!t) { setLoading(false); return; }

      // Fetch follower count + following status
      if (supabase && profile) {
        const { count } = await supabase
          .from("topic_followers")
          .select("user_id", { count: "exact", head: true })
          .eq("topic_id", topicId);
        if (mounted) setFollowerCount(count ?? 0);
        const { data: f } = await supabase
          .from("topic_followers")
          .select("user_id")
          .eq("topic_id", topicId)
          .eq("user_id", profile.id)
          .maybeSingle();
        if (mounted) setFollowing(!!f);
      }

      // Fetch child topics
      if (supabase) {
        const { data: children } = await supabase
          .from("topics")
          .select("*")
          .eq("parent_id", topicId);
        if (mounted) setChildTopics((children ?? []) as Topic[]);

        // Related = siblings + parent
        if (t.parent_id) {
          const { data: siblings } = await supabase
            .from("topics")
            .select("*")
            .eq("parent_id", t.parent_id)
            .neq("id", topicId);
          if (mounted) setRelated((siblings ?? []) as Topic[]);
        }
      }

      // Fetch posts
      const p = await fetchPosts({ sort, topicId, limit: 30, currentUserId: profile?.id });
      if (mounted) {
        setPosts(p);
        setLoading(false);
      }

      // Top contributors
      if (supabase) {
        const { data: postData } = await supabase
          .from("posts")
          .select("author_id")
          .in("id", p.map((x) => x.id));
        if (mounted && postData) {
          const counts = new Map<string, number>();
          postData.forEach((r: { author_id: string }) => counts.set(r.author_id, (counts.get(r.author_id) ?? 0) + 1));
          const topIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
          if (topIds.length > 0) {
            const { data: users } = await supabase.from("users").select("*").in("id", topIds);
            if (mounted && users) {
              setContributors(topIds.map((id) => ({
                user: (users as Profile[]).find((u) => u.id === id)!,
                count: counts.get(id) ?? 0,
              })).filter((c) => c.user));
            }
          }
        }
      }
    })();
    return () => { mounted = false; };
  }, [topicId, sort, profile?.id]);

  if (loading && !topic) {
    return (
      <div className="max-w-5xl mx-auto">
        <Skeleton className="h-44 lg:h-56 rounded-3xl mb-6" />
        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <h2 className="text-xl font-semibold mb-2">Topic not found</h2>
        <p className="text-sm text-muted-foreground mb-4">This topic may have been removed.</p>
        <Button onClick={() => setView({ name: "topics" })}>Browse topics</Button>
      </div>
    );
  }

  const handleFollow = async () => {
    if (!profile) { toast.error("Sign in to follow topics"); return; }
    if (following) {
      await unfollowTopic(topic.id, profile.id);
      setFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
      toast.success(`Unfollowed ${topic.name}`);
    } else {
      await followTopic(topic.id, profile.id);
      setFollowing(true);
      setFollowerCount((c) => c + 1);
      toast.success(`Following ${topic.name}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="relative h-44 lg:h-56 rounded-3xl overflow-hidden mb-6" style={{ background: topic.banner }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute inset-0 p-6 lg:p-8 flex flex-col justify-end text-white">
          <div className="flex items-center gap-1.5 text-xs text-white/80 mb-2">
            <button onClick={() => setView({ name: "topics" })} className="hover:text-white">Topics</button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white">{topic.name}</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-5xl drop-shadow-lg">{topic.icon}</span>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight drop-shadow-lg">{topic.name}</h1>
          </div>
          <p className="text-sm text-white/90 max-w-2xl leading-relaxed">{topic.description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-white/80">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {formatNumber(followerCount)} followers
            </span>
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> {topic.post_count} posts
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={following ? "secondary" : "default"}
              onClick={handleFollow}
              className="rounded-xl gap-1.5"
            >
              {following ? <Check className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              {following ? "Following" : "Follow"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setView({ name: "editor", topicId: topic.id })}
              className="rounded-xl gap-1.5"
            >
              <Plus className="w-4 h-4" /> Post in {topic.name}
            </Button>
            {following && (
              <Button variant="ghost" size="icon" onClick={handleFollow} className="rounded-xl">
                <BellOff className="w-4 h-4" />
              </Button>
            )}
          </div>

          {childTopics.length > 0 && (
            <div className="mb-6 glass-card rounded-2xl p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Subtopics</div>
              <div className="flex flex-wrap gap-2">
                {childTopics.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setView({ name: "topic", topicId: c.id })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:bg-accent transition-colors"
                    style={{ color: c.color }}
                  >
                    <span>{c.icon}</span>
                    {c.name}
                    <span className="text-xs text-muted-foreground ml-1">{c.post_count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Tabs value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <TabsList className="mb-4">
              <TabsTrigger value="trending" className="gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Trending
              </TabsTrigger>
              <TabsTrigger value="latest" className="gap-1.5">Latest</TabsTrigger>
              <TabsTrigger value="popular" className="gap-1.5">Top</TabsTrigger>
            </TabsList>
            <TabsContent value={sort} className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
              ) : posts.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-accent/50 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">No posts yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Be the first to share knowledge in {topic.name}.</p>
                  <Button onClick={() => setView({ name: "editor", topicId: topic.id })} className="rounded-xl">Create post</Button>
                </div>
              ) : (
                posts.map((p) => <PostCard key={p.id} post={p} />)
              )}
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4">
          <div className="glass-card rounded-2xl p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Top contributors</div>
            {contributors.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">No contributors yet.</div>
            ) : (
              <div className="space-y-2">
                {contributors.map(({ user, count }, i) => (
                  <button
                    key={user.id}
                    onClick={() => setView({ name: "profile", userId: user.id, tab: "posts" })}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors text-left"
                  >
                    <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                    <Avatar className="w-8 h-8">
                      {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.name} /> : null}
                      <AvatarFallback>{user.name[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{count} posts · {formatNumber(user.reputation)} rep</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {related.length > 0 && (
            <div className="glass-card rounded-2xl p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Related topics</div>
              <div className="space-y-1">
                {related.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setView({ name: "topic", topicId: t.id })}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent/50 transition-colors text-left"
                  >
                    <span className="text-base">{t.icon}</span>
                    <span className="text-sm font-medium truncate">{t.name}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card rounded-2xl p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">About this topic</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Created {timeAgo(topic.created_at)} ago</div>
              <div>{formatNumber(followerCount)} followers</div>
              <div>{topic.post_count} posts</div>
              {childTopics.length > 0 && <div>{childTopics.length} subtopics</div>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
