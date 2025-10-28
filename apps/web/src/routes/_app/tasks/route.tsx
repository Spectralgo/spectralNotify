import { createFileRoute, Outlet } from "@tanstack/react-router";
import { createContext, useContext, useState } from "react";

export interface TasksLayoutContext {
  selectedTaskId?: string;
  setSelectedTaskId: (id: string | undefined) => void;
}

const TasksContext = createContext<TasksLayoutContext | null>(null);

export function useTasksContext() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error("useTasksContext must be used within TasksLayoutComponent");
  }
  return context;
}

export const Route = createFileRoute("/_app/tasks")({
  component: TasksLayoutComponent,
});

function TasksLayoutComponent() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();

  return (
    <TasksContext.Provider value={{ selectedTaskId, setSelectedTaskId }}>
      <div className="flex h-[calc(100vh-4rem)] w-full gap-4 p-4">
        {/* Middle Pane - Task List */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </TasksContext.Provider>
  );
}
