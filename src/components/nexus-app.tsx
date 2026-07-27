"use client";

import * as React from "react";
import { NexusRootShell } from "@/components/nexus-root-shell";
import { useAuth } from "@/lib/auth";
import { AuthScreen } from "@/components/features/auth/auth-screen";
import { AnimatePresence, motion } from "framer-motion";
import { NexusLogo } from "@/components/shared/nexus-logo";

export function NexusApp({ children }: { children: React.ReactNode }) {
  // The page route is intentionally unused — Nexus runs as a single-page
  // experience driven by a UI view-state. This keeps the app self-contained.
  void children;

  const { session, loading } = useAuth();

  if (loading) {
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
