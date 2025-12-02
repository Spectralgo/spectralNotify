import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useSpectralNotifyContext } from "../provider";
import type {
  Workflow,
  WorkflowEvent,
  WorkflowUpdateEvent,
  WorkflowWebSocketMessage,
} from "../types";
import {
  type WorkflowWebSocketConnection,
  createWorkflowWebSocket,
} from "../websocket";

export interface UseWorkflowOptions {
  /**
   * Workflow ID to subscribe to
   */
  workflowId?: string;

  /**
   * Enable WebSocket real-time updates
   * @default true
   */
  enableWebSocket?: boolean;

  /**
   * Callback when WebSocket receives an update
   */
  onWebSocketUpdate?: (event: WorkflowUpdateEvent) => void;

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
 * Hook to fetch and subscribe to workflow updates
 *
 * @example
 * ```tsx
 * function WorkflowView({ workflowId }) {
 *   const { workflow, isLoading, isConnected } = useWorkflow({ workflowId });
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!workflow) return <div>Workflow not found</div>;
 *
 *   return (
 *     <div>
 *       <h1>{workflow.id}</h1>
 *       <p>Status: {workflow.status}</p>
 *       <p>Progress: {workflow.overallProgress}%</p>
 *       <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWorkflow({
  workflowId,
  enableWebSocket = true,
  onWebSocketUpdate,
  reconnectInterval = 3000,
  pingInterval = 30_000,
}: UseWorkflowOptions = {}) {
  const { workflowApi, config, queryClient } = useSpectralNotifyContext();

  const wsRef = useRef<WorkflowWebSocketConnection | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastUpdate: null,
  });

  // Fetch workflow metadata
  const workflowQuery = useQuery({
    queryKey: ["spectralnotify", "workflow", workflowId],
    queryFn: () => workflowApi.getById(workflowId!),
    enabled: !!workflowId,
    staleTime: 30_000,
  });

  // Fetch workflow phases
  const phasesQuery = useQuery({
    queryKey: ["spectralnotify", "workflow", workflowId, "phases"],
    queryFn: () => workflowApi.getPhases(workflowId!),
    enabled: !!workflowId,
    staleTime: 30_000,
  });

  // Fetch workflow history (events)
  const historyQuery = useQuery({
    queryKey: ["spectralnotify", "workflow", workflowId, "history"],
    queryFn: () => workflowApi.getHistory(workflowId!, 50),
    enabled: !!workflowId,
    staleTime: 30_000,
  });

  // Transform workflow data
  const transformedWorkflow: Workflow | undefined =
    workflowQuery.data && phasesQuery.data
      ? {
          id: workflowQuery.data.workflowId,
          status: workflowQuery.data.status as any,
          overallProgress: workflowQuery.data.overallProgress,
          expectedPhaseCount: workflowQuery.data.expectedPhaseCount,
          completedPhaseCount: workflowQuery.data.completedPhaseCount,
          activePhaseKey: workflowQuery.data.activePhaseKey,
          phases: phasesQuery.data,
          events: (historyQuery.data || []).map(
            (h): WorkflowEvent => ({
              id: h.id.toString(),
              timestamp: new Date(h.timestamp),
              type: h.eventType as any,
              phaseKey: h.phaseKey || undefined,
              message: h.message,
              progress: h.progress ?? undefined,
              metadata: h.metadata ? JSON.parse(h.metadata) : undefined,
            })
          ),
          lastUpdate: workflowQuery.data.updatedAt,
          metadata: workflowQuery.data.metadata,
        }
      : undefined;

  // Function to update query cache based on WebSocket event
  const updateQueryCache = (event: WorkflowUpdateEvent) => {
    if (!workflowId) return;

    // Update workflow metadata
    queryClient.setQueryData(
      ["spectralnotify", "workflow", workflowId],
      event.workflow
    );

    // Update phases
    if (Array.isArray((event as any).phases)) {
      queryClient.setQueryData(
        ["spectralnotify", "workflow", workflowId, "phases"],
        (event as any).phases
      );
    }

    // Optimistically update history cache with new event
    if (event.type === "phase-progress" || event.type === "workflow-progress") {
      queryClient.setQueryData(
        ["spectralnotify", "workflow", workflowId, "history"],
        (oldHistory: any) => {
          const baseHistory = Array.isArray(oldHistory) ? oldHistory : [];

          const newHistoryEntry = {
            id: Date.now(),
            workflowId,
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

          return [newHistoryEntry, ...baseHistory].slice(0, 50);
        }
      );
    }

    // Invalidate to ensure consistency
    queryClient.invalidateQueries({
      queryKey: ["spectralnotify", "workflow", workflowId, "history"],
    });

    setConnectionState((prev) => ({
      ...prev,
      lastUpdate: new Date(),
    }));
  };

  // Function to establish WebSocket connection
  const connect = () => {
    if (!(enableWebSocket && workflowId)) return;

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    wsRef.current = createWorkflowWebSocket(config.serverUrl, workflowId, {
      onStateChange: (state) => {
        setConnectionState((prev) => ({
          ...prev,
          isConnected: state === "connected",
          isConnecting: state === "connecting",
        }));
      },
      onMessage: (message: WorkflowWebSocketMessage) => {
        if (message.type === "ping" || message.type === "pong") {
          return;
        }

        if (message.type === "error") {
          console.error("[SpectralNotify] WebSocket error:", message.message);
          return;
        }

        // Handle workflow update events
        updateQueryCache(message as WorkflowUpdateEvent);
        onWebSocketUpdate?.(message as WorkflowUpdateEvent);
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
    if (enableWebSocket && workflowId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enableWebSocket, workflowId]);

  return {
    // Workflow data (transformed)
    workflow: transformedWorkflow,
    isLoading:
      workflowQuery.isLoading ||
      historyQuery.isLoading ||
      phasesQuery.isLoading,
    isError:
      workflowQuery.isError || historyQuery.isError || phasesQuery.isError,
    error: workflowQuery.error || historyQuery.error || phasesQuery.error,
    refetch: () => {
      workflowQuery.refetch();
      historyQuery.refetch();
      phasesQuery.refetch();
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
