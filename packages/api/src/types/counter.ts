// Counter types - these match the Drizzle schema in apps/server/src/counter-schema.ts
// Types are inferred from Drizzle but defined here for API layer usage

export interface CounterMetadata {
  id: number;
  name: string;
  value: number;
  createdAt: string;
  updatedAt: string;
  operationCount: number;
}

export interface CounterHistory {
  id: number;
  operation: string;
  previousValue: number;
  newValue: number;
  timestamp: string;
}

// Counter operation type (alias for CounterHistory)
export type CounterOperation = CounterHistory;

/**
 * WebSocket event types for real-time counter updates
 */
export type CounterUpdateEvent = {
  type: "increment" | "decrement" | "setValue" | "reset";
  value: number;
  previousValue: number;
  metadata: CounterMetadata;
  timestamp: string;
};

export type CounterWebSocketMessage =
  | CounterUpdateEvent
  | { type: "ping" }
  | { type: "pong"; timestamp: string }
  | { type: "error"; message: string };

export type WebSocketSessionData = {
  id: string;
  subscribedAt: string;
};

// Additional UI-specific types
export interface CounterListItem {
  name: string;
  value: number;
  updatedAt: string;
}
