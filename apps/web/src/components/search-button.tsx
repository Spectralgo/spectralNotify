"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchButtonProps {
  onClick?: () => void;
  className?: string;
}

export function SearchButton({ onClick, className }: SearchButtonProps) {
  return (
    <button
      className={cn(
        // Full width with input-like proportions
        "relative w-full justify-start rounded-md px-3 py-2",

        // Brand color background - subtle, elevated look
        "bg-primary/10 hover:bg-primary/15",
        "text-primary dark:text-primary-foreground",

        // Border with brand color
        "border border-primary/20 hover:border-primary/30",

        // Elevated shadow on hover
        "shadow-sm hover:shadow-lg hover:shadow-primary/10",

        // Smooth transitions
        "transition-all duration-200",

        // Focus state - 3px ring with brand color
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/50",

        // Layout
        "flex items-center gap-2",

        // Typography
        "font-medium text-sm",

        // Clickable cursor
        "cursor-pointer",

        className
      )}
      onClick={onClick}
      type="button"
    >
      {/* Top gradient accent line (like New Chat button) */}
      <div className="-top-px absolute inset-x-0 mx-auto h-px w-3/4 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Search icon with brand color */}
      <Search className="relative z-20 h-4 w-4 shrink-0" />

      {/* Placeholder text */}
      <span className="relative z-20 flex-1 text-left opacity-80">
        Search tasks...
      </span>

      {/* Keyboard shortcut hint */}
      <kbd className="relative z-20 hidden h-5 select-none items-center gap-1 rounded border bg-primary-foreground/10 px-1.5 font-medium font-mono text-[10px] opacity-70 lg:inline-flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
