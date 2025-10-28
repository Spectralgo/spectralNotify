import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import {
  addCounterToListOptimistically,
  addOptimisticHistoryEntry,
  executeRollbacks,
  removeCounterFromListOptimistically,
  showSuccessToast,
  updateCounterFromEnrichedResponse,
  updateCounterMetadataOptimistically,
  updateCounterValueOptimistically,
} from "@/lib/optimistic-updates";
import { api } from "@/utils/orpc";

/**
 * List all counters from Cloudflare API
 */
export function useListAllCounters(enabled = true) {
  return useQuery({
    ...api.counter.listAll.queryOptions(),
    enabled,
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Get counter metadata by name
 */
export function useCounterMetadata(name: string, enabled = true) {
  return useQuery({
    ...api.counter.getMetadata.queryOptions({ input: { name } }),
    enabled: enabled && !!name,
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Get counter value by name
 */
export function useCounterValue(name: string, enabled = true) {
  return useQuery({
    ...api.counter.getValue.queryOptions({ input: { name } }),
    enabled: enabled && !!name,
    staleTime: 10_000, // 10 seconds
  });
}

/**
 * Get counter history
 */
export function useCounterHistory(name: string, limit = 50, enabled = true) {
  return useQuery({
    ...api.counter.getHistory.queryOptions({ input: { name, limit } }),
    enabled: enabled && !!name,
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Create a new counter with optimistic updates
 */
export function useCreateCounter() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();

  return useMutation(
    api.counter.create.mutationOptions({
      onMutate: async ({ name }) => {
        // Get query key from oRPC
        const listQueryKey = api.counter.listAll.queryOptions().queryKey;

        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: listQueryKey });

        const userId = session?.user?.id ?? "unknown";

        // Optimistically add counter to list
        const rollbackList = addCounterToListOptimistically(
          queryClient,
          listQueryKey,
          name,
          userId
        );

        // Return context for rollback
        return {
          rollbackFns: [rollbackList],
        };
      },
      onSuccess: (data, { name }) => {
        // Get query key for invalidation
        const listQueryKey = api.counter.listAll.queryOptions().queryKey;

        // Refetch the list to get accurate data
        queryClient.invalidateQueries({ queryKey: listQueryKey });
        showSuccessToast("created", name);
      },
      onError: (error, { name }, context) => {
        // Execute rollbacks only - let component handle toast
        if (context?.rollbackFns) {
          executeRollbacks(context.rollbackFns);
        }
      },
    })
  );
}

/**
 * Increment counter with optimistic updates
 */
export function useIncrementCounter() {
  const queryClient = useQueryClient();

  return useMutation(
    api.counter.increment.mutationOptions({
      onMutate: async ({ name, amount = 1 }) => {
        // Get query keys from oRPC
        const valueQueryKey = api.counter.getValue.queryOptions({
          input: { name },
        }).queryKey;
        const metadataQueryKey = api.counter.getMetadata.queryOptions({
          input: { name },
        }).queryKey;
        const historyQueryKey = api.counter.getHistory.queryOptions({
          input: { name, limit: 50 },
        }).queryKey;

        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: valueQueryKey });
        await queryClient.cancelQueries({ queryKey: metadataQueryKey });
        await queryClient.cancelQueries({ queryKey: historyQueryKey });

        // Get current value for optimistic update
        const currentValue =
          queryClient.getQueryData<{ value: number }>(valueQueryKey)?.value ??
          0;
        const newValue = currentValue + amount;

        // Perform optimistic updates
        const rollbackValue = updateCounterValueOptimistically(
          queryClient,
          valueQueryKey,
          newValue
        );
        const rollbackMetadata = updateCounterMetadataOptimistically(
          queryClient,
          metadataQueryKey,
          { value: newValue }
        );
        const rollbackHistory = addOptimisticHistoryEntry(
          queryClient,
          historyQueryKey,
          `increment(${amount})`,
          currentValue,
          newValue
        );

        // Return context for rollback
        return {
          rollbackFns: [rollbackValue, rollbackMetadata, rollbackHistory],
        };
      },
      onSuccess: (data, { name }) => {
        // Get query keys for updates
        const valueQueryKey = api.counter.getValue.queryOptions({
          input: { name },
        }).queryKey;
        const metadataQueryKey = api.counter.getMetadata.queryOptions({
          input: { name },
        }).queryKey;
        const historyQueryKey = api.counter.getHistory.queryOptions({
          input: { name, limit: 50 },
        }).queryKey;

        // Update all queries from enriched response
        updateCounterFromEnrichedResponse(
          queryClient,
          valueQueryKey,
          metadataQueryKey,
          historyQueryKey,
          data
        );
        showSuccessToast("incremented", name);
      },
      onError: (error, { name }, context) => {
        // Execute rollbacks only - let component handle toast
        if (context?.rollbackFns) {
          executeRollbacks(context.rollbackFns);
        }
      },
    })
  );
}

/**
 * Decrement counter with optimistic updates
 */
export function useDecrementCounter() {
  const queryClient = useQueryClient();

  return useMutation(
    api.counter.decrement.mutationOptions({
      onMutate: async ({ name, amount = 1 }) => {
        // Get query keys from oRPC
        const valueQueryKey = api.counter.getValue.queryOptions({
          input: { name },
        }).queryKey;
        const metadataQueryKey = api.counter.getMetadata.queryOptions({
          input: { name },
        }).queryKey;
        const historyQueryKey = api.counter.getHistory.queryOptions({
          input: { name, limit: 50 },
        }).queryKey;

        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: valueQueryKey });
        await queryClient.cancelQueries({ queryKey: metadataQueryKey });
        await queryClient.cancelQueries({ queryKey: historyQueryKey });

        // Get current value for optimistic update
        const currentValue =
          queryClient.getQueryData<{ value: number }>(valueQueryKey)?.value ??
          0;
        const newValue = currentValue - amount;

        // Perform optimistic updates
        const rollbackValue = updateCounterValueOptimistically(
          queryClient,
          valueQueryKey,
          newValue
        );
        const rollbackMetadata = updateCounterMetadataOptimistically(
          queryClient,
          metadataQueryKey,
          { value: newValue }
        );
        const rollbackHistory = addOptimisticHistoryEntry(
          queryClient,
          historyQueryKey,
          `decrement(${amount})`,
          currentValue,
          newValue
        );

        // Return context for rollback
        return {
          rollbackFns: [rollbackValue, rollbackMetadata, rollbackHistory],
        };
      },
      onSuccess: (data, { name }) => {
        // Get query keys for updates
        const valueQueryKey = api.counter.getValue.queryOptions({
          input: { name },
        }).queryKey;
        const metadataQueryKey = api.counter.getMetadata.queryOptions({
          input: { name },
        }).queryKey;
        const historyQueryKey = api.counter.getHistory.queryOptions({
          input: { name, limit: 50 },
        }).queryKey;

        // Update all queries from enriched response
        updateCounterFromEnrichedResponse(
          queryClient,
          valueQueryKey,
          metadataQueryKey,
          historyQueryKey,
          data
        );
        showSuccessToast("decremented", name);
      },
      onError: (error, { name }, context) => {
        // Execute rollbacks only - let component handle toast
        if (context?.rollbackFns) {
          executeRollbacks(context.rollbackFns);
        }
      },
    })
  );
}

/**
 * Set counter value with optimistic updates
 */
export function useSetCounterValue() {
  const queryClient = useQueryClient();

  return useMutation(
    api.counter.setValue.mutationOptions({
      onMutate: async ({ name, value }) => {
        // Get query keys from oRPC
        const valueQueryKey = api.counter.getValue.queryOptions({
          input: { name },
        }).queryKey;
        const metadataQueryKey = api.counter.getMetadata.queryOptions({
          input: { name },
        }).queryKey;
        const historyQueryKey = api.counter.getHistory.queryOptions({
          input: { name, limit: 50 },
        }).queryKey;

        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: valueQueryKey });
        await queryClient.cancelQueries({ queryKey: metadataQueryKey });
        await queryClient.cancelQueries({ queryKey: historyQueryKey });

        // Get current value for optimistic update
        const currentValue =
          queryClient.getQueryData<{ value: number }>(valueQueryKey)?.value ??
          0;

        // Perform optimistic updates
        const rollbackValue = updateCounterValueOptimistically(
          queryClient,
          valueQueryKey,
          value
        );
        const rollbackMetadata = updateCounterMetadataOptimistically(
          queryClient,
          metadataQueryKey,
          { value }
        );
        const rollbackHistory = addOptimisticHistoryEntry(
          queryClient,
          historyQueryKey,
          `setValue(${value})`,
          currentValue,
          value
        );

        // Return context for rollback
        return {
          rollbackFns: [rollbackValue, rollbackMetadata, rollbackHistory],
        };
      },
      onSuccess: (data, { name }) => {
        // Get query keys for updates
        const valueQueryKey = api.counter.getValue.queryOptions({
          input: { name },
        }).queryKey;
        const metadataQueryKey = api.counter.getMetadata.queryOptions({
          input: { name },
        }).queryKey;
        const historyQueryKey = api.counter.getHistory.queryOptions({
          input: { name, limit: 50 },
        }).queryKey;

        // Update all queries from enriched response
        updateCounterFromEnrichedResponse(
          queryClient,
          valueQueryKey,
          metadataQueryKey,
          historyQueryKey,
          data
        );
        showSuccessToast("updated", name);
      },
      onError: (error, { name }, context) => {
        // Execute rollbacks only - let component handle toast
        if (context?.rollbackFns) {
          executeRollbacks(context.rollbackFns);
        }
      },
    })
  );
}

/**
 * Reset counter with optimistic updates
 */
export function useResetCounter() {
  const queryClient = useQueryClient();

  return useMutation(
    api.counter.reset.mutationOptions({
      onMutate: async ({ name }) => {
        // Get query keys from oRPC
        const valueQueryKey = api.counter.getValue.queryOptions({
          input: { name },
        }).queryKey;
        const metadataQueryKey = api.counter.getMetadata.queryOptions({
          input: { name },
        }).queryKey;
        const historyQueryKey = api.counter.getHistory.queryOptions({
          input: { name, limit: 50 },
        }).queryKey;

        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: valueQueryKey });
        await queryClient.cancelQueries({ queryKey: metadataQueryKey });
        await queryClient.cancelQueries({ queryKey: historyQueryKey });

        // Get current value for optimistic update
        const currentValue =
          queryClient.getQueryData<{ value: number }>(valueQueryKey)?.value ??
          0;

        // Perform optimistic updates (reset to 0)
        const rollbackValue = updateCounterValueOptimistically(
          queryClient,
          valueQueryKey,
          0
        );
        const rollbackMetadata = updateCounterMetadataOptimistically(
          queryClient,
          metadataQueryKey,
          { value: 0 }
        );
        const rollbackHistory = addOptimisticHistoryEntry(
          queryClient,
          historyQueryKey,
          "reset()",
          currentValue,
          0
        );

        // Return context for rollback
        return {
          rollbackFns: [rollbackValue, rollbackMetadata, rollbackHistory],
        };
      },
      onSuccess: (data, { name }) => {
        // Get query keys for updates
        const valueQueryKey = api.counter.getValue.queryOptions({
          input: { name },
        }).queryKey;
        const metadataQueryKey = api.counter.getMetadata.queryOptions({
          input: { name },
        }).queryKey;
        const historyQueryKey = api.counter.getHistory.queryOptions({
          input: { name, limit: 50 },
        }).queryKey;

        // Update all queries from enriched response
        updateCounterFromEnrichedResponse(
          queryClient,
          valueQueryKey,
          metadataQueryKey,
          historyQueryKey,
          data
        );
        showSuccessToast("reset", name);
      },
      onError: (error, { name }, context) => {
        // Execute rollbacks only - let component handle toast
        if (context?.rollbackFns) {
          executeRollbacks(context.rollbackFns);
        }
      },
    })
  );
}

/**
 * Delete counter with optimistic updates
 */
export function useDeleteCounter() {
  const queryClient = useQueryClient();

  return useMutation(
    api.counter.delete.mutationOptions({
      onMutate: async ({ name }) => {
        // Get query keys from oRPC
        const listQueryKey = api.counter.listAll.queryOptions().queryKey;
        const valueQueryKey = api.counter.getValue.queryOptions({
          input: { name },
        }).queryKey;
        const metadataQueryKey = api.counter.getMetadata.queryOptions({
          input: { name },
        }).queryKey;
        const historyQueryKey = api.counter.getHistory.queryOptions({
          input: { name, limit: 50 },
        }).queryKey;

        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: listQueryKey });
        await queryClient.cancelQueries({ queryKey: valueQueryKey });
        await queryClient.cancelQueries({ queryKey: metadataQueryKey });
        await queryClient.cancelQueries({ queryKey: historyQueryKey });

        // Optimistically remove counter from list
        const rollbackList = removeCounterFromListOptimistically(
          queryClient,
          listQueryKey,
          name
        );

        // Return context for rollback
        return {
          rollbackFns: [rollbackList],
        };
      },
      onSuccess: (data, { name }) => {
        // Get query keys for removal
        const listQueryKey = api.counter.listAll.queryOptions().queryKey;
        const valueQueryKey = api.counter.getValue.queryOptions({
          input: { name },
        }).queryKey;
        const metadataQueryKey = api.counter.getMetadata.queryOptions({
          input: { name },
        }).queryKey;
        const historyQueryKey = api.counter.getHistory.queryOptions({
          input: { name, limit: 50 },
        }).queryKey;

        // Remove all queries for this counter
        queryClient.removeQueries({ queryKey: valueQueryKey });
        queryClient.removeQueries({ queryKey: metadataQueryKey });
        queryClient.removeQueries({ queryKey: historyQueryKey });

        // Refetch the list to ensure consistency
        queryClient.invalidateQueries({ queryKey: listQueryKey });

        showSuccessToast("deleted", name);
      },
      onError: (error, { name }, context) => {
        // Execute rollbacks only - let component handle toast
        if (context?.rollbackFns) {
          executeRollbacks(context.rollbackFns);
        }
      },
    })
  );
}
