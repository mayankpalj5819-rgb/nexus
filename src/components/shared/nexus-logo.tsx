"use client";

import * as React from "react";

export function NexusLogo({ className }: { className?: string }) {
  const id = React.useId();
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`nexusGrad-${id}`} x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="oklch(0.75 0.22 280)" />
          <stop offset="50%" stopColor="oklch(0.7 0.25 304)" />
          <stop offset="100%" stopColor="oklch(0.72 0.18 162)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#nexusGrad-${id})`} />
      <path d="M20 44V20h4l16 16V20h4v24h-4L24 28v16h-4z" fill="white" fillOpacity="0.95" />
      <circle cx="32" cy="32" r="3" fill="white" />
    </svg>
  );
}
