"use client";

import * as React from "react";
import { useUIStore, type ProfileTab } from "@/lib/ui-store";
import { useAuth, supabase, type Profile } from "@/lib/auth";
import { fetchPosts, fetchUserProfile, fetchUserStats, followUser, unfollowUser, type Post } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PostCard } from "@/components/shared/post-card";
import { Calendar, Link as LinkIcon, MapPin, Award, Users, BookOpen, Edit, Shield, Ban, Sparkles, TrendingUp, FileText, MessageSquare, ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { formatNumber, formatDate, timeAgo } from "@/lib/helpers";
import { toast } from "sonner";
import { EditProfileModal } from "@/components/features/profile/edit-profile-modal";
import { UserBadges } from "@/components/features/profile/user-badges";
import { PostAnalytics } from "@/components/features/profile/post-analytics";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Post, Comment, Topic } from "@/lib/data";

export function ProfilePage({ userId, initialTab }: { userId?: string; initialTab?: ProfileTab }) {
  const setView = useUIStore((s) => s.setView);
  const { profile: currentUser, updateProfile } = useAuth();
  const [user, setUser] = React.useState<Profile | null>(null);
  const [stats, setStats] = React.useState({ followers: 0, following: 0, topicsFollowing: 0, postCount: 0 });
  const [following, setFollowing] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const targetId = userId ?? currentUser?.id;

  React.useEffect(() => {
    if (!targetId) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      const u = await fetchUserProfile(targetId);
      if (!mounted) return;
      setUser(u);
      const s = await fetchUserStats(targetId);
      if (mounted) setStats(s);
      if (currentUser && currentUser.id !== targetId && supabase) {
        const { data: f } = await supabase
          .from("user_followers")
          .select("follower_id")
          .eq("follower_id", currentUser.id)
          .eq("followee_id", targetId)
          .maybeSingle();
        if (mounted) setFollowing(!!f);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [targetId, currentUser]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-32 lg:h-44 rounded-3xl animate-pulse" />
        <div className="glass-card rounded-2xl h-32 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <h2 className="text-xl font-semibold mb-2">User not found</h2>
        <Button onClick={() => setView({ name: "home", feed: "trending" })}>Back home</Button>
      </div>
    );
  }

  const isSelf = currentUser?.id === user.id;
  const canModerate = currentUser?.role === "admin" && currentUser?.id !== user.id;

  return (
    <div className="max-w-4xl mx-auto">
      <div
        className="h-32 lg:h-44 rounded-3xl mb-[-60px] relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, oklch(0.7 0.22 280), oklch(0.65 0.25 304), oklch(0.72 0.18 162))" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
      </div>

      <div className="px-5 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div className="flex items-end gap-4">
            <Avatar className="w-24 h-24 rounded-3xl ring-4 ring-background shrink-0">
              {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.name} /> : null}
              <AvatarFallback className="text-3xl">{user.name[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="mb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
                {user.role === "admin" && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold uppercase tracking-wide">
                    <Shield className="w-2.5 h-2.5" /> Admin
                  </span>
                )}
                {user.role === "moderator" && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-chart-2/15 text-chart-2 font-semibold uppercase tracking-wide">
                    <Shield className="w-2.5 h-2.5" /> Mod
                  </span>
                )}
                {user.banned && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-semibold uppercase tracking-wide">
                    <Ban className="w-2.5 h-2.5" /> Banned
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">@{user.username}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            {isSelf ? (
              <>
                <Button variant="outline" onClick={() => setEditOpen(true)} className="rounded-xl gap-1.5">
                  <Edit className="w-3.5 h-3.5" /> Edit profile
                </Button>
                <Button variant="ghost" onClick={() => setView({ name: "settings" })} className="rounded-xl gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Settings
                </Button>
              </>
            ) : currentUser ? (
              <>
                <Button
                  variant={following ? "secondary" : "default"}
                  onClick={async () => {
                    if (following) { await unfollowUser(currentUser.id, user.id); setFollowing(false); toast.success("Unfollowed"); }
                    else { await followUser(currentUser.id, user.id); setFollowing(true); toast.success("Following"); }
                  }}
                  className="rounded-xl"
                >
                  {following ? "Following" : "Follow"}
                </Button>
                {canModerate && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!supabase) return;
                      if (user.banned) {
                        await supabase.from("users").update({ banned: false }).eq("id", user.id);
                        setUser({ ...user, banned: false });
                        toast.success("User unbanned");
                      } else {
                        await supabase.from("users").update({ banned: true }).eq("id", user.id);
                        setUser({ ...user, banned: true });
                        toast.success("User banned");
                      }
                    }}
                    className="rounded-xl gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    {user.banned ? "Unban" : "Ban"}
                  </Button>
                )}
              </>
            ) : null}
          </div>
        </div>

        {user.bio && <p className="text-sm leading-relaxed mb-4 max-w-2xl">{user.bio}</p>}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Joined {formatDate(user.joined_date)}
          </span>
          {user.website && (
            <a href={`https://${user.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-primary">
              <LinkIcon className="w-3.5 h-3.5" /> {user.website}
            </a>
          )}
          {user.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> {user.location}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
          <StatCard icon={<Award className="w-4 h-4" />} label="Reputation" value={formatNumber(user.reputation)} />
          <StatCard icon={<Users className="w-4 h-4" />} label="Followers" value={formatNumber(stats.followers)} />
          <StatCard icon={<Users className="w-4 h-4" />} label="Following" value={formatNumber(stats.following)} />
          <StatCard icon={<BookOpen className="w-4 h-4" />} label="Topics" value={formatNumber(stats.topicsFollowing)} />
        </div>
      </div>

      {/* User badges */}
      <div className="mb-4">
        <UserBadges profile={user} postCount={stats.postCount} followerCount={stats.followers} />
      </div>

      {/* Profile completion banner for self */}
      {isSelf && !user.bio && !user.website && (
        <div className="mb-4 glass-card rounded-2xl p-4 flex items-center gap-3 border border-primary/20">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">Complete your profile</div>
            <div className="text-xs text-muted-foreground">Add a bio and website so people know what you&apos;re about.</div>
          </div>
          <Button size="sm" onClick={() => setEditOpen(true)} className="rounded-lg gap-1.5 shrink-0">
            <Edit className="w-3.5 h-3.5" /> Edit
          </Button>
        </div>
      )}

      {/* Writing stats for self */}
      {isSelf && stats.postCount > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="glass-card rounded-xl p-3 text-center">
            <FileText className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <div className="text-lg font-bold">{stats.postCount}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Posts</div>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <Users className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <div className="text-lg font-bold">{stats.followers}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Followers</div>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <div className="text-lg font-bold">{formatNumber(user.reputation)}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Reputation</div>
          </div>
        </div>
      )}

      <ProfileTabs userId={user.id} initialTab={initialTab} isSelf={isSelf} />

      {/* Edit profile modal */}
      <EditProfileModal open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-card rounded-xl p-3">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">{icon} {label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function ProfileTabs({ userId, initialTab, isSelf }: { userId: string; initialTab?: ProfileTab; isSelf: boolean }) {
  const setView = useUIStore((s) => s.setView);
  const { profile: currentUser } = useAuth();
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [bookmarks, setBookmarks] = React.useState<Post[]>([]);
  const [followingUsers, setFollowingUsers] = React.useState<Profile[]>([]);
  const [followers, setFollowers] = React.useState<Profile[]>([]);
  const [followingTopics, setFollowingTopics] = React.useState<Topic[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      if (!supabase) return;
      // Posts
      const p = await fetchPosts({ authorId: userId, sort: "latest", limit: 50, currentUserId: currentUser?.id });
      if (mounted) setPosts(p);

      // Comments
      const { data: c } = await supabase
        .from("comments")
        .select("*")
        .eq("author_id", userId)
        .eq("removed", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (mounted && c) {
        // Fetch authors (just self here) — actually fetch posts for context
        const postIds = [...new Set(c.map((cm: { post_id: string }) => cm.post_id))];
        const { data: commentPosts } = await supabase.from("posts").select("id, title").in("id", postIds);
        const postMap = new Map<string, string>((commentPosts ?? []).map((p: { id: string; title: string }) => [p.id, p.title]));
        setComments(c.map((cm: Record<string, unknown>) => ({
          id: cm.id, post_id: cm.post_id, author_id: cm.author_id, parent_id: cm.parent_id,
          content: cm.content, mentions: cm.mentions ?? [], removed: false,
          created_at: cm.created_at, updated_at: cm.updated_at,
          post_title: postMap.get(cm.post_id as string) ?? "Untitled",
        })) as Comment[]);
      }

      // Bookmarks (only for self)
      if (isSelf) {
        const b = await fetchPosts({ bookmarkedBy: userId, sort: "latest", limit: 50, currentUserId: currentUser?.id });
        if (mounted) setBookmarks(b);
      }

      // Followers + following
      const { data: followees } = await supabase
        .from("user_followers")
        .select("followee_id, users!user_followers_followee_id_fkey(*)")
        .eq("follower_id", userId);
      if (mounted && followees) {
        setFollowingUsers((followees as { users: Profile }[]).map((r) => r.users));
      }
      const { data: followerRows } = await supabase
        .from("user_followers")
        .select("follower_id, users!user_followers_follower_id_fkey(*)")
        .eq("followee_id", userId);
      if (mounted && followerRows) {
        setFollowers((followerRows as { users: Profile }[]).map((r) => r.users));
      }

      // Topics following
      const { data: tf } = await supabase
        .from("topic_followers")
        .select("topic_id, topics!inner(*)")
        .eq("user_id", userId);
      if (mounted && tf) {
        setFollowingTopics((tf as { topics: Topic }[]).map((r) => r.topics));
      }

      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [userId, isSelf, currentUser?.id]);

  const tab = initialTab ?? "posts";

  return (
    <Tabs defaultValue={tab} className="px-5 lg:px-8">
      <TabsList className="mb-4 overflow-x-auto no-scrollbar">
        <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
        <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
        {isSelf && <TabsTrigger value="bookmarks">Bookmarks ({bookmarks.length})</TabsTrigger>}
        <TabsTrigger value="following">Following ({followingUsers.length})</TabsTrigger>
        <TabsTrigger value="followers">Followers ({followers.length})</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        {isSelf && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
      </TabsList>

      <TabsContent value="posts" className="space-y-4 mt-0">
        {loading ? (
          <div className="glass-card rounded-2xl h-32 animate-pulse" />
        ) : posts.length === 0 ? (
          <EmptyState message="No posts yet." />
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} compact />)
        )}
      </TabsContent>

      <TabsContent value="comments" className="mt-0">
        {comments.length === 0 ? (
          <EmptyState message="No comments yet." />
        ) : (
          <div className="space-y-2">
            {comments.map((c) => (
              <button
                key={c.id}
                onClick={() => setView({ name: "post", postId: c.post_id })}
                className="block w-full text-left glass-card rounded-2xl p-4 hover:shadow-soft transition-shadow"
              >
                <div className="text-xs text-muted-foreground mb-1">
                  Commented on <span className="text-foreground font-medium">{(c as Comment & { post_title: string }).post_title}</span>
                </div>
                <div className="text-sm line-clamp-3 prose-nexus">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.content}</ReactMarkdown>
                </div>
              </button>
            ))}
          </div>
        )}
      </TabsContent>

      {isSelf && (
        <TabsContent value="bookmarks" className="space-y-4 mt-0">
          {bookmarks.length === 0 ? (
            <EmptyState message="No bookmarks yet. Save posts to revisit them later." />
          ) : (
            bookmarks.map((p) => <PostCard key={p.id} post={p} compact />)
          )}
        </TabsContent>
      )}

      <TabsContent value="following" className="mt-0">
        {followingUsers.length === 0 ? (
          <EmptyState message="Not following anyone yet." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {followingUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => setView({ name: "profile", userId: u.id, tab: "posts" })}
                className="flex items-center gap-3 p-3 rounded-xl glass-card hover:shadow-soft transition-shadow text-left"
              >
                <Avatar className="w-10 h-10">
                  {u.avatar_url ? <AvatarImage src={u.avatar_url} alt={u.name} /> : null}
                  <AvatarFallback>{u.name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="followers" className="mt-0">
        {followers.length === 0 ? (
          <EmptyState message="No followers yet." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {followers.map((u) => (
              <button
                key={u.id}
                onClick={() => setView({ name: "profile", userId: u.id, tab: "posts" })}
                className="flex items-center gap-3 p-3 rounded-xl glass-card hover:shadow-soft transition-shadow text-left"
              >
                <Avatar className="w-10 h-10">
                  {u.avatar_url ? <AvatarImage src={u.avatar_url} alt={u.name} /> : null}
                  <AvatarFallback>{u.name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="activity" className="mt-0">
        <ActivityFeed userId={userId} posts={posts} comments={comments} />
      </TabsContent>

      {isSelf && (
        <TabsContent value="analytics" className="mt-0">
          <PostAnalytics userId={userId} />
        </TabsContent>
      )}
    </Tabs>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass-card rounded-2xl p-12 text-center text-sm text-muted-foreground">{message}</div>
  );
}

function ActivityFeed({ userId, posts, comments }: { userId: string; posts: Post[]; comments: (Comment & { post_title?: string })[] }) {
  const setView = useUIStore((s) => s.setView);
  const [votes, setVotes] = React.useState<{ id: string; post_id: string; value: number; created_at: string; post_title: string }[]>([]);

  React.useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    (async () => {
      // Fetch user's votes with post titles
      const { data: voteData } = await supabase
        .from("post_votes")
        .select("post_id, value, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!mounted || !voteData) return;
      const postIds = [...new Set(voteData.map((v: { post_id: string }) => v.post_id))];
      if (postIds.length === 0) { setVotes([]); return; }
      const { data: postTitles } = await supabase
        .from("posts")
        .select("id, title")
        .in("id", postIds);
      const titleMap = new Map<string, string>((postTitles ?? []).map((p: { id: string; title: string }) => [p.id, p.title]));
      setVotes(voteData.map((v: { post_id: string; value: number; created_at: string }) => ({
        id: v.post_id + v.created_at,
        post_id: v.post_id,
        value: v.value,
        created_at: v.created_at,
        post_title: titleMap.get(v.post_id) ?? "Untitled",
      })));
    })();
    return () => { mounted = false; };
  }, [userId, supabase]);

  type ActivityItem = { id: string; type: "post" | "comment" | "upvote" | "downvote"; title: string; sub: string; postId?: string; createdAt: string };
  const items: ActivityItem[] = [
    ...posts.map((p) => ({
      id: "post-" + p.id,
      type: "post" as const,
      title: `Published "${p.title}"`,
      sub: `${p.upvote_count - p.downvote_count} upvotes · ${p.comment_count} comments`,
      postId: p.id,
      createdAt: p.created_at,
    })),
    ...comments.map((c) => ({
      id: "comment-" + c.id,
      type: "comment" as const,
      title: `Commented on "${c.post_title ?? "a post"}"`,
      sub: c.content.slice(0, 80) + (c.content.length > 80 ? "…" : ""),
      postId: c.post_id,
      createdAt: c.created_at,
    })),
    ...votes.map((v) => ({
      id: "vote-" + v.id,
      type: v.value === 1 ? "upvote" as const : "downvote" as const,
      title: `${v.value === 1 ? "Upvoted" : "Downvoted"} "${v.post_title}"`,
      sub: "",
      postId: v.post_id,
      createdAt: v.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 30);

  if (items.length === 0) {
    return <EmptyState message="No recent activity. Start by posting or commenting!" />;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = item.type === "post" ? FileText : item.type === "comment" ? MessageSquare : item.type === "upvote" ? TrendingUp : TrendingUp;
        const color = item.type === "post" ? "text-blue-500 bg-blue-500/15" :
                      item.type === "comment" ? "text-purple-500 bg-purple-500/15" :
                      item.type === "upvote" ? "text-emerald-500 bg-emerald-500/15" :
                      "text-rose-500 bg-rose-500/15";
        return (
          <button
            key={item.id}
            onClick={() => item.postId && setView({ name: "post", postId: item.postId })}
            className="block w-full text-left glass-card rounded-xl p-3 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium line-clamp-1">{item.title}</div>
                {item.sub && <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.sub}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(item.createdAt)} ago</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
