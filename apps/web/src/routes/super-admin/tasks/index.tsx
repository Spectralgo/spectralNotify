import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TaskDeletePanel } from "@/components/task-delete-panel";
import { TaskListItem } from "@/components/task-list-item";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDeleteAllTasks } from "@/hooks/use-delete-tasks";
import { useTasks } from "@/hooks/use-tasks";

export const Route = createFileRoute("/super-admin/tasks/")({
  component: TasksManagementPage,
});

function TasksManagementPage() {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);

  const deleteAllMutation = useDeleteAllTasks();
  const { data: tasksData, isLoading } = useTasks();

  const taskList = tasksData?.tasks || [];
  const taskIds = taskList.map((t) => t.taskId);

  const handleDeleteAll = async () => {
    try {
      const result = await deleteAllMutation.mutateAsync();
      toast.success(
        `Successfully deleted ${result.deleted} task${result.deleted === 1 ? "" : "s"}`
      );
      if (result.failures && result.failures.length > 0) {
        toast.warning(
          `${result.failures.length} task${result.failures.length === 1 ? "" : "s"} failed to delete`,
          {
            description: result.failures
              .map((f) => `${f.taskId}: ${f.error}`)
              .join("\n"),
          }
        );
      }
      setSelectedTask(null);
      setIsDeleteAllDialogOpen(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to delete tasks: ${errorMessage}`);
    }
  };

  const handleDeleteTask = () => {
    // Clear selection when task is deleted
    setSelectedTask(null);
  };

  const filteredTasks = taskIds.filter((taskId) =>
    taskId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl text-foreground">
            Task Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage Durable Object tasks and their storage
          </p>
        </div>

        <AlertDialog
          onOpenChange={setIsDeleteAllDialogOpen}
          open={isDeleteAllDialogOpen}
        >
          <Button
            disabled={taskList.length === 0 || deleteAllMutation.isPending}
            onClick={() => setIsDeleteAllDialogOpen(true)}
            variant="destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteAllMutation.isPending ? "Deleting..." : "Delete All Tasks"}
          </Button>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete All Tasks?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete{" "}
                <strong>all {taskList.length} tasks</strong> and clear their
                Durable Object storage including:
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>All task metadata and statuses</li>
                  <li>Complete event histories</li>
                  <li>All WebSocket connections</li>
                  <li>All registry entries</li>
                </ul>
                <p className="mt-4 font-semibold text-destructive">
                  This action cannot be undone. All task data will be
                  permanently lost.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDeleteAll}
              >
                Delete All {taskList.length} Tasks
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* List + Detail Panel Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Panel - Task List */}
        <Card className="p-4 lg:col-span-1">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                value={searchQuery}
              />
            </div>

            {/* Task List */}
            <div className="space-y-1">
              {isLoading ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    Loading tasks...
                  </p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    {taskList.length === 0
                      ? "No tasks in registry"
                      : "No tasks match your search"}
                  </p>
                </div>
              ) : (
                filteredTasks.map((taskId) => (
                  <TaskListItem
                    isActive={selectedTask === taskId}
                    key={taskId}
                    onClick={() => setSelectedTask(taskId)}
                    taskId={taskId}
                  />
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Right Panel - Task Detail */}
        <div className="lg:col-span-2">
          {selectedTask ? (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground text-lg">
                    Task Details
                  </h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Task ID
                      </span>
                      <span className="font-mono text-foreground text-sm">
                        {selectedTask}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <TaskDeletePanel
                onDelete={handleDeleteTask}
                taskId={selectedTask}
              />
            </div>
          ) : (
            <Card className="p-12">
              <div className="space-y-2 text-center">
                <p className="font-medium text-foreground text-lg">
                  Select a task
                </p>
                <p className="text-muted-foreground text-sm">
                  Choose a task from the list to view and manage it
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
