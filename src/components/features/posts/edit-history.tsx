"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, X, Eye, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/auth";
import { timeAgo, formatDate, wordCount } from "@/lib/helpers";

// ── Types ────────────────────────────────────────────────────────────────────

interface Editor {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
}

interface RevisionRow {
  id: string;
  post_id: string;
  editor_id: string;
  title: string;
  content: string;
  edited_at: string;
  editor: Editor | null;
}

interface EditHistoryDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// ── Simple word-level diff (LCS) ──────────────────────────────────────────────

type DiffToken = { type: "equal" | "add" | "del"; text: string };

function tokenize(s: string): string[] {
  // Split into runs of whitespace OR runs of non-whitespace, preserving both
  return s.match(/\s+|\S+/g) ?? [];
}

function diffWords(a: string, b: string): DiffToken[] {
  const aw = tokenize(a);
  const bw = tokenize(b);
  const n = aw.length;
  const m = bw.length;

  // dp[i][j] = LCS length of aw[i:] and bw[j:]
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (aw[i] === bw[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const out: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (aw[i] === bw[j]) {
      out.push({ type: "equal", text: aw[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", text: aw[i] });
      i++;
    } else {
      out.push({ type: "add", text: bw[j] });
      j++;
    }
  }
  while (i < n) {
    out.push({ type: "del", text: aw[i] });
    i++;
  }
  while (j < m) {
    out.push({ type: "add", text: bw[j] });
    j++;
  }
  return out;
}

function summarizeDiff(diff: DiffToken[]): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const t of diff) {
    if (!/\S/.test(t.text)) continue;
    if (t.type === "add") additions++;
    else if (t.type === "del") deletions++;
  }
  return { additions, deletions };
}

function diffHasChanges(diff: DiffToken[]): boolean {
  return diff.some((t) => t.type !== "equal");
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EditHistoryDialog({
  postId,
  open,
  onOpenChange,
}: EditHistoryDialogProps) {
  const [loading, setLoading] = React.useState(true);
  const [revisions, setRevisions] = React.useState<RevisionRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch revisions whenever the dialog opens
  React.useEffect(() => {
    if (!open || !supabase) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      const { data, error: queryError } = await supabase
        .from("post_revisions")
        .select(
          `id,
           post_id,
           editor_id,
           title,
           content,
           edited_at,
           editor:users!editor_id ( id, name, username, avatar_url )`
        )
        .eq("post_id", postId)
        .order("edited_at", { ascending: false });

      if (!mounted) return;

      if (queryError) {
        setError(queryError.message);
        setRevisions([]);
      } else {
        // Normalize the editor field — PostgREST embeds as object via single-FK
        // join, but be defensive and handle array form too.
        const raw = (data ?? []) as Array<{
          id: string;
          post_id: string;
          editor_id: string;
          title: string;
          content: string;
          edited_at: string;
          editor: Editor | Editor[] | null;
        }>;
        const normalized: RevisionRow[] = raw.map((r) => ({
          id: r.id,
          post_id: r.post_id,
          editor_id: r.editor_id,
          title: r.title,
          content: r.content,
          edited_at: r.edited_at,
          editor: Array.isArray(r.editor)
            ? (r.editor[0] ?? null)
            : (r.editor ?? null),
        }));
        setRevisions(normalized);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [open, postId]);

  // Esc-to-close + lock body scroll while open
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-label="Post edit history"
          className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:px-4 bg-background/70 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl h-full sm:h-auto sm:max-h-[90vh] glass-strong sm:rounded-2xl border border-border/60 shadow-soft overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <History className="w-5 h-5 text-primary shrink-0" />
                <h2 className="text-base font-semibold truncate">📜 Edit history</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label="Close edit history"
                className="rounded-lg shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-5 py-5 flex-1">
              {loading ? (
                <TimelineSkeleton />
              ) : error ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  Failed to load edit history.
                  <div className="mt-1 text-xs opacity-70">{error}</div>
                </div>
              ) : revisions.length === 0 ? (
                <EmptyState />
              ) : (
                <Timeline revisions={revisions} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function Timeline({ revisions }: { revisions: RevisionRow[] }) {
  return (
    <ol className="relative space-y-4">
      <div
        className="absolute left-[15px] top-2 bottom-2 w-px bg-border/60"
        aria-hidden
      />
      {revisions.map((rev, i) => (
        <RevisionItem
          key={rev.id}
          rev={rev}
          // The "previous" version (older) is the next entry in the desc-ordered list
          prev={revisions[i + 1] ?? null}
          index={i}
          isOldest={i === revisions.length - 1}
        />
      ))}
    </ol>
  );
}

function RevisionItem({
  rev,
  prev,
  index,
  isOldest,
}: {
  rev: RevisionRow;
  prev: RevisionRow | null;
  index: number;
  isOldest: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const editor = rev.editor;

  const titleDiff = prev ? diffWords(prev.title, rev.title) : null;
  const contentDiff = prev ? diffWords(prev.content, rev.content) : null;
  const titleChanged = titleDiff ? diffHasChanges(titleDiff) : false;
  const contentSummary = contentDiff ? summarizeDiff(contentDiff) : null;
  const contentChanged =
    contentDiff !== null &&
    (contentSummary?.additions ?? 0) + (contentSummary?.deletions ?? 0) > 0;

  const prevWords = prev ? wordCount(prev.content) : 0;
  const newWords = wordCount(rev.content);

  const initial = editor?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.06, 0.4) }}
      className="relative pl-10"
    >
      <div
        className="absolute left-[8px] top-3 w-4 h-4 rounded-full border-2 border-primary bg-background"
        aria-hidden
      />

      <div className="glass-card rounded-xl p-4">
        {/* Editor row */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-8 h-8">
            {editor?.avatar_url ? (
              <AvatarImage src={editor.avatar_url} alt={editor.name} />
            ) : null}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">
              {editor?.name ?? "Unknown user"}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {editor ? `@${editor.username}` : "—"}
            </div>
          </div>
          <div
            className="text-xs text-muted-foreground shrink-0"
            title={formatDate(rev.edited_at)}
          >
            Edited {timeAgo(rev.edited_at)} ago
          </div>
        </div>

        {/* Title diff */}
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
            Title
          </div>
          {titleChanged && titleDiff ? (
            <div className="text-sm leading-relaxed break-words">
              <DiffView tokens={titleDiff} />
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">
              {prev ? "Title unchanged" : "First recorded title"}
            </div>
          )}
        </div>

        {/* Content diff summary */}
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
            Content
          </div>
          {contentSummary ? (
            <>
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="text-foreground font-medium">{prevWords}</span>
                  words
                </span>
                <ArrowRight className="w-3 h-3" />
                <span className="inline-flex items-center gap-1">
                  <span className="text-foreground font-medium">{newWords}</span>
                  words
                </span>
                <span className="text-muted-foreground/60">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  +{contentSummary.additions} added
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-medium">
                  −{contentSummary.deletions} removed
                </span>
              </div>
              {contentChanged ? (
                <div className="mt-2 text-sm leading-relaxed break-words line-clamp-3">
                  <DiffView tokens={contentDiff!} />
                </div>
              ) : (
                <div className="mt-1 text-xs text-muted-foreground italic">
                  Content unchanged in this edit
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-muted-foreground italic">
              Initial recorded version · {newWords} words
            </div>
          )}
        </div>

        {/* Expand full version */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="gap-1.5 text-xs h-7"
        >
          <Eye className="w-3.5 h-3.5" />
          {expanded ? "Hide full version" : "View full version"}
        </Button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <pre className="mt-3 whitespace-pre-wrap text-xs bg-muted/50 border border-border/50 rounded-lg p-3 font-mono leading-relaxed text-foreground/90">
                {rev.content}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>

        {isOldest && (
          <div className="mt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
            Earliest recorded revision
          </div>
        )}
      </div>
    </motion.li>
  );
}

function DiffView({ tokens }: { tokens: DiffToken[] }) {
  return (
    <>
      {tokens.map((t, i) => {
        if (t.type === "equal") {
          return <span key={i}>{t.text}</span>;
        }
        if (t.type === "add") {
          return (
            <span
              key={i}
              className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded px-0.5"
            >
              {t.text}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="bg-rose-500/20 text-rose-700 dark:text-rose-300 line-through rounded px-0.5"
          >
            {t.text}
          </span>
        );
      })}
    </>
  );
}

// ── States ────────────────────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <ol className="relative space-y-4">
      <div
        className="absolute left-[15px] top-2 bottom-2 w-px bg-border/60"
        aria-hidden
      />
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="relative pl-10">
          <div
            className="absolute left-[8px] top-3 w-4 h-4 rounded-full border-2 border-border bg-background"
            aria-hidden
          />
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-12 w-full" />
          </div>
        </li>
      ))}
    </ol>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
        <History className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        No edits recorded. This post has never been edited.
      </p>
    </div>
  );
}
