"use client";

import { useSignedInUser } from "@/lib/use-signed-in-user";
import * as React from "react";
import { useNexusStore, type NotificationType } from "@/lib/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, AtSign, UserPlus, Bell, Check, CheckCheck, Info } from "lucide-react";
import { motion } from "framer-motion";
import { timeAgo } from "@/lib/helpers";
import { toast } from "sonner";

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  like: Heart,
  reply: MessageSquare,
  mention: AtSign,
  follow: UserPlus,
  topic_update: Bell,
  system: Info,
};

const COLORS: Record<NotificationType, string> = {
  like: "text-rose-500 bg-rose-500/15",
  reply: "text-blue-500 bg-blue-500/15",
  mention: "text-amber-500 bg-amber-500/15",
  follow: "text-emerald-500 bg-emerald-500/15",
  topic_update: "text-purple-500 bg-purple-500/15",
  system: "text-muted-foreground bg-muted",
};

export function NotificationsPage() {
  const notifications = useNexusStore((s) => s.notifications);
  const signedInUser = useSignedInUser();
  const markRead = useNexusStore((s) => s.markNotificationRead);
  const markAllRead = useNexusStore((s) => s.markAllNotificationsRead);
  const getUser = useNexusStore((s) => s.getUser);
  const getPost = useNexusStore((s) => s.getPost);
  const getTopic = useNexusStore((s) => s.getTopic);
  const setView = useNexusStore((s) => s.setView);
  const [filter, setFilter] = React.useState<"all" | "unread">("all");

  if (!signedInUser) return null;
  const userNotifs = notifications
    .filter((n) => n.userId === signedInUser.id)
    .filter((n) => (filter === "unread" ? !n.read : true))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = notifications.filter((n) => n.userId === signedInUser.id && !n.read).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { markAllRead(); toast.success("All marked as read"); }}
          disabled={unreadCount === 0}
          className="rounded-lg gap-1.5"
        >
          <CheckCheck className="w-3.5 h-3.5" /> Mark all read
        </Button>
      </div>

      {/* Filter */}
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

      {/* List */}
      {userNotifs.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/50 flex items-center justify-center">
            <Bell className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">No notifications</h3>
          <p className="text-sm text-muted-foreground">When someone interacts with you, it&apos;ll show up here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {userNotifs.map((n, i) => {
            const actor = n.actorId ? getUser(n.actorId) : null;
            const post = n.postId ? getPost(n.postId) : null;
            const topic = n.topicId ? getTopic(n.topicId) : null;
            const Icon = ICONS[n.type];
            const color = COLORS[n.type];

            const handleClick = () => {
              if (!n.read) markRead(n.id);
              if (post) setView({ name: "post", postId: post.id });
              else if (topic) setView({ name: "topic", topicId: topic.id });
              else if (actor) setView({ name: "profile", userId: actor.id, tab: "posts" });
            };

            return (
              <motion.button
                key={n.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={handleClick}
                className={`w-full text-left glass-card rounded-2xl p-3 flex items-start gap-3 hover:shadow-soft transition-shadow ${
                  !n.read ? "ring-1 ring-primary/30" : ""
                }`}
              >
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Actor avatar */}
                {actor && (
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={actor.avatar} alt={actor.name} />
                    <AvatarFallback>{actor.name[0]}</AvatarFallback>
                  </Avatar>
                )}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-snug">{n.message}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {timeAgo(n.createdAt)} ago
                    {post && <span> · in <span className="text-foreground/80">{post.title}</span></span>}
                    {topic && <span> · in <span className="text-foreground/80">{topic.name}</span></span>}
                  </div>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
