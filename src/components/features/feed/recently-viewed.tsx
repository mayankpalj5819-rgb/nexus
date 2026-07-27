"use client";

import * as React from "react";
import { useUIStore } from "@/lib/ui-store";
import { timeAgo } from "@/lib/helpers";
import { Clock, X, Eye } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ViewedPost {
  postId: string;
  title: string;
  topicName: string;
  topicIcon: string;
  viewedAt: string;
}

export interface TrackablePost {
  id: string;
  title: string;
  topicName?: string;
  topicIcon?: string;
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "nexus-recently-viewed";
const MAX_ENTRIES = 5;

function readViewedPosts(): ViewedPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is ViewedPost =>
        e !== null &&
        typeof e === "object" &&
        typeof (e as ViewedPost).postId === "string" &&
        typeof (e as ViewedPost).title === "string" &&
        typeof (e as ViewedPost).topicName === "string" &&
        typeof (e as ViewedPost).topicIcon === "string" &&
        typeof (e as ViewedPost).viewedAt === "string"
    );
  } catch {
    return [];
  }
}

function writeViewedPosts(entries: ViewedPost[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    // Notify listeners in the same tab (storage event only fires cross-tab).
    window.dispatchEvent(new CustomEvent("nexus-recently-viewed-change"));
  } catch {
    /* ignore quota / privacy mode errors */
  }
}

// ---------------------------------------------------------------------------
// Exported helper — call from post detail page (or anywhere a post is viewed)
// ---------------------------------------------------------------------------

export function trackViewedPost(post: TrackablePost): void {
  if (typeof window === "undefined") return;
  if (!post.id || !post.title) return;

  const entry: ViewedPost = {
    postId: post.id,
    title: post.title,
    topicName: post.topicName ?? "",
    topicIcon: post.topicIcon ?? "",
    viewedAt: new Date().toISOString(),
  };

  const current = readViewedPosts();
  // Drop any prior entry for the same post so it can be re-pinned to the top.
  const filtered = current.filter((e) => e.postId !== post.id);
  const next = [entry, ...filtered].slice(0, MAX_ENTRIES);
  writeViewedPosts(next);
}

function clearViewedPosts(): void {
  writeViewedPosts([]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecentlyViewed() {
  const setView = useUIStore((s) => s.setView);
  const [entries, setEntries] = React.useState<ViewedPost[]>([]);
  const [mounted, setMounted] = React.useState(false);

  // Load once on mount, then subscribe to in-tab + cross-tab changes.
  React.useEffect(() => {
    setMounted(true);
    setEntries(readViewedPosts());

    const sync = () => setEntries(readViewedPosts());
    window.addEventListener("storage", sync);
    window.addEventListener("nexus-recently-viewed-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("nexus-recently-viewed-change", sync);
    };
  }, []);

  const goToPost = (postId: string) => setView({ name: "post", postId });

  const handleClear = () => {
    clearViewedPosts();
    setEntries([]);
  };

  // Avoid SSR/CSR hydration mismatch — render a stable shell until mounted.
  if (!mounted) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <Header />
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Clock className="w-4 h-4 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <Header />
      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ul className="space-y-0.5">
            {entries.map((entry) => (
              <ViewedPostRow
                key={entry.postId}
                entry={entry}
                onNavigate={() => goToPost(entry.postId)}
              />
            ))}
          </ul>
          <ClearButton onClick={handleClear} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Header() {
  return (
    <header className="mb-2 flex items-center gap-2">
      <Clock className="w-4 h-4 text-primary" />
      <h2 className="text-sm font-semibold">Recently viewed</h2>
    </header>
  );
}

function ViewedPostRow({
  entry,
  onNavigate,
}: {
  entry: ViewedPost;
  onNavigate: () => void;
}) {
  const icon = entry.topicIcon || "📰";
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onNavigate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onNavigate();
          }
        }}
        className="group flex items-center gap-3 rounded-xl px-2 py-2 cursor-pointer hover:bg-accent/60 transition-colors"
      >
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/60 text-base"
          aria-hidden
        >
          <span>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">
            {entry.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {entry.topicName ? `${entry.topicName} · ` : ""}
            {timeAgo(entry.viewedAt)} ago
          </p>
        </div>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-accent/60 text-accent-foreground">
        <Eye className="w-5 h-5" />
      </div>
      <p className="text-sm font-medium">No recent views yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Posts you view will appear here for quick access.
      </p>
    </div>
  );
}

function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/60 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
    >
      <X className="w-3 h-3" />
      Clear history
    </button>
  );
}

export default RecentlyViewed;
