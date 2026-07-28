"use client";

import * as React from "react";
import { supabase } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Ban, X } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/lib/helpers";

/* ========================================================================== */
/*  Types                                                                      */
/* ========================================================================== */

/** A single blocked-user row, flattened after joining blocked_users → users. */
interface BlockedUser {
  blocked_id: string;
  created_at: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

/** Raw shape returned by the nested Supabase select (before flattening). */
interface RawBlockRow {
  created_at: string;
  blocked_id: string;
  blocked: {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export interface BlockManagerProps {
  userId: string;
}

/* ========================================================================== */
/*  Exported helper functions                                                  */
/* ========================================================================== */

/**
 * Block a user. Inserts a row into `blocked_users`. Throws on error so callers
 * can handle failures (e.g. show a toast). RLS enforces that the blocker can
 * only insert rows where blocker_id = auth.uid().
 */
export async function blockUser(
  blockerId: string,
  blockedId: string
): Promise<void> {
  if (!supabase) throw new Error("Supabase client not initialized");
  if (!blockerId || !blockedId) throw new Error("Missing user id");
  if (blockerId === blockedId) throw new Error("Cannot block yourself");

  const { error } = await supabase
    .from("blocked_users")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });

  if (error) throw error;
}

/**
 * Unblock a user. Deletes the matching row from `blocked_users`. Throws on
 * error. Safe to call even if the row doesn't exist (delete is idempotent).
 */
export async function unblockUser(
  blockerId: string,
  blockedId: string
): Promise<void> {
  if (!supabase) throw new Error("Supabase client not initialized");
  if (!blockerId || !blockedId) throw new Error("Missing user id");

  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);

  if (error) throw error;
}

/**
 * Check whether `blockerId` has blocked `blockedId`. Returns false on any
 * unexpected error (fail-open) so the UI never wrongly hides content behind a
 * "blocked" gate.
 */
export async function isUserBlocked(
  blockerId: string,
  blockedId: string
): Promise<boolean> {
  if (!supabase) return false;
  if (!blockerId || !blockedId) return false;

  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocked_id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  if (error) {
    console.error("[block-manager] isUserBlocked error:", error);
    return false;
  }
  return data !== null;
}

/* ========================================================================== */
/*  Component                                                                  */
/* ========================================================================== */

/**
 * BlockManager — shows a user's blocked list inside a glass card and lets them
 * unblock with a single click (optimistic, with rollback on failure).
 *
 * Fetches from `blocked_users` joined to `users` on `blocked_id` to pull in
 * name / username / avatar_url in a single round-trip.
 */
export function BlockManager({ userId }: BlockManagerProps) {
  const [blocked, setBlocked] = React.useState<BlockedUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [unblocking, setUnblocking] = React.useState(false);

  // ── Fetch blocked users (joined with users table) ────────────────────────
  const fetchBlocked = React.useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from("blocked_users")
      .select(
        `
        created_at,
        blocked_id,
        blocked:users!blocked_id(name, username, avatar_url)
      `
      )
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[block-manager] fetch error:", error);
      toast.error("Failed to load blocked users");
      setBlocked([]);
    } else {
      const rows = (data ?? []) as unknown as RawBlockRow[];
      setBlocked(
        rows.map((r) => ({
          blocked_id: r.blocked_id,
          created_at: r.created_at,
          name: r.blocked?.name ?? null,
          username: r.blocked?.username ?? null,
          avatar_url: r.blocked?.avatar_url ?? null,
        }))
      );
    }

    setLoading(false);
  }, [userId]);

  React.useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  // ── Unblock handler (optimistic with rollback) ───────────────────────────
  const handleUnblock = React.useCallback(
    async (target: BlockedUser) => {
      // Snapshot for rollback before mutating.
      const prev = blocked;
      setBlocked((cur) => cur.filter((b) => b.blocked_id !== target.blocked_id));
      setUnblocking(true);

      const label = target.name ?? target.username ?? "user";

      try {
        await unblockUser(userId, target.blocked_id);
        toast.success(`Unblocked ${label}`);
      } catch (err) {
        console.error("[block-manager] unblock error:", err);
        setBlocked(prev); // rollback
        toast.error("Failed to unblock user");
      } finally {
        setUnblocking(false);
      }
    },
    [blocked, userId]
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <section className="glass-card rounded-2xl p-5">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Ban className="size-4 text-destructive" aria-hidden="true" />
          <span>🚫 Blocked users</span>
        </h2>
        {!loading && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
            {blocked.length}
          </span>
        )}
      </header>

      {loading ? (
        <SkeletonList />
      ) : blocked.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          You haven&apos;t blocked anyone.
        </p>
      ) : (
        <ul className="space-y-1">
          {blocked.map((u) => (
            <BlockedRow
              key={u.blocked_id}
              user={u}
              onUnblock={() => handleUnblock(u)}
              disabled={unblocking}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/* ========================================================================== */
/*  Sub-components                                                             */
/* ========================================================================== */

function BlockedRow({
  user,
  onUnblock,
  disabled,
}: {
  user: BlockedUser;
  onUnblock: () => void;
  disabled: boolean;
}) {
  const displayName = user.name ?? user.username ?? "Unknown user";
  const initials = React.useMemo(() => {
    const base = displayName.trim();
    if (!base) return "?";
    const parts = base.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  }, [displayName]);

  return (
    <li className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-accent/40">
      <Avatar className="size-10">
        {user.avatar_url ? (
          <AvatarImage src={user.avatar_url} alt={displayName} />
        ) : null}
        <AvatarFallback className="text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          {displayName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {user.username ? <>@{user.username} · </> : null}
          Blocked {timeAgo(user.created_at)} ago
        </p>
      </div>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onUnblock}
        disabled={disabled}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={`Unblock ${displayName}`}
      >
        <X className="size-4" aria-hidden="true" />
        Unblock
      </Button>
    </li>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

export default BlockManager;
