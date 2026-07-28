"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X, Clock } from "lucide-react";
import { useUIStore } from "@/lib/ui-store";
import { readingTime, timeAgo } from "@/lib/helpers";
import { supabase } from "@/lib/auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

/* ========================================================================== */
/*  ReadingList — save-for-later quick-access queue (right rail widget)       */
/* ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReadingListEntry {
  postId: string;
  title: string;
  topicName: string;
  topicIcon: string;
  savedAt: string;
  estimatedReadTime: number;
}

/** Shape accepted by the helper — mirrors what post cards expose. */
export interface SaveablePost {
  id: string;
  title: string;
  topicName?: string;
  topicIcon?: string;
  content?: string;
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "nexus-reading-list";
const MAX_ENTRIES = 10;
const CHANGE_EVENT = "nexus-reading-list-change";

function isEntry(v: unknown): v is ReadingListEntry {
  if (v === null || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.postId === "string" &&
    typeof e.title === "string" &&
    typeof e.topicName === "string" &&
    typeof e.topicIcon === "string" &&
    typeof e.savedAt === "string" &&
    typeof e.estimatedReadTime === "number"
  );
}

function readReadingList(): ReadingListEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

function writeReadingList(entries: ReadingListEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    // storage event only fires cross-tab — fire a custom one for same-tab sync.
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

// ---------------------------------------------------------------------------
// Exported helper — call from post cards, the post detail page, or anywhere.
// ---------------------------------------------------------------------------

export function addToReadingList(post: SaveablePost): void {
  if (typeof window === "undefined") return;
  if (!post.id || !post.title) return;

  const entry: ReadingListEntry = {
    postId: post.id,
    title: post.title,
    topicName: post.topicName ?? "",
    topicIcon: post.topicIcon ?? "",
    savedAt: new Date().toISOString(),
    estimatedReadTime: readingTime(post.content ?? ""),
  };

  const current = readReadingList();
  // Move-to-top if already saved; otherwise prepend.
  const filtered = current.filter((e) => e.postId !== post.id);
  const next = [entry, ...filtered].slice(0, MAX_ENTRIES);
  writeReadingList(next);
}

function removeFromReadingList(postId: string): void {
  const next = readReadingList().filter((e) => e.postId !== postId);
  writeReadingList(next);
}

function clearReadingList(): void {
  writeReadingList([]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReadingList() {
  const setView = useUIStore((s) => s.setView);
  const [entries, setEntries] = React.useState<ReadingListEntry[]>([]);
  const [mounted, setMounted] = React.useState(false);

  // Load once on mount, then keep in sync across re-renders and tabs.
  React.useEffect(() => {
    setMounted(true);
    setEntries(readReadingList());

    const sync = () => setEntries(readReadingList());
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const goToPost = (postId: string) => setView({ name: "post", postId });

  const handleRemove = (postId: string) => {
    removeFromReadingList(postId);
    setEntries((prev) => prev.filter((e) => e.postId !== postId));
  };

  const handleClear = () => {
    clearReadingList();
    setEntries([]);
  };

  // Stable shell until mounted — avoids SSR/CSR hydration mismatch.
  if (!mounted) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <Header />
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <BookOpen className="w-4 h-4 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <Header count={entries.length} />
      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ul className="space-y-0.5">
            {entries.map((entry) => (
              <ReadingListRow
                key={entry.postId}
                entry={entry}
                onNavigate={() => goToPost(entry.postId)}
                onRemove={() => handleRemove(entry.postId)}
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
// ReadingList sub-components
// ---------------------------------------------------------------------------

function Header({ count }: { count?: number }) {
  return (
    <header className="mb-2 flex items-center gap-2">
      <span aria-hidden>📖</span>
      <h2 className="text-sm font-semibold">Reading list</h2>
      {typeof count === "number" && count > 0 && (
        <span className="ml-auto rounded-full bg-accent/60 px-2 py-0.5 text-xs font-medium text-accent-foreground">
          {count}
        </span>
      )}
    </header>
  );
}

function ReadingListRow({
  entry,
  onNavigate,
  onRemove,
}: {
  entry: ReadingListEntry;
  onNavigate: () => void;
  onRemove: () => void;
}) {
  const icon = entry.topicIcon || "📰";
  return (
    <li className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-accent/60 transition-colors">
      <button
        type="button"
        onClick={onNavigate}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`Open ${entry.title}`}
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
            <Clock className="mr-0.5 inline-block w-3 h-3 align-[-2px]" />
            {entry.estimatedReadTime} min read · saved {timeAgo(entry.savedAt)} ago
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
        aria-label="Remove from reading list"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-accent/60 text-accent-foreground">
        <BookOpen className="w-5 h-5" />
      </div>
      <p className="text-sm font-medium">Save posts to read later.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Your reading queue lives here for quick access.
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
      Clear all
    </button>
  );
}

/* ========================================================================== */
/*  MentionAutocomplete — @ mention dropdown for comments / posts             */
/* ========================================================================== */

// Minimal user shape — a subset of Profile sufficient for the dropdown.
interface MentionUser {
  id: string;
  username: string;
  name: string;
  avatar_url: string | null;
}

export interface MentionAutocompleteProps {
  /** Current @-query (without the leading @). Empty string hides the dropdown. */
  query: string;
  /** Fired with the chosen username (no leading @). */
  onSelect: (username: string) => void;
  /** Absolute pixel coordinates for the floating dropdown. */
  position: { top: number; left: number };
}

const MAX_RESULTS = 5;

export function MentionAutocomplete({
  query,
  onSelect,
  position,
}: MentionAutocompleteProps) {
  const [users, setUsers] = React.useState<MentionUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);

  const trimmed = query.trim();
  const open = trimmed.length > 0;

  // Debounced username search.
  React.useEffect(() => {
    if (!open) {
      setUsers([]);
      setHighlight(0);
      return;
    }
    const client = supabase;
    if (!client) return;

    let cancelled = false;
    setLoading(true);

    const handle = window.setTimeout(async () => {
      try {
        const { data, error } = await client
          .from("users")
          .select("id, username, name, avatar_url")
          .ilike("username", `%${trimmed}%`)
          .eq("banned", false)
          .order("reputation", { ascending: false })
          .limit(MAX_RESULTS);

        if (cancelled || error) return;
        const rows = (data ?? []) as unknown as MentionUser[];
        setUsers(rows);
        setHighlight(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [trimmed, open]);

  // Clamp highlight when the result set shrinks.
  React.useEffect(() => {
    if (highlight >= users.length) setHighlight(0);
  }, [users.length, highlight]);

  // Keyboard navigation. Capture phase so we beat the textarea's default
  // behaviour for arrow / enter / escape while the dropdown is open.
  React.useEffect(() => {
    if (!open || users.length === 0) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setHighlight((h) => (h + 1) % users.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setHighlight((h) => (h - 1 + users.length) % users.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const chosen = users[highlight];
        if (chosen) onSelect(chosen.username);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onSelect(""); // empty signal → parent closes the dropdown
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, users, highlight, onSelect]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        style={{ top: position.top, left: position.left }}
        className="glass-strong fixed z-50 w-72 rounded-xl border border-border/60 p-1 shadow-soft"
        role="listbox"
        aria-label="Mention users"
      >
        {loading && users.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Searching users…
          </div>
        ) : users.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            No matching users.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {users.map((u, i) => (
              <MentionRow
                key={u.id}
                user={u}
                highlighted={i === highlight}
                onSelect={() => onSelect(u.username)}
              />
            ))}
          </ul>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function MentionRow({
  user,
  highlighted,
  onSelect,
}: {
  user: MentionUser;
  highlighted: boolean;
  onSelect: () => void;
}) {
  const initials = React.useMemo(() => {
    const base = (user.name || user.username).trim();
    if (!base) return "?";
    const parts = base.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  }, [user.name, user.username]);

  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={highlighted}
        onMouseEnter={() => {
          /* hover is handled visually via CSS; highlight stays keyboard-driven */
        }}
        onClick={onSelect}
        className={[
          "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
          highlighted ? "bg-accent/70" : "hover:bg-accent/40",
        ].join(" ")}
      >
        <Avatar className="size-7">
          {user.avatar_url ? (
            <AvatarImage src={user.avatar_url} alt={user.name} />
          ) : null}
          <AvatarFallback className="text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">
            {user.name || user.username}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            @{user.username}
          </p>
        </div>
      </button>
    </li>
  );
}

export default ReadingList;
