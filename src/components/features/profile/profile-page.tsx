"use client";

import { useSignedInUser } from "@/lib/use-signed-in-user";
import * as React from "react";
import { useNexusStore, type ProfileTab, type User, type Post, type Comment } from "@/lib/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PostCard } from "@/components/shared/post-card";
import { Calendar, Link as LinkIcon, MapPin, Award, Users, BookOpen, Edit, Shield, Ban, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { formatNumber, formatDate, timeAgo } from "@/lib/helpers";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ProfilePage({ userId, initialTab }: { userId?: string; initialTab?: ProfileTab }) {
  const signedInUser = useSignedInUser();
  const getUser = useNexusStore((s) => s.getUser);
  const setView = useNexusStore((s) => s.setView);
  const isFollowing = useNexusStore((s) => (userId ? s.isFollowingUser(userId) : false));
  const followUser = useNexusStore((s) => s.followUser);
  const unfollowUser = useNexusStore((s) => s.unfollowUser);
  const banUser = useNexusStore((s) => s.banUser);
  const unbanUser = useNexusStore((s) => s.unbanUser);

  const targetId = userId ?? signedInUser?.id;
  const user = targetId ? getUser(targetId) : undefined;

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <h2 className="text-xl font-semibold mb-2">User not found</h2>
        <Button onClick={() => setView({ name: "home", feed: "trending" })}>Back home</Button>
      </div>
    );
  }

  const isSelf = signedInUser?.id === user.id;
  const canModerate = signedInUser?.role === "admin" && signedInUser?.id !== user.id;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Banner */}
      <div className="h-32 lg:h-44 rounded-3xl mb-[-60px] relative overflow-hidden" style={{
        background: "linear-gradient(135deg, oklch(0.7 0.22 280), oklch(0.65 0.25 304), oklch(0.72 0.18 162))",
      }}>
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
      </div>

      <div className="px-5 lg:px-8">
        {/* Header card */}
        <div className="flex items-end justify-between gap-4 mb-4">
          <div className="flex items-end gap-4">
            <Avatar className="w-24 h-24 rounded-3xl ring-4 ring-background shrink-0">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-3xl">{user.name[0]}</AvatarFallback>
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
              <Button variant="outline" onClick={() => setView({ name: "settings" })} className="rounded-xl gap-1.5">
                <Edit className="w-3.5 h-3.5" /> Edit profile
              </Button>
            ) : (
              <>
                <Button
                  variant={isFollowing ? "secondary" : "default"}
                  onClick={() => {
                    if (isFollowing) { unfollowUser(user.id); toast.success("Unfollowed"); }
                    else { followUser(user.id); toast.success("Following"); }
                  }}
                  className="rounded-xl"
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
                {canModerate && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (user.banned) { unbanUser(user.id); toast.success("User unbanned"); }
                      else { banUser(user.id); toast.success("User banned"); }
                    }}
                    className="rounded-xl gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    {user.banned ? "Unban" : "Ban"}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-sm leading-relaxed mb-4 max-w-2xl">{user.bio}</p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Joined {formatDate(user.joinedDate)}
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

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
          <StatCard icon={<Award className="w-4 h-4" />} label="Reputation" value={formatNumber(user.reputation)} />
          <StatCard icon={<Users className="w-4 h-4" />} label="Followers" value={formatNumber(user.followers.length)} />
          <StatCard icon={<Users className="w-4 h-4" />} label="Following" value={formatNumber(user.followingUsers.length)} />
          <StatCard icon={<BookOpen className="w-4 h-4" />} label="Topics" value={formatNumber(user.followingTopics.length)} />
        </div>
      </div>

      {/* Tabs */}
      <ProfileTabs user={user} initialTab={initialTab} />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-card rounded-xl p-3">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        {icon} {label}
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function ProfileTabs({ user, initialTab }: { user: User; initialTab?: ProfileTab }) {
  const getUserPosts = useNexusStore((s) => s.getUserPosts);
  const getUserComments = useNexusStore((s) => s.getUserComments);
  const getBookmarkedPosts = useNexusStore((s) => s.getBookmarkedPosts);
  const getTopic = useNexusStore((s) => s.getTopic);
  const getUser = useNexusStore((s) => s.getUser);
  const topics = useNexusStore((s) => s.topics);
  const users = useNexusStore((s) => s.users);
  const setView = useNexusStore((s) => s.setView);
  const signedInUser = useSignedInUser();
  const isSelf = signedInUser?.id === user.id;

  const tab = initialTab ?? "posts";

  const posts = getUserPosts(user.id);
  const comments = getUserComments(user.id);
  const bookmarks = getBookmarkedPosts(user.id);
  const followingTopics = topics.filter((t) => user.followingTopics.includes(t.id));
  const followers = users.filter((u) => user.followers.includes(u.id));
  const followingUsers = users.filter((u) => user.followingUsers.includes(u.id));

  return (
    <Tabs defaultValue={tab} className="px-5 lg:px-8">
      <TabsList className="mb-4 overflow-x-auto no-scrollbar">
        <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
        <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
        {isSelf && <TabsTrigger value="bookmarks">Bookmarks ({bookmarks.length})</TabsTrigger>}
        <TabsTrigger value="following">Following ({user.followingUsers.length})</TabsTrigger>
        <TabsTrigger value="followers">Followers ({user.followers.length})</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="posts" className="space-y-4 mt-0">
        {posts.length === 0 ? (
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
            {comments.map((c) => {
              const post = useNexusStore.getState().getPost(c.postId);
              return (
                <button
                  key={c.id}
                  onClick={() => post && setView({ name: "post", postId: post.id })}
                  className="block w-full text-left glass-card rounded-2xl p-4 hover:shadow-soft transition-shadow"
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    Commented on <span className="text-foreground font-medium">{post?.title}</span> · {timeAgo(c.createdAt)}
                  </div>
                  <div className="text-sm line-clamp-3 prose-nexus">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.content}</ReactMarkdown>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>↑ {c.upvotes.length}</span>
                    <span>↓ {c.downvotes.length}</span>
                  </div>
                </button>
              );
            })}
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
                  <AvatarImage src={u.avatar} alt={u.name} />
                  <AvatarFallback>{u.name[0]}</AvatarFallback>
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
                  <AvatarImage src={u.avatar} alt={u.name} />
                  <AvatarFallback>{u.name[0]}</AvatarFallback>
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
        <ActivityList userId={user.id} />
      </TabsContent>
    </Tabs>
  );
}

function ActivityList({ userId }: { userId: string }) {
  const getAuditLogs = useNexusStore((s) => s.getAuditLogs);
  const getUserPosts = useNexusStore((s) => s.getUserPosts);
  const getUserComments = useNexusStore((s) => s.getUserComments);
  const setView = useNexusStore((s) => s.setView);

  const posts = getUserPosts(userId);
  const comments = getUserComments(userId);

  type Item = { id: string; type: string; text: string; sub: string; action?: () => void };
  const items: Item[] = [
    ...posts.map((p) => ({
      id: p.id,
      type: "post",
      text: `Published "${p.title}"`,
      sub: `${timeAgo(p.createdAt)} ago · ${p.upvotes.length - p.downvotes.length} upvotes`,
      action: () => setView({ name: "post", postId: p.id }),
    })),
    ...comments.map((c) => ({
      id: c.id,
      type: "comment",
      text: `Commented on a post`,
      sub: `${timeAgo(c.createdAt)} ago · ${c.upvotes.length} upvotes`,
      action: () => setView({ name: "post", postId: c.postId }),
    })),
  ].sort((a, b) => 0); // approximate; timestamps already in titles

  if (items.length === 0) {
    return <EmptyState message="No recent activity." />;
  }

  return (
    <div className="space-y-2">
      {items.slice(0, 20).map((item) => (
        <button
          key={item.id}
          onClick={item.action}
          className="block w-full text-left glass-card rounded-xl p-3 hover:bg-accent/50 transition-colors"
        >
          <div className="text-sm font-medium">{item.text}</div>
          <div className="text-xs text-muted-foreground">{item.sub}</div>
        </button>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass-card rounded-2xl p-12 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
