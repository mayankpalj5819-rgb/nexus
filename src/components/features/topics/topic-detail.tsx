"use client";

import * as React from "react";
import { useNexusStore, type Topic, type Post } from "@/lib/store";
import { motion } from "framer-motion";
import { Plus, Users, TrendingUp, ArrowUp, MessageSquare, ChevronRight, Check, Bell, BellOff } from "lucide-react";
import { PostCard } from "@/components/shared/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatNumber, timeAgo } from "@/lib/helpers";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function TopicDetailPage({ topicId }: { topicId: string }) {
  const getTopic = useNexusStore((s) => s.getTopic);
  const getRelatedTopics = useNexusStore((s) => s.getRelatedTopics);
  const getTopicPosts = useNexusStore((s) => s.getTopicPosts);
  const getTopContributors = useNexusStore((s) => s.getTopContributors);
  const isFollowingTopic = useNexusStore((s) => s.isFollowingTopic);
  const followTopic = useNexusStore((s) => s.followTopic);
  const unfollowTopic = useNexusStore((s) => s.unfollowTopic);
  const setView = useNexusStore((s) => s.setView);
  const topics = useNexusStore((s) => s.topics);

  const topic = getTopic(topicId);
  const [sort, setSort] = React.useState<"trending" | "latest" | "popular">("trending");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(t);
  }, [topicId, sort]);

  if (!topic) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <h2 className="text-xl font-semibold mb-2">Topic not found</h2>
        <p className="text-sm text-muted-foreground mb-4">This topic may have been removed.</p>
        <Button onClick={() => setView({ name: "topics" })}>Browse topics</Button>
      </div>
    );
  }

  const related = getRelatedTopics(topicId);
  const contributors = getTopContributors(topicId);
  const posts = getTopicPosts(topicId, sort);
  const following = isFollowingTopic(topicId);
  const childTopics = topics.filter((t) => t.parentId === topic.id);
  const parentTopic = topic.parentId ? getTopic(topic.parentId) : null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Banner */}
      <div className="relative h-44 lg:h-56 rounded-3xl overflow-hidden mb-6" style={{ background: topic.banner }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute inset-0 p-6 lg:p-8 flex flex-col justify-end text-white">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-white/80 mb-2">
            <button onClick={() => setView({ name: "topics" })} className="hover:text-white">Topics</button>
            {parentTopic && (
              <>
                <ChevronRight className="w-3 h-3" />
                <button onClick={() => setView({ name: "topic", topicId: parentTopic.id })} className="hover:text-white">
                  {parentTopic.name}
                </button>
              </>
            )}
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
              <Users className="w-3.5 h-3.5" /> {formatNumber(topic.followers.length)} followers
            </span>
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> {topic.postCount} posts
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Main */}
        <div>
          {/* Action bar */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={following ? "secondary" : "default"}
              onClick={() => {
                if (following) { unfollowTopic(topic.id); toast.success(`Unfollowed ${topic.name}`); }
                else { followTopic(topic.id); toast.success(`Following ${topic.name}`); }
              }}
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
              <Button variant="ghost" size="icon" onClick={() => { unfollowTopic(topic.id); toast.success(`Unfollowed ${topic.name}`); }} className="rounded-xl">
                <BellOff className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Subtopics */}
          {childTopics.length > 0 && (
            <div className="mb-6 glass-card rounded-2xl p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Subtopics
              </div>
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
                    <span className="text-xs text-muted-foreground ml-1">{c.postCount}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          <Tabs value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <TabsList className="mb-4">
              <TabsTrigger value="trending" className="gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Trending
              </TabsTrigger>
              <TabsTrigger value="latest" className="gap-1.5">
                Latest
              </TabsTrigger>
              <TabsTrigger value="popular" className="gap-1.5">
                Top
              </TabsTrigger>
            </TabsList>
            <TabsContent value={sort} className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl p-5">
                    <Skeleton className="w-32 h-3 mb-3" />
                    <Skeleton className="w-3/4 h-5 mb-2" />
                    <Skeleton className="w-full h-3" />
                  </div>
                ))
              ) : posts.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-accent/50 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">No posts yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Be the first to share knowledge in {topic.name}.</p>
                  <Button onClick={() => setView({ name: "editor", topicId: topic.id })} className="rounded-xl">
                    Create post
                  </Button>
                </div>
              ) : (
                posts.map((post: Post, i: number) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  >
                    <PostCard post={post} />
                  </motion.div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Top contributors */}
          <div className="glass-card rounded-2xl p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Top contributors
            </div>
            <div className="space-y-2">
              {contributors.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">No contributors yet.</div>
              ) : (
                contributors.map(({ user, count }, i) => (
                  <button
                    key={user.id}
                    onClick={() => setView({ name: "profile", userId: user.id, tab: "posts" })}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors text-left"
                  >
                    <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{count} posts · {formatNumber(user.reputation)} rep</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Related topics */}
          {related.length > 0 && (
            <div className="glass-card rounded-2xl p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Related topics
              </div>
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
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              About this topic
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Created {timeAgo(topic.createdAt)} ago</div>
              <div>{formatNumber(topic.followers.length)} followers</div>
              <div>{topic.postCount} posts</div>
              {childTopics.length > 0 && <div>{childTopics.length} subtopics</div>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
