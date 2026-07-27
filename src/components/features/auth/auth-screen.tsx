"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, BookOpen, Users, TrendingUp } from "lucide-react";
import { useNexusStore } from "@/lib/store";
import { toast } from "sonner";

export function AuthScreen() {
  const signIn = useNexusStore((s) => s.signIn);
  const users = useNexusStore((s) => s.users);
  const [loading, setLoading] = React.useState(false);

  const handleGoogleSignIn = () => {
    setLoading(true);
    // In production this would redirect through Supabase OAuth with the
    // configured Google provider. In the demo we simulate by signing in
    // as the first seeded user (an admin) so the full app is explorable.
    setTimeout(() => {
      signIn("u1");
      toast.success("Welcome to Nexus");
      setLoading(false);
    }, 700);
  };

  return (
    <div className="min-h-screen w-full bg-background aurora-bg flex flex-col lg:flex-row">
      {/* Left: hero */}
      <div className="flex-1 flex flex-col justify-between p-8 lg:p-16 max-w-2xl">
        <div className="flex items-center gap-2">
          <NexusLogo className="w-9 h-9" />
          <span className="text-xl font-semibold tracking-tight">Nexus</span>
        </div>

        <div className="py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-muted-foreground mb-6"
          >
            <Sparkles className="w-3 h-3" />
            Phase 1 · Public MVP
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl lg:text-6xl font-bold tracking-tight leading-[1.05]"
          >
            People don&apos;t follow<br />
            <span className="gradient-text">creators.</span><br />
            They follow <span className="gradient-text">knowledge.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 text-lg text-muted-foreground max-w-md leading-relaxed"
          >
            A knowledge-first platform organized around <strong className="text-foreground">Topics</strong>,
            <strong className="text-foreground"> Subtopics</strong>, and
            <strong className="text-foreground"> Posts</strong>. Discover ideas, not influencers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-8 flex flex-col sm:flex-row gap-3"
          >
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="group relative inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              <GoogleIcon className="w-5 h-5" />
              {loading ? "Connecting…" : "Continue with Google"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 text-xs text-muted-foreground"
          >
            By continuing you agree to Nexus&apos;s Terms & Privacy Policy.
          </motion.div>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-md">
          <Feature icon={<BookOpen className="w-4 h-4" />} label="Topics" />
          <Feature icon={<TrendingUp className="w-4 h-4" />} label="Trending" />
          <Feature icon={<Users className="w-4 h-4" />} label="Community" />
        </div>
      </div>

      {/* Right: visual / quick demo accounts */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-16 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-chart-4/15 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative w-full max-w-md glass-card rounded-3xl p-6 shadow-soft"
        >
          <div className="text-sm font-medium mb-4 text-muted-foreground">
            Quick demo · explore as any seeded user
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1 no-scrollbar">
            {users.slice(0, 8).map((u) => (
              <button
                key={u.id}
                onClick={() => { signIn(u.id); toast.success(`Signed in as ${u.name}`); }}
                className="group flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors text-left"
              >
                <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full bg-muted" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
            Or use Google OAuth to create your own account.
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="w-7 h-7 rounded-lg glass flex items-center justify-center text-primary">
        {icon}
      </div>
      {label}
    </div>
  );
}

function NexusLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="nexusGrad2" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="oklch(0.75 0.22 280)" />
          <stop offset="50%" stopColor="oklch(0.7 0.25 304)" />
          <stop offset="100%" stopColor="oklch(0.72 0.18 162)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#nexusGrad2)" />
      <path d="M20 44V20h4l16 16V20h4v24h-4L24 28v16h-4z" fill="white" fillOpacity="0.95" />
      <circle cx="32" cy="32" r="3" fill="white" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        opacity="0.7"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        opacity="0.6"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        opacity="0.5"
      />
    </svg>
  );
}
