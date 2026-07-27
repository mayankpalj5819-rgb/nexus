"use client";

import * as React from "react";
import { NexusRootShell } from "@/components/nexus-root-shell";
import { useNexusStore } from "@/lib/store";
import { AuthScreen } from "@/components/features/auth/auth-screen";
import { AnimatePresence, motion } from "framer-motion";

export function NexusApp({ children }: { children: React.ReactNode }) {
  // The page route is intentionally unused — Nexus runs as a single-page
  // experience driven by a Zustand view-state. This keeps the app self-
  // contained and gives us full control of transitions.
  void children;

  const session = useNexusStore((s) => s.session);
  const bootstrapped = useNexusStore((s) => s.bootstrapped);
  const bootstrap = useNexusStore((s) => s.bootstrap);

  React.useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (!bootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background aurora-bg">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative w-16 h-16"
          >
            <NexusLogo className="w-16 h-16" />
            <motion.div
              className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-muted-foreground"
          >
            Loading Nexus…
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {session ? (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <NexusRootShell />
        </motion.div>
      ) : (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AuthScreen />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NexusLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="nexusGrad" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="oklch(0.75 0.22 280)" />
          <stop offset="50%" stopColor="oklch(0.7 0.25 304)" />
          <stop offset="100%" stopColor="oklch(0.72 0.18 162)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#nexusGrad)" />
      <path
        d="M20 44V20h4l16 16V20h4v24h-4L24 28v16h-4z"
        fill="white"
        fillOpacity="0.95"
      />
      <circle cx="32" cy="32" r="3" fill="white" />
    </svg>
  );
}
