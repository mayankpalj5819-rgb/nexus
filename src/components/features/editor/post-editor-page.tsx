"use client";

import * as React from "react";
import { useUIStore } from "@/lib/ui-store";
import { useAuth } from "@/lib/auth";
import { NexusLogo } from "@/components/shared/nexus-logo";
import { NexusEditor, type NexusEditorHandle } from "@/components/features/editor/nexus-editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Save, Send, X, Check, Clock, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { fetchTopics, createPost, updatePost, fetchPost, type Topic } from "@/lib/data";
import { wordCount, readingTime } from "@/lib/helpers";
import { PostTemplatePicker, MarkdownCheatSheet } from "@/components/features/editor/editor-extras";

export function PostEditorPage({ postId, topicId }: { postId?: string; topicId?: string }) {
  const editorRef = React.useRef<NexusEditorHandle>(null);
  const { profile, loading: authLoading, session, signInWithGoogle } = useAuth();
  const setView = useUIStore((s) => s.setView);
  const [topics, setTopics] = React.useState<Topic[]>([]);
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [selectedTopics, setSelectedTopics] = React.useState<string[]>([]);
  const [tags, setTags] = React.useState("");
  const [mode, setMode] = React.useState<"write" | "preview">("write");
  const [topicsLoading, setTopicsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const t = await fetchTopics();
      if (mounted) setTopics(t);

      if (postId) {
        const p = await fetchPost(postId, profile?.id);
        if (mounted && p) {
          setTitle(p.title);
          setContent(p.content);
          setSelectedTopics(p.topic_ids);
          setTags(p.tags.join(", "));
          // Poll for editor readiness — more reliable than a fixed setTimeout
          const trySet = (attempts = 0) => {
            if (editorRef.current) {
              editorRef.current.setMarkdown(p.content);
            } else if (attempts < 20) {
              setTimeout(() => trySet(attempts + 1), 50);
            }
          };
          trySet();
        }
        setTopicsLoading(false);
      } else if (topicId) {
        setSelectedTopics([topicId]);
      }
    })();
    return () => { mounted = false; };
  }, [postId, topicId, profile?.id]);

  // Show loading state while auth is being determined
  if (authLoading || (session && !profile)) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-14 rounded-2xl animate-pulse bg-muted/40" />
        <div className="h-48 rounded-2xl animate-pulse bg-muted/40" />
        <div className="h-96 rounded-2xl animate-pulse bg-muted/40" />
        <div className="text-center text-sm text-muted-foreground py-2">
          Loading editor…
        </div>
      </div>
    );
  }

  // If truly not signed in (no session at all)
  if (!session) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/50 flex items-center justify-center">
          <NexusLogo className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Sign in to create posts</h2>
        <p className="text-sm text-muted-foreground mb-6">You need to be signed in to share knowledge on Nexus.</p>
        <Button onClick={() => signInWithGoogle()} className="rounded-xl">
          Continue with Google
        </Button>
      </div>
    );
  }

  // Signed in but profile failed to load (rare edge case) — show error with retry
  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <h2 className="text-xl font-semibold mb-2">Profile not loaded</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your session is active but your profile couldn&apos;t be loaded. Try refreshing the page.
        </p>
        <Button onClick={() => window.location.reload()} className="rounded-xl">
          Refresh page
        </Button>
      </div>
    );
  }

  const toggleTopic = (id: string) => {
    setSelectedTopics((s) =>
      s.includes(id) ? s.filter((t) => t !== id) : s.length < 3 ? [...s, id] : (toast.warning("Maximum 3 topics per post"), s)
    );
  };

  const handlePublish = async () => {
    if (!title.trim()) { toast.error("Please add a title"); return; }
    if (!content.trim()) { toast.error("Please write some content"); return; }
    if (selectedTopics.length === 0) { toast.error("Please select at least one topic"); return; }

    const tagArray = tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 6);

    if (postId) {
      await updatePost(postId, { title, content, topicIds: selectedTopics, tags: tagArray });
      toast.success("Post updated");
      setView({ name: "post", postId });
    } else {
      const id = await createPost({ title, content, topicIds: selectedTopics, tags: tagArray }, profile.id);
      if (id) {
        toast.success("Post published");
        setView({ name: "post", postId: id });
      } else {
        toast.error("Failed to publish");
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {postId ? "Edit Post" : "New Post"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Share knowledge. Pick the topics it belongs to. Be specific and useful.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setView({ name: "home", feed: "trending" })}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="A clear, specific title"
          className="h-14 text-lg lg:text-xl font-semibold rounded-2xl glass flex-1"
        />
        {!postId && (
          <PostTemplatePicker
            onSelect={(t) => {
              setTitle(t.title);
              setContent(t.content);
              editorRef.current?.setMarkdown(t.content);
              toast.success("Template loaded");
            }}
          />
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Topics ({selectedTopics.length}/3) — required
          </label>
        </div>
        <div className="glass-card rounded-2xl p-4 max-h-48 overflow-y-auto">
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No topics available yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {topics.slice(0, 30).map((t) => {
                const selected = selectedTopics.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTopic(t.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selected ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                    }`}
                  >
                    {selected && <Check className="w-3 h-3" />}
                    <span>{t.icon}</span>
                    {t.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

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

      <Tabs value={mode} onValueChange={(v) => setMode(v as "write" | "preview")}>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            {mode === "write" && <MarkdownCheatSheet />}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {wordCount(content).toLocaleString()} words
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {readingTime(content)} min read
            </span>
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

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky bottom-4 mt-6 flex items-center gap-2 p-3 glass-strong rounded-2xl border border-border/50"
      >
        <div className="flex-1" />
        <Button variant="ghost" onClick={() => setView({ name: "home", feed: "trending" })} className="rounded-xl">Cancel</Button>
        <Button onClick={handlePublish} className="gap-1.5 rounded-xl shadow-glow">
          <Send className="w-4 h-4" />
          {postId ? "Update" : "Publish"}
        </Button>
      </motion.div>
    </div>
  );
}
