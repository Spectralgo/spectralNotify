import { cn } from "@/lib/utils";

export type WorkflowStatus =
  | "pending"
  | "in-progress"
  | "success"
  | "failed"
  | "canceled";

interface WorkflowStatusPillProps {
  status: WorkflowStatus;
  className?: string;
}

const statusConfig: Record<
  WorkflowStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  },
  "in-progress": {
    label: "In Progress",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  success: {
    label: "Success",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  canceled: {
    label: "Canceled",
    className: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
};

function WorkflowStatusPill({ status, className }: WorkflowStatusPillProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium text-xs",
        config.className,
        className
      )}
      data-slot="workflow-status-pill"
    >
      {config.label}
    </span>
  );
}

export { WorkflowStatusPill };
