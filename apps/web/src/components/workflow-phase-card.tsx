import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { motion } from "motion/react";
import type * as React from "react";
import { cn } from "@/lib/utils";

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

const statusIconColors: Record<PhaseStatus, string> = {
  pending: "text-gray-400",
  "in-progress": "text-blue-500",
  success: "text-emerald-500",
  failed: "text-red-500",
  canceled: "text-gray-400",
};

const statusPillStyles: Record<PhaseStatus, string> = {
  pending: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  "in-progress": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
  canceled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const statusLabels: Record<PhaseStatus, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  success: "Complete",
  failed: "Failed",
  canceled: "Canceled",
};

const statusGradients: Record<PhaseStatus, string> = {
  pending: "from-gray-400/60 to-gray-500/80",
  "in-progress": "from-blue-500/60 to-blue-600/80",
  success: "from-emerald-500/60 to-emerald-600/80",
  failed: "from-red-500/60 to-red-600/80",
  canceled: "from-gray-400/60 to-gray-500/80",
};

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function WorkflowPhaseCard({
  phase,
  className,
  ...props
}: WorkflowPhaseCardProps) {
  const Icon = statusIcons[phase.status];

  // Calculate duration if both timestamps exist
  let durationSeconds: number | null = null;
  if (phase.startedAt && phase.completedAt) {
    const start = new Date(phase.startedAt).getTime();
    const end = new Date(phase.completedAt).getTime();
    durationSeconds = Math.round((end - start) / 1000);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[var(--radius-md)] border border-border/30 bg-card/30 p-3",
        "transition-all duration-200 hover:bg-card/50 hover:border-border/40",
        className
      )}
      data-slot="workflow-phase-card"
      {...props}
    >
      {/* Header: Icon + Label | Status Pill */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon
            className={cn(
              "h-4 w-4 flex-shrink-0",
              statusIconColors[phase.status],
              phase.status === "in-progress" && "animate-spin"
            )}
            aria-hidden="true"
          />
          <h4 className="text-sm font-medium text-foreground truncate">
            {phase.label}
          </h4>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-xs font-normal flex-shrink-0",
            statusPillStyles[phase.status]
          )}
        >
          {statusLabels[phase.status]}
        </span>
      </div>

      {/* Enhanced Progress Bar */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-border/30">
        <motion.div
          className={cn(
            "h-full rounded-full bg-gradient-to-r",
            statusGradients[phase.status]
          )}
          initial={{ width: 0 }}
          animate={{ width: `${phase.progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Timeline Metadata with Progress Percentage */}
      <div className="flex items-center justify-between text-xs text-muted-foreground/50">
        {phase.startedAt && (
          <div>
            {formatTime(phase.startedAt)}
            {phase.completedAt && (
              <>
                {" → "}
                {formatTime(phase.completedAt)}
                {durationSeconds !== null && (
                  <span className="font-medium">
                    {" • "}
                    {formatDuration(durationSeconds)}
                  </span>
                )}
              </>
            )}
          </div>
        )}
        <span className={cn(
          "font-medium text-xs ml-auto",
          phase.status === "success" ? "text-emerald-500" :
          phase.status === "in-progress" ? "text-blue-500" :
          phase.status === "failed" ? "text-red-500" :
          "text-gray-500"
        )}>
          {Math.round(phase.progress)}%
        </span>
      </div>
    </div>
  );
}

export { WorkflowPhaseCard };
export type { WorkflowPhase, PhaseStatus };
