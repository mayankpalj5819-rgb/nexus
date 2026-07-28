"use client";

import * as React from "react";
import type { Profile } from "@/lib/auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BadgeDef {
  icon: string;
  label: string;
  description: string;
}

/**
 * Compute the list of badges a user has earned based on profile + activity.
 * Order matters: badges render in the same order they're pushed here, which
 * matches the product spec (founding → posts → followers → reputation → roles).
 */
function computeBadges(
  profile: Profile,
  postCount: number,
  followerCount: number
): BadgeDef[] {
  const badges: BadgeDef[] = [];

  // 🌱 Founding Member
  // TODO: replace placeholder with a real "first 1000 users" check (e.g. by
  // joined_date or a backfilled user_seq column). For now, always show.
  badges.push({
    icon: "🌱",
    label: "Founding Member",
    description: "Joined during the early days of the community.",
  });

  // ✍️ First Post
  if (postCount >= 1) {
    badges.push({
      icon: "✍️",
      label: "First Post",
      description: "Published their first post.",
    });
  }

  // 📚 Prolific
  if (postCount >= 10) {
    badges.push({
      icon: "📚",
      label: "Prolific",
      description: "Published 10 or more posts.",
    });
  }

  // 🏆 Century
  if (postCount >= 100) {
    badges.push({
      icon: "🏆",
      label: "Century",
      description: "Published 100 or more posts.",
    });
  }

  // 👥 Followed
  if (followerCount >= 10) {
    badges.push({
      icon: "👥",
      label: "Followed",
      description: "Reached 10 followers.",
    });
  }

  // ⭐ Popular
  if (followerCount >= 100) {
    badges.push({
      icon: "⭐",
      label: "Popular",
      description: "Reached 100 followers.",
    });
  }

  // 💎 Reputation 1K
  if (profile.reputation >= 1000) {
    badges.push({
      icon: "💎",
      label: "Reputation 1K",
      description: "Earned 1,000 reputation points.",
    });
  }

  // 👑 Reputation 10K
  if (profile.reputation >= 10000) {
    badges.push({
      icon: "👑",
      label: "Reputation 10K",
      description: "Earned 10,000 reputation points.",
    });
  }

  // 🛡️ Moderator
  if (profile.role === "moderator") {
    badges.push({
      icon: "🛡️",
      label: "Moderator",
      description: "Trusted to help keep the community healthy.",
    });
  }

  // ⚡ Admin
  if (profile.role === "admin") {
    badges.push({
      icon: "⚡",
      label: "Admin",
      description: "Site administrator with full access.",
    });
  }

  return badges;
}

export interface UserBadgesProps {
  profile: Profile;
  postCount: number;
  followerCount: number;
}

/**
 * Renders the set of badges a user has earned as small glass pills with
 * hover-to-reveal descriptions. Falls back to a muted prompt when the user
 * has no badges yet.
 */
export function UserBadges({
  profile,
  postCount,
  followerCount,
}: UserBadgesProps) {
  const badges = computeBadges(profile, postCount, followerCount);

  if (badges.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No badges yet — keep contributing!
      </p>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((badge) => (
          <Tooltip key={badge.label}>
            <TooltipTrigger asChild>
              <span
                className="glass-card inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium cursor-default select-none transition-shadow hover:shadow-soft"
                aria-label={`${badge.label} — ${badge.description}`}
              >
                <span aria-hidden="true">{badge.icon}</span>
                <span>{badge.label}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>{badge.description}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
