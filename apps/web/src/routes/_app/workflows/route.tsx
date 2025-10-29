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
      <Outlet />
    </WorkflowsContext.Provider>
  );
}
