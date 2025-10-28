import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { orpc } from "../utils/orpc";
import type { CounterUpdateEvent } from "../utils/websocket";
import {
  closeWebSocket,
  createCounterWebSocket,
  sendPing,
} from "../utils/websocket";

interface UseCounterWebSocketOptions {
  enabled?: boolean;
  onUpdate?: (event: CounterUpdateEvent) => void;
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
 * Hook to establish a WebSocket connection to a specific counter
 * Automatically updates TanStack Query cache when counter updates are received
 */
export function useCounterWebSocket(
  counterName: string | null,
  options: UseCounterWebSocketOptions = {}
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
  const updateQueryCache = (event: CounterUpdateEvent) => {
    if (!counterName) return;

    const valueQueryKey = orpc.counter.getValue.queryOptions({
      input: { name: counterName },
    }).queryKey;
    const metadataQueryKey = orpc.counter.getMetadata.queryOptions({
      input: { name: counterName },
    }).queryKey;

    // Update counter value query
    queryClient.setQueryData(valueQueryKey, {
      name: counterName,
      value: event.value,
    });

    // Update metadata query
    queryClient.setQueryData(metadataQueryKey, event.metadata);

    // Invalidate history to refetch
    const historyQueryKey = orpc.counter.getHistory.queryOptions({
      input: { name: counterName, limit: 50 },
    }).queryKey;
    queryClient.invalidateQueries({ queryKey: historyQueryKey });

    setConnectionState((prev) => ({
      ...prev,
      lastUpdate: new Date(),
    }));
  };

  // Function to establish WebSocket connection
  const connect = () => {
    if (!(enabled && counterName)) return;

    setConnectionState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    wsRef.current = createCounterWebSocket(counterName, {
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
      onMessage: (
        message:
          | CounterUpdateEvent
          | { type: "ping" }
          | { type: "pong"; timestamp: string }
          | { type: "error"; message: string }
      ) => {
        if (message.type === "ping" || message.type === "pong") {
          // Ignore ping/pong messages
          return;
        }

        if (message.type === "error") {
          console.error("WebSocket error message:", message.message);
          return;
        }

        // Handle counter update events
        updateQueryCache(message as CounterUpdateEvent);
        onUpdate?.(message as CounterUpdateEvent);
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
        if (enabled) {
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
    if (enabled && counterName) {
      connect();
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      disconnect();
    };
  }, [enabled, counterName]);

  return {
    ...connectionState,
    reconnect: connect,
    disconnect,
  };
}
