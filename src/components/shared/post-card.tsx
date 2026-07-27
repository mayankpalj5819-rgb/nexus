"use client";

import { useSignedInUser } from "@/lib/use-signed-in-user";
import * as React from "react";
import { useNexusStore, type Post, type User, type Topic } from "@/lib/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowBigUp, ArrowBigDown, MessageSquare, Bookmark, Share2, MoreHorizontal, Flag, Trash2, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { timeAgo, formatNumber } from "@/lib/helpers";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function PostCard({ post, compact = false }: { post: Post; compact?: boolean }) {
  const setView = useNexusStore((s) => s.setView);
  const getUser = useNexusStore((s) => s.getUser);
  const getTopic = useNexusStore((s) => s.getTopic);
  const upvotePost = useNexusStore((s) => s.upvotePost);
  const downvotePost = useNexusStore((s) => s.downvotePost);
  const bookmarkPost = useNexusStore((s) => s.bookmarkPost);
  const deletePost = useNexusStore((s) => s.deletePost);
  const reportTarget = useNexusStore((s) => s.reportTarget);
  const signedInUser = useSignedInUser();

  const author = getUser(post.authorId);
  const topics = post.topicIds.map((id) => getTopic(id)).filter(Boolean) as Topic[];
  const session = useNexusStore((s) => s.session);

  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportReason, setReportReason] = React.useState("");

  if (post.removed) {
    return (
      <div className="glass-card rounded-2xl p-5 text-sm text-muted-foreground italic">
        This post has been removed by moderators.
        {post.removedReason && <span className="block mt-1 not-italic">Reason: {post.removedReason}</span>}
      </div>
    );
  }

  if (!author) return null;

  const score = post.upvotes.length - post.downvotes.length;
  const hasUpvoted = session ? post.upvotes.includes(session.userId) : false;
  const hasDownvoted = session ? post.downvotes.includes(session.userId) : false;
  const hasBookmarked = session ? post.bookmarks.includes(session.userId) : false;
  const isAuthor = signedInUser?.id === post.authorId;

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`Nexus post: "${post.title}"`).catch(() => {});
    }
    toast.success("Link copied to clipboard");
  };

  const submitReport = () => {
    if (!reportReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    reportTarget({ targetType: "post", targetId: post.id, reason: reportReason });
    toast.success("Report submitted. Thank you.");
    setReportOpen(false);
    setReportReason("");
  };

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="group glass-card rounded-2xl overflow-hidden"
    >
      {/* Topic strip */}
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
        onClick={() => setView({ name: "post", postId: post.id })}
      >
        {/* Author row */}
        <div className="flex items-center gap-2.5 mb-3">
          <button
            onClick={(e) => { e.stopPropagation(); setView({ name: "profile", userId: author.id, tab: "posts" }); }}
            className="flex items-center gap-2.5 group/author min-w-0"
          >
            <Avatar className="w-7 h-7 ring-1 ring-border/50">
              <AvatarImage src={author.avatar} alt={author.name} />
              <AvatarFallback className="text-xs">{author.name[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-medium leading-tight group-hover/author:text-primary transition-colors truncate">
                {author.name}
              </div>
              <div className="text-xs text-muted-foreground leading-tight">
                @{author.username} · {timeAgo(post.createdAt)}
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
                        <AlertDialogAction
                          onClick={() => { deletePost(post.id); toast.success("Post deleted"); }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
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

        {/* Title */}
        <h2 className="text-lg lg:text-xl font-semibold tracking-tight leading-snug mb-1.5 group-hover:text-primary transition-colors">
          {post.title}
        </h2>

        {/* Preview */}
        {!compact && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
            {post.preview}
          </p>
        )}

        {/* Images */}
        {post.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {post.images.slice(0, 2).map((img, i) => (
              <div key={i} className="aspect-video rounded-xl overflow-hidden bg-muted">
                <img src={img.url} alt={img.alt ?? ""} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-border/40">
        <VoteButton
          score={score}
          hasUpvoted={hasUpvoted}
          hasDownvoted={hasDownvoted}
          onUpvote={() => { upvotePost(post.id); }}
          onDownvote={() => { downvotePost(post.id); }}
        />

        <ActionButton
          icon={<MessageSquare className="w-4 h-4" />}
          label={formatNumber(post.commentIds.length)}
          onClick={() => setView({ name: "post", postId: post.id })}
          hoverLabel="Comments"
        />

        <div className="flex-1" />

        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground px-2">
          <Eye className="w-3.5 h-3.5" />
          {formatNumber(post.views)}
        </span>

        <ActionButton
          icon={<Bookmark className={hasBookmarked ? "w-4 h-4 fill-current" : "w-4 h-4"} />}
          active={hasBookmarked}
          onClick={() => {
            bookmarkPost(post.id);
            toast.success(hasBookmarked ? "Removed bookmark" : "Bookmarked");
          }}
          hoverLabel="Bookmark"
        />

        <ActionButton
          icon={<Share2 className="w-4 h-4" />}
          onClick={handleShare}
          hoverLabel="Share"
        />
      </div>

      {/* Report dialog */}
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
