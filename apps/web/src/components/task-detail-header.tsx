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
        <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2 py-1 text-red-400 text-xs font-medium">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Error
        </span>
      );
    }

    if (isConnecting) {
      return (
        <span className="flex items-center gap-1.5 rounded-full bg-yellow-500/20 px-2 py-1 text-yellow-400 text-xs font-medium">
          <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
          Connecting...
        </span>
      );
    }

    if (isConnected) {
      return (
        <span className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-2 py-1 text-green-400 text-xs font-medium">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Live
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1.5 rounded-full bg-gray-500/20 px-2 py-1 text-gray-400 text-xs font-medium">
        <span className="h-2 w-2 rounded-full bg-gray-500" />
        Disconnected
      </span>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-white/10 border-b pb-4",
        className
      )}
      data-slot="task-detail-header"
      {...props}
    >
      {/* Task ID and Status */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="font-bold font-mono text-2xl text-white tracking-tight">
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
            <p className="text-gray-400 text-sm">Last updated {lastUpdate}</p>
          )}
          {getConnectionStatus()}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">
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
