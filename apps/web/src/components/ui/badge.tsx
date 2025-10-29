import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border font-medium text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        active:
          "border-primary/20 bg-primary/10 text-primary shadow-sm",
        completed: "border-border bg-muted text-muted-foreground shadow-sm",
        failed: "border-destructive/20 bg-destructive/10 text-destructive shadow-sm",
        count: "border-border bg-secondary/40 text-muted-foreground shadow-sm",
        outline: "border-current text-foreground",
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
