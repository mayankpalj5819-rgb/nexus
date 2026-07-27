"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useUIStore } from "@/lib/ui-store";
import { useAuth } from "@/lib/auth";
import { Search, Home, Compass, Bell, Bookmark, Plus, Shield, Settings, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Post, Topic, Profile } from "@/lib/data";

export function NexusCommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const setView = useUIStore((s) => s.setView);
  const recentSearches = useUIStore((s) => s.recentSearches);
  const { profile } = useAuth();
  const [query, setQuery] = React.useState("");
  const [topics, setTopics] = React.useState<Topic[]>([]);
  const [users, setUsers] = React.useState<Profile[]>([]);
  const [posts, setPosts] = React.useState<Post[]>([]);

  // Reset query when opening
  React.useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  // Fetch initial data for browsing
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { fetchTopics, fetchPosts, supabase } = await import("@/lib/data");
      const [t, p] = await Promise.all([
        fetchTopics(),
        fetchPosts({ sort: "latest", limit: 6 }),
      ]);
      if (mounted) {
        setTopics(t.slice(0, 8));
        setPosts(p);
      }
      if (supabase) {
        const { data: u } = await supabase.from("users").select("*").limit(5);
        if (mounted) setUsers((u ?? []) as Profile[]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Search when query changes
  React.useEffect(() => {
    if (!query.trim()) return;
    let mounted = true;
    const t = setTimeout(async () => {
      const { searchAll } = await import("@/lib/data");
      const r = await searchAll(query, "all", profile?.id);
      if (mounted) {
        setTopics(r.topics.slice(0, 5));
        setUsers(r.users.slice(0, 5));
        setPosts(r.posts.slice(0, 5));
      }
    }, 250);
    return () => { clearTimeout(t); mounted = false; };
  }, [query, profile?.id]);

  const go = (fn: () => void) => {
    fn();
    onOpenChange(false);
  };

  const navItems = [
    { label: "Home — Trending", icon: Home, action: () => setView({ name: "home", feed: "trending" }) },
    { label: "Home — Latest", icon: Home, action: () => setView({ name: "home", feed: "latest" }) },
    { label: "Home — Popular", icon: Home, action: () => setView({ name: "home", feed: "popular" }) },
    { label: "Home — Following", icon: Home, action: () => setView({ name: "home", feed: "following" }) },
    { label: "Explore Topics", icon: Compass, action: () => setView({ name: "topics" }) },
    { label: "Search", icon: Search, action: () => setView({ name: "search" }) },
    { label: "Notifications", icon: Bell, action: () => setView({ name: "notifications" }) },
    { label: "Bookmarks", icon: Bookmark, action: () => setView({ name: "bookmarks" }) },
    { label: "New Post", icon: Plus, action: () => setView({ name: "editor" }) },
    { label: "Settings", icon: Settings, action: () => setView({ name: "settings" }) },
  ];
  if (profile?.role === "admin" || profile?.role === "moderator") {
    navItems.push({ label: "Admin Panel", icon: Shield, action: () => setView({ name: "admin", tab: "dashboard" }) });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-background/60 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl"
          >
            <Command
              className="glass-strong rounded-2xl border border-border/60 shadow-soft overflow-hidden"
              loop
            >
              <div className="flex items-center gap-2 px-4 border-b border-border/50">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search posts, topics, people or jump to…"
                  className="flex-1 bg-transparent border-0 outline-none py-4 text-sm placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Navigate" className="text-xs text-muted-foreground px-2 pt-2">
                  {navItems.map((item) => (
                    <Command.Item
                      key={item.label}
                      onSelect={() => go(item.action)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer aria-selected:bg-accent"
                    >
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      {item.label}
                    </Command.Item>
                  ))}
                </Command.Group>

                {recentSearches.length > 0 && !query && (
                  <Command.Group heading="Recent searches" className="text-xs text-muted-foreground px-2 pt-2">
                    {recentSearches.slice(0, 5).map((q) => (
                      <Command.Item
                        key={q}
                        onSelect={() => go(() => setView({ name: "search", query: q }))}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer aria-selected:bg-accent"
                      >
                        <Search className="w-4 h-4 text-muted-foreground" />
                        {q}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {topics.length > 0 && (
                  <Command.Group heading="Topics" className="text-xs text-muted-foreground px-2 pt-2">
                    {topics.map((t) => (
                      <Command.Item
                        key={t.id}
                        onSelect={() => go(() => setView({ name: "topic", topicId: t.id }))}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer aria-selected:bg-accent"
                      >
                        <span className="text-base">{t.icon}</span>
                        <span className="flex-1">{t.name}</span>
                        <span className="text-xs text-muted-foreground">{t.post_count} posts</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {users.length > 0 && (
                  <Command.Group heading="People" className="text-xs text-muted-foreground px-2 pt-2">
                    {users.map((u) => (
                      <Command.Item
                        key={u.id}
                        onSelect={() => go(() => setView({ name: "profile", userId: u.id, tab: "posts" }))}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer aria-selected:bg-accent"
                      >
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.name} className="w-6 h-6 rounded-full bg-muted" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                            {u.name[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="flex-1">{u.name}</span>
                        <span className="text-xs text-muted-foreground">@{u.username}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {posts.length > 0 && (
                  <Command.Group heading="Posts" className="text-xs text-muted-foreground px-2 pt-2">
                    {posts.map((p) => (
                      <Command.Item
                        key={p.id}
                        onSelect={() => go(() => setView({ name: "post", postId: p.id }))}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer aria-selected:bg-accent"
                      >
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{p.title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
              <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 text-[10px] text-muted-foreground">
                <span>↑↓ navigate · ↵ select · esc close</span>
                <span>Nexus Command</span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
