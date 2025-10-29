import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border font-normal text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-blue-500/20 bg-blue-500/10 text-blue-500 shadow-sm",
        active:
          "border-blue-500/20 bg-blue-500/10 text-blue-500 shadow-sm",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-500 shadow-sm",
        completed:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-500 shadow-sm",
        failed:
          "border-red-500/20 bg-red-500/10 text-red-500 shadow-sm",
        destructive:
          "border-red-500/20 bg-red-500/10 text-red-500 shadow-sm",
        secondary:
          "border-gray-500/20 bg-gray-500/10 text-gray-500 shadow-sm",
        count:
          "border-border/30 bg-secondary/20 text-muted-foreground shadow-sm",
        outline:
          "border-border/30 text-foreground",
      },
      size: {
        default: "px-2.5 py-0.5",
        sm: "px-2 py-0 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      data-slot="badge"
      {...props}
    />
  );
}

export { Badge, badgeVariants };
