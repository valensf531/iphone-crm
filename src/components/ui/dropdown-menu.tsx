"use client";
import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuContent = ({
  className,
  sideOffset = 6,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> & {
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.Content>>;
}) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[10rem] overflow-hidden rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_8px_24px_-12px_rgb(0_0_0/0.18)]",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
);
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = ({
  className,
  inset,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.Item>>;
}) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer touch-manipulation select-none items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
);
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuLabel = ({
  className,
  inset,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) => (
  <div
    className={cn("px-3 py-1.5 text-xs font-semibold text-muted-foreground", inset && "pl-8", className)}
    {...props}
  />
);
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
};
