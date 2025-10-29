import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { TaskFilters, TaskStatus } from "@/types/task";
import { api } from "@/utils/orpc";

/**
 * Hook to fetch all tasks with optional filtering
 */
export function useTasks(filters?: TaskFilters) {
  const query = useQuery(
    api.tasks.getAll.queryOptions({
      staleTime: 30_000, // 30 seconds
      refetchInterval: 3000, // Refetch every 3 seconds for task list
    })
  );

  // Apply client-side filtering
  let filteredTasks = query.data || [];

  if (filters?.status) {
    filteredTasks = filteredTasks.filter(
      (task) => task.status === filters.status
    );
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    filteredTasks = filteredTasks.filter((task) =>
      task.id.toLowerCase().includes(searchLower)
    );
  }

  return {
    tasks: filteredTasks,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch a single task by ID
 * NOTE: WebSocket should be preferred for task details. This hook is only for fallback.
 */
export function useTask(taskId?: string) {
  return useQuery(
    api.tasks.getById.queryOptions({
      input: { taskId: taskId! },
      enabled: !!taskId,
      staleTime: 30_000,
      // No refetchInterval - WebSocket should handle updates for task details
    })
  );
}

/**
 * Hook to get task statistics
 * NOTE: Computes stats client-side from all tasks
 */
export function useTaskStats() {
  const { tasks, isLoading } = useTasks();

  const stats = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in-progress").length,
    success: tasks.filter((t) => t.status === "success").length,
    failed: tasks.filter((t) => t.status === "failed").length,
    canceled: tasks.filter((t) => t.status === "canceled").length,
  };

  return {
    stats,
    isLoading,
  };
}

/**
 * Hook to manage task search
 */
export function useTaskSearch() {
  const [search, setSearch] = useState("");

  const handleSearch = (query: string) => {
    setSearch(query);
  };

  const clearSearch = () => {
    setSearch("");
  };

  return {
    search,
    setSearch: handleSearch,
    clearSearch,
  };
}

/**
 * Hook to manage task filter by status
 */
export function useTaskFilter(initialStatus?: TaskStatus) {
  const [status, setStatus] = useState<TaskStatus | undefined>(initialStatus);

  const handleFilterChange = (newStatus?: TaskStatus) => {
    setStatus(newStatus);
  };

  const clearFilter = () => {
    setStatus(undefined);
  };

  return {
    status,
    setStatus: handleFilterChange,
    clearFilter,
  };
}
