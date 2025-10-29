import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { Progress } from "./ui/progress";

type PhaseStatus =
  | "pending"
  | "in-progress"
  | "success"
  | "failed"
  | "canceled";

interface WorkflowPhase {
  key: string;
  label: string;
  weight: number;
  status: PhaseStatus;
  progress: number;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

interface WorkflowPhaseCardProps extends React.ComponentProps<"div"> {
  phase: WorkflowPhase;
}

const statusIcons: Record<
  PhaseStatus,
  React.ComponentType<{ className?: string }>
> = {
  pending: Clock,
  "in-progress": Loader2,
  success: CheckCircle2,
  failed: XCircle,
  canceled: XCircle,
};

const statusColors: Record<PhaseStatus, string> = {
  pending: "text-muted-foreground bg-muted border-border",
  "in-progress": "text-primary bg-primary/10 border-primary/20",
  success: "text-primary bg-primary/10 border-primary/20",
  failed: "text-destructive bg-destructive/10 border-destructive/20",
  canceled: "text-muted-foreground bg-muted border-border",
};

function WorkflowPhaseCard({
  phase,
  className,
  ...props
}: WorkflowPhaseCardProps) {
  const Icon = statusIcons[phase.status];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[var(--radius-md)] border p-4",
        statusColors[phase.status],
        className
      )}
      data-slot="workflow-phase-card"
      {...props}
    >
      {/* Header: Icon + Label + Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "h-5 w-5",
              phase.status === "in-progress" && "animate-spin"
            )}
          />
          <h4 className="font-medium text-sm">{phase.label}</h4>
        </div>
        <span className="text-xs uppercase opacity-70">{phase.status}</span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <Progress className="h-[6px] flex-1" value={phase.progress} />
        <span className="whitespace-nowrap font-medium text-xs">
          {Math.round(phase.progress)}%
        </span>
      </div>

      {/* Metadata */}
      {phase.completedAt && (
        <p className="text-xs opacity-60">
          Completed: {new Date(phase.completedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

export { WorkflowPhaseCard };
export type { WorkflowPhase, PhaseStatus };
