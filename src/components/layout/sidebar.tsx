"use client";

import * as React from "react";
import { useUIStore, type View } from "@/lib/ui-store";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Home,
  Compass,
  Search,
  Bell,
  Bookmark,
  Plus,
  Shield,
  Settings,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { NexusLogo } from "@/components/shared/nexus-logo";
import type { Topic } from "@/lib/data";

export function NexusSidebar() {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const { profile, signOut } = useAuth();
  const [unread, setUnread] = React.useState(0);
  const [followedTopics, setFollowedTopics] = React.useState<Topic[]>([]);

  // Fetch unread count + followed topics
  React.useEffect(() => {
    if (!profile) return;
    let mounted = true;
    (async () => {
      if (!supabase) return;
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("read", false);
      if (mounted) setUnread(count ?? 0);

      const { data: tf } = await supabase
        .from("topic_followers")
        .select("topic_id, topics!inner(*)")
        .eq("user_id", profile.id);
      if (mounted) setFollowedTopics((tf ?? []).map((r: { topics: Topic }) => r.topics));
    })();
    return () => { mounted = false; };
  }, [profile]);

  const isActive = (name: View["name"]) => view.name === name;

  const items: { name: View["name"]; label: string; icon: React.ReactNode; view: View; badge?: number }[] = [
    { name: "home", label: "Home", icon: <Home className="w-[18px] h-[18px]" />, view: { name: "home", feed: "trending" } },
    { name: "topics", label: "Explore Topics", icon: <Compass className="w-[18px] h-[18px]" />, view: { name: "topics" } },
    { name: "search", label: "Search", icon: <Search className="w-[18px] h-[18px]" />, view: { name: "search" } },
    { name: "notifications", label: "Notifications", icon: <Bell className="w-[18px] h-[18px]" />, view: { name: "notifications" }, badge: unread },
    { name: "bookmarks", label: "Bookmarks", icon: <Bookmark className="w-[18px] h-[18px]" />, view: { name: "bookmarks" } },
  ];

  if (profile?.role === "admin" || profile?.role === "moderator") {
    items.push({
      name: "admin",
      label: "Admin",
      icon: <Shield className="w-[18px] h-[18px]" />,
      view: { name: "admin", tab: "dashboard" },
    });
  }

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col p-4 sticky top-0 self-start max-h-screen overflow-y-auto no-scrollbar">
      <button
        onClick={() => setView({ name: "home", feed: "trending" })}
        className="flex items-center gap-2 px-2 py-3 mb-2"
      >
        <NexusLogo className="w-8 h-8" />
        <span className="text-lg font-semibold tracking-tight">Nexus</span>
      </button>

      <Button
        onClick={() => setView({ name: "editor" })}
        className="mb-4 rounded-xl h-11 gap-2 shadow-glow"
        size="lg"
      >
        <Plus className="w-4 h-4" />
        New Post
        <kbd className="ml-1 hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-background/20 border border-foreground/20">
          ⌘↵
        </kbd>
      </Button>

      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavButton
            key={item.name}
            active={isActive(item.name)}
            label={item.label}
            icon={item.icon}
            badge={item.badge}
            onClick={() => setView(item.view)}
          />
        ))}
      </nav>

      {followedTopics.length > 0 && (
        <div className="mt-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1.5">
            Following
          </div>
          <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto no-scrollbar">
            {followedTopics.map((t) => (
              <button
                key={t.id}
                onClick={() => setView({ name: "topic", topicId: t.id })}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-accent/50 transition-colors text-left"
              >
                <span className="text-base shrink-0">{t.icon}</span>
                <span className="truncate flex-1">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.post_count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {profile && (
        <div className="mt-4">
          <div className="glass-card rounded-xl p-2 flex items-center gap-2.5">
            <button
              onClick={() => setView({ name: "profile", userId: profile.id, tab: "posts" })}
              className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity"
            >
              <Avatar className="w-9 h-9 shrink-0">
                {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.name} /> : null}
                <AvatarFallback>{profile.name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-left">
                <div className="text-sm font-medium truncate">{profile.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {profile.reputation.toLocaleString()} rep
                </div>
              </div>
            </button>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setView({ name: "settings" })}
                    className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { signOut(); toast.success("Signed out"); }}
                    className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
    </aside>
  );
}

function NavButton({
  active,
  label,
  icon,
  badge,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl bg-accent border border-border/50"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      <span className="relative z-10">{icon}</span>
      <span className="relative z-10 flex-1 text-left">{label}</span>
      {badge ? (
        <span className="relative z-10 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}
