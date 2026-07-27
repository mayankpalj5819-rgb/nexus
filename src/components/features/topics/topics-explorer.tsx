"use client";

import * as React from "react";
import { useNexusStore, type Topic } from "@/lib/store";
import { motion } from "framer-motion";
import { Search, ChevronRight, TrendingUp, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/helpers";

export function TopicsExplorer() {
  const topics = useNexusStore((s) => s.topics);
  const setView = useNexusStore((s) => s.setView);
  const [query, setQuery] = React.useState("");

  const rootTopics = topics.filter((t) => !t.parentId);
  const filtered = query
    ? topics.filter(
        (t) =>
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.description.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Explore Topics</h1>
        <p className="text-sm text-muted-foreground">
          Follow the topics that matter to you. Knowledge is organized hierarchically — dive deep into any branch.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search topics…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-11 rounded-xl glass"
        />
      </div>

      {query ? (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            {filtered.length} {filtered.length === 1 ? "result" : "results"}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((t, i) => (
              <TopicCard key={t.id} topic={t} index={i} onClick={() => setView({ name: "topic", topicId: t.id })} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {rootTopics.map((root) => {
            const childTopics = topics.filter((t) => t.parentId === root.id);
            return (
              <div key={root.id}>
                <TopicTreeRoot root={root} childTopics={childTopics} onOpen={(id) => setView({ name: "topic", topicId: id })} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TopicTreeRoot({
  root,
  childTopics,
  onOpen,
}: {
  root: Topic;
  childTopics: Topic[];
  onOpen: (id: string) => void;
}) {
  const topics = useNexusStore((s) => s.topics);

  return (
    <div className="glass-card rounded-3xl overflow-hidden">
      {/* Banner */}
      <button
        onClick={() => onOpen(root.id)}
        className="relative w-full h-32 lg:h-40 text-left group"
        style={{ background: root.banner }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{root.icon}</span>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{root.name}</h2>
              <p className="text-sm text-white/80">{formatNumber(root.followers.length)} followers · {root.postCount} posts</p>
            </div>
          </div>
        </div>
      </button>

      {/* Description */}
      <div className="p-5">
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{root.description}</p>

        {/* Children */}
        {childTopics.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {childTopics.map((child) => {
              const grandchildren = topics.filter((t) => t.parentId === child.id);
              return (
                <button
                  key={child.id}
                  onClick={() => onOpen(child.id)}
                  className="group flex items-start gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left"
                >
                  <span className="text-xl shrink-0 mt-0.5">{child.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm group-hover:text-primary transition-colors">{child.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {child.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" /> {formatNumber(child.followers.length)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {child.postCount}
                      </span>
                      {grandchildren.length > 0 && (
                        <span>+{grandchildren.length} subtopics</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TopicCard({ topic, index, onClick }: { topic: Topic; index: number; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      onClick={onClick}
      className="text-left rounded-2xl overflow-hidden glass-card group hover:shadow-glow transition-shadow"
    >
      <div className="h-20 relative" style={{ background: topic.banner }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-2 left-3 text-2xl">{topic.icon}</div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">{topic.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{topic.description}</p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="w-3 h-3" /> {formatNumber(topic.followers.length)}
          </span>
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {topic.postCount}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
