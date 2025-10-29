import { Check, Copy, FileText, Info } from "lucide-react";
import { useState } from "react";
import type * as React from "react";

import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { EventTimeline, type TaskEvent } from "./event-timeline";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Progress } from "./ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
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
    metadata?: string;
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
  const [copied, setCopied] = useState(false);
  const [metadataCopied, setMetadataCopied] = useState(false);

  // Parse metadata safely
  const parsedMetadata = workflow?.metadata ? (() => {
    try {
      return JSON.parse(workflow.metadata);
    } catch {
      return null;
    }
  })() : null;

  const purpose = parsedMetadata?.purpose;
  const author = parsedMetadata?.author;
  const origin = parsedMetadata?.origin;

  const handleCopyId = async () => {
    if (!workflow) return;
    await navigator.clipboard.writeText(workflow.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMetadata = async () => {
    if (!parsedMetadata) return;
    await navigator.clipboard.writeText(JSON.stringify(parsedMetadata, null, 2));
    setMetadataCopied(true);
    setTimeout(() => setMetadataCopied(false), 2000);
  };

  if (!workflow) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center rounded-[var(--radius-lg)] border border-border bg-card backdrop-blur-xl",
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
        "flex h-full flex-col gap-6 rounded-[var(--radius-lg)] border border-border bg-card p-6 backdrop-blur-xl",
        className
      )}
      data-slot="workflow-detail-panel"
      {...props}
    >
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-mono font-semibold text-lg text-foreground">
              {workflow.id}
            </h2>
            <WorkflowStatusPill status={workflow.status} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="h-7 w-7 cursor-pointer"
                  onClick={handleCopyId}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {copied ? "Copied!" : "Copy workflow ID"}
              </TooltipContent>
            </Tooltip>
            {parsedMetadata && (
              <Dialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button
                        className="h-7 w-7 cursor-pointer"
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>View metadata</TooltipContent>
                </Tooltip>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <DialogTitle>Workflow Metadata</DialogTitle>
                        <DialogDescription>
                          Complete metadata for workflow {workflow.id}
                        </DialogDescription>
                      </div>
                      <Button
                        className="h-8 gap-2 cursor-pointer"
                        onClick={handleCopyMetadata}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {metadataCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogHeader>
                  <pre className="rounded-[var(--radius-md)] border border-border bg-secondary/30 p-4 text-xs overflow-x-auto">
                    {JSON.stringify(parsedMetadata, null, 2)}
                  </pre>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {workflow.lastUpdate && (
            <span className="text-muted-foreground text-xs">{workflow.lastUpdate}</span>
          )}
        </div>

        {/* Metadata Row */}
        {(purpose?.title || author || origin?.module) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            {purpose?.title && (
              <>
                <FileText className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{purpose.title}</span>
              </>
            )}
            {author && (
              <>
                <span>•</span>
                <span className="flex-shrink-0">
                  {author.type === "user" && author.name
                    ? author.name
                    : `@${author.type}`}
                </span>
              </>
            )}
            {origin?.module && (
              <>
                <span>•</span>
                <span className="font-mono flex-shrink-0">{origin.module}</span>
              </>
            )}
          </div>
        )}

        {/* Overall Progress */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-foreground">
                Overall Progress
              </span>
              {workflow.expectedPhaseCount !== undefined &&
                workflow.completedPhaseCount !== undefined && (
                  <span className="text-muted-foreground text-xs">
                    ({workflow.completedPhaseCount}/
                    {workflow.expectedPhaseCount} phases)
                  </span>
                )}
            </div>
            <span className={cn(
              "font-medium text-sm",
              workflow.status === "success" ? "text-emerald-500" :
              workflow.status === "in-progress" ? "text-blue-500" :
              workflow.status === "failed" ? "text-red-500" :
              "text-gray-500"
            )}>
              {Math.round(workflow.overallProgress)}%
            </span>
          </div>
          <Progress className="h-[6px]" value={workflow.overallProgress} />
          {workflow.activePhaseKey && (
            <p className="text-muted-foreground text-xs">
              Active: {workflow.activePhaseKey}
            </p>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 text-xs">
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isConnected
                ? "bg-emerald-500"
                : isConnecting
                  ? "animate-pulse bg-yellow-400"
                  : "bg-gray-400"
            )}
          />
          <span className="text-muted-foreground/60">
            {isConnected
              ? "Live updates active"
              : isConnecting
                ? "Connecting..."
                : connectionError || "Disconnected"}
          </span>
        </div>
      </div>

      {/* Two Column Layout: Phases | Events (stacks on small screens) */}
      <div className="flex flex-1 flex-col gap-6 overflow-hidden lg:flex-row">
        {/* Left Column: Phase Cards */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
          <h3 className="font-normal text-xs text-muted-foreground/40 mb-1">
            Phases
          </h3>
          <div className="grid gap-2">
            {workflow.phases.map((phase) => (
              <WorkflowPhaseCard key={phase.key} phase={phase} />
            ))}
          </div>
        </div>

        {/* Right Column: Event Timeline */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <EventTimeline events={workflow.events} />
        </div>
      </div>
    </div>
  );
}

export { WorkflowDetailPanel };
