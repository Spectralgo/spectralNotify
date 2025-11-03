import { useWorkflow as useWorkflowClient } from "@spectralnotify/react-native";
import type { Workflow, WorkflowUpdateEvent } from "@spectralnotify/react-native";
import { useCallback } from "react";

export interface UseWorkflowOptions {
  workflowId?: string;
  enableWebSocket?: boolean;
  onWebSocketUpdate?: (event: WorkflowUpdateEvent) => void;
  reconnectInterval?: number;
  pingInterval?: number;
}

/**
 * React Native wrapper for @spectralnotify/react-native useWorkflow hook
 * Provides workflow monitoring with real-time WebSocket updates
 */
export function useWorkflow({
  workflowId,
  enableWebSocket = true,
  onWebSocketUpdate,
  reconnectInterval = 3000,
  pingInterval = 30_000,
}: UseWorkflowOptions = {}) {
  const handleUpdate = useCallback(
    (event: WorkflowUpdateEvent) => {
      console.log("[WorkflowHook] Received update:", event.type, event);
      onWebSocketUpdate?.(event);
    },
    [onWebSocketUpdate]
  );

  const result = useWorkflowClient({
    workflowId,
    enableWebSocket,
    onWebSocketUpdate: handleUpdate,
    reconnectInterval,
    pingInterval,
  });

  return result;
}

export type { Workflow, WorkflowUpdateEvent };
