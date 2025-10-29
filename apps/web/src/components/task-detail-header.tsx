import { Copy } from "lucide-react";
import type * as React from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { type TaskStatus, TaskStatusPill } from "./task-status-pill";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";

interface TaskDetailHeaderProps extends React.ComponentProps<"div"> {
  taskId: string;
  status: TaskStatus;
  lastUpdate?: string;
  isLive?: boolean;
  onLiveToggle?: (enabled: boolean) => void;
  // WebSocket connection state
  isConnected?: boolean;
  isConnecting?: boolean;
  connectionError?: string | null;
}

function TaskDetailHeader({
  taskId,
  status,
  lastUpdate,
  isLive = true,
  onLiveToggle,
  isConnected = false,
  isConnecting = false,
  connectionError,
  className,
  ...props
}: TaskDetailHeaderProps) {
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(taskId);
      toast.success("Task ID copied to clipboard");
    } catch {
      toast.error("Failed to copy Task ID");
    }
  };

  // Determine connection status display
  const getConnectionStatus = () => {
    if (!isLive) return null;

    if (connectionError) {
      return (
        <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-1 font-medium text-destructive text-xs">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          Error
        </span>
      );
    }

    if (isConnecting) {
      return (
        <span className="flex items-center gap-1.5 rounded-full bg-yellow-500/20 px-2 py-1 font-medium text-xs text-yellow-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
          Connecting...
        </span>
      );
    }

    if (isConnected) {
      return (
        <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-1 font-medium text-primary text-xs">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Live
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 font-medium text-muted-foreground text-xs">
        <span className="h-2 w-2 rounded-full bg-muted-foreground" />
        Disconnected
      </span>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-border border-b pb-4",
        className
      )}
      data-slot="task-detail-header"
      {...props}
    >
      {/* Task ID and Status */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="font-bold font-mono text-2xl text-foreground tracking-tight">
            {taskId}
          </h2>
          <TaskStatusPill status={status} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="gap-2"
            onClick={handleCopyId}
            size="sm"
            variant="outline"
          >
            <Copy className="h-4 w-4" />
            Copy ID
          </Button>
        </div>
      </div>

      {/* Live toggle, connection status, and last update */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <p className="text-muted-foreground text-sm">Last updated {lastUpdate}</p>
          )}
          {getConnectionStatus()}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {isLive ? "WebSocket" : "Polling"}
          </span>
          <Switch
            aria-label="Toggle live updates"
            checked={isLive}
            onCheckedChange={onLiveToggle}
          />
        </div>
      </div>
    </div>
  );
}

export { TaskDetailHeader };
