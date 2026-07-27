"use client";

import { useSignedInUser } from "@/lib/use-signed-in-user";
import * as React from "react";
import { useNexusStore } from "@/lib/store";
import { Search, Bell, Bookmark, Plus, Moon, Sun, ArrowLeft } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export function NexusTopbar({ onOpenCmd }: { onOpenCmd: () => void }) {
  const view = useNexusStore((s) => s.view);
  const setView = useNexusStore((s) => s.setView);
  const goBack = useNexusStore((s) => s.goBack);
  const signedInUser = useSignedInUser();
  const unread = useNexusStore((s) => s.unreadNotificationCount());
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const title = (() => {
    switch (view.name) {
      case "home": return view.feed ? `${view.feed[0].toUpperCase()}${view.feed.slice(1)}` : "Home";
      case "topics": return "Explore Topics";
      case "topic": return "Topic";
      case "post": return "Post";
      case "search": return "Search";
      case "profile": return "Profile";
      case "notifications": return "Notifications";
      case "bookmarks": return "Bookmarks";
      case "admin": return "Admin";
      case "editor": return view.postId ? "Edit Post" : "New Post";
      case "settings": return "Settings";
    }
  })();

  const canGoBack = view.name !== "home";

  return (
    <header className="sticky top-0 z-30 glass-strong border-b border-border/50">
      <div className="flex items-center gap-3 px-4 lg:px-8 h-16">
        {canGoBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="rounded-lg shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}

        <h1 className="text-base font-semibold tracking-tight truncate">{title}</h1>

        <div className="flex-1" />

        {/* Search trigger */}
        <button
          onClick={() => setView({ name: "search" })}
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 hover:bg-muted transition-colors text-sm text-muted-foreground w-64 lg:w-72"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Search Nexus…</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-background/60 border border-border/60">⌘K</kbd>
        </button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-lg shrink-0"
          aria-label="Toggle theme"
        >
          {mounted && theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {/* Quick actions */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setView({ name: "notifications" })}
          className="rounded-lg shrink-0 relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setView({ name: "bookmarks" })}
          className="rounded-lg shrink-0 hidden sm:inline-flex"
          aria-label="Bookmarks"
        >
          <Bookmark className="w-4 h-4" />
        </Button>

        <Button
          onClick={() => setView({ name: "editor" })}
          size="sm"
          className="rounded-lg gap-1.5 lg:hidden"
        >
          <Plus className="w-4 h-4" />
          New
        </Button>

        {signedInUser && (
          <button
            onClick={() => setView({ name: "profile", userId: signedInUser.id, tab: "posts" })}
            className="ml-1 shrink-0"
          >
            <Avatar className="w-9 h-9 ring-2 ring-transparent hover:ring-primary/50 transition-all">
              <AvatarImage src={signedInUser.avatar} alt={signedInUser.name} />
              <AvatarFallback>{signedInUser.name[0]}</AvatarFallback>
            </Avatar>
          </button>
        )}
      </div>
    </header>
  );
}
