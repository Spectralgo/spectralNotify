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
    className: "bg-muted text-muted-foreground border-border",
  },
  "in-progress": {
    label: "In Progress",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  success: {
    label: "Success",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  canceled: {
    label: "Canceled",
    className: "bg-muted text-muted-foreground border-border",
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
