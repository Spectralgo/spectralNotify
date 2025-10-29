import { motion } from "motion/react";
import type * as React from "react";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentProps<"div"> {
  value?: number;
  showLabel?: boolean;
  max?: number;
}

function Progress({
  className,
  value = 0,
  showLabel = false,
  max = 100,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn(
        "relative h-[6px] w-full overflow-hidden rounded-full border border-border bg-border/30",
        className
      )}
      data-slot="progress"
      {...props}
    >
      <motion.div
        animate={{ width: `${percentage}%` }}
        className="h-full rounded-full bg-primary"
        initial={{ width: "0%" }}
        transition={{
          type: "spring",
          stiffness: 50,
          damping: 15,
        }}
      />
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center font-medium text-foreground text-xs">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

export { Progress };
