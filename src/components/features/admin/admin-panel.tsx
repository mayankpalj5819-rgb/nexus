"use client";

import { useSignedInUser } from "@/lib/use-signed-in-user";
import * as React from "react";
import { useNexusStore, type AdminTab, type User, type Post, type Topic, type Report } from "@/lib/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Shield, Users, FileText, Hash, Flag, BarChart3, Crown, Ban, Check, X, Trash2, AlertTriangle } from "lucide-react";
import { formatNumber, formatDate, timeAgo } from "@/lib/helpers";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function AdminPanel({ initialTab }: { initialTab?: AdminTab }) {
  const signedInUser = useSignedInUser();
  const setView = useNexusStore((s) => s.setView);

  if (!signedInUser || (signedInUser.role !== "admin" && signedInUser.role !== "moderator")) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Access denied</h2>
        <p className="text-sm text-muted-foreground mb-4">You don&apos;t have permission to access the admin panel.</p>
        <Button onClick={() => setView({ name: "home", feed: "trending" })}>Back home</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-xs text-muted-foreground">Manage users, content, reports, and platform analytics.</p>
        </div>
      </div>

      <Tabs defaultValue={initialTab ?? "dashboard"}>
        <TabsList className="mb-6 overflow-x-auto no-scrollbar">
          <TabsTrigger value="dashboard" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="posts" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Posts</TabsTrigger>
          <TabsTrigger value="topics" className="gap-1.5"><Hash className="w-3.5 h-3.5" /> Topics</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5"><Flag className="w-3.5 h-3.5" /> Reports</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Analytics</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5"><Crown className="w-3.5 h-3.5" /> Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0"><DashboardTab /></TabsContent>
        <TabsContent value="users" className="mt-0"><UsersTab /></TabsContent>
        <TabsContent value="posts" className="mt-0"><PostsTab /></TabsContent>
        <TabsContent value="topics" className="mt-0"><TopicsTab /></TabsContent>
        <TabsContent value="reports" className="mt-0"><ReportsTab /></TabsContent>
        <TabsContent value="analytics" className="mt-0"><AnalyticsTab /></TabsContent>
        <TabsContent value="roles" className="mt-0"><RolesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const users = useNexusStore((s) => s.users);
  const posts = useNexusStore((s) => s.posts);
  const topics = useNexusStore((s) => s.topics);
  const comments = useNexusStore((s) => s.comments);
  const reports = useNexusStore((s) => s.reports);
  const auditLogsRaw = useNexusStore((s) => s.auditLogs);
  const auditLogs = React.useMemo(
    () => [...auditLogsRaw].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [auditLogsRaw]
  );

  const pendingReports = reports.filter((r) => r.status === "pending");
  const bannedUsers = users.filter((u) => u.banned);

  const stats = [
    { label: "Total users", value: users.length, icon: Users, color: "text-blue-500 bg-blue-500/15" },
    { label: "Total posts", value: posts.length, icon: FileText, color: "text-purple-500 bg-purple-500/15" },
    { label: "Topics", value: topics.length, icon: Hash, color: "text-emerald-500 bg-emerald-500/15" },
    { label: "Comments", value: comments.length, icon: FileText, color: "text-amber-500 bg-amber-500/15" },
    { label: "Pending reports", value: pendingReports.length, icon: Flag, color: "text-rose-500 bg-rose-500/15" },
    { label: "Banned users", value: bannedUsers.length, icon: Ban, color: "text-red-500 bg-red-500/15" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold">{formatNumber(s.value)}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <Card className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-3">Recent audit log</h3>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {auditLogs.slice(0, 30).map((log) => {
              const actor = users.find((u) => u.id === log.actorId);
              return (
                <div key={log.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-border/30 last:border-0">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={actor?.avatar} alt={actor?.name} />
                    <AvatarFallback className="text-[10px]">{actor?.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{actor?.name}</span>
                  <span className="text-muted-foreground">{log.action}</span>
                  <span className="text-muted-foreground">· {log.targetType}</span>
                  {log.metadata && <span className="text-muted-foreground">({log.metadata})</span>}
                  <div className="flex-1" />
                  <span className="text-muted-foreground">{timeAgo(log.createdAt)} ago</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function UsersTab() {
  const users = useNexusStore((s) => s.users);
  const banUser = useNexusStore((s) => s.banUser);
  const unbanUser = useNexusStore((s) => s.unbanUser);
  const setRole = useNexusStore((s) => s.setRole);
  const setView = useNexusStore((s) => s.setView);
  const signedInUser = useSignedInUser();
  const [search, setSearch] = React.useState("");

  const filtered = users.filter((u) =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className="rounded-lg max-w-md" />
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3 hidden md:table-cell">Reputation</th>
                <th className="text-left p-3 hidden md:table-cell">Joined</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-border/40 hover:bg-accent/30">
                  <td className="p-3">
                    <button onClick={() => setView({ name: "profile", userId: u.id, tab: "posts" })} className="flex items-center gap-2.5">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={u.avatar} alt={u.name} />
                        <AvatarFallback className="text-xs">{u.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">@{u.username}</div>
                      </div>
                    </button>
                  </td>
                  <td className="p-3">
                    {signedInUser?.role === "admin" && u.id !== signedInUser.id ? (
                      <Select value={u.role} onValueChange={(v) => { setRole(u.id, v as User["role"]); toast.success("Role updated"); }}>
                        <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs capitalize px-2 py-1 rounded-md bg-muted/60">{u.role}</span>
                    )}
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{formatNumber(u.reputation)}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">{formatDate(u.joinedDate)}</td>
                  <td className="p-3">
                    {u.banned ? (
                      <span className="text-xs px-2 py-1 rounded-md bg-destructive/15 text-destructive">Banned</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-500">Active</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {u.id !== signedInUser?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (u.banned) { unbanUser(u.id); toast.success("User unbanned"); }
                          else { banUser(u.id); toast.success("User banned"); }
                        }}
                        className="h-7 text-xs gap-1"
                      >
                        {u.banned ? <Check className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                        {u.banned ? "Unban" : "Ban"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PostsTab() {
  const posts = useNexusStore((s) => s.posts);
  const getUser = useNexusStore((s) => s.getUser);
  const removePost = useNexusStore((s) => s.removePost);
  const setView = useNexusStore((s) => s.setView);
  const [search, setSearch] = React.useState("");

  const filtered = posts.filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts…" className="rounded-lg max-w-md" />
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-3">Post</th>
                <th className="text-left p-3 hidden md:table-cell">Author</th>
                <th className="text-left p-3 hidden lg:table-cell">Created</th>
                <th className="text-left p-3">Score</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const author = getUser(p.authorId);
                return (
                  <tr key={p.id} className="border-t border-border/40 hover:bg-accent/30">
                    <td className="p-3">
                      <button onClick={() => setView({ name: "post", postId: p.id })} className="text-left">
                        <div className="font-medium line-clamp-1 max-w-xs">{p.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{p.preview}</div>
                      </button>
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">{author?.name}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">{timeAgo(p.createdAt)}</td>
                    <td className="p-3 text-xs">{formatNumber(p.upvotes.length - p.downvotes.length)}</td>
                    <td className="p-3">
                      {p.removed ? (
                        <span className="text-xs px-2 py-1 rounded-md bg-destructive/15 text-destructive">Removed</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-500">Live</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {!p.removed && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive">
                              <Trash2 className="w-3 h-3" /> Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove this post?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Provide a reason. The post will be hidden from public view but kept in the database for audit purposes.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Input id={`reason-${p.id}`} placeholder="Reason for removal" />
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => {
                                const reason = (document.getElementById(`reason-${p.id}`) as HTMLInputElement)?.value;
                                removePost(p.id, reason || "Removed by moderator");
                                toast.success("Post removed");
                              }}>Remove post</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TopicsTab() {
  const topics = useNexusStore((s) => s.topics);
  const setView = useNexusStore((s) => s.setView);

  return (
    <Card className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left p-3">Topic</th>
              <th className="text-left p-3 hidden md:table-cell">Parent</th>
              <th className="text-left p-3">Followers</th>
              <th className="text-left p-3">Posts</th>
              <th className="text-right p-3">View</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.id} className="border-t border-border/40 hover:bg-accent/30">
                <td className="p-3">
                  <button onClick={() => setView({ name: "topic", topicId: t.id })} className="flex items-center gap-2">
                    <span className="text-base">{t.icon}</span>
                    <span className="font-medium">{t.name}</span>
                  </button>
                </td>
                <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">
                  {topics.find((p) => p.id === t.parentId)?.name ?? "—"}
                </td>
                <td className="p-3 text-xs">{formatNumber(t.followers.length)}</td>
                <td className="p-3 text-xs">{t.postCount}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setView({ name: "topic", topicId: t.id })} className="h-7 text-xs">Open</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ReportsTab() {
  const reports = useNexusStore((s) => s.reports);
  const users = useNexusStore((s) => s.users);
  const posts = useNexusStore((s) => s.posts);
  const comments = useNexusStore((s) => s.comments);
  const resolveReport = useNexusStore((s) => s.resolveReport);
  const setView = useNexusStore((s) => s.setView);
  const [filter, setFilter] = React.useState<"pending" | "resolved" | "dismissed" | "all">("pending");

  const visible = reports.filter((r) => filter === "all" ? true : r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/40 w-fit">
        {(["pending", "resolved", "dismissed", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === f ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f} ({reports.filter((r) => f === "all" ? true : r.status === f).length})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card className="glass-card p-12 text-center text-sm text-muted-foreground">
          No reports in this filter.
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map((r) => {
            const reporter = users.find((u) => u.id === r.reporterId);
            const target = r.targetType === "post"
              ? posts.find((p) => p.id === r.targetId)
              : r.targetType === "comment"
              ? comments.find((c) => c.id === r.targetId)
              : users.find((u) => u.id === r.targetId);
            return (
              <Card key={r.id} className="glass-card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                    <Flag className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium capitalize">{r.targetType}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-sm">{r.reason}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md capitalize ${
                        r.status === "pending" ? "bg-amber-500/15 text-amber-500" :
                        r.status === "resolved" ? "bg-emerald-500/15 text-emerald-500" :
                        "bg-muted text-muted-foreground"
                      }`}>{r.status}</span>
                    </div>
                    {r.details && <p className="text-xs text-muted-foreground mt-1">{r.details}</p>}
                    <div className="text-xs text-muted-foreground mt-1">
                      Reported by @{reporter?.username} · {timeAgo(r.createdAt)} ago
                    </div>
                    {target && (
                      <div className="mt-2 p-2 rounded-lg bg-muted/40 text-xs">
                        {r.targetType === "post" && (target as Post).title && (
                          <button onClick={() => setView({ name: "post", postId: r.targetId })} className="text-primary hover:underline">
                            View post: {(target as Post).title}
                          </button>
                        )}
                        {r.targetType === "comment" && (target as Comment).content && (
                          <div className="line-clamp-2">{(target as Comment).content}</div>
                        )}
                        {r.targetType === "user" && (target as User).name && (
                          <button onClick={() => setView({ name: "profile", userId: r.targetId, tab: "posts" })} className="text-primary hover:underline">
                            View user: {(target as User).name}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { resolveReport(r.id, "resolved"); toast.success("Marked resolved"); }} className="h-7 text-xs gap-1">
                        <Check className="w-3 h-3" /> Resolve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { resolveReport(r.id, "dismissed"); toast.success("Dismissed"); }} className="h-7 text-xs gap-1">
                        <X className="w-3 h-3" /> Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnalyticsTab() {
  const posts = useNexusStore((s) => s.posts);
  const users = useNexusStore((s) => s.users);
  const topics = useNexusStore((s) => s.topics);
  const comments = useNexusStore((s) => s.comments);

  const totalUpvotes = posts.reduce((sum, p) => sum + p.upvotes.length, 0);
  const totalDownvotes = posts.reduce((sum, p) => sum + p.downvotes.length, 0);
  const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
  const avgReputation = users.length ? users.reduce((s, u) => s + u.reputation, 0) / users.length : 0;
  const topTopics = [...topics].sort((a, b) => b.postCount - a.postCount).slice(0, 8);
  const maxPosts = topTopics[0]?.postCount ?? 1;

  const bars = [
    { label: "Total upvotes", value: totalUpvotes, color: "bg-emerald-500" },
    { label: "Total downvotes", value: totalDownvotes, color: "bg-rose-500" },
    { label: "Total views", value: totalViews, color: "bg-blue-500" },
    { label: "Total comments", value: comments.length, color: "bg-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-3">
        {bars.map((b) => (
          <Card key={b.label} className="glass-card p-4">
            <div className="text-xs text-muted-foreground mb-1">{b.label}</div>
            <div className="text-2xl font-bold mb-2">{formatNumber(b.value)}</div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={`h-full ${b.color}`} style={{ width: `${Math.min(100, (b.value / Math.max(totalViews, 1)) * 100)}%` }} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-3">Top topics by post count</h3>
        <div className="space-y-2">
          {topTopics.map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <span className="text-base w-6">{t.icon}</span>
              <span className="text-sm w-32 truncate">{t.name}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(t.postCount / maxPosts) * 100}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-12 text-right">{t.postCount}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-3">Platform health</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2"><span className="text-muted-foreground">Avg reputation:</span> <span className="font-medium">{Math.round(avgReputation)}</span></div>
          <div className="flex items-center gap-2"><span className="text-muted-foreground">Posts per user:</span> <span className="font-medium">{(posts.length / users.length).toFixed(1)}</span></div>
          <div className="flex items-center gap-2"><span className="text-muted-foreground">Comments per post:</span> <span className="font-medium">{(comments.length / posts.length).toFixed(1)}</span></div>
          <div className="flex items-center gap-2"><span className="text-muted-foreground">Avg upvote ratio:</span> <span className="font-medium">{((totalUpvotes / (totalUpvotes + totalDownvotes)) * 100).toFixed(1)}%</span></div>
        </div>
      </Card>
    </div>
  );
}

function RolesTab() {
  const users = useNexusStore((s) => s.users);
  const setRole = useNexusStore((s) => s.setRole);
  const signedInUser = useSignedInUser();

  const admins = users.filter((u) => u.role === "admin");
  const moderators = users.filter((u) => u.role === "moderator");

  return (
    <div className="space-y-6">
      <Card className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Admins ({admins.length})</h3>
        </div>
        <div className="space-y-2">
          {admins.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg">
              <Avatar className="w-8 h-8"><AvatarImage src={u.avatar} alt={u.name} /><AvatarFallback className="text-xs">{u.name[0]}</AvatarFallback></Avatar>
              <div className="flex-1">
                <div className="text-sm font-medium">{u.name}</div>
                <div className="text-xs text-muted-foreground">@{u.username}</div>
              </div>
              {signedInUser?.id !== u.id && signedInUser?.role === "admin" && (
                <Select value={u.role} onValueChange={(v) => { setRole(u.id, v as User["role"]); toast.success("Role updated"); }}>
                  <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold">Moderators ({moderators.length})</h3>
        </div>
        <div className="space-y-2">
          {moderators.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg">
              <Avatar className="w-8 h-8"><AvatarImage src={u.avatar} alt={u.name} /><AvatarFallback className="text-xs">{u.name[0]}</AvatarFallback></Avatar>
              <div className="flex-1">
                <div className="text-sm font-medium">{u.name}</div>
                <div className="text-xs text-muted-foreground">@{u.username}</div>
              </div>
              {signedInUser?.role === "admin" && (
                <Select value={u.role} onValueChange={(v) => { setRole(u.id, v as User["role"]); toast.success("Role updated"); }}>
                  <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="glass-card p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            Roles are managed via Supabase RLS policies. Admins can ban users, remove posts, manage roles, and view audit logs. Moderators can resolve reports and remove posts. Regular users can post, comment, and vote.
          </div>
        </div>
      </Card>
    </div>
  );
}
