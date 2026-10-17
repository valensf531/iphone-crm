import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-3", className)}>
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? (
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display mt-1.5 text-2xl font-semibold leading-[1.05] tracking-tight text-foreground text-balance sm:text-[34px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground text-pretty">{description}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div> : null}
    </div>
  );
}
