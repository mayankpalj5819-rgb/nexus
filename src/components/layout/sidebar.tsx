"use client";

import { useSignedInUser } from "@/lib/use-signed-in-user";
import * as React from "react";
import Link from "next/link";
import { useNexusStore, type View } from "@/lib/store";
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
  User as UserIcon,
  LogOut,
  Sparkles,
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

export function NexusSidebar() {
  const view = useNexusStore((s) => s.view);
  const setView = useNexusStore((s) => s.setView);
  const signedInUser = useSignedInUser();
  const unread = useNexusStore((s) => s.unreadNotificationCount());
  const signOut = useNexusStore((s) => s.signOut);

  const isActive = (name: View["name"]) => view.name === name;

  const items: { name: View["name"]; label: string; icon: React.ReactNode; view: View; badge?: number }[] = [
    { name: "home", label: "Home", icon: <Home className="w-[18px] h-[18px]" />, view: { name: "home", feed: "trending" } },
    { name: "topics", label: "Explore Topics", icon: <Compass className="w-[18px] h-[18px]" />, view: { name: "topics" } },
    { name: "search", label: "Search", icon: <Search className="w-[18px] h-[18px]" />, view: { name: "search" } },
    { name: "notifications", label: "Notifications", icon: <Bell className="w-[18px] h-[18px]" />, view: { name: "notifications" }, badge: unread },
    { name: "bookmarks", label: "Bookmarks", icon: <Bookmark className="w-[18px] h-[18px]" />, view: { name: "bookmarks" } },
  ];

  if (signedInUser?.role === "admin" || signedInUser?.role === "moderator") {
    items.push({
      name: "admin",
      label: "Admin",
      icon: <Shield className="w-[18px] h-[18px]" />,
      view: { name: "admin", tab: "dashboard" },
    });
  }

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col p-4 sticky top-0 self-start max-h-screen overflow-y-auto no-scrollbar">
      {/* Logo */}
      <button
        onClick={() => setView({ name: "home", feed: "trending" })}
        className="flex items-center gap-2 px-2 py-3 mb-2"
      >
        <NexusLogo className="w-8 h-8" />
        <span className="text-lg font-semibold tracking-tight">Nexus</span>
      </button>

      {/* New post */}
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

      {/* Nav */}
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

      {/* Following topics */}
      {signedInUser && signedInUser.followingTopics.length > 0 && (
        <div className="mt-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1.5">
            Following
          </div>
          <FollowingTopics />
        </div>
      )}

      <div className="flex-1" />

      {/* User card */}
      {signedInUser && (
        <div className="mt-4">
          <div className="glass-card rounded-xl p-2 flex items-center gap-2.5">
            <button
              onClick={() => setView({ name: "profile", userId: signedInUser.id, tab: "posts" })}
              className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity"
            >
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={signedInUser.avatar} alt={signedInUser.name} />
                <AvatarFallback>{signedInUser.name[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-left">
                <div className="text-sm font-medium truncate">{signedInUser.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {signedInUser.reputation.toLocaleString()} rep
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

function FollowingTopics() {
  const topics = useNexusStore((s) => s.topics);
  const signedInUser = useSignedInUser();
  const setView = useNexusStore((s) => s.setView);

  if (!signedInUser) return null;

  const followed = topics.filter((t) => signedInUser.followingTopics.includes(t.id));

  return (
    <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto no-scrollbar">
      {followed.map((t) => (
        <button
          key={t.id}
          onClick={() => setView({ name: "topic", topicId: t.id })}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-accent/50 transition-colors text-left"
        >
          <span className="text-base shrink-0">{t.icon}</span>
          <span className="truncate flex-1">{t.name}</span>
          <span className="text-xs text-muted-foreground">
            {t.postCount}
          </span>
        </button>
      ))}
    </div>
  );
}

function NexusLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="nexusGrad3" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="oklch(0.75 0.22 280)" />
          <stop offset="50%" stopColor="oklch(0.7 0.25 304)" />
          <stop offset="100%" stopColor="oklch(0.72 0.18 162)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#nexusGrad3)" />
      <path d="M20 44V20h4l16 16V20h4v24h-4L24 28v16h-4z" fill="white" fillOpacity="0.95" />
      <circle cx="32" cy="32" r="3" fill="white" />
    </svg>
  );
}
