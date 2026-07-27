"use client";

import { supabase } from "@/lib/auth";
import type { Profile } from "@/lib/auth";

// Re-export Profile so consumers can import it from either module
export type { Profile } from "@/lib/auth";

// ============================================================================
// Types — mirror our public schema
// ============================================================================

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string;
  banner: string;
  color: string;
  icon: string;
  parent_id: string | null;
  post_count: number;
  created_at: string;
  follower_count?: number;
}

export interface Post {
  id: string;
  author_id: string;
  title: string;
  preview: string;
  content: string;
  images: { url: string; alt?: string }[];
  tags: string[];
  views: number;
  removed: boolean;
  removed_reason: string | null;
  created_at: string;
  updated_at: string | null;
  topic_ids: string[];
  topics?: Topic[];
  author?: Profile;
  upvote_count: number;
  downvote_count: number;
  comment_count: number;
  my_vote?: 1 | -1 | 0;
  is_bookmarked?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  mentions: string[];
  removed: boolean;
  created_at: string;
  updated_at: string | null;
  author?: Profile;
  upvote_count: number;
  downvote_count: number;
  my_vote?: 1 | -1 | 0;
  children?: Comment[];
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: "like" | "reply" | "mention" | "follow" | "topic_update" | "system";
  actor_id: string | null;
  post_id: string | null;
  comment_id: string | null;
  topic_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
  actor?: Profile;
}

export interface BookmarkFolder {
  id: string;
  user_id: string;
  name: string;
  post_ids: string[];
  created_at: string;
}

// ============================================================================
// Topics
// ============================================================================

export async function fetchTopics(): Promise<Topic[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    console.error("fetchTopics error:", error);
    return [];
  }
  return (data ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    follower_count: Array.isArray(t.followers) ? t.followers.length : 0,
  })) as Topic[];
}

export async function fetchTopic(slugOrId: string): Promise<Topic | null> {
  if (!supabase) return null;
  const col = slugOrId.length === 36 && slugOrId.includes("-") ? "id" : "slug";
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .eq(col, slugOrId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Topic;
}

export async function fetchTopicFollowers(topicId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("topic_followers")
    .select("user_id")
    .eq("topic_id", topicId);
  if (error) return [];
  return (data ?? []).map((r: { user_id: string }) => r.user_id);
}

export async function followTopic(topicId: string, userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("topic_followers").upsert({ topic_id: topicId, user_id: userId });
}

export async function unfollowTopic(topicId: string, userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("topic_followers").delete().match({ topic_id: topicId, user_id: userId });
}

export async function isFollowingTopic(topicId: string, userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase
    .from("topic_followers")
    .select("user_id")
    .eq("topic_id", topicId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

// ============================================================================
// Posts
// ============================================================================

export type FeedSort = "trending" | "latest" | "popular" | "week" | "following";

// Standard post select with all aggregates + topic join
const POST_SELECT_FULL = `
  id, author_id, title, preview, content, images, tags, views,
  removed, removed_reason, created_at, updated_at,
  upvote_count:post_votes!post_votes_post_id_fkey(count),
  downvote_count:post_votes!post_votes_post_id_fkey(count),
  comment_count:comments!comments_post_id_fkey(count),
  post_topics(topic_id)
`;

// Lighter select for search/random (no aggregate joins — counts fetched in transformPosts)
const POST_SELECT_LIGHT = `
  id, author_id, title, preview, content, images, tags, views,
  removed, removed_reason, created_at, updated_at
`;

interface FetchPostsOptions {
  sort?: FeedSort;
  topicId?: string;
  authorId?: string;
  bookmarkedBy?: string;
  limit?: number;
  offset?: number;
  currentUserId?: string;
}

export async function fetchPosts(opts: FetchPostsOptions = {}): Promise<Post[]> {
  if (!supabase) return [];
  const { sort = "latest", topicId, authorId, bookmarkedBy, limit = 20, offset = 0, currentUserId } = opts;

  let query = supabase.from("posts").select(`
      id, author_id, title, preview, content, images, tags, views,
      removed, removed_reason, created_at, updated_at,
      upvote_count:post_votes!post_votes_post_id_fkey(count),
      downvote_count:post_votes!post_votes_post_id_fkey(count),
      comment_count:comments!comments_post_id_fkey(count),
      post_topics(topic_id)
    `);

  // Joins via post_topics
  if (topicId) {
    // Topic-scoped query — keep all aggregates, use inner join on post_topics
    query = supabase
      .from("posts")
      .select(`
        id, author_id, title, preview, content, images, tags, views,
        removed, removed_reason, created_at, updated_at,
        upvote_count:post_votes!post_votes_post_id_fkey(count),
        downvote_count:post_votes!post_votes_post_id_fkey(count),
        comment_count:comments!comments_post_id_fkey(count),
        post_topics!inner(topic_id)
      `)
      .eq("post_topics.topic_id", topicId);
  }

  if (authorId) query = query.eq("author_id", authorId);

  // Note: bookmarkedBy filter is handled separately below because we can't
  // directly filter by a foreign key on the bookmarks table from posts.

  let postsQuery = query.eq("removed", false);

  // For "week" filter, restrict to last 7 days
  if (sort === "week") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    postsQuery = postsQuery.gte("created_at", weekAgo);
  }

  // For "following" filter, restrict to posts in topics the user follows
  if (sort === "following" && currentUserId) {
    const { data: followed } = await supabase
      .from("topic_followers")
      .select("topic_id")
      .eq("user_id", currentUserId);
    const followedTopicIds = (followed ?? []).map((r: { topic_id: string }) => r.topic_id);
    if (followedTopicIds.length === 0) return [];
    // Get post IDs that match any followed topic
    const { data: postTopics } = await supabase
      .from("post_topics")
      .select("post_id")
      .in("topic_id", followedTopicIds);
    const postIds = [...new Set((postTopics ?? []).map((r: { post_id: string }) => r.post_id))];
    if (postIds.length === 0) return [];
    postsQuery = postsQuery.in("id", postIds);
  }

  if (sort === "latest") {
    postsQuery = postsQuery.order("created_at", { ascending: false });
  } else if (sort === "popular") {
    // Popular = most upvotes — we'll sort client-side after fetching counts
    postsQuery = postsQuery.order("created_at", { ascending: false }).limit(limit * 3);
  } else {
    // trending, week — fetch recent, sort client-side
    postsQuery = postsQuery.order("created_at", { ascending: false }).limit(limit * 3);
  }

  postsQuery = postsQuery.range(offset, offset + limit - 1);

  const { data, error } = await postsQuery;
  if (error) {
    console.error("fetchPosts error:", error);
    return [];
  }

  // If filtering by bookmarked posts, fetch bookmarked post IDs first
  if (bookmarkedBy) {
    const { data: bookmarkData } = await supabase
      .from("bookmarks")
      .select("post_id")
      .eq("user_id", bookmarkedBy);
    const bookmarkedIds = (bookmarkData ?? []).map((b: { post_id: string }) => b.post_id);
    const filtered = (data ?? []).filter((p: { id: string }) => bookmarkedIds.includes(p.id));
    return transformPosts(filtered, sort, limit, currentUserId);
  }

  return transformPosts(data ?? [], sort, limit, currentUserId);
}

async function transformPosts(
  rows: Record<string, unknown>[],
  sort: FeedSort,
  limit: number,
  currentUserId?: string
): Promise<Post[]> {
  if (rows.length === 0) return [];

  const authorIds = [...new Set(rows.map((r) => r.author_id as string))];
  const postIds = rows.map((r) => r.id as string);

  // Fetch authors
  const { data: authors } = await supabase!
    .from("users")
    .select("*")
    .in("id", authorIds);
  const authorMap = new Map<string, Profile>(
    (authors ?? []).map((a: Profile) => [a.id, a])
  );

  // Fetch topics for all posts
  const { data: postTopics } = await supabase!
    .from("post_topics")
    .select("post_id, topic_id, topics!inner(id, name, slug, description, banner, color, icon, parent_id, post_count, created_at)")
    .in("post_id", postIds);
  const topicMap = new Map<string, Topic[]>();
  (postTopics ?? []).forEach((pt: Record<string, unknown>) => {
    const postId = pt.post_id as string;
    const t = pt.topics as Topic;
    if (!topicMap.has(postId)) topicMap.set(postId, []);
    topicMap.get(postId)!.push(t);
  });

  // Fetch current user's votes
  let voteMap = new Map<string, 1 | -1 | 0>();
  if (currentUserId) {
    const { data: votes } = await supabase!
      .from("post_votes")
      .select("post_id, value")
      .eq("user_id", currentUserId)
      .in("post_id", postIds);
    (votes ?? []).forEach((v: { post_id: string; value: 1 | -1 }) => {
      voteMap.set(v.post_id, v.value);
    });
  }

  // Fetch current user's bookmarks
  let bookmarkSet = new Set<string>();
  if (currentUserId) {
    const { data: bookmarks } = await supabase!
      .from("bookmarks")
      .select("post_id")
      .eq("user_id", currentUserId)
      .in("post_id", postIds);
    (bookmarks ?? []).forEach((b: { post_id: string }) => bookmarkSet.add(b.post_id));
  }

  const posts: Post[] = rows.map((r) => {
    const upvoteRow = (r.upvote_count as { count: number }[] | null)?.[0];
    const downvoteRow = (r.downvote_count as { count: number }[] | null)?.[0];
    const commentRow = (r.comment_count as { count: number }[] | null)?.[0];
    return {
      id: r.id,
      author_id: r.author_id,
      title: r.title,
      preview: r.preview,
      content: r.content,
      images: (r.images as { url: string; alt?: string }[]) ?? [],
      tags: (r.tags as string[]) ?? [],
      views: r.views as number,
      removed: r.removed as boolean,
      removed_reason: r.removed_reason as string | null,
      created_at: r.created_at,
      updated_at: r.updated_at as string | null,
      topic_ids: ((r.post_topics as { topic_id: string }[]) ?? []).map((pt) => pt.topic_id),
      topics: topicMap.get(r.id as string) ?? [],
      author: authorMap.get(r.author_id as string),
      upvote_count: upvoteRow?.count ?? 0,
      downvote_count: downvoteRow?.count ?? 0,
      comment_count: commentRow?.count ?? 0,
      my_vote: voteMap.get(r.id as string) ?? 0,
      is_bookmarked: bookmarkSet.has(r.id as string),
    };
  });

  // Sort trending/popular/week
  const day = 24 * 60 * 60 * 1000;
  if (sort === "popular") {
    posts.sort((a, b) => (b.upvote_count - b.downvote_count) - (a.upvote_count - a.downvote_count));
  } else if (sort === "trending" || sort === "week") {
    posts.sort((a, b) => {
      const ageA = (Date.now() - new Date(a.created_at).getTime()) / day;
      const ageB = (Date.now() - new Date(b.created_at).getTime()) / day;
      const scoreA = (a.upvote_count - a.downvote_count + a.comment_count * 2 + a.views / 100) / Math.pow(ageA + 2, 1.3);
      const scoreB = (b.upvote_count - b.downvote_count + b.comment_count * 2 + b.views / 100) / Math.pow(ageB + 2, 1.3);
      return scoreB - scoreA;
    });
  }

  return posts.slice(0, limit);
}

export async function fetchPost(postId: string, currentUserId?: string): Promise<Post | null> {
  if (!supabase) return null;
  // Use the full select so we get vote counts, comment count, and topic_ids
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT_FULL)
    .eq("id", postId)
    .maybeSingle();
  if (error || !data) return null;
  // Increment view count (best-effort, fire-and-forget)
  try { await supabase.rpc("increment_post_views", { post_id: postId }); } catch {}
  const posts = await transformPosts([data], "latest", 1, currentUserId);
  return posts[0] ?? null;
}

export async function createPost(
  data: {
    title: string;
    content: string;
    topicIds: string[];
    tags?: string[];
    images?: { url: string; alt?: string }[];
  },
  authorId: string
): Promise<string | null> {
  if (!supabase) return null;
  const preview = data.content.replace(/[#>*`_~\-\[\]\(\)!]/g, "").slice(0, 160).trim();
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: authorId,
      title: data.title,
      preview,
      content: data.content,
      tags: data.tags ?? [],
      images: data.images ?? [],
    })
    .select("id")
    .single();
  if (error || !post) {
    console.error("createPost error:", error);
    return null;
  }
  // Link topics
  if (data.topicIds.length > 0) {
    const links = data.topicIds.map((topic_id) => ({ post_id: post.id, topic_id }));
    await supabase.from("post_topics").insert(links);
  }
  return post.id;
}

export async function updatePost(
  postId: string,
  data: { title?: string; content?: string; topicIds?: string[]; tags?: string[] }
): Promise<void> {
  if (!supabase) return;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.title !== undefined) update.title = data.title;
  if (data.content !== undefined) {
    update.content = data.content;
    update.preview = data.content.replace(/[#>*`_~\-\[\]\(\)!]/g, "").slice(0, 160).trim();
  }
  if (data.tags !== undefined) update.tags = data.tags;
  await supabase.from("posts").update(update).eq("id", postId);

  if (data.topicIds !== undefined) {
    await supabase.from("post_topics").delete().eq("post_id", postId);
    if (data.topicIds.length > 0) {
      const links = data.topicIds.map((topic_id) => ({ post_id: postId, topic_id }));
      await supabase.from("post_topics").insert(links);
    }
  }
}

export async function deletePost(postId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("posts").delete().eq("id", postId);
}

export async function fetchRandomPost(currentUserId?: string): Promise<Post | null> {
  if (!supabase) return null;
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("removed", false);
  if (!count || count === 0) return null;
  const offset = Math.floor(Math.random() * count);
  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT_FULL)
    .eq("removed", false)
    .range(offset, offset);
  if (!data || data.length === 0) return null;
  const posts = await transformPosts(data, "latest", 1, currentUserId);
  return posts[0] ?? null;
}

// ============================================================================
// Votes
// ============================================================================

export async function voteOnPost(
  postId: string,
  userId: string,
  value: 1 | -1
): Promise<void> {
  if (!supabase) return;
  // Try upsert — primary key (post_id, user_id) ensures one vote per user
  const { error } = await supabase
    .from("post_votes")
    .upsert({ post_id: postId, user_id: userId, value }, { onConflict: "post_id,user_id" });
  if (error) console.error("voteOnPost error:", error);
}

export async function removeVoteOnPost(postId: string, userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("post_votes").delete().match({ post_id: postId, user_id: userId });
}

// ============================================================================
// Comments
// ============================================================================

export async function fetchComments(postId: string, currentUserId?: string): Promise<Comment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .eq("removed", false)
    .order("created_at", { ascending: true });
  if (error || !data) return [];

  const authorIds = [...new Set(data.map((c: { author_id: string }) => c.author_id))];
  const commentIds = data.map((c: { id: string }) => c.id);

  const { data: authors } = await supabase
    .from("users")
    .select("*")
    .in("id", authorIds);
  const authorMap = new Map<string, Profile>(
    (authors ?? []).map((a: Profile) => [a.id, a])
  );

  let voteMap = new Map<string, 1 | -1 | 0>();
  if (currentUserId) {
    const { data: votes } = await supabase
      .from("comment_votes")
      .select("comment_id, value")
      .eq("user_id", currentUserId)
      .in("comment_id", commentIds);
    (votes ?? []).forEach((v: { comment_id: string; value: 1 | -1 }) => {
      voteMap.set(v.comment_id, v.value);
    });
  }

  const { data: upvoteCounts } = await supabase
    .from("comment_votes")
    .select("comment_id, value")
    .in("comment_id", commentIds);

  const upMap = new Map<string, number>();
  const downMap = new Map<string, number>();
  (upvoteCounts ?? []).forEach((v: { comment_id: string; value: number }) => {
    if (v.value === 1) upMap.set(v.comment_id, (upMap.get(v.comment_id) ?? 0) + 1);
    else downMap.set(v.comment_id, (downMap.get(v.comment_id) ?? 0) + 1);
  });

  const comments: Comment[] = data.map((c: Record<string, unknown>) => ({
    id: c.id as string,
    post_id: c.post_id as string,
    author_id: c.author_id as string,
    parent_id: c.parent_id as string | null,
    content: c.content as string,
    mentions: (c.mentions as string[]) ?? [],
    removed: c.removed as boolean,
    created_at: c.created_at as string,
    updated_at: c.updated_at as string | null,
    author: authorMap.get(c.author_id as string),
    upvote_count: upMap.get(c.id as string) ?? 0,
    downvote_count: downMap.get(c.id as string) ?? 0,
    my_vote: voteMap.get(c.id as string) ?? 0,
  }));

  // Build nested tree
  const byId = new Map(comments.map((c) => [c.id, c]));
  const roots: Comment[] = [];
  comments.forEach((c) => {
    if (c.parent_id && byId.has(c.parent_id)) {
      const parent = byId.get(c.parent_id)!;
      if (!parent.children) parent.children = [];
      parent.children.push(c);
    } else {
      roots.push(c);
    }
  });
  // Sort roots by score, children by time
  roots.sort((a, b) => (b.upvote_count - b.downvote_count) - (a.upvote_count - a.downvote_count));
  comments.forEach((c) => {
    if (c.children) c.children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  });
  return roots;
}

export async function addComment(
  data: { postId: string; parentId: string | null; content: string; mentions?: string[] },
  authorId: string
): Promise<string | null> {
  if (!supabase) return null;
  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      post_id: data.postId,
      author_id: authorId,
      parent_id: data.parentId,
      content: data.content,
      mentions: data.mentions ?? [],
    })
    .select("id")
    .single();
  if (error) {
    console.error("addComment error:", error);
    return null;
  }
  return comment.id;
}

export async function updateComment(commentId: string, content: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("comments")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", commentId);
}

export async function deleteComment(commentId: string): Promise<void> {
  if (!supabase) return;
  // Delete cascade will handle children
  await supabase.from("comments").delete().eq("id", commentId);
}

export async function voteOnComment(
  commentId: string,
  userId: string,
  value: 1 | -1
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("comment_votes")
    .upsert({ comment_id: commentId, user_id: userId, value }, { onConflict: "comment_id,user_id" });
}

// ============================================================================
// Bookmarks
// ============================================================================

export async function toggleBookmark(postId: string, userId: string): Promise<boolean> {
  if (!supabase) return false;
  // Check if exists
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    await supabase.from("bookmarks").delete().match({ post_id: postId, user_id: userId });
    return false;
  } else {
    await supabase.from("bookmarks").insert({ post_id: postId, user_id: userId });
    return true;
  }
}

export async function fetchBookmarkFolders(userId: string): Promise<BookmarkFolder[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("bookmark_folders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return data as BookmarkFolder[];
}

export async function createBookmarkFolder(userId: string, name: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("bookmark_folders")
    .insert({ user_id: userId, name })
    .select("id")
    .single();
  if (error) return null;
  return data.id;
}

export async function deleteBookmarkFolder(folderId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("bookmark_folders").delete().eq("id", folderId);
}

// ============================================================================
// User follows
// ============================================================================

export async function followUser(followerId: string, followeeId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("user_followers").insert({ follower_id: followerId, followee_id: followeeId });
}

export async function unfollowUser(followerId: string, followeeId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("user_followers").delete().match({ follower_id: followerId, followee_id: followeeId });
}

export async function isFollowingUser(followerId: string, followeeId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase
    .from("user_followers")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("followee_id", followeeId)
    .maybeSingle();
  return !!data;
}

export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

export async function fetchUserStats(userId: string): Promise<{
  followers: number;
  following: number;
  topicsFollowing: number;
  postCount: number;
}> {
  if (!supabase) return { followers: 0, following: 0, topicsFollowing: 0, postCount: 0 };
  const [followers, following, topicsFollowing, posts] = await Promise.all([
    supabase.from("user_followers").select("follower_id", { count: "exact", head: true }).eq("followee_id", userId),
    supabase.from("user_followers").select("followee_id", { count: "exact", head: true }).eq("follower_id", userId),
    supabase.from("topic_followers").select("topic_id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId).eq("removed", false),
  ]);
  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    topicsFollowing: topicsFollowing.count ?? 0,
    postCount: posts.count ?? 0,
  };
}

// ============================================================================
// Notifications
// ============================================================================

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];

  const actorIds = [...new Set((data ?? []).map((n: { actor_id: string | null }) => n.actor_id).filter(Boolean))] as string[];
  const { data: actors } = await supabase
    .from("users")
    .select("*")
    .in("id", actorIds);
  const actorMap = new Map<string, Profile>(
    (actors ?? []).map((a: Profile) => [a.id, a])
  );

  return (data ?? []).map((n: Record<string, unknown>) => ({
    ...n,
    actor: n.actor_id ? actorMap.get(n.actor_id as string) : undefined,
  })) as AppNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}

// ============================================================================
// Search
// ============================================================================

export interface SearchResults {
  posts: Post[];
  topics: Topic[];
  users: Profile[];
}

export async function searchAll(
  query: string,
  filter: "all" | "posts" | "topics" | "users" = "all",
  currentUserId?: string
): Promise<SearchResults> {
  if (!supabase || !query.trim()) return { posts: [], topics: [], users: [] };
  const q = query.trim();

  const [postsP, topicsP, usersP] = await Promise.all([
    filter === "all" || filter === "posts"
      ? supabase
          .from("posts")
          .select(POST_SELECT_FULL)
          .or(`title.ilike.%${q}%,preview.ilike.%${q}%`)
          .eq("removed", false)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
    filter === "all" || filter === "topics"
      ? supabase
          .from("topics")
          .select("*")
          .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
    filter === "all" || filter === "users"
      ? supabase
          .from("users")
          .select("*")
          .or(`name.ilike.%${q}%,username.ilike.%${q}%,bio.ilike.%${q}%`)
          .eq("banned", false)
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const posts = postsP.data ? await transformPosts(postsP.data as Record<string, unknown>[], "latest", 20, currentUserId) : [];
  return {
    posts,
    topics: (topicsP.data ?? []) as Topic[],
    users: (usersP.data ?? []) as Profile[],
  };
}
