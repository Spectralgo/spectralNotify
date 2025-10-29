import type { LucideIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface EmptyStateProps extends React.ComponentProps<"div"> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-12 text-center backdrop-blur-xl",
        className
      )}
      data-slot="empty-state"
      {...props}
    >
      {Icon && (
        <div className="rounded-full bg-primary/10 p-4">
          <Icon className="h-8 w-8 text-primary" />
        </div>
      )}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg text-foreground tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="max-w-sm text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {action && (
        <Button
          className="mt-2"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

export { EmptyState };
