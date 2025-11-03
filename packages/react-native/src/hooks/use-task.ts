import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useSpectralNotifyContext } from "../provider";
import type {
  Task,
  TaskEvent,
  TaskUpdateEvent,
  TaskWebSocketMessage,
} from "../types";
import { closeWebSocket, createTaskWebSocket, sendPing } from "../websocket";

export interface UseTaskOptions {
  /**
   * Task ID to subscribe to
   */
  taskId?: string;

  /**
   * Enable WebSocket real-time updates
   * @default true
   */
  enableWebSocket?: boolean;

  /**
   * Callback when WebSocket receives an update
   */
  onWebSocketUpdate?: (event: TaskUpdateEvent) => void;

  /**
   * WebSocket reconnect interval in milliseconds
   * @default 3000
   */
  reconnectInterval?: number;

  /**
   * WebSocket ping interval in milliseconds
   * @default 30000
   */
  pingInterval?: number;
}

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

/**
 * Hook to fetch and subscribe to task updates
 *
 * @example
 * ```tsx
 * function TaskView({ taskId }) {
 *   const { task, isLoading, isConnected } = useTask({ taskId });
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!task) return <div>Task not found</div>;
 *
 *   return (
 *     <div>
 *       <h1>{task.id}</h1>
 *       <p>Status: {task.status}</p>
 *       <p>Progress: {task.progress}%</p>
 *       <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTask({
  taskId,
  enableWebSocket = true,
  onWebSocketUpdate,
  reconnectInterval = 3000,
  pingInterval = 30_000,
}: UseTaskOptions = {}) {
  const { taskApi, config, queryClient } = useSpectralNotifyContext();

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastUpdate: null,
  });

  // Fetch task metadata
  const taskQuery = useQuery({
    queryKey: ["spectralnotify", "task", taskId],
    queryFn: () => taskApi.getById(taskId!),
    enabled: !!taskId,
    staleTime: 30_000,
  });

  // Fetch task history (events)
  const historyQuery = useQuery({
    queryKey: ["spectralnotify", "task", taskId, "history"],
    queryFn: () => taskApi.getHistory(taskId!, 50),
    enabled: !!taskId,
    staleTime: 30_000,
  });

  // Transform task data
  const transformedTask: Task | undefined = taskQuery.data
    ? {
        id: taskQuery.data.taskId,
        status: taskQuery.data.status as any,
        progress: taskQuery.data.progress,
        events: (historyQuery.data || []).map(
          (h): TaskEvent => ({
            id: h.id.toString(),
            timestamp: new Date(h.timestamp),
            type: h.eventType as any,
            message: h.message,
            progress: h.progress ?? undefined,
            metadata: h.metadata ? JSON.parse(h.metadata) : undefined,
          })
        ),
        lastUpdate: taskQuery.data.updatedAt,
        metadata: taskQuery.data.metadata,
      }
    : undefined;

  // Function to update query cache based on WebSocket event
  const updateQueryCache = (event: TaskUpdateEvent) => {
    if (!taskId) return;

    // Update task metadata
    queryClient.setQueryData(
      ["spectralnotify", "task", taskId],
      event.task
    );

    // Optimistically update history cache with new event
    if (event.type === "event" || event.type === "progress") {
      queryClient.setQueryData(
        ["spectralnotify", "task", taskId, "history"],
        (oldHistory: any) => {
          const baseHistory = Array.isArray(oldHistory) ? oldHistory : [];

          const newHistoryEntry = {
            id: Date.now(),
            eventType:
              event.type === "event" ? event.event.eventType : "progress",
            message:
              event.type === "event"
                ? event.event.message
                : `Progress updated to ${event.progress}%`,
            progress:
              event.type === "event"
                ? (event.event.progress ?? null)
                : event.progress,
            timestamp: event.timestamp,
            metadata: null,
          };

          return [newHistoryEntry, ...baseHistory].slice(0, 50);
        }
      );
    }

    // Invalidate to ensure consistency
    queryClient.invalidateQueries({
      queryKey: ["spectralnotify", "task", taskId, "history"],
    });

    setConnectionState((prev) => ({
      ...prev,
      lastUpdate: new Date(),
    }));
  };

  // Function to establish WebSocket connection
  const connect = () => {
    if (!(enableWebSocket && taskId)) return;

    setConnectionState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    wsRef.current = createTaskWebSocket(config.serverUrl, taskId, {
      onOpen: () => {
        setConnectionState({
          isConnected: true,
          isConnecting: false,
          error: null,
          lastUpdate: null,
        });

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current) {
            sendPing(wsRef.current);
          }
        }, pingInterval);
      },
      onMessage: (message: TaskWebSocketMessage) => {
        if (message.type === "ping" || message.type === "pong") {
          return;
        }

        if (message.type === "error") {
          console.error("[SpectralNotify] WebSocket error:", message.message);
          return;
        }

        // Handle task update events
        updateQueryCache(message as TaskUpdateEvent);
        onWebSocketUpdate?.(message as TaskUpdateEvent);
      },
      onClose: () => {
        setConnectionState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt to reconnect after delay
        if (enableWebSocket && taskId) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      },
      onError: (_error: Event) => {
        setConnectionState((prev) => ({
          ...prev,
          error: "WebSocket connection error",
          isConnecting: false,
        }));
      },
    });
  };

  // Function to disconnect WebSocket
  const disconnect = () => {
    if (wsRef.current) {
      closeWebSocket(wsRef.current);
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  // Establish connection on mount and when dependencies change
  useEffect(() => {
    if (enableWebSocket && taskId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enableWebSocket, taskId]);

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
    isConnected: connectionState.isConnected,
    isConnecting: connectionState.isConnecting,
    connectionError: connectionState.error,
    lastUpdate: connectionState.lastUpdate,
    reconnect: connect,
    disconnect,
  };
}
