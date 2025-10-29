import { motion } from "motion/react";
import type * as React from "react";

import { cn } from "@/lib/utils";
import { type TaskStatus, TaskStatusPill } from "./task-status-pill";
import { Progress } from "./ui/progress";

interface TaskListItemProps extends React.ComponentProps<"button"> {
  taskId: string;
  status: TaskStatus;
  progress?: number;
  lastEvent?: string;
  relativeTime: string;
  isSelected?: boolean;
}

function TaskListItem({
  taskId,
  status,
  progress,
  lastEvent,
  relativeTime,
  isSelected = false,
  className,
  ...props
}: TaskListItemProps) {
  return (
    <motion.button
      className={cn(
        "group relative w-full cursor-pointer rounded-[var(--radius-md)] border border-border bg-secondary/40 p-4 text-left transition-all hover:border-ring/50 hover:bg-secondary/60 focus:outline-none focus:ring-2 focus:ring-ring/50",
        isSelected &&
          "border-ring bg-secondary/60 shadow-[0_0_0_1px_var(--color-ring)]",
        className
      )}
      data-slot="task-list-item"
      type="button"
      {...props}
    >
      {/* Left border indicator when selected */}
      {isSelected && (
        <div className="absolute inset-y-0 left-0 w-1 rounded-l-[var(--radius-md)] bg-primary" />
      )}

      <div className="flex flex-col gap-3">
        {/* Header: Task ID, Status, Time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-sm text-foreground">
              {taskId}
            </span>
            <TaskStatusPill size="sm" status={status} />
          </div>
          <span className="whitespace-nowrap text-muted-foreground text-xs">
            {relativeTime}
          </span>
        </div>

        {/* Progress bar (if available) */}
        {progress !== undefined && (
          <div className="flex items-center gap-2">
            <Progress className="h-[6px]" value={progress} />
            <span className="whitespace-nowrap font-medium text-primary text-xs">
              {Math.round(progress)}%
            </span>
          </div>
        )}

        {/* Last event snippet */}
        {lastEvent && (
          <p className="line-clamp-1 text-muted-foreground text-sm">{lastEvent}</p>
        )}
      </div>
    </motion.button>
  );
}

export { TaskListItem };
