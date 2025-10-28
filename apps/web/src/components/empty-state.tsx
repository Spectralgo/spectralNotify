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
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-gray-800/50 p-12 text-center backdrop-blur-xl",
        className
      )}
      data-slot="empty-state"
      {...props}
    >
      {Icon && (
        <div className="rounded-full bg-white/5 p-4">
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
      )}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg text-white tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="max-w-sm text-gray-400 text-sm">{description}</p>
        )}
      </div>
      {action && (
        <Button
          className="mt-2 bg-emerald-600 hover:bg-emerald-700"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

export { EmptyState };
