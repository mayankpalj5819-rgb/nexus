"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { List } from "lucide-react";
import { clsx } from "@/lib/helpers";

interface TocItem {
  id: string;
  /** 0 = h2, 1 = h3 */
  level: 0 | 1;
  text: string;
}

interface PostTableOfContentsProps {
  content: string;
}

/**
 * Inline CSS for the temporary flash highlight applied to a heading
 * after the user clicks its TOC entry. Injected once per mount.
 */
const FLASH_CSS = `
.post-toc-flash {
  animation: post-toc-flash-anim 1.6s ease-out;
  border-radius: 8px;
}
@keyframes post-toc-flash-anim {
  0% { background-color: var(--accent); }
  70% { background-color: var(--accent); }
  100% { background-color: transparent; }
}
`;

/**
 * Strip common inline markdown (bold, italic, code, links, images, strikes)
 * so the TOC label matches the text rendered by react-markdown in the DOM.
 */
function stripInlineMarkdown(s: string): string {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .trim();
}

/** Convert heading text into a URL-safe slug (used as a stable React key). */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Normalize whitespace so DOM textContent and parsed text match reliably. */
function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Parse markdown for `##` (h2) and `###` (h3) headings.
 * Skips `#` (h1), `####+`, ATX closing hashes, and headings inside
 * fenced code blocks (``` or ~~~).
 */
function parseHeadings(markdown: string): TocItem[] {
  const lines = markdown.split("\n");
  const raw: TocItem[] = [];
  let inFence = false;

  for (const line of lines) {
    // Toggle fenced-code-block state on lines starting with ``` or ~~~
    if (/^\s*(`{3,}|~{3,})/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    // Check h3 first (more specific) — `^##\s` won't match `### ` anyway,
    // but this keeps the intent explicit.
    const h3 = line.match(/^###\s+(.+?)\s*#*\s*$/);
    if (h3) {
      const text = stripInlineMarkdown(h3[1]);
      if (text) raw.push({ id: slugify(text), level: 1, text });
      continue;
    }

    const h2 = line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (h2) {
      const text = stripInlineMarkdown(h2[1]);
      if (text) raw.push({ id: slugify(text), level: 0, text });
    }
  }

  // De-duplicate IDs by appending -2, -3, etc. for repeat headings.
  const seen = new Map<string, number>();
  return raw.map((item) => {
    const count = seen.get(item.id) ?? 0;
    seen.set(item.id, count + 1);
    return count === 0 ? item : { ...item, id: `${item.id}-${count + 1}` };
  });
}

/**
 * Auto-generates a table of contents from a post's markdown content and
 * displays it as a sticky, glass-styled sidebar. Tracks scroll position
 * via IntersectionObserver and smooth-scrolls to headings on click.
 *
 * Returns `null` when fewer than 3 headings are found.
 */
export function PostTableOfContents({ content }: PostTableOfContentsProps) {
  const items = React.useMemo(() => parseHeadings(content), [content]);
  const [activeText, setActiveText] = React.useState<string>(
    () => items[0]?.text ?? ""
  );

  // Default to the first heading once content arrives asynchronously.
  React.useEffect(() => {
    if (items.length > 0 && !activeText) {
      setActiveText(items[0].text);
    }
  }, [items, activeText]);

  // Observe rendered h2/h3 elements to highlight the active section.
  React.useEffect(() => {
    if (items.length === 0) return;

    const scope = document.querySelector("article") ?? document.body;
    const itemTexts = new Set(items.map((i) => normalizeText(i.text)));
    const headings = Array.from(
      scope.querySelectorAll<HTMLElement>("h2, h3")
    ).filter((h) => itemTexts.has(normalizeText(h.textContent ?? "")));

    if (headings.length === 0) return;

    const visible = new Set<HTMLElement>();

    const pickActive = () => {
      // Choose the topmost currently-visible heading in document order.
      const first = headings.find((h) => visible.has(h));
      if (first) {
        const text = normalizeText(first.textContent ?? "");
        if (text) setActiveText(text);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) visible.add(el);
          else visible.delete(el);
        }
        pickActive();
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  const handleClick = React.useCallback((text: string) => {
    const scope = document.querySelector("article") ?? document.body;
    const target = Array.from(
      scope.querySelectorAll<HTMLElement>("h2, h3")
    ).find((h) => normalizeText(h.textContent ?? "") === normalizeText(text));

    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.classList.add("post-toc-flash");
    window.setTimeout(() => {
      target.classList.remove("post-toc-flash");
    }, 1600);
  }, []);

  if (items.length < 3) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FLASH_CSS }} />
      <nav
        aria-label="Table of contents"
        className="sticky top-24 w-full max-w-xs"
      >
        <div className="glass-card rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <List className="h-4 w-4 text-primary" />
            <span>📋 Contents</span>
          </div>
          <ul className="max-h-[70vh] space-y-0.5 overflow-y-auto no-scrollbar">
            {items.map((item, index) => {
              const isActive =
                normalizeText(item.text) === normalizeText(activeText);
              return (
                <li key={`${item.id}-${index}`} className="relative">
                  {isActive && (
                    <motion.span
                      layoutId="post-toc-active"
                      className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleClick(item.text)}
                    style={{ paddingLeft: `${item.level * 12 + 10}px` }}
                    className={clsx(
                      "block w-full py-1 pr-2 text-left text-sm leading-snug transition-colors duration-150",
                      isActive
                        ? "font-medium text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.text}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}

export default PostTableOfContents;
