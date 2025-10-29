import { useQuery } from "@tanstack/react-query";
import { api } from "@/utils/orpc";
import { useWorkflowWebSocket } from "./use-workflow-websocket";

interface UseWorkflowDetailOptions {
  workflowId?: string;
  enableWebSocket?: boolean;
  onWebSocketUpdate?: (event: any) => void;
}

/**
 * Composite hook that combines workflow data fetching with WebSocket real-time updates
 * Provides a single interface for components to get workflow data and connection state
 */
export function useWorkflowDetail({
  workflowId,
  enableWebSocket = true,
  onWebSocketUpdate,
}: UseWorkflowDetailOptions = {}) {
  // Fetch workflow metadata
  const workflowQuery = useQuery({
    ...api.workflows.getById.queryOptions({
      input: { workflowId: workflowId! },
      enabled: !!workflowId,
      staleTime: 30_000,
      // No refetchInterval - WebSocket handles updates
    }),
  });

  // Fetch workflow history (events)
  const historyQuery = useQuery({
    ...api.workflows.getHistory.queryOptions({
      input: { workflowId: workflowId!, limit: 50 },
      enabled: !!workflowId,
      staleTime: 30_000,
    }),
  });

  // WebSocket connection for real-time updates
  const websocket = useWorkflowWebSocket(workflowId, {
    enabled: enableWebSocket && !!workflowId,
    onUpdate: onWebSocketUpdate,
  });

  // Fetch phases separately from relational table
  const phasesQuery = useQuery({
    ...api.workflows.getPhases.queryOptions({
      input: { workflowId: workflowId! },
      enabled: !!workflowId,
      staleTime: 30_000,
    }),
  });

  // Transform WorkflowMetadata + Phases + WorkflowHistory into expected shape
  const transformedWorkflow =
    workflowQuery.data && phasesQuery.data
      ? {
          ...workflowQuery.data,
          phases: phasesQuery.data,
          // Map WorkflowHistory[] to events
          events: (historyQuery.data || []).map((h) => ({
            id: h.id.toString(),
            timestamp: new Date(h.timestamp),
            type: h.eventType as any,
            phaseKey: h.phaseKey || undefined,
            message: h.message,
            progress: h.progress ?? undefined,
            metadata: h.metadata ? JSON.parse(h.metadata) : undefined,
          })),
        }
      : undefined;

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
    isConnected: websocket.isConnected,
    isConnecting: websocket.isConnecting,
    connectionError: websocket.error,
    lastUpdate: websocket.lastUpdate,
    reconnect: websocket.reconnect,
    disconnect: websocket.disconnect,
  };
}
