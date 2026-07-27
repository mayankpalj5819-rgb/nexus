"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, BookOpen, Users, TrendingUp, Shield, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { NexusLogo } from "@/components/shared/nexus-logo";
import { toast } from "sonner";

export function AuthScreen() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // OAuth redirect happens — toast is just in case it fails
      toast.success("Redirecting to Google…");
    } catch (e) {
      console.error(e);
      toast.error("Could not start Google sign-in");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background aurora-bg flex flex-col lg:flex-row">
      {/* Left: hero */}
      <div className="flex-1 flex flex-col justify-between p-8 lg:p-16 max-w-2xl">
        <div className="flex items-center gap-2">
          <NexusLogo className="w-9 h-9" />
          <span className="text-xl font-semibold tracking-tight">Nexus</span>
          <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full glass text-muted-foreground uppercase tracking-wider font-semibold">Beta</span>
        </div>

        <div className="py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-muted-foreground mb-6"
          >
            <Sparkles className="w-3 h-3" />
            Phase 1 · Now in production
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
            className="mt-8"
          >
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="group relative inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60"
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

      {/* Right: visual / value props */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-16 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-chart-4/15 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative w-full max-w-md space-y-3"
        >
          <ValueProp
            icon={<BookOpen className="w-5 h-5" />}
            title="Follow topics, not people"
            description="Science → Physics → Mechanics → Newton's Laws. Dive as deep as you want."
            delay={0.35}
          />
          <ValueProp
            icon={<Shield className="w-5 h-5" />}
            title="No algorithmic noise"
            description="Trending, latest, popular, following. You decide what you see."
            delay={0.45}
          />
          <ValueProp
            icon={<Zap className="w-5 h-5" />}
            title="Built for thinking"
            description="Rich markdown editor, nested discussions, real reputation for helpful answers."
            delay={0.55}
          />
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

function ValueProp({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card rounded-2xl p-5 flex items-start gap-4 shadow-soft"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
    </motion.div>
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
