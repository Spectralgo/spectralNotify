import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/utils/orpc";

/**
 * Hook to delete a single task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => await client.tasks.delete({ taskId }),
    onSuccess: () => {
      // Invalidate task list query to refetch
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

/**
 * Hook to delete all tasks (super admin only)
 */
export function useDeleteAllTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => await client.tasks.deleteAll(),
    onSuccess: () => {
      // Invalidate task list query to refetch
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
