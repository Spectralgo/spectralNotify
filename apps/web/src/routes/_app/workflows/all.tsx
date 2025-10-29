import { createFileRoute } from "@tanstack/react-router";
import { Inbox, Search } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { WorkflowDetailPanel } from "@/components/workflow-detail-panel";
import { WorkflowListItem } from "@/components/workflow-list-item";
import { useWorkflowDetail } from "@/hooks/use-workflow-detail";
import { useWorkflows } from "@/hooks/use-workflows";
import { formatRelativeTime } from "@/lib/format-time";
import { useWorkflowsContext } from "./route";

export const Route = createFileRoute("/_app/workflows/all")({
  component: AllWorkflowsPage,
});

function AllWorkflowsPage() {
  const { selectedWorkflowId, setSelectedWorkflowId } = useWorkflowsContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [isLiveEnabled, setIsLiveEnabled] = useState(true);

  const { workflows, isLoading } = useWorkflows({ search: searchQuery });

  const {
    workflow: selectedWorkflow,
    isConnected,
    isConnecting,
    connectionError,
  } = useWorkflowDetail({
    workflowId: selectedWorkflowId,
    enableWebSocket: isLiveEnabled,
  });

  const handleWorkflowClick = (workflowId: string) => {
    setSelectedWorkflowId(
      workflowId === selectedWorkflowId ? undefined : workflowId
    );
  };

  const handleLiveToggle = (enabled: boolean) => {
    setIsLiveEnabled(enabled);
  };

  return (
    <div className="flex h-full gap-4">
      {/* Workflow List */}
      <div className="flex w-full max-w-2xl flex-col gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-gray-400" />
          <Input
            className="border-white/10 bg-gray-800/50 pl-10 placeholder:text-gray-500"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Workflow ID..."
            value={searchQuery}
          />
        </div>

        {/* Workflow List */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-400 text-sm">Loading workflows...</p>
            </div>
          ) : workflows.length === 0 ? (
            <EmptyState
              description={
                searchQuery
                  ? "Try adjusting your search query"
                  : "Workflows will appear here when they're created"
              }
              icon={Inbox}
              title={searchQuery ? "No matches found" : "No workflows yet"}
            />
          ) : (
            workflows.map((workflow) => (
              <WorkflowListItem
                isSelected={selectedWorkflowId === workflow.id}
                key={workflow.id}
                lastEvent={workflow.lastEvent.message}
                onClick={() => handleWorkflowClick(workflow.id)}
                overallProgress={workflow.overallProgress}
                relativeTime={formatRelativeTime(workflow.updatedAt)}
                status={workflow.status as any}
                workflowId={workflow.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Workflow Detail Panel */}
      <div className="flex-1">
        <WorkflowDetailPanel
          connectionError={connectionError}
          isConnected={isConnected}
          isConnecting={isConnecting}
          isLive={isLiveEnabled}
          onLiveToggle={handleLiveToggle}
          workflow={
            selectedWorkflow
              ? {
                  id: selectedWorkflow.workflowId,
                  status: selectedWorkflow.status as any,
                  overallProgress: selectedWorkflow.overallProgress,
                  expectedPhaseCount: selectedWorkflow.expectedPhaseCount,
                  completedPhaseCount: selectedWorkflow.completedPhaseCount,
                  activePhaseKey: selectedWorkflow.activePhaseKey,
                  phases: selectedWorkflow.phases,
                  events: selectedWorkflow.events,
                  lastUpdate: formatRelativeTime(selectedWorkflow.updatedAt),
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
