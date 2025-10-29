import { useQuery } from "@tanstack/react-query";
import type { TaskEvent } from "@/types/task";
import { api } from "@/utils/orpc";
import { useTaskWebSocket } from "./use-task-websocket";

interface UseTaskDetailOptions {
  taskId?: string;
  enableWebSocket?: boolean;
  onWebSocketUpdate?: (event: any) => void;
}

/**
 * Composite hook that combines task data fetching with WebSocket real-time updates
 * Provides a single interface for components to get task data and connection state
 */
export function useTaskDetail({
  taskId,
  enableWebSocket = true,
  onWebSocketUpdate,
}: UseTaskDetailOptions = {}) {
  // Fetch task metadata
  const taskQuery = useQuery({
    ...api.tasks.getById.queryOptions({
      input: { taskId: taskId! },
      enabled: !!taskId,
      staleTime: 30_000,
      // No refetchInterval - WebSocket handles updates
    }),
  });

  // Fetch task history (events)
  const historyQuery = useQuery({
    ...api.tasks.getHistory.queryOptions({
      input: { taskId: taskId!, limit: 50 },
      enabled: !!taskId,
      staleTime: 30_000,
    }),
  });

  // WebSocket connection for real-time updates
  const websocket = useTaskWebSocket(taskId, {
    enabled: enableWebSocket && !!taskId,
    onUpdate: onWebSocketUpdate,
  });

  // Transform TaskMetadata + TaskHistory into expected shape
  const transformedTask = taskQuery.data
    ? {
        ...taskQuery.data,
        // Map TaskHistory[] to TaskEvent[]
        events: (historyQuery.data || []).map((h) => ({
          id: h.id.toString(),
          timestamp: new Date(h.timestamp),
          type: h.eventType as any,
          message: h.message,
          progress: h.progress ?? undefined,
          metadata: h.metadata ? JSON.parse(h.metadata) : undefined,
        })) as TaskEvent[],
      }
    : undefined;

  return {
    // Task data (transformed)
    task: transformedTask,
    isLoading: taskQuery.isLoading || historyQuery.isLoading,
    isError: taskQuery.isError || historyQuery.isError,
    error: taskQuery.error || historyQuery.error,
    refetch: () => {
      taskQuery.refetch();
      historyQuery.refetch();
    },

    // WebSocket state
    isConnected: websocket.isConnected,
    isConnecting: websocket.isConnecting,
    connectionError: websocket.error,
    lastUpdate: websocket.lastUpdate,
    reconnect: websocket.reconnect,
    disconnect: websocket.disconnect,
  };
}
