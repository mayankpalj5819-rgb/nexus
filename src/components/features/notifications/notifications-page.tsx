"use client";

import * as React from "react";
import { useUIStore } from "@/lib/ui-store";
import { useAuth } from "@/lib/auth";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, type AppNotification } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, AtSign, UserPlus, Bell, Check, CheckCheck, Info } from "lucide-react";
import { motion } from "framer-motion";
import { timeAgo } from "@/lib/helpers";
import { toast } from "sonner";

const ICONS = {
  like: Heart, reply: MessageSquare, mention: AtSign, follow: UserPlus, topic_update: Bell, system: Info,
} as const;

const COLORS = {
  like: "text-rose-500 bg-rose-500/15",
  reply: "text-blue-500 bg-blue-500/15",
  mention: "text-amber-500 bg-amber-500/15",
  follow: "text-emerald-500 bg-emerald-500/15",
  topic_update: "text-purple-500 bg-purple-500/15",
  system: "text-muted-foreground bg-muted",
} as const;

export function NotificationsPage() {
  const { profile } = useAuth();
  const setView = useUIStore((s) => s.setView);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<"all" | "unread">("all");

  const load = React.useCallback(async () => {
    if (!profile) return;
    const data = await fetchNotifications(profile.id);
    setNotifications(data);
    setLoading(false);
  }, [profile]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (!profile) return null;

  const visible = notifications.filter((n) => (filter === "unread" ? !n.read : true));
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClick = async (n: AppNotification) => {
    if (!n.read) await markNotificationRead(n.id);
    if (n.post_id) setView({ name: "post", postId: n.post_id });
    else if (n.topic_id) setView({ name: "topic", topicId: n.topic_id });
    else if (n.actor_id) setView({ name: "profile", userId: n.actor_id, tab: "posts" });
    await load();
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead(profile.id);
    toast.success("All marked as read");
    await load();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-xs text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleMarkAll} disabled={unreadCount === 0} className="rounded-lg gap-1.5">
          <CheckCheck className="w-3.5 h-3.5" /> Mark all read
        </Button>
      </div>

      <div className="flex items-center gap-1 mb-4 p-0.5 rounded-xl bg-muted/40 w-fit">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === f ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="glass-card rounded-2xl h-16 animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/50 flex items-center justify-center">
            <Bell className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">No notifications</h3>
          <p className="text-sm text-muted-foreground">When someone interacts with you, it&apos;ll show up here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((n, i) => {
            const Icon = ICONS[n.type];
            const color = COLORS[n.type];
            return (
              <motion.button
                key={n.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => handleClick(n)}
                className={`w-full text-left glass-card rounded-2xl p-3 flex items-start gap-3 hover:shadow-soft transition-shadow ${
                  !n.read ? "ring-1 ring-primary/30" : ""
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {n.actor && (
                  <Avatar className="w-8 h-8 shrink-0">
                    {n.actor.avatar_url ? <AvatarImage src={n.actor.avatar_url} alt={n.actor.name} /> : null}
                    <AvatarFallback>{n.actor.name[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-snug">{n.message}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)} ago</div>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
