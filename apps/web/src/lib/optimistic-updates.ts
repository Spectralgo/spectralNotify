import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  Counter,
  CounterHistory,
  CounterMetadata,
} from "../types/counter";

/**
 * Optimistic update utilities for counter operations
 * Provides consistent patterns for optimistic UI updates with automatic rollback on error
 */

interface EnrichedCounterResponse {
  value: number;
  metadata: CounterMetadata;
  latestHistory: CounterHistory[];
}

/**
 * Update counter value optimistically in the query cache
 */
export function updateCounterValueOptimistically(
  queryClient: QueryClient,
  queryKey: unknown[],
  newValue: number
): () => void {
  const previousValue = queryClient.getQueryData<{ value: number }>(queryKey);

  // Optimistically update the value query
  queryClient.setQueryData(queryKey, { value: newValue });

  // Return rollback function
  return () => {
    if (previousValue !== undefined) {
      queryClient.setQueryData(queryKey, previousValue);
    }
  };
}

/**
 * Update counter metadata optimistically in the query cache
 */
export function updateCounterMetadataOptimistically(
  queryClient: QueryClient,
  queryKey: unknown[],
  updates: Partial<CounterMetadata>
): () => void {
  const previousMetadata = queryClient.getQueryData<CounterMetadata>(queryKey);

  // Optimistically update metadata
  if (previousMetadata) {
    queryClient.setQueryData(queryKey, {
      ...previousMetadata,
      ...updates,
      updatedAt: new Date().toISOString(),
      operationCount: previousMetadata.operationCount + 1,
    });
  }

  // Return rollback function
  return () => {
    if (previousMetadata !== undefined) {
      queryClient.setQueryData(queryKey, previousMetadata);
    }
  };
}

/**
 * Add optimistic history entry to the query cache
 */
export function addOptimisticHistoryEntry(
  queryClient: QueryClient,
  queryKey: unknown[],
  operation: string,
  previousValue: number,
  newValue: number
): () => void {
  const previousHistory = queryClient.getQueryData<CounterHistory[]>(queryKey);

  // Create optimistic history entry
  const optimisticEntry: CounterHistory = {
    id: Date.now(), // Temporary ID
    operation,
    previousValue,
    newValue,
    timestamp: new Date().toISOString(),
  };

  // Prepend to history
  if (previousHistory) {
    queryClient.setQueryData(queryKey, [optimisticEntry, ...previousHistory]);
  }

  // Return rollback function
  return () => {
    if (previousHistory !== undefined) {
      queryClient.setQueryData(queryKey, previousHistory);
    }
  };
}

/**
 * Update all counter queries from enriched response
 * This is used after successful mutation to update all related queries
 */
export function updateCounterFromEnrichedResponse(
  queryClient: QueryClient,
  valueQueryKey: unknown[],
  metadataQueryKey: unknown[],
  historyQueryKey: unknown[],
  response: EnrichedCounterResponse
): void {
  // Update value query
  queryClient.setQueryData(valueQueryKey, { value: response.value });

  // Update metadata query
  queryClient.setQueryData(metadataQueryKey, response.metadata);

  // Update history query (merge with existing to avoid losing data)
  const existingHistory =
    queryClient.getQueryData<CounterHistory[]>(historyQueryKey);

  if (existingHistory) {
    // Merge latest history with existing, removing duplicates by ID
    const latestIds = new Set(response.latestHistory.map((h) => h.id));
    const filtered = existingHistory.filter((h) => !latestIds.has(h.id));
    queryClient.setQueryData(
      historyQueryKey,
      [...response.latestHistory, ...filtered].slice(0, 50)
    );
  } else {
    queryClient.setQueryData(historyQueryKey, response.latestHistory);
  }
}

/**
 * Add counter to list optimistically
 */
export function addCounterToListOptimistically(
  queryClient: QueryClient,
  queryKey: unknown[],
  counterName: string,
  userId: string
): () => void {
  const previousList = queryClient.getQueryData<{
    counters: Counter[];
    count: number;
  }>(queryKey);

  // Create optimistic counter entry
  const optimisticCounter: Counter = {
    name: counterName,
    createdAt: new Date().toISOString(),
    createdBy: userId,
  };

  // Add to list
  if (previousList) {
    queryClient.setQueryData(queryKey, {
      counters: [optimisticCounter, ...previousList.counters],
      count: previousList.count + 1,
    });
  }

  // Return rollback function
  return () => {
    if (previousList !== undefined) {
      queryClient.setQueryData(queryKey, previousList);
    }
  };
}

/**
 * Remove counter from list optimistically
 */
export function removeCounterFromListOptimistically(
  queryClient: QueryClient,
  queryKey: unknown[],
  counterName: string
): () => void {
  const previousList = queryClient.getQueryData<{
    counters: Counter[];
    count: number;
  }>(queryKey);

  // Remove from list
  if (previousList) {
    queryClient.setQueryData(queryKey, {
      counters: previousList.counters.filter((c) => c.name !== counterName),
      count: previousList.count - 1,
    });
  }

  // Return rollback function
  return () => {
    if (previousList !== undefined) {
      queryClient.setQueryData(queryKey, previousList);
    }
  };
}

/**
 * Execute rollback functions only (no toast)
 * Use this when component-level code handles user feedback
 */
export function executeRollbacks(rollbackFns: Array<() => void>): void {
  for (const rollback of rollbackFns) {
    rollback();
  }
}

/**
 * Show error toast and execute rollback functions
 * @deprecated Use executeRollbacks() and handle toasts at component level for better UX
 */
export function handleOptimisticError(
  error: Error,
  operation: string,
  rollbackFns: Array<() => void>
): void {
  // Execute all rollback functions
  executeRollbacks(rollbackFns);

  // Show error toast
  toast.error(`Failed to ${operation}`, {
    description: error.message || "An unexpected error occurred",
  });
}

/**
 * Show success toast for counter operations
 */
export function showSuccessToast(operation: string, counterName: string): void {
  toast.success(`Counter ${operation}`, {
    description: `"${counterName}" has been ${operation} successfully`,
  });
}
