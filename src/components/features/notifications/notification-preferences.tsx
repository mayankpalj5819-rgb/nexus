"use client";

import * as React from "react";
import { Bell, Mail, Moon, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type EmailDigestFrequency = "never" | "daily" | "weekly";

export interface NotificationPrefs {
  likeNotifications: boolean;
  replyNotifications: boolean;
  mentionNotifications: boolean;
  followNotifications: boolean;
  topicUpdateNotifications: boolean;
  emailDigestFrequency: EmailDigestFrequency;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "HH:MM" (24h)
  quietHoursEnd: string;   // "HH:MM" (24h)
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "nexus-notification-prefs";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  likeNotifications: true,
  replyNotifications: true,
  mentionNotifications: true,
  followNotifications: true,
  topicUpdateNotifications: true,
  emailDigestFrequency: "weekly",
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
};

const FREQUENCY_OPTIONS: ReadonlyArray<{ value: EmailDigestFrequency; label: string }> = [
  { value: "never", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (exported)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the current notification preferences from localStorage.
 * Falls back to defaults on the server, if localStorage is unavailable,
 * or if the stored value is missing/invalid.
 */
export function getNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_NOTIFICATION_PREFS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

/** Convert an "HH:MM" string into minutes-since-midnight. Returns -1 if invalid. */
function timeStringToMinutes(t: string): number {
  const parts = t.split(":").map(Number);
  if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
    return -1;
  }
  const [h, m] = parts;
  if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

/**
 * Determine whether the given time falls inside the user's quiet-hours window.
 *
 * Handles overnight windows (e.g. 22:00 → 08:00) by treating `start >= end`
 * as wrapping across midnight. Uses the current time if `now` is omitted and
 * the current prefs if `prefs` is omitted.
 */
export function isQuietHours(
  now: Date = new Date(),
  prefs: NotificationPrefs = getNotificationPrefs()
): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const start = timeStringToMinutes(prefs.quietHoursStart);
  const end = timeStringToMinutes(prefs.quietHoursEnd);
  if (start < 0 || end < 0) return false;
  if (start === end) return false; // zero-length window

  const current = now.getHours() * 60 + now.getMinutes();

  if (start < end) {
    // Same-day window, e.g. 09:00 → 17:00
    return current >= start && current < end;
  }
  // Overnight window, e.g. 22:00 → 08:00
  return current >= start || current < end;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: toggle row
// ─────────────────────────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function ToggleRow({ label, description, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function NotificationPreferences() {
  const { profile } = useAuth();
  const [prefs, setPrefs] = React.useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);

  // Load stored prefs on mount (client-only).
  React.useEffect(() => {
    setPrefs(getNotificationPrefs());
  }, []);

  // Type-safe field updater.
  const update = React.useCallback(
    <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSave = React.useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      toast.success("Notification preferences saved", {
        description: profile ? `Updated for @${profile.username}` : undefined,
      });
    } catch {
      toast.error("Failed to save preferences");
    }
  }, [prefs, profile]);

  const handleReset = React.useCallback(() => {
    setPrefs({ ...DEFAULT_NOTIFICATION_PREFS });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore — in-memory state is already reset
    }
    toast.info("Reset to defaults", {
      description: "Click Save to persist the changes.",
    });
  }, []);

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Bell className="w-5 h-5 text-primary shrink-0" />
        <h2 className="text-lg font-semibold tracking-tight">🔔 Notification preferences</h2>
      </div>

      {/* Activity toggles */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Activity
        </h3>
        <div className="divide-y divide-border/60">
          <ToggleRow
            label="Likes"
            description="When someone likes one of your posts."
            checked={prefs.likeNotifications}
            onCheckedChange={(v) => update("likeNotifications", v)}
          />
          <ToggleRow
            label="Replies"
            description="When someone replies to your posts."
            checked={prefs.replyNotifications}
            onCheckedChange={(v) => update("replyNotifications", v)}
          />
          <ToggleRow
            label="Mentions"
            description="When someone mentions you with @username."
            checked={prefs.mentionNotifications}
            onCheckedChange={(v) => update("mentionNotifications", v)}
          />
          <ToggleRow
            label="Follows"
            description="When someone starts following you."
            checked={prefs.followNotifications}
            onCheckedChange={(v) => update("followNotifications", v)}
          />
          <ToggleRow
            label="Topic updates"
            description="Important changes in topics you follow."
            checked={prefs.topicUpdateNotifications}
            onCheckedChange={(v) => update("topicUpdateNotifications", v)}
          />
        </div>
      </section>

      {/* Email digest */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Email digest
          </h3>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">Digest frequency</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              A summary of what you missed, delivered to your inbox.
            </p>
          </div>
          <Select
            value={prefs.emailDigestFrequency}
            onValueChange={(v) => update("emailDigestFrequency", v as EmailDigestFrequency)}
          >
            <SelectTrigger className="w-32" aria-label="Email digest frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Quiet hours */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Moon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">Quiet hours</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pause non-essential notifications during a set time window.
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.quietHoursEnabled}
            onCheckedChange={(v) => update("quietHoursEnabled", v)}
            aria-label="Toggle quiet hours"
          />
        </div>

        {prefs.quietHoursEnabled && (
          <div className="grid grid-cols-2 gap-3 pl-6">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Start</span>
              <input
                type="time"
                value={prefs.quietHoursStart}
                onChange={(e) => update("quietHoursStart", e.target.value)}
                aria-label="Quiet hours start time"
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">End</span>
              <input
                type="time"
                value={prefs.quietHoursEnd}
                onChange={(e) => update("quietHoursEnd", e.target.value)}
                aria-label="Quiet hours end time"
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </label>
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to defaults
        </Button>
        <Button size="sm" onClick={handleSave} className="gap-1.5">
          <Save className="w-3.5 h-3.5" />
          Save
        </Button>
      </div>
    </div>
  );
}
