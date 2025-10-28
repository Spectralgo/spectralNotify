import type * as React from "react";
import type { TaskStatus } from "@/types/task";
import { Badge } from "./ui/badge";

interface TaskStatusPillProps
  extends Omit<React.ComponentProps<typeof Badge>, "variant"> {
  status: TaskStatus;
}

const statusLabels: Record<TaskStatus, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  success: "Success",
  failed: "Failed",
  canceled: "Canceled",
};

const statusVariants: Record<TaskStatus, string> = {
  pending: "secondary",
  "in-progress": "default",
  success: "success",
  failed: "destructive",
  canceled: "outline",
};

function TaskStatusPill({ status, ...props }: TaskStatusPillProps) {
  return (
    <Badge variant={statusVariants[status] as any} {...props}>
      {statusLabels[status]}
    </Badge>
  );
}

export { TaskStatusPill };
export type { TaskStatus };
