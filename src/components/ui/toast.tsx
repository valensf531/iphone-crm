"use client";

import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

function ToastViewport({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>) {
  return (
    <ToastPrimitives.Viewport
      className={cn(
        "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 md:max-w-[420px]",
        className
      )}
      {...props}
    />
  );
}
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_8px_24px_-12px_rgb(0_0_0/0.25)] transition-transform duration-150 data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
  {
    variants: {
      variant: {
        default: "",
        success:
          "border-emerald-500/40 bg-popover [&_button]:hover:bg-emerald-500/10",
        destructive:
          "border-destructive/40 bg-destructive text-destructive-foreground [&_button]:border-destructive-foreground/30 [&_button]:hover:bg-destructive-foreground/10",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Toast({ className, variant, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>) {
  return <ToastPrimitives.Root className={cn(toastVariants({ variant }), variant, className)} {...props} />;
}
Toast.displayName = ToastPrimitives.Root.displayName;

function ToastAction({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>) {
  return (
    <ToastPrimitives.Action
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-xl border border-input bg-transparent px-3 text-xs font-bold transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-destructive-foreground/30 group-[.destructive]:hover:bg-destructive-foreground/10",
        className
      )}
      {...props}
    />
  );
}
ToastAction.displayName = ToastPrimitives.Action.displayName;

function ToastClose({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>) {
  return (
    <ToastPrimitives.Close
      className={cn(
        "rounded-lg p-1 text-popover-foreground/60 transition-colors hover:text-popover-foreground focus:outline-none focus:ring-2 focus:ring-ring group-[.destructive]:text-destructive-foreground/70 group-[.destructive]:hover:text-destructive-foreground",
        className
      )}
      toast-close=""
      {...props}
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </ToastPrimitives.Close>
  );
}
ToastClose.displayName = ToastPrimitives.Close.displayName;

function ToastTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm font-bold", className)} {...props} />;
}
ToastTitle.displayName = "ToastTitle";

function ToastDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm text-muted-foreground group-[.destructive]:text-destructive-foreground", className)} {...props} />;
}
ToastDescription.displayName = "ToastDescription";

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
