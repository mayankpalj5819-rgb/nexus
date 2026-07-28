"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutTemplate,
  MessageSquare,
  HelpCircle,
  BookOpen,
  Sparkles,
  BookMarked,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/* -------------------------------------------------------------------------- */
/*                              PostTemplatePicker                            */
/* -------------------------------------------------------------------------- */

export interface PostTemplate {
  title: string;
  content: string;
}

interface TemplateDef {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  template: PostTemplate;
}

const TEMPLATES: readonly TemplateDef[] = [
  {
    id: "discussion",
    name: "Discussion",
    description: "Open a conversation with the community",
    icon: MessageSquare,
    template: {
      title: "Let's discuss\u2026",
      content:
        "## Background\n\n\n## My take\n\n\n## Questions for the community\n\n- \n- \n- \n",
    },
  },
  {
    id: "question",
    name: "Question",
    description: "Ask for help on a specific problem",
    icon: HelpCircle,
    template: {
      title: "How do I\u2026",
      content:
        "## What I'm trying to do\n\n\n## What I've tried\n\n\n## Where I'm stuck\n\n",
    },
  },
  {
    id: "guide",
    name: "Guide",
    description: "Teach others with a step-by-step walkthrough",
    icon: BookOpen,
    template: {
      title: "A guide to\u2026",
      content:
        "## TL;DR\n\n\n## Prerequisites\n\n- \n\n## Step-by-step\n\n### 1. \n\n### 2. \n\n### 3. \n\n## Common pitfalls\n\n- \n",
    },
  },
  {
    id: "showcase",
    name: "Showcase",
    description: "Share something you built or made",
    icon: Sparkles,
    template: {
      title: "Showcase: \u2026",
      content:
        "## What I built\n\n\n## Why\n\n\n## How it works\n\n\n## What's next\n\n",
    },
  },
] as const;

export interface PostTemplatePickerProps {
  onSelect: (template: PostTemplate) => void;
}

export function PostTemplatePicker({ onSelect }: PostTemplatePickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl gap-2 h-9 px-3"
        >
          <LayoutTemplate className="w-4 h-4" />
          <span className="text-sm font-medium">Templates</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-72 rounded-xl glass-card border-border/50 p-1.5 shadow-soft"
      >
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5 font-semibold">
          Start from a template
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50 my-1" />
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <DropdownMenuItem
              key={t.id}
              onSelect={(e) => {
                // Prevent the default focus steal so the editor keeps focus
                // after we hand it the new template content.
                e.preventDefault();
                onSelect(t.template);
              }}
              className="rounded-lg gap-3 px-2.5 py-2 cursor-pointer items-start"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="w-4 h-4" />
              </span>
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium leading-tight">
                  {t.name}
                </span>
                <span className="text-xs text-muted-foreground leading-snug">
                  {t.description}
                </span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* -------------------------------------------------------------------------- */
/*                             MarkdownCheatSheet                             */
/* -------------------------------------------------------------------------- */

interface CheatRow {
  code: string;
  render: React.ReactNode;
}

interface CheatSection {
  title: string;
  rows: CheatRow[];
}

const CHEAT_SECTIONS: readonly CheatSection[] = [
  {
    title: "Headings",
    rows: [
      { code: "# Heading 1", render: <span className="text-sm font-bold">Heading 1</span> },
      { code: "## Heading 2", render: <span className="text-xs font-bold">Heading 2</span> },
      { code: "### Heading 3", render: <span className="text-[11px] font-semibold">Heading 3</span> },
    ],
  },
  {
    title: "Inline styles",
    rows: [
      { code: "**bold**", render: <strong className="text-xs font-bold">bold</strong> },
      { code: "*italic*", render: <em className="text-xs italic">italic</em> },
      { code: "~~strikethrough~~", render: <s className="text-xs line-through">strikethrough</s> },
    ],
  },
  {
    title: "Lists",
    rows: [
      { code: "- bullet", render: <span className="text-xs">{"\u2022"} bullet</span> },
      { code: "1. numbered", render: <span className="text-xs">1. numbered</span> },
    ],
  },
  {
    title: "Blocks",
    rows: [
      {
        code: "> quote",
        render: (
          <span className="text-xs italic border-l-2 border-primary pl-2 text-muted-foreground">
            quote
          </span>
        ),
      },
      {
        code: "`inline code`",
        render: (
          <code className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded">
            inline code
          </code>
        ),
      },
      {
        code: "```code block```",
        render: (
          <pre className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
            code block
          </pre>
        ),
      },
      {
        code: "---",
        render: <div className="h-px w-full bg-border" aria-label="horizontal rule" />,
      },
    ],
  },
  {
    title: "Links & media",
    rows: [
      {
        code: "[link](url)",
        render: (
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-xs text-primary underline underline-offset-2"
          >
            link
          </a>
        ),
      },
      {
        code: "![image](url)",
        render: (
          <span className="text-xs text-muted-foreground italic">[image]</span>
        ),
      },
    ],
  },
] as const;

export function MarkdownCheatSheet() {
  const [open, setOpen] = React.useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 rounded-xl h-9"
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Markdown help</span>
          <ChevronDown
            className={cn(
              "w-3 h-3 opacity-60 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="markdown-cheatsheet"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-2xl p-4 max-h-80 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <BookMarked className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Markdown reference
                </h3>
              </div>

              <div className="space-y-3">
                {CHEAT_SECTIONS.map((section) => (
                  <div key={section.title}>
                    <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1.5">
                      {section.title}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {section.rows.map((row, idx) => (
                        <div
                          key={`${section.title}-${idx}-${row.code}`}
                          className="flex items-center gap-2 rounded-lg bg-muted/30 border border-border/40 px-2.5 py-1.5"
                        >
                          <code className="font-mono text-[11px] text-foreground/80 shrink-0 max-w-[55%] truncate">
                            {row.code}
                          </code>
                          <span className="text-muted-foreground/40 text-[10px] shrink-0">
                            {"\u2192"}
                          </span>
                          <div className="flex-1 min-w-0 overflow-hidden flex items-center">
                            {row.render}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-[10px] text-muted-foreground/70 leading-relaxed">
                Tip: most of these are also available as buttons in the editor
                toolbar above.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Collapsible>
  );
}
