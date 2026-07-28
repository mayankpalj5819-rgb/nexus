"use client";

import * as React from "react";
import { useUIStore } from "@/lib/ui-store";
import { useAuth, supabase } from "@/lib/auth";
import type { Post, Profile, Topic } from "@/lib/data";
import { toggleBookmark, voteOnPost, removeVoteOnPost, deletePost } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowBigUp, ArrowBigDown, MessageSquare, Bookmark, Share2, MoreHorizontal, Flag, Trash2, Eye, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { timeAgo, formatNumber, readingTime } from "@/lib/helpers";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PostReactions } from "@/components/shared/post-reactions";
import { RealtimeCommentBadge } from "@/components/features/posts/realtime-comment-badge";
import { addToReadingList } from "@/components/features/feed/reading-list";
import { BookOpen } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function PostCard({ post, compact = false }: { post: Post; compact?: boolean }) {
  const setView = useUIStore((s) => s.setView);
  const { profile } = useAuth();
  const [localPost, setLocalPost] = React.useState(post);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportReason, setReportReason] = React.useState("");

  React.useEffect(() => setLocalPost(post), [post]);

  if (localPost.removed) {
    return (
      <div className="glass-card rounded-2xl p-5 text-sm text-muted-foreground italic">
        This post has been removed by moderators.
        {localPost.removed_reason && <span className="block mt-1 not-italic">Reason: {localPost.removed_reason}</span>}
      </div>
    );
  }

  const author = localPost.author;
  const topics = localPost.topics ?? [];
  const score = localPost.upvote_count - localPost.downvote_count;
  const hasUpvoted = localPost.my_vote === 1;
  const hasDownvoted = localPost.my_vote === -1;
  const hasBookmarked = !!localPost.is_bookmarked;
  const isAuthor = profile?.id === localPost.author_id;

  const handleVote = async (value: 1 | -1) => {
    if (!profile) { toast.error("Sign in to vote"); return; }
    // Optimistic update
    const prev = localPost;
    const newValue = prev.my_vote === value ? 0 : value;
    setLocalPost({
      ...prev,
      my_vote: newValue as 1 | -1 | 0,
      upvote_count: prev.upvote_count + (newValue === 1 ? 1 : prev.my_vote === 1 ? -1 : 0),
      downvote_count: prev.downvote_count + (newValue === -1 ? 1 : prev.my_vote === -1 ? -1 : 0),
    });
    try {
      if (newValue === 0) {
        await removeVoteOnPost(localPost.id, profile.id);
      } else {
        await voteOnPost(localPost.id, profile.id, value);
      }
    } catch (e) {
      console.error(e);
      setLocalPost(prev);
      toast.error("Vote failed");
    }
  };

  const handleBookmark = async () => {
    if (!profile) { toast.error("Sign in to bookmark"); return; }
    const prev = localPost;
    setLocalPost({ ...prev, is_bookmarked: !prev.is_bookmarked });
    try {
      const bookmarked = await toggleBookmark(localPost.id, profile.id);
      toast.success(bookmarked ? "Bookmarked" : "Removed bookmark");
    } catch (e) {
      console.error(e);
      setLocalPost(prev);
    }
  };

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`Nexus post: "${localPost.title}"`).catch(() => {});
    }
    toast.success("Link copied to clipboard");
  };

  const submitReport = async () => {
    if (!reportReason.trim()) { toast.error("Please provide a reason"); return; }
    if (!profile || !supabase) return;
    await supabase.from("reports").insert({
      reporter_id: profile.id,
      target_type: "post",
      target_id: localPost.id,
      reason: reportReason,
    });
    toast.success("Report submitted. Thank you.");
    setReportOpen(false);
    setReportReason("");
  };

  const handleDelete = async () => {
    try {
      await deletePost(localPost.id);
      toast.success("Post deleted");
      setView({ name: "home", feed: "trending" });
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    }
  };

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="group glass-card rounded-2xl overflow-hidden"
    >
      {topics.length > 0 && (
        <div className="flex items-center gap-1.5 px-5 pt-4 pb-1 flex-wrap">
          {topics.slice(0, 3).map((t) => (
            <button
              key={t.id}
              onClick={(e) => { e.stopPropagation(); setView({ name: "topic", topicId: t.id }); }}
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md hover:bg-accent transition-colors"
              style={{ color: t.color }}
            >
              <span>{t.icon}</span>
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div
        className="px-5 pb-4 pt-3 cursor-pointer"
        onClick={() => setView({ name: "post", postId: localPost.id })}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (author) setView({ name: "profile", userId: author.id, tab: "posts" });
            }}
            className="flex items-center gap-2.5 group/author min-w-0"
          >
            <Avatar className="w-7 h-7 ring-1 ring-border/50">
              {author?.avatar_url ? <AvatarImage src={author.avatar_url} alt={author.name} /> : null}
              <AvatarFallback className="text-xs">{author?.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-medium leading-tight group-hover/author:text-primary transition-colors truncate">
                {author?.name ?? "Unknown"}
              </div>
              <div className="text-xs text-muted-foreground leading-tight">
                @{author?.username ?? "unknown"} · {timeAgo(localPost.created_at)}
              </div>
            </div>
          </button>

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Post actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => {
                addToReadingList({
                  id: localPost.id,
                  title: localPost.title,
                  topicName: localPost.topics?.[0]?.name,
                  topicIcon: localPost.topics?.[0]?.icon,
                  content: localPost.content,
                });
                toast.success("Added to reading list");
              }}>
                <BookOpen className="w-4 h-4 mr-2" /> Save to reading list
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                <Flag className="w-4 h-4 mr-2" /> Report
              </DropdownMenuItem>
              {isAuthor && (
                <>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. The post and all its comments will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h2 className="text-lg lg:text-xl font-semibold tracking-tight leading-snug mb-1.5 group-hover:text-primary transition-colors">
          {localPost.title}
        </h2>

        {!compact && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
            {localPost.preview}
          </p>
        )}

        {/* Reading time + tags meta */}
        <div className="flex items-center gap-3 mb-2 text-[11px] text-muted-foreground/80">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {readingTime(localPost.content)} min read
          </span>
          {localPost.tags.length > 0 && (
            <span className="opacity-60">·</span>
          )}
        </div>

        {localPost.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {localPost.images.slice(0, 2).map((img, i) => (
              <div key={i} className="aspect-video rounded-xl overflow-hidden bg-muted">
                <img src={img.url} alt={img.alt ?? ""} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {localPost.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {localPost.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 px-3 py-2 border-t border-border/40">
        <VoteButton
          score={score}
          hasUpvoted={hasUpvoted}
          hasDownvoted={hasDownvoted}
          onUpvote={() => handleVote(1)}
          onDownvote={() => handleVote(-1)}
        />

        <ActionButton
          icon={<MessageSquare className="w-4 h-4" />}
          label={formatNumber(localPost.comment_count)}
          onClick={() => setView({ name: "post", postId: localPost.id })}
          hoverLabel="Comments"
        />

        <PostReactions postId={localPost.id} />

        <div className="flex-1" />

        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground px-2">
          <Eye className="w-3.5 h-3.5" />
          {formatNumber(localPost.views)}
        </span>

        <ActionButton
          icon={<Bookmark className={hasBookmarked ? "w-4 h-4 fill-current" : "w-4 h-4"} />}
          active={hasBookmarked}
          onClick={handleBookmark}
          hoverLabel="Bookmark"
        />

        <ActionButton
          icon={<Share2 className="w-4 h-4" />}
          onClick={handleShare}
          hoverLabel="Share"
        />
      </div>

      <AlertDialog open={reportOpen} onOpenChange={setReportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report this post</AlertDialogTitle>
            <AlertDialogDescription>
              Help us keep Nexus civil. Tell us what&apos;s wrong with this post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="e.g. Spam, harassment, misinformation…"
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitReport}>Submit report</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.article>
  );
}

function VoteButton({
  score,
  hasUpvoted,
  hasDownvoted,
  onUpvote,
  onDownvote,
}: {
  score: number;
  hasUpvoted: boolean;
  hasDownvoted: boolean;
  onUpvote: () => void;
  onDownvote: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-muted/40">
      <button
        onClick={onUpvote}
        className={`p-1.5 rounded-lg hover:bg-accent transition-colors ${
          hasUpvoted ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Upvote"
      >
        <ArrowBigUp className={`w-4 h-4 ${hasUpvoted ? "fill-current" : ""}`} />
      </button>
      <span className={`text-xs font-semibold min-w-[24px] text-center ${
        hasUpvoted ? "text-primary" : hasDownvoted ? "text-destructive" : "text-foreground"
      }`}>
        {formatNumber(score)}
      </span>
      <button
        onClick={onDownvote}
        className={`p-1.5 rounded-lg hover:bg-accent transition-colors ${
          hasDownvoted ? "text-destructive" : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Downvote"
      >
        <ArrowBigDown className={`w-4 h-4 ${hasDownvoted ? "fill-current" : ""}`} />
      </button>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  active,
  hoverLabel,
}: {
  icon: React.ReactNode;
  label?: string;
  onClick: () => void;
  active?: boolean;
  hoverLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-accent transition-colors text-sm ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
      title={hoverLabel}
    >
      {icon}
      {label && <span className="text-xs font-medium">{label}</span>}
    </button>
  );
}

// Unused imports cleanup — these types are used via inference
void ({} as Profile | Topic);
