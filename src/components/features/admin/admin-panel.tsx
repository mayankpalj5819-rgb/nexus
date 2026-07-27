"use client";

import * as React from "react";
import { useUIStore } from "@/lib/ui-store";
import { useAuth, supabase, type Profile } from "@/lib/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Users, FileText, Hash, Flag, BarChart3, Ban, Check, X } from "lucide-react";
import { formatNumber, timeAgo } from "@/lib/helpers";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { Post, Topic, AppNotification } from "@/lib/data";

interface Report {
  id: string;
  reporter_id: string;
  target_type: "post" | "comment" | "user";
  target_id: string;
  reason: string;
  details: string | null;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
}

export function AdminPanel() {
  const { profile } = useAuth();
  const setView = useUIStore((s) => s.setView);

  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
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

      <Tabs defaultValue="dashboard">
        <TabsList className="mb-6 overflow-x-auto no-scrollbar">
          <TabsTrigger value="dashboard" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="topics" className="gap-1.5"><Hash className="w-3.5 h-3.5" /> Topics</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5"><Flag className="w-3.5 h-3.5" /> Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0"><DashboardTab /></TabsContent>
        <TabsContent value="users" className="mt-0"><UsersTab /></TabsContent>
        <TabsContent value="topics" className="mt-0"><TopicsTab /></TabsContent>
        <TabsContent value="reports" className="mt-0"><ReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const [stats, setStats] = React.useState({ users: 0, posts: 0, topics: 0, comments: 0, reports: 0, banned: 0 });

  React.useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    (async () => {
      const [u, p, t, c, r, b] = await Promise.all([
        supabase!.from("users").select("id", { count: "exact", head: true }),
        supabase!.from("posts").select("id", { count: "exact", head: true }).eq("removed", false),
        supabase!.from("topics").select("id", { count: "exact", head: true }),
        supabase!.from("comments").select("id", { count: "exact", head: true }).eq("removed", false),
        supabase!.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase!.from("users").select("id", { count: "exact", head: true }).eq("banned", true),
      ]);
      if (mounted) {
        setStats({
          users: u.count ?? 0,
          posts: p.count ?? 0,
          topics: t.count ?? 0,
          comments: c.count ?? 0,
          reports: r.count ?? 0,
          banned: b.count ?? 0,
        });
      }
    })();
    return () => { mounted = false; };
  }, []);

  const cards = [
    { label: "Total users", value: stats.users, icon: Users, color: "text-blue-500 bg-blue-500/15" },
    { label: "Total posts", value: stats.posts, icon: FileText, color: "text-purple-500 bg-purple-500/15" },
    { label: "Topics", value: stats.topics, icon: Hash, color: "text-emerald-500 bg-emerald-500/15" },
    { label: "Comments", value: stats.comments, icon: FileText, color: "text-amber-500 bg-amber-500/15" },
    { label: "Pending reports", value: stats.reports, icon: Flag, color: "text-rose-500 bg-rose-500/15" },
    { label: "Banned users", value: stats.banned, icon: Ban, color: "text-red-500 bg-red-500/15" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
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
  );
}

function UsersTab() {
  const { profile: currentUser } = useAuth();
  const [users, setUsers] = React.useState<Profile[]>([]);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase!.from("users").select("*").order("created_at", { ascending: false }).limit(100);
      if (mounted) setUsers((data ?? []) as Profile[]);
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = users.filter((u) => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()));

  const toggleBan = async (u: Profile) => {
    if (!supabase) return;
    await supabase.from("users").update({ banned: !u.banned }).eq("id", u.id);
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, banned: !u.banned } : x));
    toast.success(u.banned ? "User unbanned" : "User banned");
  };

  return (
    <div className="space-y-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users…"
        className="w-full max-w-md px-3 py-2 rounded-lg bg-muted/40 text-sm border-0 outline-none"
      />
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3 hidden md:table-cell">Reputation</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-border/40 hover:bg-accent/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-8 h-8">
                        {u.avatar_url ? <AvatarImage src={u.avatar_url} alt={u.name} /> : null}
                        <AvatarFallback className="text-xs">{u.name[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-xs capitalize px-2 py-1 rounded-md bg-muted/60">{u.role}</span>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{formatNumber(u.reputation)}</td>
                  <td className="p-3">
                    {u.banned ? (
                      <span className="text-xs px-2 py-1 rounded-md bg-destructive/15 text-destructive">Banned</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-500">Active</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {u.id !== currentUser?.id && (
                      <Button variant="ghost" size="sm" onClick={() => toggleBan(u)} className="h-7 text-xs gap-1">
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

function TopicsTab() {
  const [topics, setTopics] = React.useState<Topic[]>([]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { fetchTopics } = await import("@/lib/data");
      const t = await fetchTopics();
      if (mounted) setTopics(t);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Card className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left p-3">Topic</th>
              <th className="text-left p-3">Posts</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.id} className="border-t border-border/40 hover:bg-accent/30">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{t.icon}</span>
                    <span className="font-medium">{t.name}</span>
                  </div>
                </td>
                <td className="p-3 text-xs">{t.post_count}</td>
                <td className="p-3 text-xs text-muted-foreground">{timeAgo(t.created_at)} ago</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ReportsTab() {
  const [reports, setReports] = React.useState<Report[]>([]);
  const [filter, setFilter] = React.useState<"pending" | "resolved" | "dismissed" | "all">("pending");

  React.useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase!.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
      if (mounted) setReports((data ?? []) as Report[]);
    })();
    return () => { mounted = false; };
  }, []);

  const visible = reports.filter((r) => filter === "all" ? true : r.status === filter);

  const resolve = async (id: string, status: "resolved" | "dismissed") => {
    if (!supabase) return;
    await supabase.from("reports").update({ status, resolved_at: new Date().toISOString() }).eq("id", id);
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    toast.success(status === "resolved" ? "Marked resolved" : "Dismissed");
  };

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
        <Card className="glass-card p-12 text-center text-sm text-muted-foreground">No reports in this filter.</Card>
      ) : (
        <div className="space-y-2">
          {visible.map((r) => (
            <Card key={r.id} className="glass-card p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                  <Flag className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium capitalize">{r.target_type}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-sm">{r.reason}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-md capitalize ${
                      r.status === "pending" ? "bg-amber-500/15 text-amber-500" :
                      r.status === "resolved" ? "bg-emerald-500/15 text-emerald-500" :
                      "bg-muted text-muted-foreground"
                    }`}>{r.status}</span>
                  </div>
                  {r.details && <p className="text-xs text-muted-foreground mt-1">{r.details}</p>}
                  <div className="text-xs text-muted-foreground mt-1">{timeAgo(r.created_at)} ago</div>
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => resolve(r.id, "resolved")} className="h-7 text-xs gap-1">
                      <Check className="w-3 h-3" /> Resolve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => resolve(r.id, "dismissed")} className="h-7 text-xs gap-1">
                      <X className="w-3 h-3" /> Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Avoid unused import warnings — types are used via inference in render
void ({} as Post | AppNotification);
