"use client";

import * as React from "react";
import { supabase } from "@/lib/auth";
import { Users } from "lucide-react";

/**
 * Shows how many users are currently viewing a given topic, using
 * Supabase Realtime presence on a channel named per topic.
 *
 * Free — uses Supabase Realtime which is already in your plan.
 */
export function TopicPresence({ topicId }: { topicId: string }) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!supabase) return;
    const presenceKey = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    const channel = supabase.channel(`topic-${topicId}`, {
      config: { presence: { key: presenceKey } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ topic_id: topicId, at: Date.now() });
        }
      });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [topicId]);

  if (count < 2) return null; // don't show if it's just you

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-medium">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <Users className="w-3 h-3" />
      {count} viewing
    </div>
  );
}
