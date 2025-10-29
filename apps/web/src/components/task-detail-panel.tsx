import { FileText } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { EventTimeline, type TaskEvent } from "./event-timeline";
import { TaskDetailHeader } from "./task-detail-header";
import type { TaskStatus } from "./task-status-pill";

interface TaskDetailPanelProps extends React.ComponentProps<"div"> {
  task?: {
    id: string;
    status: TaskStatus;
    events: TaskEvent[];
    lastUpdate?: string;
  };
  isLive?: boolean;
  onLiveToggle?: (enabled: boolean) => void;
  // WebSocket connection state
  isConnected?: boolean;
  isConnecting?: boolean;
  connectionError?: string | null;
}

function TaskDetailPanel({
  task,
  isLive = true,
  onLiveToggle,
  isConnected = false,
  isConnecting = false,
  connectionError,
  className,
  ...props
}: TaskDetailPanelProps) {
  if (!task) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center rounded-[var(--radius-lg)] border border-border bg-card backdrop-blur-xl",
          className
        )}
        data-slot="task-detail-panel"
        {...props}
      >
        <EmptyState
          className="border-none bg-transparent"
          description="Click on any task from the list to see its full event timeline and details"
          icon={FileText}
          title="Select a task to view details"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-6 rounded-[var(--radius-lg)] border border-border bg-card p-6 backdrop-blur-xl",
        className
      )}
      data-slot="task-detail-panel"
      {...props}
    >
      <TaskDetailHeader
        connectionError={connectionError}
        isConnected={isConnected}
        isConnecting={isConnecting}
        isLive={isLive}
        lastUpdate={task.lastUpdate}
        onLiveToggle={onLiveToggle}
        status={task.status}
        taskId={task.id}
      />
      <div className="flex-1 overflow-y-auto">
        <EventTimeline events={task.events} />
      </div>
    </div>
  );
}

export { TaskDetailPanel };
