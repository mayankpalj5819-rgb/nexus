"use client";

import * as React from "react";
import { NexusSidebar } from "@/components/layout/sidebar";
import { NexusTopbar } from "@/components/layout/topbar";
import { NexusCommandPalette } from "@/components/layout/command-palette";
import { NexusMobileNav } from "@/components/layout/mobile-nav";
import { NexusViewRouter } from "@/components/layout/view-router";
import { useUIStore } from "@/lib/ui-store";
import { motion, AnimatePresence } from "framer-motion";

export function NexusRootShell() {
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const view = useUIStore((s) => s.view);

  // Cmd/Ctrl + K command palette
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Cmd/Ctrl + Enter → new post
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && view.name !== "editor") {
        e.preventDefault();
        useUIStore.getState().setView({ name: "editor" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view.name]);

  return (
    <div className="min-h-screen bg-background aurora-bg">
      <div className="mx-auto max-w-[1600px] flex">
        <NexusSidebar />
        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <NexusTopbar onOpenCmd={() => setCmdOpen(true)} />
          <main className="flex-1 px-4 lg:px-8 py-6 pb-24 lg:pb-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={view.name + (view as { postId?: string }).postId + (view as { topicId?: string }).topicId + (view as { userId?: string }).userId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <NexusViewRouter />
              </motion.div>
            </AnimatePresence>
          </main>
          <NexusFooter />
        </div>
        <NexusRightRail />
      </div>
      <NexusMobileNav onOpenCmd={() => setCmdOpen(true)} />
      <NexusCommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}

function NexusRightRail() {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const [trending, setTrending] = React.useState<import("@/lib/data").Post[]>([]);
  const [topics, setTopics] = React.useState<import("@/lib/data").Topic[]>([]);

  React.useEffect(() => {
    if (view.name === "search" || view.name === "admin" || view.name === "editor") return;
    let mounted = true;
    (async () => {
      const { fetchPosts, fetchTopics } = await import("@/lib/data");
      const [t, tops] = await Promise.all([
        fetchPosts({ sort: "trending", limit: 5 }),
        fetchTopics(),
      ]);
      if (mounted) {
        setTrending(t);
        setTopics(tops.filter((x) => !x.parent_id).slice(0, 10));
      }
    })();
    return () => { mounted = false; };
  }, [view.name]);

  if (view.name === "search" || view.name === "admin" || view.name === "editor") return null;

  return (
    <aside className="hidden xl:flex flex-col gap-4 w-80 p-6 sticky top-0 self-start max-h-screen overflow-y-auto no-scrollbar pt-6">
      {trending.length > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Trending now
          </div>
          <ol className="space-y-3">
            {trending.map((p, i) => (
              <li key={p.id}>
                <button
                  onClick={() => setView({ name: "post", postId: p.id })}
                  className="flex gap-3 text-left group w-full"
                >
                  <span className="text-2xl font-bold text-muted-foreground/40 group-hover:text-primary transition-colors w-6 shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {p.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.upvote_count - p.downvote_count} upvotes · {p.comment_count} comments
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {topics.length > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Explore topics
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t) => (
              <button
                key={t.id}
                onClick={() => setView({ name: "topic", topicId: t.id })}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent transition-colors"
                style={{ color: t.color }}
              >
                <span>{t.icon}</span>
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground px-2 leading-relaxed">
        <p className="font-medium text-foreground mb-1">Nexus · Phase 1</p>
        People follow knowledge, not creators. No ads, no algorithmic noise — just ideas organized by topic.
      </div>
    </aside>
  );
}

function NexusFooter() {
  return (
    <footer className="mt-auto border-t border-border/50 py-6 px-4 lg:px-8 text-xs text-muted-foreground">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">Nexus</span>
          <span>·</span>
          <span>Follow knowledge, not people.</span>
        </div>
        <div className="flex items-center gap-4">
          <a className="hover:text-foreground transition-colors cursor-pointer">About</a>
          <a className="hover:text-foreground transition-colors cursor-pointer">Privacy</a>
          <a className="hover:text-foreground transition-colors cursor-pointer">Terms</a>
          <a className="hover:text-foreground transition-colors cursor-pointer">Help</a>
        </div>
      </div>
    </footer>
  );
}
