import { motion } from "motion/react";
import type * as React from "react";

import { cn } from "@/lib/utils";
import { Progress } from "./ui/progress";
import type { WorkflowStatus } from "./workflow-status-pill";
import { WorkflowStatusPill } from "./workflow-status-pill";

interface WorkflowListItemProps extends React.ComponentProps<"button"> {
  workflowId: string;
  status: WorkflowStatus;
  overallProgress?: number;
  lastEvent: string;
  relativeTime: string;
  isSelected?: boolean;
}

function WorkflowListItem({
  workflowId,
  status,
  overallProgress = 0,
  lastEvent,
  relativeTime,
  isSelected = false,
  className,
  ...props
}: WorkflowListItemProps) {
  return (
    <motion.button
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "w-full rounded-[var(--radius-md)] border border-border bg-secondary/40 p-4 text-left transition-all hover:border-ring/50 hover:bg-secondary/60 focus:outline-none focus:ring-2 focus:ring-ring/50",
        isSelected &&
          "border-ring bg-secondary/60 shadow-[0_0_0_1px_var(--color-ring)]",
        className
      )}
      data-selected={isSelected}
      data-slot="workflow-list-item"
      initial={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      type="button"
      {...props}
    >
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h3 className="font-mono font-semibold text-sm text-foreground">
              {workflowId}
            </h3>
            <WorkflowStatusPill status={status} />
          </div>
          <span className="whitespace-nowrap text-muted-foreground text-xs">
            {relativeTime}
          </span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <Progress className="h-[6px] flex-1" value={overallProgress} />
          <span className="whitespace-nowrap font-medium text-primary text-xs">
            {Math.round(overallProgress)}%
          </span>
        </div>

        {/* Last Event */}
        <p className="line-clamp-1 text-muted-foreground text-xs">{lastEvent}</p>
      </div>
    </motion.button>
  );
}

export { WorkflowListItem };
