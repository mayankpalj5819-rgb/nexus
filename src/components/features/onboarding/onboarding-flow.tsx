"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  BookOpen,
  Compass,
} from "lucide-react";
import { useAuth, supabase } from "@/lib/auth";
import { fetchTopics, followTopic, type Topic } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { NexusLogo } from "@/components/shared/nexus-logo";
import { toast } from "sonner";

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

type Step = "welcome" | "pick" | "success";

const MIN_SELECTION = 3;
const TARGET_SELECTION = 5;
const STEP_ORDER: readonly Step[] = ["welcome", "pick", "success"] as const;

function storageKey(userId: string): string {
  return `nexus-onboarding-complete-${userId}`;
}

/**
 * Mix an arbitrary CSS color with transparency. Supports `#rgb`, `#rrggbb`,
 * `oklch(...)`, `var(--...)`, and named colors — falls back to `color-mix`
 * for anything we can't statically append alpha to.
 */
function withAlpha(color: string, alpha: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, alpha)) * 100);
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    const a = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0");
    return `${color}${a}`;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const expanded = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    return withAlpha(expanded, alpha);
  }
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function OnboardingFlow() {
  const { profile } = useAuth();

  const [visible, setVisible] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [step, setStep] = React.useState<Step>("welcome");
  const [topics, setTopics] = React.useState<Topic[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [loadingTopics, setLoadingTopics] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // --- Visibility check: profile exists + no localStorage flag + 0 follows ---
  React.useEffect(() => {
    if (!profile) {
      setChecking(false);
      setVisible(false);
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.localStorage.getItem(storageKey(profile.id))
    ) {
      setChecking(false);
      setVisible(false);
      return;
    }

    let cancelled = false;
    setChecking(true);

    (async () => {
      if (!supabase) {
        setChecking(false);
        return;
      }
      const { count, error } = await supabase
        .from("topic_followers")
        .select("topic_id", { count: "exact", head: true })
        .eq("user_id", profile.id);

      if (cancelled) return;
      setChecking(false);

      if (error) {
        console.error("Onboarding visibility check error:", error);
        return;
      }

      if ((count ?? 0) === 0) {
        setVisible(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile]);

  // --- Topic loading (lazy, triggered when entering the pick step) ---
  const loadTopics = React.useCallback(async () => {
    if (topics.length > 0 || loadingTopics) return;
    setLoadingTopics(true);
    try {
      const all = await fetchTopics();
      const root = all.filter((t) => t.parent_id === null);
      setTopics(root);
    } catch (e) {
      console.error("fetchTopics error during onboarding:", e);
      toast.error("Could not load topics. Please try again.");
    } finally {
      setLoadingTopics(false);
    }
  }, [topics.length, loadingTopics]);

  const handleStart = () => {
    void loadTopics();
    setStep("pick");
  };

  const handleBack = () => setStep("welcome");

  const toggleTopic = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= TARGET_SELECTION) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const handleContinue = () => {
    if (selected.size < MIN_SELECTION) return;
    setStep("success");
  };

  const handleEnterNexus = async () => {
    if (!profile || submitting) return;
    setSubmitting(true);
    try {
      const ids = Array.from(selected);
      await Promise.all(ids.map((id) => followTopic(id, profile.id)));
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey(profile.id), "1");
      }
      setVisible(false);
      toast.success("Welcome to Nexus!", {
        description: "Your feed is now tailored to your interests.",
      });
    } catch (e) {
      console.error("Onboarding follow error:", e);
      toast.error("Could not save your topics. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking || !visible || !profile) return null;

  const selectedCount = selected.size;
  const canContinue = selectedCount >= MIN_SELECTION;
  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 aurora-bg flex items-center justify-center p-4 sm:p-6">
      {/* Dim + blur backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-2xl glass-strong rounded-3xl shadow-glow overflow-hidden"
      >
        {/* Decorative aurora glows */}
        <div className="pointer-events-none absolute -top-1/3 -right-1/4 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-1/3 -left-1/4 w-72 h-72 rounded-full bg-chart-4/15 blur-3xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 sm:px-8 pt-6 sm:pt-7 pb-4">
          <div className="flex items-center gap-2">
            <NexusLogo className="w-6 h-6" />
            <span className="font-semibold tracking-tight">Nexus</span>
          </div>
          <Stepper current={stepIndex} total={STEP_ORDER.length} />
        </div>

        {/* Body */}
        <div className="relative px-6 sm:px-8 pb-8 min-h-[440px]">
          <AnimatePresence mode="wait">
            {/* ---------------- STEP 1: WELCOME ---------------- */}
            {step === "welcome" && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center text-center pt-6 sm:pt-10"
              >
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.05 }}
                  className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shadow-glow mb-6"
                >
                  <Sparkles className="w-8 h-8" />
                </motion.div>

                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Welcome to <span className="gradient-text">Nexus</span>
                </h2>

                <p className="mt-3 text-muted-foreground max-w-md leading-relaxed">
                  {profile.name?.trim()
                    ? `Hi ${profile.name.split(" ")[0]}, let's personalize your feed. `
                    : "Let's personalize your feed. "}
                  Pick a few topics you care about — you can change them anytime.
                </p>

                <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-md">
                  <MiniStep icon={<Sparkles className="w-4 h-4" />} label="Pick topics" />
                  <MiniStep icon={<BookOpen className="w-4 h-4" />} label="Build your feed" />
                  <MiniStep icon={<Compass className="w-4 h-4" />} label="Start exploring" />
                </div>

                <Button
                  size="lg"
                  onClick={handleStart}
                  className="mt-10 rounded-2xl px-6 h-12 shadow-glow"
                >
                  Get started
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {/* ---------------- STEP 2: PICK TOPICS ---------------- */}
            {step === "pick" && (
              <motion.div
                key="pick"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="pt-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      Choose your <span className="gradient-text">topics</span>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Follow at least {MIN_SELECTION} to build your feed. Pick up to{" "}
                      {TARGET_SELECTION}.
                    </p>
                  </div>
                  <div className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-sm font-medium">
                    <span
                      className={
                        selectedCount >= MIN_SELECTION
                          ? "text-primary"
                          : "text-muted-foreground"
                      }
                    >
                      {selectedCount}
                    </span>
                    <span className="text-muted-foreground">
                      / {TARGET_SELECTION} selected
                    </span>
                  </div>
                </div>

                {loadingTopics ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="shimmer h-28 rounded-2xl glass-card"
                        aria-hidden
                      />
                    ))}
                  </div>
                ) : topics.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm">
                    No topics available yet. Please check back later.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                    {topics.map((topic) => {
                      const isSelected = selected.has(topic.id);
                      const color =
                        topic.color && topic.color.trim()
                          ? topic.color
                          : "var(--primary)";
                      return (
                        <motion.button
                          key={topic.id}
                          type="button"
                          onClick={() => toggleTopic(topic.id)}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          aria-pressed={isSelected}
                          className="relative text-left rounded-2xl glass-card p-4 overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          style={
                            isSelected
                              ? {
                                  borderColor: color,
                                  boxShadow: `0 0 0 1px ${color}, 0 0 24px -8px ${color}`,
                                }
                              : undefined
                          }
                        >
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-soft"
                                style={{ background: color }}
                              >
                                <Check className="w-3 h-3" strokeWidth={3} />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2"
                            style={{ background: withAlpha(color, 0.16) }}
                          >
                            <span aria-hidden>{topic.icon || "📚"}</span>
                          </div>

                          <div className="font-semibold text-sm leading-tight line-clamp-1">
                            {topic.name}
                          </div>
                          {topic.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {topic.description}
                            </p>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 mt-6">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="rounded-xl"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleContinue}
                    disabled={!canContinue || loadingTopics || topics.length === 0}
                    className="rounded-xl px-6"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ---------------- STEP 3: SUCCESS ---------------- */}
            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center text-center pt-8 sm:pt-12"
              >
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.05,
                    type: "spring",
                    bounce: 0.4,
                  }}
                  className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shadow-glow mb-6"
                >
                  <Check className="w-8 h-8" strokeWidth={3} />
                </motion.div>

                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  You&apos;re <span className="gradient-text">all set!</span>
                </h2>

                <p className="mt-3 text-muted-foreground max-w-md leading-relaxed">
                  {selectedCount === 0
                    ? "Your feed is ready to explore."
                    : `You've selected ${selectedCount} ${
                        selectedCount === 1 ? "topic" : "topics"
                      } to follow. Click below to enter Nexus.`}
                </p>

                {selectedCount > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-md">
                    {Array.from(selected).map((id) => {
                      const t = topics.find((x) => x.id === id);
                      if (!t) return null;
                      const color =
                        t.color && t.color.trim() ? t.color : "var(--primary)";
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass text-xs font-medium"
                          style={{ borderColor: withAlpha(color, 0.45) }}
                        >
                          <span aria-hidden>{t.icon || "📚"}</span>
                          {t.name}
                        </span>
                      );
                    })}
                  </div>
                )}

                <Button
                  size="lg"
                  onClick={handleEnterNexus}
                  disabled={submitting}
                  className="mt-10 rounded-2xl px-6 h-12 shadow-glow"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Setting up…
                    </>
                  ) : (
                    <>
                      Enter Nexus
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={
            i === current
              ? "w-6 h-1.5 rounded-full bg-primary transition-all"
              : i < current
                ? "w-1.5 h-1.5 rounded-full bg-primary/60 transition-all"
                : "w-1.5 h-1.5 rounded-full bg-muted-foreground/30 transition-all"
          }
        />
      ))}
    </div>
  );
}

function MiniStep({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="glass rounded-xl p-3 flex flex-col items-center text-center gap-1.5">
      <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}
