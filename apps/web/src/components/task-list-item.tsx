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
        "group relative w-full rounded-lg border bg-gray-800/50 p-4 text-left transition-all hover:border-emerald-500/50 hover:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
        isSelected &&
          "border-emerald-500 bg-gray-800/80 shadow-emerald-500/10 shadow-lg",
        !isSelected && "border-white/10",
        className
      )}
      data-slot="task-list-item"
      type="button"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      {...props}
    >
      {/* Left border indicator when selected */}
      {isSelected && (
        <div className="absolute inset-y-0 left-0 w-1 rounded-l-lg bg-gradient-to-b from-emerald-400 to-teal-500" />
      )}

      <div className="flex flex-col gap-3">
        {/* Header: Task ID, Status, Time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-sm text-white">
              {taskId}
            </span>
            <TaskStatusPill size="sm" status={status} />
          </div>
          <span className="whitespace-nowrap text-gray-400 text-xs">
            {relativeTime}
          </span>
        </div>

        {/* Progress bar (if available) */}
        {progress !== undefined && (
          <div className="flex items-center gap-2">
            <Progress className="h-1.5" value={progress} />
            <span className="whitespace-nowrap font-medium text-emerald-400 text-xs">
              {Math.round(progress)}%
            </span>
          </div>
        )}

        {/* Last event snippet */}
        {lastEvent && (
          <p className="line-clamp-1 text-gray-400 text-sm">{lastEvent}</p>
        )}
      </div>
    </motion.button>
  );
}

export { TaskListItem };
