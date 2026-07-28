"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const SHORTCUTS = [
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["⌘", "↵"], label: "New post" },
  { keys: ["?"], label: "Show this help" },
  { keys: ["G", "H"], label: "Go home" },
  { keys: ["G", "T"], label: "Explore topics" },
  { keys: ["G", "S"], label: "Search" },
  { keys: ["G", "N"], label: "Notifications" },
  { keys: ["G", "B"], label: "Bookmarks" },
  { keys: ["G", "P"], label: "Your profile" },
  { keys: ["Esc"], label: "Close dialogs" },
  { keys: ["J"], label: "Next post in feed" },
  { keys: ["K"], label: "Previous post in feed" },
];

export function KeyboardShortcutsOverlay({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/60 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg glass-strong rounded-2xl border border-border/60 shadow-soft overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-primary" />
                <h2 className="text-base font-semibold">Keyboard shortcuts</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-lg">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {SHORTCUTS.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k, i) => (
                      <kbd
                        key={i}
                        className="min-w-[24px] h-6 px-1.5 inline-flex items-center justify-center rounded-md bg-muted/60 border border-border text-[11px] font-mono font-medium"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-border/50 text-xs text-muted-foreground">
              Press <kbd className="px-1 py-0.5 rounded bg-muted/60 border border-border text-[10px]">?</kbd> anywhere to open this dialog.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
