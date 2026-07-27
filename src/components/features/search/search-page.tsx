"use client";

import * as React from "react";
import { useNexusStore, type SearchFilter, type Post, type Topic, type User } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Search, X, Clock, FileText, Hash, User as UserIcon, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard } from "@/components/shared/post-card";
import { motion } from "framer-motion";
import { formatNumber, timeAgo } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function SearchPage({ initialQuery, initialFilter }: { initialQuery?: string; initialFilter?: SearchFilter }) {
  const searchAll = useNexusStore((s) => s.searchAll);
  const recentSearches = useNexusStore((s) => s.recentSearches);
  const addRecentSearch = useNexusStore((s) => s.addRecentSearch);
  const setView = useNexusStore((s) => s.setView);

  const [query, setQuery] = React.useState(initialQuery ?? "");
  const [filter, setFilter] = React.useState<SearchFilter>(initialFilter ?? "all");
  const [debounced, setDebounced] = React.useState(initialQuery ?? "");
  const [hasSearched, setHasSearched] = React.useState(!!initialQuery);

  // Debounce query
  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query);
      if (query.trim()) {
        addRecentSearch(query.trim());
        setHasSearched(true);
      } else {
        setHasSearched(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, addRecentSearch]);

  const results = React.useMemo(() => searchAll(debounced, filter), [debounced, filter, searchAll]);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts, topics, people…"
          className="pl-10 pr-10 h-12 rounded-2xl glass text-base"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-accent"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1 mb-6 p-0.5 rounded-xl bg-muted/40 w-fit">
        {(["all", "posts", "topics", "users"] as SearchFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
              filter === f ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Recent searches when no query */}
      {!hasSearched && recentSearches.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Recent searches
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-muted/40 hover:bg-accent transition-colors"
              >
                <Clock className="w-3 h-3 text-muted-foreground" />
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {!hasSearched ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/50 flex items-center justify-center">
            <Search className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Search Nexus</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Find posts, topics, and people across the knowledge graph. Start typing to see instant results.
          </p>
        </div>
      ) : (results.posts.length + results.topics.length + results.users.length) === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-accent/50 flex items-center justify-center">
            <Search className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">No results for &quot;{debounced}&quot;</h3>
          <p className="text-sm text-muted-foreground">Try a different keyword or filter.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Topics section */}
          {(filter === "all" || filter === "topics") && results.topics.length > 0 && (
            <section>
              <SectionHeader icon={<Hash className="w-4 h-4" />} label="Topics" count={results.topics.length} />
              <div className="grid sm:grid-cols-2 gap-2">
                {results.topics.map((t: Topic) => (
                  <button
                    key={t.id}
                    onClick={() => setView({ name: "topic", topicId: t.id })}
                    className="group flex items-start gap-3 p-3 rounded-xl glass-card hover:shadow-soft transition-shadow text-left"
                  >
                    <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-lg" style={{ background: t.banner }}>
                      {t.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium group-hover:text-primary transition-colors">{t.name}</div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatNumber(t.followers.length)} followers · {t.postCount} posts
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Users section */}
          {(filter === "all" || filter === "users") && results.users.length > 0 && (
            <section>
              <SectionHeader icon={<UserIcon className="w-4 h-4" />} label="People" count={results.users.length} />
              <div className="grid sm:grid-cols-2 gap-2">
                {results.users.map((u: User) => (
                  <button
                    key={u.id}
                    onClick={() => setView({ name: "profile", userId: u.id, tab: "posts" })}
                    className="group flex items-center gap-3 p-3 rounded-xl glass-card hover:shadow-soft transition-shadow text-left"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={u.avatar} alt={u.name} />
                      <AvatarFallback>{u.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{u.name}</div>
                      <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{formatNumber(u.followers.length)} followers · {formatNumber(u.reputation)} rep</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Posts section */}
          {(filter === "all" || filter === "posts") && results.posts.length > 0 && (
            <section>
              <SectionHeader icon={<FileText className="w-4 h-4" />} label="Posts" count={results.posts.length} />
              <div className="space-y-3">
                {results.posts.map((p: Post) => (
                  <PostCard key={p.id} post={p} compact />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-6 h-6 rounded-md bg-accent/50 flex items-center justify-center text-primary">{icon}</div>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-muted-foreground">· {count}</span>
    </div>
  );
}
