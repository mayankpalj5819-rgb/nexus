"use client";

import { useSignedInUser } from "@/lib/use-signed-in-user";
import * as React from "react";
import { useNexusStore } from "@/lib/store";
import { Home, Compass, Search, Bell, Bookmark, Plus, Shield, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function NexusMobileNav({ onOpenCmd }: { onOpenCmd: () => void }) {
  const view = useNexusStore((s) => s.view);
  const setView = useNexusStore((s) => s.setView);
  const signedInUser = useSignedInUser();
  const unread = useNexusStore((s) => s.unreadNotificationCount());

  const items = [
    { name: "home", label: "Home", icon: Home, view: { name: "home", feed: "trending" } as const },
    { name: "topics", label: "Topics", icon: Compass, view: { name: "topics" } as const },
    { name: "search", label: "Search", icon: Search, view: { name: "search" } as const, onCmd: onOpenCmd },
    { name: "notifications", label: "Alerts", icon: Bell, view: { name: "notifications" } as const, badge: unread },
    { name: "bookmarks", label: "Saved", icon: Bookmark, view: { name: "bookmarks" } as const },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass-strong border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2">
        {items.slice(0, 2).map((item) => (
          <MobileNavButton key={item.name} {...item} active={view.name === item.name} setView={setView} />
        ))}

        {/* Center FAB */}
        <button
          onClick={() => setView({ name: "editor" })}
          className="flex items-center justify-center w-12 h-12 -mt-6 rounded-full bg-primary text-primary-foreground shadow-glow"
        >
          <Plus className="w-5 h-5" />
        </button>

        {items.slice(3).map((item) => (
          <MobileNavButton key={item.name} {...item} active={view.name === item.name} setView={setView} />
        ))}
      </div>
    </div>
  );
}

function MobileNavButton({
  label,
  icon: Icon,
  view: v,
  active,
  setView,
  badge,
  onCmd,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  view: Parameters<ReturnType<typeof useNexusStore.getState>["setView"]>[0];
  active: boolean;
  setView: ReturnType<typeof useNexusStore.getState>["setView"];
  badge?: number;
  onCmd?: () => void;
}) {
  return (
    <button
      onClick={() => (onCmd ? onCmd() : setView(v))}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[58px] transition-colors",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
      {badge ? (
        <span className="absolute top-0 right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  );
}
