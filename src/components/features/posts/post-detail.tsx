"use client";

import * as React from "react";
import { useUIStore } from "@/lib/ui-store";
import { useAuth, supabase } from "@/lib/auth";
import { fetchPost, fetchComments, addComment, updateComment, deleteComment, voteOnComment, toggleBookmark, voteOnPost, removeVoteOnPost, deletePost, updatePost, type Post, type Comment } from "@/lib/data";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowBigUp, ArrowBigDown, Bookmark, Share2, Eye, Trash2, Edit, Flag, Reply, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { timeAgo, formatDate, formatNumber } from "@/lib/helpers";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import { ReadingProgressBar, BackToTopButton } from "@/components/shared/reading-progress";
import { trackViewedPost } from "@/components/features/feed/recently-viewed";
import { PollWidget } from "@/components/shared/poll-widget";
import { ShareDialog } from "@/components/shared/share-dialog";

export function PostDetailPage({ postId }: { postId: string }) {
  const setView = useUIStore((s) => s.setView);
  const { profile } = useAuth();
  const [post, setPost] = React.useState<Post | null>(null);
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newComment, setNewComment] = React.useState("");
  const [shareOpen, setShareOpen] = React.useState(false);
  const [sort, setSort] = React.useState<"top" | "new" | "controversial">("top");

  const loadPost = React.useCallback(async () => {
    const p = await fetchPost(postId, profile?.id);
    setPost(p);
    setLoading(false);
  }, [postId, profile?.id]);

  const loadComments = React.useCallback(async () => {
    const c = await fetchComments(postId, profile?.id);
    setComments(c);
  }, [postId, profile?.id]);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      await loadPost();
      await loadComments();
      if (!mounted) return;
      // Track this post as recently viewed
      if (post) {
        trackViewedPost({
          id: post.id,
          title: post.title,
          topicName: post.topics?.[0]?.name,
          topicIcon: post.topics?.[0]?.icon,
        });
      }
    })();
    return () => { mounted = false; };
  }, [loadPost, loadComments, post?.id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="glass-card rounded-3xl h-64 animate-pulse" />
        <div className="glass-card rounded-2xl h-32 animate-pulse" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <h2 className="text-xl font-semibold mb-2">Post not found</h2>
        <p className="text-sm text-muted-foreground mb-4">It may have been deleted.</p>
        <Button onClick={() => setView({ name: "home", feed: "trending" })}>Back to home</Button>
      </div>
    );
  }

  if (post.removed) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <h2 className="text-xl font-semibold mb-2">Post removed</h2>
        <p className="text-sm text-muted-foreground mb-1">This post was removed by moderators.</p>
        {post.removed_reason && <p className="text-xs text-muted-foreground italic mb-4">Reason: {post.removed_reason}</p>}
        <Button onClick={() => setView({ name: "home", feed: "trending" })}>Back to home</Button>
      </div>
    );
  }

  const author = post.author;
  const topics = post.topics ?? [];
  const score = post.upvote_count - post.downvote_count;
  const hasUpvoted = post.my_vote === 1;
  const hasDownvoted = post.my_vote === -1;
  const hasBookmarked = !!post.is_bookmarked;
  const isAuthor = profile?.id === post.author_id;

  const handleVote = async (value: 1 | -1) => {
    if (!profile) { toast.error("Sign in to vote"); return; }
    const prev = post;
    const newValue = prev.my_vote === value ? 0 : value;
    setPost({
      ...prev,
      my_vote: newValue as 1 | -1 | 0,
      upvote_count: prev.upvote_count + (newValue === 1 ? 1 : prev.my_vote === 1 ? -1 : 0),
      downvote_count: prev.downvote_count + (newValue === -1 ? 1 : prev.my_vote === -1 ? -1 : 0),
    });
    try {
      if (newValue === 0) await removeVoteOnPost(post.id, profile.id);
      else await voteOnPost(post.id, profile.id, value);
    } catch (e) {
      console.error(e);
      setPost(prev);
    }
  };

  const handleBookmark = async () => {
    if (!profile) { toast.error("Sign in to bookmark"); return; }
    setPost({ ...post, is_bookmarked: !post.is_bookmarked });
    try {
      await toggleBookmark(post.id, profile.id);
    } catch (e) {
      console.error(e);
      setPost(post);
    }
  };

  const handleShare = () => {
    setShareOpen(true);
  };

  const submitComment = async () => {
    if (!newComment.trim() || !profile) return;
    const id = await addComment({ postId: post.id, parentId: null, content: newComment.trim() }, profile.id);
    if (id) {
      setNewComment("");
      toast.success("Comment posted");
      await loadComments();
      await loadPost();
    }
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (sort === "new") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === "controversial") {
      // Controversial = lots of votes on both sides (close ratio + high volume)
      const scoreA = Math.min(a.upvote_count, a.downvote_count) * (a.upvote_count + a.downvote_count);
      const scoreB = Math.min(b.upvote_count, b.downvote_count) * (b.upvote_count + b.downvote_count);
      return scoreB - scoreA;
    }
    return (b.upvote_count - b.downvote_count) - (a.upvote_count - a.downvote_count);
  });

  return (
    <div className="max-w-3xl mx-auto">
      <ReadingProgressBar />
      <BackToTopButton />
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <button onClick={() => setView({ name: "home", feed: "trending" })} className="hover:text-foreground">Home</button>
        <span>/</span>
        {topics[0] && (
          <button onClick={() => setView({ name: "topic", topicId: topics[0].id })} className="hover:text-foreground inline-flex items-center gap-1">
            <span>{topics[0].icon}</span> {topics[0].name}
          </button>
        )}
      </div>

      <article className="glass-card rounded-3xl overflow-hidden mb-6">
        <div className="p-5 lg:p-6 pb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => author && setView({ name: "profile", userId: author.id, tab: "posts" })}>
              <Avatar className="w-11 h-11 ring-2 ring-border/50">
                {author?.avatar_url ? <AvatarImage src={author.avatar_url} alt={author?.name} /> : null}
                <AvatarFallback>{author?.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
            </button>
            <div className="min-w-0 flex-1">
              <button onClick={() => author && setView({ name: "profile", userId: author.id, tab: "posts" })} className="text-left">
                <div className="font-semibold leading-tight hover:text-primary transition-colors">{author?.name ?? "Unknown"}</div>
                <div className="text-xs text-muted-foreground leading-tight">
                  @{author?.username ?? "unknown"} · {formatDate(post.created_at)}
                  {post.updated_at && <span className="italic"> · edited</span>}
                </div>
              </button>
            </div>
            <div className="flex items-center gap-1">
              {author && profile && profile.id !== author.id && (
                <FollowButton userId={author.id} />
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-lg">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleShare}><Share2 className="w-4 h-4 mr-2" /> Share</DropdownMenuItem>
                  <DropdownMenuItem onSelect={async () => {
                    const reason = window.prompt("Report reason");
                    if (reason && profile && supabase) {
                      await supabase.from("reports").insert({ reporter_id: profile.id, target_type: "post", target_id: post.id, reason });
                      toast.success("Reported");
                    }
                  }}>
                    <Flag className="w-4 h-4 mr-2" /> Report
                  </DropdownMenuItem>
                  {isAuthor && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setView({ name: "editor", postId: post.id })}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently remove the post and all comments.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                await deletePost(post.id);
                                toast.success("Post deleted");
                                setView({ name: "home", feed: "trending" });
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="px-5 lg:px-6 pb-3">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight leading-tight">{post.title}</h1>
        </div>

        <div className="px-5 lg:px-6 pb-3 flex flex-wrap items-center gap-2">
          {topics.map((t) => (
            <button
              key={t.id}
              onClick={() => setView({ name: "topic", topicId: t.id })}
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md hover:bg-accent transition-colors"
              style={{ color: t.color }}
            >
              <span>{t.icon}</span>
              {t.name}
            </button>
          ))}
          {post.tags.map((tag) => (
            <span key={tag} className="text-xs px-2 py-1 rounded-md bg-muted/60 text-muted-foreground">#{tag}</span>
          ))}
        </div>

        <div className="px-5 lg:px-6 pb-6 prose-nexus">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>

        {post.images.length > 0 && (
          <div className="px-5 lg:px-6 pb-6 space-y-3">
            {post.images.map((img, i) => (
              <img key={i} src={img.url} alt={img.alt ?? ""} className="w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Inline poll if exists */}
        <div className="px-5 lg:px-6 pb-6">
          <PollWidget postId={post.id} />
        </div>

        <div className="flex items-center gap-1 px-3 py-2 border-t border-border/40">
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-muted/40">
            <button onClick={() => handleVote(1)} className={`p-1.5 rounded-lg hover:bg-accent transition-colors ${hasUpvoted ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <ArrowBigUp className={`w-4 h-4 ${hasUpvoted ? "fill-current" : ""}`} />
            </button>
            <span className={`text-xs font-semibold min-w-[24px] text-center ${hasUpvoted ? "text-primary" : hasDownvoted ? "text-destructive" : "text-foreground"}`}>{formatNumber(score)}</span>
            <button onClick={() => handleVote(-1)} className={`p-1.5 rounded-lg hover:bg-accent transition-colors ${hasDownvoted ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}>
              <ArrowBigDown className={`w-4 h-4 ${hasDownvoted ? "fill-current" : ""}`} />
            </button>
          </div>
          <span className="text-xs text-muted-foreground px-2 inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> {formatNumber(post.views)} views
          </span>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={handleBookmark} className={`rounded-lg ${hasBookmarked ? "text-primary" : ""}`}>
            <Bookmark className={`w-4 h-4 ${hasBookmarked ? "fill-current" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-lg">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </article>

      <div className="space-y-4">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-9 h-9 shrink-0">
              {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.name} /> : null}
              <AvatarFallback>{profile?.name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={profile ? "Add to the discussion…" : "Sign in to comment"}
                rows={3}
                className="rounded-xl resize-none bg-muted/40"
                disabled={!profile}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">Tip: use @username to mention people</span>
                <Button onClick={submitComment} disabled={!newComment.trim() || !profile} size="sm" className="rounded-lg">
                  <Reply className="w-3.5 h-3.5 mr-1" /> Comment
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{formatNumber(post.comment_count)} comments</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/40">
            {(["top", "new", "controversial"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                  sort === s ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {sortedComments.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <p className="text-sm text-muted-foreground mb-2">No comments yet.</p>
            <p className="text-xs text-muted-foreground">Be the first to start the discussion.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {sortedComments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  postId={post.id}
                  depth={0}
                  onReload={async () => { await loadComments(); await loadPost(); }}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Share dialog */}
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        postTitle={post.title}
        postUrl={typeof window !== "undefined" ? `${window.location.origin}/?post=${post.id}` : undefined}
      />
    </div>
  );
}

function FollowButton({ userId }: { userId: string }) {
  const { profile } = useAuth();
  const [following, setFollowing] = React.useState(false);

  React.useEffect(() => {
    if (!profile || !supabase) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase!
        .from("user_followers")
        .select("follower_id")
        .eq("follower_id", profile.id)
        .eq("followee_id", userId)
        .maybeSingle();
      if (mounted) setFollowing(!!data);
    })();
    return () => { mounted = false; };
  }, [profile, userId]);

  if (!profile || profile.id === userId) return null;

  return (
    <Button
      variant={following ? "secondary" : "outline"}
      size="sm"
      className="rounded-lg text-xs"
      onClick={async () => {
        const { followUser, unfollowUser } = await import("@/lib/data");
        if (following) {
          await unfollowUser(profile.id, userId);
          setFollowing(false);
          toast.success("Unfollowed");
        } else {
          await followUser(profile.id, userId);
          setFollowing(true);
          toast.success("Following");
        }
      }}
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}

function CommentItem({ comment, postId, depth, onReload }: { comment: Comment; postId: string; depth: number; onReload: () => Promise<void> }) {
  const { profile } = useAuth();
  const [localComment, setLocalComment] = React.useState(comment);
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [editText, setEditText] = React.useState(comment.content);

  React.useEffect(() => setLocalComment(comment), [comment]);

  const author = localComment.author;
  const hasUpvoted = localComment.my_vote === 1;
  const hasDownvoted = localComment.my_vote === -1;
  const score = localComment.upvote_count - localComment.downvote_count;
  const isAuthor = profile?.id === localComment.author_id;

  const handleVote = async (value: 1 | -1) => {
    if (!profile) { toast.error("Sign in to vote"); return; }
    const prev = localComment;
    const newValue = prev.my_vote === value ? 0 : value;
    setLocalComment({
      ...prev,
      my_vote: newValue as 1 | -1 | 0,
      upvote_count: prev.upvote_count + (newValue === 1 ? 1 : prev.my_vote === 1 ? -1 : 0),
      downvote_count: prev.downvote_count + (newValue === -1 ? 1 : prev.my_vote === -1 ? -1 : 0),
    });
    try {
      if (newValue === 0) {
        // Use the supabase client imported at top of file from @/lib/auth
        await supabase!.from("comment_votes").delete().match({ comment_id: comment.id, user_id: profile.id });
      } else {
        await voteOnComment(comment.id, profile.id, value);
      }
    } catch (e) {
      console.error(e);
      setLocalComment(prev);
    }
  };

  const submitReply = async () => {
    if (!replyText.trim() || !profile) return;
    const id = await addComment({ postId, parentId: comment.id, content: replyText.trim() }, profile.id);
    if (id) {
      setReplyText("");
      setReplyOpen(false);
      toast.success("Reply added");
      await onReload();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="glass-card rounded-2xl p-4"
      style={{ marginLeft: depth > 0 ? `${Math.min(depth, 4) * 16}px` : 0 }}
    >
      <div className="flex items-start gap-3">
        <Avatar className="w-8 h-8">
          {author?.avatar_url ? <AvatarImage src={author.avatar_url} alt={author?.name} /> : null}
          <AvatarFallback>{author?.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => author && useUIStore.getState().setView({ name: "profile", userId: author.id, tab: "posts" })}
              className="font-medium text-sm hover:text-primary transition-colors"
            >
              {author?.name ?? "Unknown"}
            </button>
            <span className="text-xs text-muted-foreground">@{author?.username ?? "unknown"}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{timeAgo(localComment.created_at)}</span>
            {localComment.updated_at && <span className="text-xs text-muted-foreground italic">· edited</span>}
          </div>

          {editOpen ? (
            <div className="space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="rounded-lg resize-none bg-muted/40"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={async () => { await updateComment(comment.id, editText); setEditOpen(false); toast.success("Edited"); }}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditOpen(false); setEditText(localComment.content); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm leading-relaxed prose-nexus">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{localComment.content}</ReactMarkdown>
            </div>
          )}

          <div className="flex items-center gap-1 mt-2">
            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/40">
              <button onClick={() => handleVote(1)} className={`p-1 rounded hover:bg-accent transition-colors ${hasUpvoted ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <ArrowBigUp className={`w-3.5 h-3.5 ${hasUpvoted ? "fill-current" : ""}`} />
              </button>
              <span className={`text-xs font-semibold min-w-[20px] text-center ${hasUpvoted ? "text-primary" : hasDownvoted ? "text-destructive" : "text-foreground"}`}>{score}</span>
              <button onClick={() => handleVote(-1)} className={`p-1 rounded hover:bg-accent transition-colors ${hasDownvoted ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}>
                <ArrowBigDown className={`w-3.5 h-3.5 ${hasDownvoted ? "fill-current" : ""}`} />
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setReplyOpen((v) => !v)} className="h-7 px-2 text-xs gap-1">
              <Reply className="w-3 h-3" /> Reply
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAuthor && (
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={async () => {
                  const reason = window.prompt("Report reason");
                  if (reason && profile && supabase) {
                    await supabase.from("reports").insert({ reporter_id: profile.id, target_type: "comment", target_id: comment.id, reason });
                    toast.success("Reported");
                  }
                }}>
                  <Flag className="w-3.5 h-3.5 mr-2" /> Report
                </DropdownMenuItem>
                {isAuthor && (
                  <>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                          <AlertDialogDescription>This will remove the comment and all replies.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              await deleteComment(comment.id);
                              toast.success("Deleted");
                              await onReload();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {replyOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to @${author?.username ?? "user"}…`}
                rows={2}
                className="rounded-lg resize-none bg-muted/40 text-sm"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={submitReply} disabled={!replyText.trim()}>Reply</Button>
                <Button size="sm" variant="ghost" onClick={() => setReplyOpen(false)}>Cancel</Button>
              </div>
            </motion.div>
          )}

          {localComment.children && localComment.children.length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 border-border/40 pl-3">
              {localComment.children.map((child) => (
                <CommentItem key={child.id} comment={child} postId={postId} depth={depth + 1} onReload={onReload} />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Avoid unused import warning
void updatePost;
