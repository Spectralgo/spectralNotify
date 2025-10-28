/**
 * Counter type definitions
 * These types match the backend API response shapes
 */

export interface Counter {
  name: string;
  createdAt: string;
  createdBy: string;
}

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

export interface CounterListResponse {
  counters: Counter[];
  count: number;
}

export interface CounterValueResponse {
  name: string;
  value: number;
}

export interface EnrichedCounterResponse {
  name: string;
  value: number;
  metadata: CounterMetadata;
  latestHistory: CounterHistory[];
}

export interface CounterHistoryResponse {
  history: CounterHistory[];
  count: number;
}

export interface CounterCreateResponse {
  success: boolean;
  name: string;
}

export interface CounterDeleteResponse {
  success: boolean;
  name: string;
}

/**
 * WebSocket event types for real-time counter updates
 */
export interface CounterUpdateEvent {
  type: "increment" | "decrement" | "setValue" | "reset";
  value: number;
  previousValue: number;
  metadata: CounterMetadata;
  timestamp: string;
}

export type CounterWebSocketMessage =
  | CounterUpdateEvent
  | { type: "ping" }
  | { type: "pong"; timestamp: string }
  | { type: "error"; message: string };
