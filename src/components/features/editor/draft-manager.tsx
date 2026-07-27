"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, AlertCircle, Target, ChevronDown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ========================================================================== */
/*                          DraftAutosaveIndicator                            */
/* ========================================================================== */

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export interface DraftAutosaveIndicatorProps {
  status: AutosaveStatus;
  lastSaved?: Date;
}

/** "just now" / "Xm ago" / "Xh ago" / "Xd ago" — the spec calls for "Xm ago". */
function formatSavedAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

const STATUS_LABEL: Record<AutosaveStatus, string> = {
  idle: "Draft will autosave",
  saving: "Saving...",
  saved: "Saved",
  error: "Error",
};

export function DraftAutosaveIndicator({
  status,
  lastSaved,
}: DraftAutosaveIndicatorProps) {
  // Re-render every 30s so "Xm ago" stays fresh without an external timer.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % 1_000_000), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const tone =
    status === "saved"
      ? "text-emerald-500 dark:text-emerald-400"
      : status === "error"
        ? "text-destructive"
        : status === "saving"
          ? "text-foreground/80"
          : "text-muted-foreground";

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-xs font-medium backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`icon-${status}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-3.5 w-3.5 items-center justify-center"
          >
            {status === "saving" && (
              <Loader2 className={cn("h-3.5 w-3.5 animate-spin text-primary")} />
            )}
            {status === "saved" && (
              <Check className={cn("h-3.5 w-3.5", tone)} strokeWidth={2.75} />
            )}
            {status === "error" && (
              <AlertCircle className={cn("h-3.5 w-3.5", tone)} strokeWidth={2.25} />
            )}
            {status === "idle" && (
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
            )}
          </motion.span>
        </AnimatePresence>
      </span>

      {/* Label */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`label-${status}`}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className={cn("tabular-nums", tone)}
        >
          {STATUS_LABEL[status]}
        </motion.span>
      </AnimatePresence>

      {/* Last saved timestamp */}
      <AnimatePresence initial={false}>
        {lastSaved && (
          <motion.span
            key="last-saved"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden whitespace-nowrap text-muted-foreground/70"
          >
            <span className="px-1 text-muted-foreground/40">·</span>
            Last saved {formatSavedAgo(lastSaved)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================================================================== */
/*                                WritingGoals                                 */
/* ========================================================================== */

export interface WritingGoalsProps {
  currentWords: number;
}

const GOAL_STORAGE_KEY = "nexus-writing-goal";
const DEFAULT_GOAL = 500;
const GOAL_PRESETS: readonly number[] = [100, 250, 500, 1000, 2000] as const;

const CONFETTI_EMOJIS: readonly string[] = [
  "🎉",
  "🎊",
  "✨",
  "🌟",
  "💫",
  "🎯",
  "🔥",
  "💜",
  "🚀",
  "📝",
] as const;

interface ConfettiParticle {
  id: number;
  emoji: string;
  angle: number; // degrees, 0 = right, 90 = down
  distance: number; // px
  rotate: number; // deg
  delay: number; // s
  duration: number; // s
  size: number; // px
}

function generateParticles(): ConfettiParticle[] {
  const count = 18;
  return Array.from({ length: count }, (_, i) => {
    const angle = (360 / count) * i + (Math.random() - 0.5) * 18;
    return {
      id: i,
      emoji: CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length] ?? "🎉",
      angle,
      distance: 70 + Math.random() * 80,
      rotate: (Math.random() - 0.5) * 540,
      delay: Math.random() * 0.12,
      duration: 1.4 + Math.random() * 0.9,
      size: 14 + Math.random() * 12,
    };
  });
}

function motivationalMessage(pct: number): { text: string; tone: string } {
  if (pct >= 100)
    return { text: "Goal achieved! Outstanding work.", tone: "text-emerald-500 dark:text-emerald-400" };
  if (pct >= 75)
    return { text: "Almost there — finish strong!", tone: "text-primary" };
  if (pct >= 50)
    return { text: "Halfway there. Keep going!", tone: "text-primary" };
  if (pct >= 25)
    return { text: "Making solid progress.", tone: "text-muted-foreground" };
  if (pct > 0)
    return { text: "Warming up the keyboard...", tone: "text-muted-foreground" };
  return { text: "Let's get started!", tone: "text-muted-foreground" };
}

function ConfettiBurst() {
  const particles = React.useMemo(() => generateParticles(), []);
  return (
    <motion.div
      key="confetti-burst"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-visible"
      aria-hidden
    >
      <div className="relative">
        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          return (
            <motion.span
              key={p.id}
              initial={{ opacity: 1, x: 0, y: 0, scale: 0.3, rotate: 0 }}
              animate={{
                opacity: 0,
                x: Math.cos(rad) * p.distance,
                y: Math.sin(rad) * p.distance + 24,
                scale: 1.1,
                rotate: p.rotate,
              }}
              transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
              className="absolute left-0 top-0 leading-none"
              style={{ fontSize: `${p.size}px` }}
            >
              {p.emoji}
            </motion.span>
          );
        })}
      </div>
    </motion.div>
  );
}

export function WritingGoals({ currentWords }: WritingGoalsProps) {
  // SSR-safe: default until we read localStorage on mount.
  const [goal, setGoal] = React.useState<number>(DEFAULT_GOAL);
  const [hydrated, setHydrated] = React.useState(false);
  const [celebrating, setCelebrating] = React.useState(false);
  const prevReachedRef = React.useRef<boolean>(currentWords >= DEFAULT_GOAL);

  // ── Load stored goal on mount ──
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GOAL_STORAGE_KEY);
      if (raw !== null) {
        const parsed = Number.parseInt(raw, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          setGoal(parsed);
          // Re-arm the "reached" baseline so we don't celebrate on a stored
          // goal that's already met.
          prevReachedRef.current = currentWords >= parsed;
        }
      } else {
        prevReachedRef.current = currentWords >= DEFAULT_GOAL;
      }
    } catch {
      // localStorage may be unavailable (private mode, etc.) — fall back to default.
    } finally {
      setHydrated(true);
    }
    // Only run once on mount.
  }, []);

  // ── Persist goal whenever it changes (after hydration) ──
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(GOAL_STORAGE_KEY, String(goal));
    } catch {
      // Ignore write failures — in-memory state still works.
    }
  }, [goal, hydrated]);

  // ── Celebrate when transitioning from <100% → 100% ──
  const reached = currentWords >= goal;
  React.useEffect(() => {
    if (reached && !prevReachedRef.current) {
      setCelebrating(true);
      const id = window.setTimeout(() => setCelebrating(false), 2600);
      prevReachedRef.current = true;
      return () => window.clearTimeout(id);
    }
    if (!reached && prevReachedRef.current) {
      // Re-arm so we celebrate again if they climb back to the goal.
      prevReachedRef.current = false;
    }
  }, [reached, goal]);

  const percentage = React.useMemo(
    () => Math.min(100, Math.round((currentWords / goal) * 100)),
    [currentWords, goal],
  );
  const isComplete = percentage >= 100;
  const message = motivationalMessage(percentage);

  const handleGoalChange = React.useCallback((value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      setGoal(parsed);
    }
  }, []);

  return (
    <div className="glass-card relative overflow-hidden rounded-2xl p-4">
      <AnimatePresence>
        {celebrating && <ConfettiBurst />}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
              isComplete
                ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400"
                : "bg-primary/10 text-primary",
            )}
          >
            {isComplete ? (
              <Trophy className="h-3.5 w-3.5" />
            ) : (
              <Target className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="text-sm font-semibold">Writing goal</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 rounded-lg px-2 text-xs font-medium"
            >
              <Target className="h-3 w-3 opacity-60" />
              <span className="tabular-nums">{goal.toLocaleString()}</span>
              <span className="text-muted-foreground">words</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="glass-card w-44 rounded-xl border-border/50 p-1.5 shadow-soft"
          >
            <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Daily goal
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 bg-border/50" />
            <DropdownMenuRadioGroup
              value={String(goal)}
              onValueChange={handleGoalChange}
            >
              {GOAL_PRESETS.map((preset) => (
                <DropdownMenuRadioItem
                  key={preset}
                  value={String(preset)}
                  className="rounded-lg py-1.5 text-sm tabular-nums"
                >
                  {preset.toLocaleString()} words
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress bar */}
      <Progress
        value={percentage}
        aria-label={`Writing progress: ${percentage}% of ${goal.toLocaleString()} words`}
        className={cn(
          "h-2.5",
          isComplete && "[&_[data-slot=progress-indicator]]:bg-emerald-500 dark:[&_[data-slot=progress-indicator]]:bg-emerald-400",
        )}
      />

      {/* Stats row */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">
            {currentWords.toLocaleString()}
          </span>
          {" / "}
          {goal.toLocaleString()} words
        </span>
        <motion.span
          key={`pct-${isComplete ? "done" : "active"}`}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
          className={cn(
            "text-xs font-semibold tabular-nums",
            isComplete
              ? "text-emerald-500 dark:text-emerald-400"
              : "text-primary",
          )}
        >
          {percentage}%
        </motion.span>
      </div>

      {/* Motivational message */}
      <div className="mt-2 flex items-center gap-1.5">
        {isComplete ? (
          <Trophy className="h-3 w-3 shrink-0 text-emerald-500 dark:text-emerald-400" />
        ) : (
          <Target className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={message.text}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn("text-xs", message.tone)}
          >
            {message.text}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
