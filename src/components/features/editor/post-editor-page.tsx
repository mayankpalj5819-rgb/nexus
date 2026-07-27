"use client";

import * as React from "react";
import { useNexusStore, type ID } from "@/lib/store";
import { NexusEditor, type NexusEditorHandle } from "@/components/features/editor/nexus-editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Save, Send, X, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { motion } from "framer-motion";

export function PostEditorPage({ postId, topicId }: { postId?: ID; topicId?: ID }) {
  const editorRef = React.useRef<NexusEditorHandle>(null);
  const createPost = useNexusStore((s) => s.createPost);
  const updatePost = useNexusStore((s) => s.updatePost);
  const getPost = useNexusStore((s) => s.getPost);
  const topics = useNexusStore((s) => s.topics);
  const setView = useNexusStore((s) => s.setView);
  const saveDraft = useNexusStore((s) => s.saveDraft);
  const drafts = useNexusStore((s) => s.drafts);

  const editing = postId ? getPost(postId) : undefined;

  const [title, setTitle] = React.useState(editing?.title ?? "");
  const [content, setContent] = React.useState(editing?.content ?? "");
  const [selectedTopics, setSelectedTopics] = React.useState<ID[]>(
    editing?.topicIds ?? (topicId ? [topicId] : [])
  );
  const [tags, setTags] = React.useState(editing?.tags.join(", ") ?? "");
  const [savingDraft, setSavingDraft] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [mode, setMode] = React.useState<"write" | "preview">("write");

  // Autosave draft (debounced)
  React.useEffect(() => {
    if (editing) return; // no autosave when editing existing post
    if (!title && !content) return;
    const t = setTimeout(() => {
      setSavingDraft(true);
      const id = saveDraft({ title, content, topicIds: selectedTopics });
      setLastSaved(new Date());
      setSavingDraft(false);
      void id;
    }, 1500);
    return () => clearTimeout(t);
  }, [title, content, selectedTopics, editing, saveDraft]);

  const toggleTopic = (id: ID) => {
    setSelectedTopics((s) =>
      s.includes(id) ? s.filter((t) => t !== id) : s.length < 3 ? [...s, id] : (toast.warning("Maximum 3 topics per post"), s)
    );
  };

  const handlePublish = () => {
    if (!title.trim()) { toast.error("Please add a title"); return; }
    if (!content.trim()) { toast.error("Please write some content"); return; }
    if (selectedTopics.length === 0) { toast.error("Please select at least one topic"); return; }

    const tagArray = tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 6);

    if (editing) {
      updatePost(editing.id, { title, content, topicIds: selectedTopics, tags: tagArray });
      toast.success("Post updated");
      setView({ name: "post", postId: editing.id });
    } else {
      const id = createPost({ title, content, topicIds: selectedTopics, tags: tagArray });
      toast.success("Post published");
      setView({ name: "post", postId: id });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {editing ? "Edit Post" : "New Post"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Share knowledge. Pick the topics it belongs to. Be specific and useful.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setView(editing ? { name: "post", postId: editing.id } : { name: "home", feed: "trending" })}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="A clear, specific title"
        className="h-14 text-lg lg:text-xl font-semibold rounded-2xl mb-4 glass"
      />

      {/* Topics */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Topics ({selectedTopics.length}/3) — required
          </label>
        </div>
        <div className="glass-card rounded-2xl p-4 max-h-48 overflow-y-auto">
          <div className="flex flex-wrap gap-1.5">
            {topics.filter((t) => !t.parentId || true).slice(0, 30).map((t) => {
              const selected = selectedTopics.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTopic(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {selected && <Check className="w-3 h-3" />}
                  <span>{t.icon}</span>
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="mb-4">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Tags (optional, comma-separated)
        </label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. physics, classical-mechanics, symmetry"
          className="rounded-xl glass"
        />
      </div>

      {/* Editor / Preview */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as "write" | "preview")}>
        <div className="flex items-center justify-between mb-2">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <div className="text-xs text-muted-foreground">
            {savingDraft ? "Saving draft…" : lastSaved ? `Draft saved · ${lastSaved.toLocaleTimeString()}` : ""}
          </div>
        </div>
        <TabsContent value="write" className="mt-0">
          <NexusEditor ref={editorRef} initialContent={content} onChange={(md) => setContent(md)} />
        </TabsContent>
        <TabsContent value="preview" className="mt-0">
          <div className="glass-card rounded-2xl p-6 min-h-[300px] lg:min-h-[400px] prose-nexus">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <div className="text-sm text-muted-foreground italic">Nothing to preview yet.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky bottom-4 mt-6 flex items-center gap-2 p-3 glass-strong rounded-2xl border border-border/50"
      >
        <Button
          variant="outline"
          onClick={() => {
            saveDraft({ title, content, topicIds: selectedTopics });
            setLastSaved(new Date());
            toast.success("Draft saved");
          }}
          className="gap-1.5 rounded-xl"
        >
          <Save className="w-4 h-4" /> Save draft
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          onClick={() => setView({ name: "home", feed: "trending" })}
          className="rounded-xl"
        >
          Cancel
        </Button>
        <Button onClick={handlePublish} className="gap-1.5 rounded-xl shadow-glow">
          <Send className="w-4 h-4" />
          {editing ? "Update" : "Publish"}
        </Button>
      </motion.div>

      {drafts.length > 0 && !editing && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Your saved drafts</h3>
          <div className="space-y-2">
            {drafts.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setTitle(d.title);
                  setContent(d.content);
                  setSelectedTopics(d.topicIds);
                  editorRef.current?.setMarkdown(d.content);
                  toast.info("Draft loaded");
                }}
                className="w-full text-left p-3 rounded-xl glass-card hover:shadow-soft transition-shadow"
              >
                <div className="font-medium text-sm truncate">{d.title || "(untitled)"}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {new Date(d.updatedAt).toLocaleString()} · {d.content.slice(0, 80)}…
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
