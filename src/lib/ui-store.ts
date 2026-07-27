import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ID = string;
export type View =
  | { name: "home"; feed?: FeedTab }
  | { name: "topic"; topicId: ID }
  | { name: "post"; postId: ID }
  | { name: "search"; query?: string; filter?: SearchFilter }
  | { name: "profile"; userId?: ID; tab?: ProfileTab }
  | { name: "notifications" }
  | { name: "bookmarks"; folderId?: ID }
  | { name: "admin"; tab?: AdminTab }
  | { name: "editor"; postId?: ID; topicId?: ID }
  | { name: "topics" }
  | { name: "settings" };

export type FeedTab = "trending" | "latest" | "popular" | "following" | "week";
export type SearchFilter = "all" | "posts" | "topics" | "users";
export type ProfileTab = "posts" | "comments" | "bookmarks" | "following" | "followers" | "activity";
export type AdminTab = "dashboard" | "users" | "posts" | "topics" | "reports" | "analytics" | "roles";

interface UIState {
  view: View;
  viewHistory: View[];
  recentSearches: string[];
  setView: (v: View) => void;
  goBack: () => void;
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      view: { name: "home", feed: "trending" } as View,
      viewHistory: [] as View[],
      recentSearches: [] as string[],
      setView: (v) => {
        const current = get().view;
        set({
          view: v,
          viewHistory: [...get().viewHistory, current].slice(-50),
        });
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      },
      goBack: () => {
        const hist = [...get().viewHistory];
        const prev = hist.pop();
        if (prev) set({ view: prev, viewHistory: hist });
      },
      addRecentSearch: (q) => {
        if (!q.trim()) return;
        const next = [q, ...get().recentSearches.filter((s) => s !== q)].slice(0, 10);
        set({ recentSearches: next });
      },
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: "nexus-ui-v2",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as unknown as Storage))),
      partialize: (s) => ({
        view: s.view,
        recentSearches: s.recentSearches,
      }),
    }
  )
);
