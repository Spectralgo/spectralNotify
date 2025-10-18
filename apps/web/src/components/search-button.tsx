"use client"

import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchButtonProps {
  onClick?: () => void
  className?: string
}

export function SearchButton({ onClick, className }: SearchButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Full width with input-like proportions
        "w-full justify-start px-3 py-2 rounded-md relative",

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
        "text-sm font-medium",

        // Clickable cursor
        "cursor-pointer",

        className
      )}
    >
      {/* Top gradient accent line (like New Chat button) */}
      <div className="absolute inset-x-0 h-px w-3/4 mx-auto -top-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Search icon with brand color */}
      <Search className="h-4 w-4 shrink-0 relative z-20" />

      {/* Placeholder text */}
      <span className="flex-1 text-left relative z-20 opacity-80">
        Search chats...
      </span>

      {/* Keyboard shortcut hint */}
      <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-primary-foreground/10 px-1.5 font-mono text-[10px] font-medium opacity-70 relative z-20">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  )
}
