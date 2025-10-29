import { createFileRoute, Outlet } from "@tanstack/react-router";
import { createContext, useContext, useState } from "react";

export interface WorkflowsLayoutContext {
  selectedWorkflowId: string | undefined;
  setSelectedWorkflowId: (id: string | undefined) => void;
}

const WorkflowsContext = createContext<WorkflowsLayoutContext | null>(null);

export function useWorkflowsContext() {
  const context = useContext(WorkflowsContext);
  if (!context) {
    throw new Error(
      "useWorkflowsContext must be used within WorkflowsLayoutComponent"
    );
  }
  return context;
}

export const Route = createFileRoute("/_app/workflows")({
  component: WorkflowsLayoutComponent,
});

function WorkflowsLayoutComponent() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<
    string | undefined
  >();

  return (
    <WorkflowsContext.Provider
      value={{ selectedWorkflowId, setSelectedWorkflowId }}
    >
      <div className="flex h-[calc(100vh-4rem)] w-full gap-4 p-4">
        {/* Middle Pane - Workflow List */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </WorkflowsContext.Provider>
  );
}
