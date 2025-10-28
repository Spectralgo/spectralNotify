import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { TaskUpdateEvent } from "@spectralNotify/api/types/task";
import { api } from "@/utils/orpc";
import {
  closeWebSocket,
  createTaskWebSocket,
  sendPing,
} from "@/utils/websocket-task";

interface UseTaskWebSocketOptions {
  enabled?: boolean;
  onUpdate?: (event: TaskUpdateEvent) => void;
  reconnectInterval?: number;
  pingInterval?: number;
}

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

/**
 * Hook to establish a WebSocket connection to a specific task
 * Automatically updates TanStack Query cache when task updates are received
 */
export function useTaskWebSocket(
  taskId: string | undefined,
  options: UseTaskWebSocketOptions = {}
) {
  const {
    enabled = true,
    onUpdate,
    reconnectInterval = 3000,
    pingInterval = 30_000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastUpdate: null,
  });

  // Function to update query cache based on WebSocket event
  const updateQueryCache = (event: TaskUpdateEvent) => {
    if (!taskId) return;

    const taskQueryKey = api.tasks.getById.queryOptions({
      input: { taskId },
    }).queryKey;
    const historyQueryKey = api.tasks.getHistory.queryOptions({
      input: { taskId, limit: 50 },
    }).queryKey;
    const listQueryKey = api.tasks.getAll.queryOptions().queryKey;

    // Update task metadata from the event
    queryClient.setQueryData(taskQueryKey, event.task);

    // Optimistically update history cache with new event
    if (event.type === "event" || event.type === "progress") {
      queryClient.setQueryData(historyQueryKey, (oldHistory: any) => {
        if (!oldHistory) return oldHistory;

        // Create new history entry from WebSocket event
        const newHistoryEntry = {
          id: Date.now(), // Temporary ID until server refetch
          eventType:
            event.type === "event" ? event.event.eventType : "progress",
          message:
            event.type === "event"
              ? event.event.message
              : `Progress updated to ${event.progress}%`,
          progress:
            event.type === "event" ? event.event.progress ?? null : event.progress,
          timestamp: event.timestamp,
          metadata: null,
        };

        // Prepend new event (newest first) and maintain limit
        return [newHistoryEntry, ...oldHistory].slice(0, 50);
      });
    }

    // Still invalidate to ensure consistency with server (async refetch)
    queryClient.invalidateQueries({ queryKey: historyQueryKey });

    // Update task in list if present
    queryClient.setQueryData(listQueryKey, (oldData: any) => {
      if (!oldData?.tasks) return oldData;

      return {
        ...oldData,
        tasks: oldData.tasks.map((task: any) =>
          task.taskId === taskId ? { ...task, ...event.task } : task
        ),
      };
    });

    setConnectionState((prev) => ({
      ...prev,
      lastUpdate: new Date(),
    }));
  };

  // Function to establish WebSocket connection
  const connect = () => {
    if (!(enabled && taskId)) return;

    setConnectionState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    wsRef.current = createTaskWebSocket(taskId, {
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
      onMessage: (message) => {
        if (message.type === "ping" || message.type === "pong") {
          // Ignore ping/pong messages
          return;
        }

        if (message.type === "error") {
          console.error("WebSocket error message:", message.message);
          return;
        }

        // Handle task update events
        updateQueryCache(message as TaskUpdateEvent);
        onUpdate?.(message as TaskUpdateEvent);
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
        if (enabled && taskId) {
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
    if (enabled && taskId) {
      connect();
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      disconnect();
    };
  }, [enabled, taskId]);

  return {
    ...connectionState,
    reconnect: connect,
    disconnect,
  };
}
