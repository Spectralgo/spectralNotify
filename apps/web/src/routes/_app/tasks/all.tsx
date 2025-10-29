import { createFileRoute } from "@tanstack/react-router";
import { Inbox, Search } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { TaskListItem } from "@/components/task-list-item";
import { Input } from "@/components/ui/input";
import { useTaskDetail } from "@/hooks/use-task-detail";
import { useTasks } from "@/hooks/use-tasks";
import { formatRelativeTime } from "@/lib/format-time";
import { useTasksContext } from "./route";

export const Route = createFileRoute("/_app/tasks/all")({
  component: AllTasksPage,
});

function AllTasksPage() {
  const { selectedTaskId, setSelectedTaskId } = useTasksContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [isLiveEnabled, setIsLiveEnabled] = useState(true);

  const { tasks, isLoading } = useTasks({ search: searchQuery });

  const {
    task: selectedTask,
    isConnected,
    isConnecting,
    connectionError,
  } = useTaskDetail({
    taskId: selectedTaskId,
    enableWebSocket: isLiveEnabled,
  });

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId === selectedTaskId ? undefined : taskId);
  };

  const handleLiveToggle = (enabled: boolean) => {
    setIsLiveEnabled(enabled);
  };

  return (
    <div className="flex h-full gap-4">
      {/* Task List */}
      <div className="flex w-full max-w-2xl flex-col gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Task ID..."
            value={searchQuery}
          />
        </div>

        {/* Task List */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground text-sm">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              description={
                searchQuery
                  ? "Try adjusting your search query"
                  : "Tasks will appear here when they're created"
              }
              icon={Inbox}
              title={searchQuery ? "No matches found" : "No tasks yet"}
            />
          ) : (
            tasks.map((task) => (
              <TaskListItem
                isSelected={selectedTaskId === task.id}
                key={task.id}
                lastEvent={task.lastEvent.message}
                onClick={() => handleTaskClick(task.id)}
                progress={task.progress}
                relativeTime={formatRelativeTime(task.updatedAt)}
                status={task.status as any}
                taskId={task.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Task Detail Panel */}
      <div className="flex-1">
        <TaskDetailPanel
          connectionError={connectionError}
          isConnected={isConnected}
          isConnecting={isConnecting}
          isLive={isLiveEnabled}
          onLiveToggle={handleLiveToggle}
          task={
            selectedTask
              ? {
                  id: selectedTask.taskId,
                  status: selectedTask.status as any,
                  events: selectedTask.events,
                  lastUpdate: formatRelativeTime(selectedTask.updatedAt),
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
