"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, ChevronDown, RotateCcw, ArrowBigUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface SearchFilters {
  dateRange: "any" | "today" | "week" | "month" | "year";
  minUpvotes: number;
  sortBy: "relevance" | "newest" | "oldest" | "top";
  topicId?: string;
}

interface AdvancedFiltersProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

const DEFAULT_FILTERS: SearchFilters = {
  dateRange: "any",
  minUpvotes: 0,
  sortBy: "relevance",
  topicId: "",
};

const DATE_RANGE_OPTIONS: { value: SearchFilters["dateRange"]; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
  { value: "year", label: "Past year" },
];

const SORT_OPTIONS: { value: SearchFilters["sortBy"]; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "top", label: "Top" },
];

function countActiveFilters(filters: SearchFilters): number {
  let count = 0;
  if (filters.dateRange !== DEFAULT_FILTERS.dateRange) count++;
  if (filters.minUpvotes !== DEFAULT_FILTERS.minUpvotes) count++;
  if (filters.sortBy !== DEFAULT_FILTERS.sortBy) count++;
  if (filters.topicId && filters.topicId.trim().length > 0) count++;
  return count;
}

function update<K extends keyof SearchFilters>(
  filters: SearchFilters,
  key: K,
  value: SearchFilters[K]
): SearchFilters {
  return { ...filters, [key]: value };
}

export function AdvancedFilters({ filters, onChange }: AdvancedFiltersProps) {
  const [expanded, setExpanded] = React.useState(false);

  const activeCount = countActiveFilters(filters);
  const hasActive = activeCount > 0;

  const handleDateRangeChange = (value: string) => {
    onChange(update(filters, "dateRange", value as SearchFilters["dateRange"]));
  };

  const handleMinUpvotesChange = (value: number[]) => {
    onChange(update(filters, "minUpvotes", value[0] ?? 0));
  };

  const handleSortByChange = (value: SearchFilters["sortBy"]) => {
    onChange(update(filters, "sortBy", value));
  };

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(update(filters, "topicId", e.target.value));
  };

  const handleReset = () => {
    onChange({ ...DEFAULT_FILTERS });
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls="advanced-filters-panel"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
      >
        <span className="flex items-center gap-2.5">
          <Settings2 className="size-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            ⚙️ Advanced filters
          </span>
          {hasActive && (
            <span
              aria-label={`${activeCount} active filter${activeCount === 1 ? "" : "s"}`}
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground"
            >
              {activeCount}
            </span>
          )}
        </span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="text-muted-foreground"
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </button>

      {/* Collapsible panel */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="advanced-filters-panel"
            id="advanced-filters-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-5">
              {/* 1. Date range */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Date range
                </label>
                <Select
                  value={filters.dateRange}
                  onValueChange={handleDateRangeChange}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue placeholder="Select a date range" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_RANGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Minimum upvotes */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">
                    Minimum upvotes
                  </label>
                  <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground tabular-nums">
                    <ArrowBigUp className="size-3" />
                    {filters.minUpvotes}
                  </span>
                </div>
                <Slider
                  value={[filters.minUpvotes]}
                  onValueChange={handleMinUpvotesChange}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/70">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>

              {/* 3. Sort by */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Sort by
                </label>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {SORT_OPTIONS.map((opt) => {
                    const isActive = filters.sortBy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSortByChange(opt.value)}
                        aria-pressed={isActive}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                          isActive
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Topic filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Topic{" "}
                  <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <input
                  type="text"
                  value={filters.topicId ?? ""}
                  onChange={handleTopicChange}
                  placeholder="Type a topic name…"
                  className="h-8 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground/60 shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                />
              </div>

              {/* Reset */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={!hasActive}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    hasActive
                      ? "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      : "cursor-not-allowed text-muted-foreground/40"
                  )}
                >
                  <RotateCcw className="size-3.5" />
                  Reset filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdvancedFilters;
