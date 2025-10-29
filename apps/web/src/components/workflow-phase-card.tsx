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
  pending: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  "in-progress": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  failed: "text-red-400 bg-red-500/10 border-red-500/20",
  canceled: "text-orange-400 bg-orange-500/10 border-orange-500/20",
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
        "flex flex-col gap-3 rounded-lg border p-4",
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
        <Progress className="h-2 flex-1" value={phase.progress} />
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
