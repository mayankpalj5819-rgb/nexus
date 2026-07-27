"use client";

import { useSignedInUser } from "@/lib/use-signed-in-user";
import * as React from "react";
import { useNexusStore, type Post, type User, type Comment } from "@/lib/store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowBigUp, ArrowBigDown, Bookmark, Share2, Eye, Trash2, Edit, Flag, Reply, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { timeAgo, formatNumber, formatDate } from "@/lib/helpers";
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
import { Skeleton } from "@/components/ui/skeleton";

export function PostDetailPage({ postId }: { postId: string }) {
  const getPost = useNexusStore((s) => s.getPost);
  const getUser = useNexusStore((s) => s.getUser);
  const getTopic = useNexusStore((s) => s.getTopic);
  const upvotePost = useNexusStore((s) => s.upvotePost);
  const downvotePost = useNexusStore((s) => s.downvotePost);
  const bookmarkPost = useNexusStore((s) => s.bookmarkPost);
  const deletePost = useNexusStore((s) => s.deletePost);
  const reportTarget = useNexusStore((s) => s.reportTarget);
  const getCommentsForPost = useNexusStore((s) => s.getCommentsForPost);
  const addComment = useNexusStore((s) => s.addComment);
  const setView = useNexusStore((s) => s.setView);
  const session = useNexusStore((s) => s.session);
  const signedInUser = useSignedInUser();

  const post = getPost(postId);
  const [newComment, setNewComment] = React.useState("");
  const [sort, setSort] = React.useState<"top" | "new">("top");
  const viewedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    // increment view count (best-effort) — once per post visit
    if (post && viewedRef.current !== post.id) {
      viewedRef.current = post.id;
      useNexusStore.setState((st) => ({
        posts: st.posts.map((p) => p.id === post.id ? { ...p, views: p.views + 1 } : p),
      }));
    }
  }, [post]);

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
        {post.removedReason && <p className="text-xs text-muted-foreground italic mb-4">Reason: {post.removedReason}</p>}
        <Button onClick={() => setView({ name: "home", feed: "trending" })}>Back to home</Button>
      </div>
    );
  }

  const author = getUser(post.authorId);
  const topics = post.topicIds.map((id) => getTopic(id)).filter(Boolean);
  const score = post.upvotes.length - post.downvotes.length;
  const hasUpvoted = session ? post.upvotes.includes(session.userId) : false;
  const hasDownvoted = session ? post.downvotes.includes(session.userId) : false;
  const hasBookmarked = session ? post.bookmarks.includes(session.userId) : false;
  const isAuthor = signedInUser?.id === post.authorId;

  const comments = getCommentsForPost(post.id).sort((a, b) => {
    if (sort === "new") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return (b.upvotes.length - b.downvotes.length) - (a.upvotes.length - a.downvotes.length);
  });

  const submitComment = () => {
    if (!newComment.trim()) return;
    addComment({ postId: post.id, parentId: null, content: newComment.trim() });
    setNewComment("");
    toast.success("Comment posted");
  };

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`Nexus post: "${post.title}"`).catch(() => {});
    }
    toast.success("Link copied");
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <button onClick={() => setView({ name: "home", feed: "trending" })} className="hover:text-foreground">Home</button>
        <span>/</span>
        {topics[0] && (
          <>
            <button onClick={() => setView({ name: "topic", topicId: topics[0].id })} className="hover:text-foreground inline-flex items-center gap-1">
              <span>{topics[0].icon}</span> {topics[0].name}
            </button>
          </>
        )}
      </div>

      {/* Post */}
      <article className="glass-card rounded-3xl overflow-hidden mb-6">
        {/* Author header */}
        <div className="p-5 lg:p-6 pb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => author && setView({ name: "profile", userId: author.id, tab: "posts" })}>
              <Avatar className="w-11 h-11 ring-2 ring-border/50">
                <AvatarImage src={author?.avatar} alt={author?.name} />
                <AvatarFallback>{author?.name[0]}</AvatarFallback>
              </Avatar>
            </button>
            <div className="min-w-0 flex-1">
              <button onClick={() => author && setView({ name: "profile", userId: author.id, tab: "posts" })} className="text-left">
                <div className="font-semibold leading-tight hover:text-primary transition-colors">{author?.name}</div>
                <div className="text-xs text-muted-foreground leading-tight">
                  @{author?.username} · {formatDate(post.createdAt)}
                  {post.updatedAt && <span className="italic"> · edited</span>}
                </div>
              </button>
            </div>
            <div className="flex items-center gap-1">
              {author && signedInUser && signedInUser.id !== author.id && (
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
                  <DropdownMenuItem onSelect={() => {
                    const reason = window.prompt("Report reason");
                    if (reason) { reportTarget({ targetType: "post", targetId: post.id, reason }); toast.success("Reported"); }
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
                              onClick={() => { deletePost(post.id); toast.success("Post deleted"); setView({ name: "home", feed: "trending" }); }}
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

        {/* Title */}
        <div className="px-5 lg:px-6 pb-3">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight leading-tight">{post.title}</h1>
        </div>

        {/* Topics + tags */}
        <div className="px-5 lg:px-6 pb-3 flex flex-wrap items-center gap-2">
          {topics.map((t) => (
            <button
              key={t!.id}
              onClick={() => setView({ name: "topic", topicId: t!.id })}
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md hover:bg-accent transition-colors"
              style={{ color: t!.color }}
            >
              <span>{t!.icon}</span>
              {t!.name}
            </button>
          ))}
          {post.tags.map((tag) => (
            <span key={tag} className="text-xs px-2 py-1 rounded-md bg-muted/60 text-muted-foreground">#{tag}</span>
          ))}
        </div>

        {/* Content */}
        <div className="px-5 lg:px-6 pb-6 prose-nexus">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>

        {/* Images */}
        {post.images.length > 0 && (
          <div className="px-5 lg:px-6 pb-6 space-y-3">
            {post.images.map((img, i) => (
              <img key={i} src={img.url} alt={img.alt ?? ""} className="w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-1 px-3 py-2 border-t border-border/40">
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-muted/40">
            <button onClick={() => upvotePost(post.id)} className={`p-1.5 rounded-lg hover:bg-accent transition-colors ${hasUpvoted ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <ArrowBigUp className={`w-4 h-4 ${hasUpvoted ? "fill-current" : ""}`} />
            </button>
            <span className={`text-xs font-semibold min-w-[24px] text-center ${hasUpvoted ? "text-primary" : hasDownvoted ? "text-destructive" : "text-foreground"}`}>{formatNumber(score)}</span>
            <button onClick={() => downvotePost(post.id)} className={`p-1.5 rounded-lg hover:bg-accent transition-colors ${hasDownvoted ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}>
              <ArrowBigDown className={`w-4 h-4 ${hasDownvoted ? "fill-current" : ""}`} />
            </button>
          </div>
          <span className="text-xs text-muted-foreground px-2 inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> {formatNumber(post.views)} views
          </span>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={() => { bookmarkPost(post.id); toast.success(hasBookmarked ? "Removed bookmark" : "Bookmarked"); }} className={`rounded-lg ${hasBookmarked ? "text-primary" : ""}`}>
            <Bookmark className={`w-4 h-4 ${hasBookmarked ? "fill-current" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-lg">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </article>

      {/* Comments */}
      <div className="space-y-4">
        {/* Comment composer */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-9 h-9 shrink-0">
              <AvatarImage src={signedInUser?.avatar} alt={signedInUser?.name} />
              <AvatarFallback>{signedInUser?.name[0] ?? "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add to the discussion…"
                rows={3}
                className="rounded-xl resize-none bg-muted/40"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  Tip: use @username to mention people
                </span>
                <Button onClick={submitComment} disabled={!newComment.trim()} size="sm" className="rounded-lg">
                  <Reply className="w-3.5 h-3.5 mr-1" /> Comment
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sort tabs */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{formatNumber(post.commentIds.length)} comments</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/40">
            {(["top", "new"] as const).map((s) => (
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

        {/* Comment list */}
        {comments.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <p className="text-sm text-muted-foreground mb-2">No comments yet.</p>
            <p className="text-xs text-muted-foreground">Be the first to start the discussion.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {comments.map((c) => (
                <CommentItem key={c.id} comment={c} postId={post.id} depth={0} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function FollowButton({ userId }: { userId: string }) {
  const isFollowing = useNexusStore((s) => s.isFollowingUser(userId));
  const followUser = useNexusStore((s) => s.followUser);
  const unfollowUser = useNexusStore((s) => s.unfollowUser);
  return (
    <Button
      variant={isFollowing ? "secondary" : "outline"}
      size="sm"
      className="rounded-lg text-xs"
      onClick={() => {
        if (isFollowing) { unfollowUser(userId); toast.success("Unfollowed"); }
        else { followUser(userId); toast.success("Following"); }
      }}
    >
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}

function CommentItem({ comment, postId, depth }: { comment: Comment; postId: string; depth: number }) {
  const getUser = useNexusStore((s) => s.getUser);
  const getChildComments = useNexusStore((s) => s.getChildComments);
  const upvoteComment = useNexusStore((s) => s.upvoteComment);
  const downvoteComment = useNexusStore((s) => s.downvoteComment);
  const addComment = useNexusStore((s) => s.addComment);
  const editComment = useNexusStore((s) => s.editComment);
  const deleteComment = useNexusStore((s) => s.deleteComment);
  const reportTarget = useNexusStore((s) => s.reportTarget);
  const setView = useNexusStore((s) => s.setView);
  const session = useNexusStore((s) => s.session);
  const signedInUser = useSignedInUser();

  const author = getUser(comment.authorId);
  const children = getChildComments(comment.id);
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [editText, setEditText] = React.useState(comment.content);

  if (!author) return null;

  const hasUpvoted = session ? comment.upvotes.includes(session.userId) : false;
  const hasDownvoted = session ? comment.downvotes.includes(session.userId) : false;
  const score = comment.upvotes.length - comment.downvotes.length;
  const isAuthor = signedInUser?.id === comment.authorId;

  const submitReply = () => {
    if (!replyText.trim()) return;
    addComment({ postId, parentId: comment.id, content: replyText.trim() });
    setReplyText("");
    setReplyOpen(false);
    toast.success("Reply added");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`glass-card rounded-2xl p-4 ${depth > 0 ? "ml-4 lg:ml-6" : ""}`}
      style={{ marginLeft: depth > 0 ? `${Math.min(depth, 4) * 16}px` : 0 }}
    >
      <div className="flex items-start gap-3">
        <button onClick={() => setView({ name: "profile", userId: author.id, tab: "posts" })}>
          <Avatar className="w-8 h-8">
            <AvatarImage src={author.avatar} alt={author.name} />
            <AvatarFallback>{author.name[0]}</AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setView({ name: "profile", userId: author.id, tab: "posts" })} className="font-medium text-sm hover:text-primary transition-colors">
              {author.name}
            </button>
            <span className="text-xs text-muted-foreground">@{author.username}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
            {comment.updatedAt && <span className="text-xs text-muted-foreground italic">· edited</span>}
            {depth > 0 && <span className="text-xs text-muted-foreground/70">· reply</span>}
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
                <Button size="sm" onClick={() => { editComment(comment.id, editText); setEditOpen(false); toast.success("Edited"); }}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditOpen(false); setEditText(comment.content); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm leading-relaxed prose-nexus">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.content}</ReactMarkdown>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 mt-2">
            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/40">
              <button onClick={() => upvoteComment(comment.id)} className={`p-1 rounded hover:bg-accent transition-colors ${hasUpvoted ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <ArrowBigUp className={`w-3.5 h-3.5 ${hasUpvoted ? "fill-current" : ""}`} />
              </button>
              <span className={`text-xs font-semibold min-w-[20px] text-center ${hasUpvoted ? "text-primary" : hasDownvoted ? "text-destructive" : "text-foreground"}`}>{score}</span>
              <button onClick={() => downvoteComment(comment.id)} className={`p-1 rounded hover:bg-accent transition-colors ${hasDownvoted ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}>
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
                <DropdownMenuItem onSelect={() => {
                  const reason = window.prompt("Report reason");
                  if (reason) { reportTarget({ targetType: "comment", targetId: comment.id, reason }); toast.success("Reported"); }
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
                            onClick={() => { deleteComment(comment.id); toast.success("Deleted"); }}
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

          {/* Reply box */}
          {replyOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3"
            >
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to @${author.username}…`}
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

          {/* Children */}
          {children.length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 border-border/40 pl-3">
              {children.map((child) => (
                <CommentItem key={child.id} comment={child} postId={postId} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
