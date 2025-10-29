import { useQuery } from "@tanstack/react-query";
import { api } from "@/utils/orpc";

export type WorkflowStatus =
  | "pending"
  | "in-progress"
  | "success"
  | "failed"
  | "canceled";

export interface WorkflowFilters {
  status?: WorkflowStatus;
  search?: string;
}

/**
 * Hook to fetch all workflows with optional filtering
 */
export function useWorkflows(filters?: WorkflowFilters) {
  const query = useQuery(
    api.workflows.getAll.queryOptions({
      staleTime: 30_000, // 30 seconds
      refetchInterval: 3000, // Refetch every 3 seconds for workflow list
    })
  );

  // Apply client-side filtering
  let filteredWorkflows = query.data || [];

  if (filters?.status) {
    filteredWorkflows = filteredWorkflows.filter(
      (workflow) => workflow.status === filters.status
    );
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    filteredWorkflows = filteredWorkflows.filter((workflow) =>
      workflow.id.toLowerCase().includes(searchLower)
    );
  }

  return {
    workflows: filteredWorkflows,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
