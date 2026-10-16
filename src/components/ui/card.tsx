import * as React from "react";
import { cn } from "@/lib/utils";

const Card = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn("rounded-2xl border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgb(0_0_0/0.05)]", className)} {...props} />
);
Card.displayName = "Card";

const CardHeader = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-4 sm:p-6", className)} {...props} />
);
CardHeader.displayName = "CardHeader";

const CardTitle = ({ className, ref, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { ref?: React.Ref<HTMLHeadingElement> }) => (
  <h3 ref={ref} className={cn("font-display text-lg font-semibold leading-none tracking-tight text-balance", className)} {...props} />
);
CardTitle.displayName = "CardTitle";

const CardDescription = ({ className, ref, ...props }: React.HTMLAttributes<HTMLParagraphElement> & { ref?: React.Ref<HTMLParagraphElement> }) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground text-pretty", className)} {...props} />
);
CardDescription.displayName = "CardDescription";

const CardContent = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn("p-4 pt-0 sm:p-6 sm:pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

const CardFooter = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn("flex flex-wrap items-center gap-2 p-4 pt-0 sm:p-6 sm:pt-0", className)} {...props} />
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
