"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  X,
  Link2,
  Copy,
  Check,
  Share2,
  Twitter,
  Linkedin,
  Facebook,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────
interface ShareDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  postTitle: string;
  postUrl?: string;
}

// ── Brand icons for platforms missing from lucide-react ───────────────────
// lucide-react ships Twitter, Linkedin, Facebook — but not Reddit, WhatsApp,
// or Hacker News. We inline minimal brand SVGs for those three so every
// social button can carry its own branded color.

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 12.07c0-1.21-.99-2.2-2.2-2.2-.59 0-1.13.24-1.53.62-1.51-1-3.57-1.65-5.85-1.73l1.18-3.32 2.92.65c.03.79.68 1.42 1.47 1.42.81 0 1.47-.66 1.47-1.47 0-.81-.66-1.47-1.47-1.47-.57 0-1.06.33-1.3.81l-3.27-.73c-.18-.04-.36.07-.42.24l-1.32 3.71c-2.36.04-4.51.69-6.08 1.73-.4-.38-.94-.62-1.53-.62-1.21 0-2.2.99-2.2 2.2 0 .86.49 1.6 1.21 1.96-.04.23-.07.46-.07.7 0 3.55 4.13 6.42 9.22 6.42s9.22-2.87 9.22-6.42c0-.24-.02-.47-.07-.7.72-.36 1.21-1.1 1.21-1.96zM7.07 13.5c0-.81.66-1.47 1.47-1.47.81 0 1.47.66 1.47 1.47 0 .81-.66 1.47-1.47 1.47-.81 0-1.47-.66-1.47-1.47zm8.04 4.06c-1.05.78-3.18.78-4.23 0a.4.4 0 11.5-.62c.66.49 2.57.49 3.23 0a.4.4 0 11.5.62zm-.27-2.59c-.81 0-1.47-.66-1.47-1.47 0-.81.66-1.47 1.47-1.47.81 0 1.47.66 1.47 1.47 0 .81-.66 1.47-1.47 1.47z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function HackerNewsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M0 0v24h24V0H0zm6.951 5.896l4.112 7.708v5.064h1.583v-4.972l4.148-7.799h-1.749l-2.457 4.875c-.372.745-.688 1.434-.688 1.434s-.297-.708-.651-1.434L8.831 5.896h-1.88z" />
    </svg>
  );
}

// ── Social share config ───────────────────────────────────────────────────
interface SocialShare {
  key: string;
  name: string;
  /** Brand color used for the icon chip background. */
  color: string;
  /** Build the share URL for this platform. */
  href: (url: string, title: string) => string;
  icon: React.ReactNode;
}

const SOCIAL_SHARES: SocialShare[] = [
  {
    key: "twitter",
    name: "X",
    color: "#000000",
    href: (url, title) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        title
      )}&url=${encodeURIComponent(url)}`,
    icon: <Twitter className="size-4" />,
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    color: "#0A66C2",
    href: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        url
      )}`,
    icon: <Linkedin className="size-4" />,
  },
  {
    key: "reddit",
    name: "Reddit",
    color: "#FF4500",
    href: (url, title) =>
      `https://reddit.com/submit?url=${encodeURIComponent(
        url
      )}&title=${encodeURIComponent(title)}`,
    icon: <RedditIcon className="size-4" />,
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    color: "#25D366",
    href: (url, title) =>
      `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    icon: <WhatsAppIcon className="size-4" />,
  },
  {
    key: "facebook",
    name: "Facebook",
    color: "#1877F2",
    href: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`,
    icon: <Facebook className="size-4" />,
  },
  {
    key: "hackernews",
    name: "Hacker News",
    color: "#FF6600",
    href: (url, title) =>
      `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(
        url
      )}&t=${encodeURIComponent(title)}`,
    icon: <HackerNewsIcon className="size-4" />,
  },
];

// ── Component ─────────────────────────────────────────────────────────────
/**
 * ShareDialog — a glassmorphic modal for sharing a post.
 *
 * Provides:
 *   • Native Web Share API trigger (only when `navigator.share` exists).
 *   • Copy-link row with a 2-second "Copied!" confirmation state.
 *   • Six branded social buttons that each open a share intent in a new
 *     popup window: X, LinkedIn, Reddit, WhatsApp, Facebook, Hacker News.
 *
 * The URL defaults to `window.location.href` when `postUrl` is not supplied.
 * That resolution happens inside an effect so SSR markup stays stable.
 */
export function ShareDialog({
  open,
  onOpenChange,
  postTitle,
  postUrl,
}: ShareDialogProps) {
  // Empty-string initial value keeps server/client markup in sync; the real
  // URL (either the prop or window.location.href) is filled in post-mount.
  const [resolvedUrl, setResolvedUrl] = React.useState<string>("");
  const [copied, setCopied] = React.useState<boolean>(false);
  const [canNativeShare, setCanNativeShare] = React.useState<boolean>(false);
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Resolve URL + detect native share on the client only.
  React.useEffect(() => {
    if (!open) return;
    setResolvedUrl(postUrl ?? window.location.href);
    setCanNativeShare(
      typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
    );
  }, [open, postUrl]);

  // Always clear any pending copy-state timer on unmount.
  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Lock body scroll while the dialog is open.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleNativeShare = async () => {
    if (!resolvedUrl) return;
    try {
      await navigator.share({
        title: postTitle,
        text: postTitle,
        url: resolvedUrl,
      });
    } catch {
      // User cancelled the share sheet — no action needed.
    }
  };

  const handleCopy = async () => {
    if (!resolvedUrl) return;
    const showCopied = () => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    };

    try {
      await navigator.clipboard.writeText(resolvedUrl);
      showCopied();
      return;
    } catch {
      // Clipboard API can fail on insecure origins — fall back below.
    }

    // Legacy fallback for non-secure contexts.
    try {
      const ta = document.createElement("textarea");
      ta.value = resolvedUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showCopied();
    } catch {
      // Last-resort: silently give up.
    }
  };

  const handleSocial = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop — clicking it closes the dialog */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />

          {/* Modal panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Share “${postTitle}”`}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "glass-strong relative z-10 w-full max-w-md rounded-2xl p-6 shadow-soft"
            )}
          >
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight">
                  Share this post
                </h2>
                <p className="truncate text-sm text-muted-foreground">
                  {postTitle}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label="Close share dialog"
                className="-mr-2 -mt-2 shrink-0"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Native Web Share API */}
            {canNativeShare && (
              <Button
                onClick={handleNativeShare}
                size="lg"
                className="mb-3 w-full"
              >
                <Share2 className="size-4" />
                Share via…
              </Button>
            )}

            {/* Copy link */}
            <div className="mb-4 flex items-center gap-2 rounded-xl border bg-background/60 p-2 pl-3">
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm text-muted-foreground">
                {resolvedUrl || "—"}
              </span>
              <Button
                size="sm"
                variant={copied ? "secondary" : "default"}
                onClick={handleCopy}
                className="shrink-0"
                aria-label={copied ? "Link copied" : "Copy link to clipboard"}
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            {/* Social grid */}
            <div className="grid grid-cols-2 gap-2">
              {SOCIAL_SHARES.map((s) => (
                <Button
                  key={s.key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSocial(s.href(resolvedUrl, postTitle))}
                  className="justify-start px-2.5"
                  aria-label={`Share on ${s.name}`}
                >
                  <span
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-white"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.icon}
                  </span>
                  <span className="truncate font-medium">{s.name}</span>
                </Button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
