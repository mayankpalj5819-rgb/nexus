"use client";

import * as React from "react";
import { useNexusStore } from "@/lib/store";
import { HomePage } from "@/components/features/feed/home-page";
import { TopicsExplorer } from "@/components/features/topics/topics-explorer";
import { TopicDetailPage } from "@/components/features/topics/topic-detail";
import { PostDetailPage } from "@/components/features/posts/post-detail";
import { SearchPage } from "@/components/features/search/search-page";
import { ProfilePage } from "@/components/features/profile/profile-page";
import { NotificationsPage } from "@/components/features/notifications/notifications-page";
import { BookmarksPage } from "@/components/features/bookmarks/bookmarks-page";
import { AdminPanel } from "@/components/features/admin/admin-panel";
import { PostEditorPage } from "@/components/features/editor/post-editor-page";
import { SettingsPage } from "@/components/features/profile/settings-page";

export function NexusViewRouter() {
  const view = useNexusStore((s) => s.view);

  switch (view.name) {
    case "home":
      return <HomePage />;
    case "topics":
      return <TopicsExplorer />;
    case "topic":
      return <TopicDetailPage topicId={view.topicId} />;
    case "post":
      return <PostDetailPage postId={view.postId} />;
    case "search":
      return <SearchPage initialQuery={view.query} initialFilter={view.filter} />;
    case "profile":
      return <ProfilePage userId={view.userId} initialTab={view.tab} />;
    case "notifications":
      return <NotificationsPage />;
    case "bookmarks":
      return <BookmarksPage folderId={view.folderId} />;
    case "admin":
      return <AdminPanel initialTab={view.tab} />;
    case "editor":
      return <PostEditorPage postId={view.postId} topicId={view.topicId} />;
    case "settings":
      return <SettingsPage />;
    default:
      return <HomePage />;
  }
}
