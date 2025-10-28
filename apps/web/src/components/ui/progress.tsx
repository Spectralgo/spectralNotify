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
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={value}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full border border-white/10 bg-gray-800/50",
        className
      )}
      data-slot="progress"
      role="progressbar"
      {...props}
    >
      <motion.div
        animate={{ width: `${percentage}%` }}
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
        initial={{ width: "0%" }}
        transition={{
          type: "spring",
          stiffness: 50,
          damping: 15,
        }}
      />
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center font-medium text-white text-xs">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

export { Progress };
