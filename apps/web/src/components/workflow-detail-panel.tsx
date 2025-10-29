import { FileText } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { EventTimeline, type TaskEvent } from "./event-timeline";
import { Progress } from "./ui/progress";
import type { PhaseStatus, WorkflowPhase } from "./workflow-phase-card";
import { WorkflowPhaseCard } from "./workflow-phase-card";
import { WorkflowStatusPill } from "./workflow-status-pill";

interface WorkflowDetailPanelProps extends React.ComponentProps<"div"> {
  workflow?: {
    id: string;
    status: PhaseStatus;
    overallProgress: number;
    expectedPhaseCount?: number;
    completedPhaseCount?: number;
    activePhaseKey?: string | null;
    phases: WorkflowPhase[];
    events: TaskEvent[];
    lastUpdate?: string;
  };
  isLive?: boolean;
  onLiveToggle?: (enabled: boolean) => void;
  // WebSocket connection state
  isConnected?: boolean;
  isConnecting?: boolean;
  connectionError?: string | null;
}

function WorkflowDetailPanel({
  workflow,
  isLive = true,
  onLiveToggle,
  isConnected = false,
  isConnecting = false,
  connectionError,
  className,
  ...props
}: WorkflowDetailPanelProps) {
  if (!workflow) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center rounded-xl border border-white/10 bg-gray-800/50 backdrop-blur-xl",
          className
        )}
        data-slot="workflow-detail-panel"
        {...props}
      >
        <EmptyState
          className="border-none bg-transparent"
          description="Click on any workflow from the list to see its full event timeline and phase details"
          icon={FileText}
          title="Select a workflow to view details"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-6 rounded-xl border border-white/10 bg-gray-800/50 p-6 backdrop-blur-xl",
        className
      )}
      data-slot="workflow-detail-panel"
      {...props}
    >
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="font-mono font-semibold text-lg text-white">
              {workflow.id}
            </h2>
            <WorkflowStatusPill status={workflow.status} />
          </div>
          {workflow.lastUpdate && (
            <span className="text-gray-400 text-xs">{workflow.lastUpdate}</span>
          )}
        </div>

        {/* Overall Progress */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-white">
                Overall Progress
              </span>
              {workflow.expectedPhaseCount !== undefined &&
                workflow.completedPhaseCount !== undefined && (
                  <span className="text-gray-400 text-xs">
                    ({workflow.completedPhaseCount}/
                    {workflow.expectedPhaseCount} phases)
                  </span>
                )}
            </div>
            <span className="font-medium text-sm text-white">
              {Math.round(workflow.overallProgress)}%
            </span>
          </div>
          <Progress className="h-3" value={workflow.overallProgress} />
          {workflow.activePhaseKey && (
            <p className="text-gray-400 text-xs">
              Active: {workflow.activePhaseKey}
            </p>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 text-xs">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              isConnected
                ? "bg-emerald-400"
                : isConnecting
                  ? "animate-pulse bg-yellow-400"
                  : "bg-gray-500"
            )}
          />
          <span className="text-gray-400">
            {isConnected
              ? "Live updates active"
              : isConnecting
                ? "Connecting..."
                : connectionError || "Disconnected"}
          </span>
        </div>
      </div>

      {/* Phase Cards */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-sm text-white uppercase tracking-wider">
          Phases
        </h3>
        <div className="grid gap-3">
          {workflow.phases.map((phase) => (
            <WorkflowPhaseCard key={phase.key} phase={phase} />
          ))}
        </div>
      </div>

      {/* Event Timeline */}
      <div className="flex-1 overflow-y-auto">
        <EventTimeline events={workflow.events} />
      </div>
    </div>
  );
}

export { WorkflowDetailPanel };
