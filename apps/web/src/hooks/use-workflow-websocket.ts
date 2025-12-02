import type { WorkflowUpdateEvent } from "@spectralNotify/api/types/workflow";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "@/utils/orpc";
import {
  type ConnectionState,
  type WorkflowWebSocketConnection,
  createWorkflowWebSocket,
} from "@/utils/websocket-workflow";

interface UseWorkflowWebSocketOptions {
  enabled?: boolean;
  onUpdate?: (event: WorkflowUpdateEvent) => void;
  reconnectInterval?: number;
  pingInterval?: number;
}

interface HookConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

/**
 * Hook to establish a WebSocket connection to a specific workflow
 * Automatically updates TanStack Query cache when workflow updates are received
 */
export function useWorkflowWebSocket(
  workflowId: string | undefined,
  options: UseWorkflowWebSocketOptions = {}
) {
  const {
    enabled = true,
    onUpdate,
    reconnectInterval = 3000,
    pingInterval = 30_000,
  } = options;

  const wsRef = useRef<WorkflowWebSocketConnection | null>(null);
  const queryClient = useQueryClient();

  const [connectionState, setConnectionState] = useState<HookConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastUpdate: null,
  });

  // Function to update query cache based on WebSocket event
  const updateQueryCache = (event: WorkflowUpdateEvent) => {
    const receiveTime = Date.now();
    const receiveTimestamp = new Date().toISOString();

    console.log(
      `[WorkflowWebSocket] 📥 RECEIVE Message | workflowId=${workflowId} | type=${event.type} | serverTimestamp=${event.timestamp} | receiveTimestamp=${receiveTimestamp}`
    );

    if (!workflowId) return;

    const workflowQueryKey = api.workflows.getById.queryOptions({
      input: { workflowId },
    }).queryKey;
    const historyQueryKey = api.workflows.getHistory.queryOptions({
      input: { workflowId, limit: 50 },
    }).queryKey;
    const listQueryKey = api.workflows.getAll.queryOptions().queryKey;

    // Update workflow metadata from the event
    queryClient.setQueryData(workflowQueryKey, event.workflow);

    // Optimistically update history cache with new event
    if (event.type === "phase-progress" || event.type === "workflow-progress") {
      queryClient.setQueryData(historyQueryKey, (oldHistory: any) => {
        const baseHistory = Array.isArray(oldHistory) ? oldHistory : [];

        // Create new history entry from WebSocket event
        const newHistoryEntry = {
          id: Date.now(), // Temporary ID until server refetch
          eventType:
            event.type === "phase-progress"
              ? "phase-progress"
              : "workflow-progress",
          phaseKey: event.type === "phase-progress" ? event.phase : null,
          message:
            event.type === "phase-progress"
              ? `Phase ${event.phase} progress: ${event.progress}%`
              : `Overall progress: ${event.overallProgress}%`,
          progress:
            event.type === "phase-progress"
              ? event.progress
              : event.overallProgress,
          timestamp: event.timestamp,
          metadata: null,
        };

        // Prepend new event (newest first) and maintain limit
        return [newHistoryEntry, ...baseHistory].slice(0, 50);
      });
    }

    // Still invalidate to ensure consistency with server (async refetch)
    queryClient.invalidateQueries({ queryKey: historyQueryKey });

    // Update phases cache with data from WebSocket event
    const phasesQueryKey = api.workflows.getPhases.queryOptions({
      input: { workflowId },
    }).queryKey;

    // Immediate UI update with phases from WebSocket event
    if (Array.isArray((event as any).phases)) {
      queryClient.setQueryData(phasesQueryKey, (event as any).phases);
    }

    // Ensure eventual consistency with server
    queryClient.invalidateQueries({ queryKey: phasesQueryKey });

    // Update workflow in list if present
    queryClient.setQueryData(listQueryKey, (oldData: any) => {
      if (!oldData) return oldData;

      return oldData.map((workflow: any) =>
        workflow.id === workflowId
          ? {
              ...workflow,
              status: event.workflow.status,
              overallProgress: event.workflow.overallProgress,
              expectedPhaseCount: event.workflow.expectedPhaseCount,
              completedPhaseCount: event.workflow.completedPhaseCount,
              activePhaseKey: event.workflow.activePhaseKey,
              updatedAt: new Date(event.workflow.updatedAt),
              phases: event.phases, // Phases come from the event (relational table)
            }
          : workflow
      );
    });

    setConnectionState((prev) => ({
      ...prev,
      lastUpdate: new Date(),
    }));

    const processingDuration = Date.now() - receiveTime;
    console.log(
      `[WorkflowWebSocket] ✅ Cache Update Complete | workflowId=${workflowId} | type=${event.type} | processingDuration=${processingDuration}ms`
    );
  };

  // Function to establish WebSocket connection
  const connect = () => {
    if (!(enabled && workflowId)) return;

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    wsRef.current = createWorkflowWebSocket(workflowId, {
      onStateChange: (state: ConnectionState) => {
        setConnectionState((prev) => ({
          ...prev,
          isConnected: state === "connected",
          isConnecting: state === "connecting",
        }));

        if (state === "connected") {
          console.log(
            `[WorkflowWebSocket] 🔌 Connected | workflowId=${workflowId} | timestamp=${new Date().toISOString()}`
          );
        }
      },
      onMessage: (message) => {
        if (message.type === "ping" || message.type === "pong") {
          return;
        }

        if (message.type === "error") {
          console.error("WebSocket error message:", message.message);
          return;
        }

        // Handle workflow update events
        updateQueryCache(message as WorkflowUpdateEvent);
        onUpdate?.(message as WorkflowUpdateEvent);
      },
      onError: () => {
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
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Establish connection on mount and when dependencies change
  useEffect(() => {
    if (enabled && workflowId) {
      connect();
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      disconnect();
    };
  }, [enabled, workflowId]);

  return {
    ...connectionState,
    reconnect: connect,
    disconnect,
  };
}
