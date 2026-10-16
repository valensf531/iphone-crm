import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
  {
    variants: {
      variant: {
        default: "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-zinc-950",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-white",
        outline: "text-foreground",
        success: "border-transparent bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800",
        warning: "border-transparent bg-amber-100 text-amber-950 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800",
        live: "border-transparent bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/30",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
