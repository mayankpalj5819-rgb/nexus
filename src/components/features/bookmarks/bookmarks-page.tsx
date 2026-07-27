"use client";

import * as React from "react";
import { useUIStore } from "@/lib/ui-store";
import { useAuth, supabase } from "@/lib/auth";
import { fetchPosts, toggleBookmark, createBookmarkFolder, deleteBookmarkFolder, type Post } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PostCard } from "@/components/shared/post-card";
import { Bookmark, FolderPlus, Folder, Trash2, Search, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function BookmarksPage() {
  const { profile } = useAuth();
  const setView = useUIStore((s) => s.setView);
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [folders, setFolders] = React.useState<{ id: string; name: string }[]>([]);
  const [activeFolderId, setActiveFolderId] = React.useState<string | "all">("all");
  const [search, setSearch] = React.useState("");
  const [newFolderName, setNewFolderName] = React.useState("");
  const [showNewFolder, setShowNewFolder] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!profile || !supabase) return;
    const p = await fetchPosts({ bookmarkedBy: profile.id, sort: "latest", limit: 100, currentUserId: profile.id });
    setPosts(p);
    const { data: f } = await supabase
      .from("bookmark_folders")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true });
    setFolders((f ?? []) as { id: string; name: string }[]);
    setLoading(false);
  }, [profile]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (!profile) return null;

  const visiblePosts = posts.filter((p) => {
    const matchesSearch = !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.preview.toLowerCase().includes(search.toLowerCase());
    return matchesSearch; // folders not implemented for filtering yet (bookmarks table has folder_id but we don't filter by it currently)
  });

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    const id = await createBookmarkFolder(profile.id, newFolderName.trim());
    if (id) {
      setActiveFolderId(id);
      setNewFolderName("");
      setShowNewFolder(false);
      toast.success("Folder created");
      await load();
    }
  };

  const removeBookmark = async (postId: string) => {
    await toggleBookmark(postId, profile.id);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success("Removed from bookmarks");
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Bookmarks</h1>
        <p className="text-sm text-muted-foreground">{posts.length} posts saved · organize them into folders</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bookmarks…"
          className="pl-10 h-10 rounded-xl glass"
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-6">
        <FolderChip
          active={activeFolderId === "all"}
          icon={<Bookmark className="w-3.5 h-3.5" />}
          label="All"
          count={posts.length}
          onClick={() => setActiveFolderId("all")}
        />
        {folders.map((f) => (
          <FolderChip
            key={f.id}
            active={activeFolderId === f.id}
            icon={<Folder className="w-3.5 h-3.5" />}
            label={f.name}
            count={0}
            onClick={() => setActiveFolderId(f.id)}
            menu={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 p-0.5 rounded hover:bg-accent" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem className="text-destructive" onSelect={async () => {
                    await deleteBookmarkFolder(f.id);
                    if (activeFolderId === f.id) setActiveFolderId("all");
                    toast.success("Folder deleted");
                    await load();
                  }}>
                    Delete folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        ))}
        {showNewFolder ? (
          <div className="inline-flex items-center gap-1 p-1 rounded-lg glass">
            <Input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
              placeholder="Folder name…"
              className="h-7 w-32 border-0 bg-transparent text-xs"
            />
            <Button size="sm" onClick={createFolder} className="h-7 text-xs">Add</Button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewFolder(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-dashed border-border hover:bg-accent/50 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" /> New folder
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="glass-card rounded-2xl h-32 animate-pulse" />)}
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/50 flex items-center justify-center">
            <Bookmark className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">Nothing here yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Save posts to revisit them later.</p>
          <Button onClick={() => setView({ name: "home", feed: "trending" })} className="rounded-xl">Browse posts</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {visiblePosts.map((p) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} layout>
                <div className="relative">
                  <PostCard post={p} compact />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBookmark(p.id)}
                    className="absolute top-3 right-3 h-7 gap-1 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function FolderChip({
  active, icon, label, count, onClick, menu,
}: {
  active: boolean; icon: React.ReactNode; label: string; count: number; onClick: () => void; menu?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {icon}
      {label}
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${active ? "bg-primary-foreground/20" : "bg-background/60"}`}>{count}</span>
      {menu}
    </button>
  );
}
