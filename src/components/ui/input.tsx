import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = ({ className, type, ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-input bg-control px-3.5 py-2 text-sm tabular-nums ring-offset-background transition-[border-color,box-shadow] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/70 hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
);
Input.displayName = "Input";

export { Input };
