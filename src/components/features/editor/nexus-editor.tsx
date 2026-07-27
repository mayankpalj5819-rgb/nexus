"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Strikethrough,
  Minus,
} from "lucide-react";
import { createLowlight } from "lowlight";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const lowlight = createLowlight();

const ToolbarButton = ({
  icon,
  onClick,
  active,
  label,
  disabled,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
  disabled?: boolean;
}) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    onClick={onClick}
    className={cn("h-8 w-8 rounded-md", active && "bg-accent text-primary")}
    title={label}
    disabled={disabled}
  >
    {icon}
  </Button>
);

export interface NexusEditorHandle {
  getMarkdown: () => string;
  setMarkdown: (md: string) => void;
  clear: () => void;
}

export const NexusEditor = React.forwardRef<
  NexusEditorHandle,
  { initialContent?: string; placeholder?: string; onChange?: (md: string) => void }
>(function NexusEditor({ initialContent = "", placeholder = "Write something amazing…", onChange }, ref) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: false,
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline underline-offset-2" },
      }),
      Image.configure({ HTMLAttributes: { class: "rounded-xl" } }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-editor min-h-[300px] lg:min-h-[400px] p-5 outline-none text-sm leading-relaxed",
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) onChange(getMarkdown(editor));
    },
  });

  // Generate simple markdown from editor HTML
  const getMarkdown = (ed: ReturnType<typeof useEditor> | null) => {
    if (!ed) return "";
    const html = ed.getHTML();
    // Convert basic HTML to markdown-ish string for our React Markdown renderer.
    // We keep HTML and let React Markdown handle it via the gfm extension; but
    // to be safe and avoid raw HTML in storage, we serialize to markdown here.
    return htmlToMarkdown(html);
  };

  React.useImperativeHandle(ref, () => ({
    getMarkdown: () => getMarkdown(editor),
    setMarkdown: (md: string) => {
      if (!editor) return;
      editor.commands.setContent(markdownToHtml(md));
    },
    clear: () => editor?.commands.clearContent(),
  }));

  if (!editor) return null;

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-border/50">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap p-2 border-b border-border/40 bg-muted/30">
        <ToolbarButton icon={<Undo className="w-3.5 h-3.5" />} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo" />
        <ToolbarButton icon={<Redo className="w-3.5 h-3.5" />} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo" />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton icon={<Heading1 className="w-3.5 h-3.5" />} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} label="Heading 1" />
        <ToolbarButton icon={<Heading2 className="w-3.5 h-3.5" />} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="Heading 2" />
        <ToolbarButton icon={<Heading3 className="w-3.5 h-3.5" />} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} label="Heading 3" />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton icon={<Bold className="w-3.5 h-3.5" />} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="Bold" />
        <ToolbarButton icon={<Italic className="w-3.5 h-3.5" />} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="Italic" />
        <ToolbarButton icon={<Strikethrough className="w-3.5 h-3.5" />} onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} label="Strikethrough" />
        <ToolbarButton icon={<Code className="w-3.5 h-3.5" />} onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} label="Inline code" />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton icon={<List className="w-3.5 h-3.5" />} onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="Bullet list" />
        <ToolbarButton icon={<ListOrdered className="w-3.5 h-3.5" />} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="Ordered list" />
        <ToolbarButton icon={<Quote className="w-3.5 h-3.5" />} onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label="Quote" />
        <ToolbarButton icon={<Code className="w-3.5 h-3.5" />} onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} label="Code block" />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton
          icon={<LinkIcon className="w-3.5 h-3.5" />}
          onClick={() => {
            const url = window.prompt("URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive("link")}
          label="Link"
        />
        <ToolbarButton
          icon={<ImageIcon className="w-3.5 h-3.5" />}
          onClick={() => {
            const url = window.prompt("Image URL");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
          label="Image"
        />
        <ToolbarButton icon={<Minus className="w-3.5 h-3.5" />} onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Divider" />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
});

// ---------- minimal HTML <-> Markdown serialization ----------
// We only need to round-trip the subset TipTap produces for our app.

function htmlToMarkdown(html: string): string {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  return nodeToMarkdown(doc.body.firstChild as HTMLElement).trim();
}

function nodeToMarkdown(node: HTMLElement | Node | null): string {
  if (!node) return "";
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/\s+/g, " ");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const inner = Array.from(el.childNodes).map(nodeToMarkdown).join("");

  switch (tag) {
    case "h1": return `\n# ${inner.trim()}\n\n`;
    case "h2": return `\n## ${inner.trim()}\n\n`;
    case "h3": return `\n### ${inner.trim()}\n\n`;
    case "p": return `${inner}\n\n`;
    case "strong":
    case "b": return `**${inner}**`;
    case "em":
    case "i": return `*${inner}*`;
    case "s":
    case "del": return `~~${inner}~~`;
    case "code": return `\`${inner}\``;
    case "pre": {
      const code = el.textContent ?? "";
      return `\n\`\`\`\n${code}\n\`\`\`\n\n`;
    }
    case "blockquote": return `${inner.split("\n").map((l) => `> ${l}`).join("\n")}\n\n`;
    case "ul": return Array.from(el.children).map((li) => `- ${nodeToMarkdown(li).trim()}`).join("\n") + "\n\n";
    case "ol": return Array.from(el.children).map((li, i) => `${i + 1}. ${nodeToMarkdown(li).trim()}`).join("\n") + "\n\n";
    case "li": return inner;
    case "a": return `[${inner}](${el.getAttribute("href") ?? ""})`;
    case "img": return `![${el.getAttribute("alt") ?? ""}](${el.getAttribute("src") ?? ""})`;
    case "hr": return `\n---\n\n`;
    case "br": return `\n`;
    case "div": return inner;
    default: return inner;
  }
}

function markdownToHtml(md: string): string {
  // Minimal markdown -> HTML for hydration. Good enough for the editor's setContent.
  let html = md;
  html = html.replace(/```([\s\S]*?)```/g, (_m, code) => `<pre><code>${escapeHtml(code)}</code></pre>`);
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/~~([^~]+)~~/g, "<s>$1</s>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
  html = html.replace(/^---$/gm, "<hr>");
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Lists
  html = html.replace(/(?:^- (.+)$\n?)+/gm, (m) => `<ul>${m.split("\n").filter(Boolean).map((l) => `<li>${l.replace(/^- /, "")}</li>`).join("")}</ul>`);
  html = html.replace(/(?:^\d+\. (.+)$\n?)+/gm, (m) => `<ol>${m.split("\n").filter(Boolean).map((l) => `<li>${l.replace(/^\d+\. /, "")}</li>`).join("")}</ol>`);
  // Paragraphs
  html = html.split(/\n\n+/).map((block) => {
    if (/^<(h\d|ul|ol|pre|blockquote|hr|img)/.test(block.trim())) return block;
    return `<p>${block.trim()}</p>`;
  }).join("\n");
  return html;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
