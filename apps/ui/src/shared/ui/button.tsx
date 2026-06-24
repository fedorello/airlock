import { type VariantProps, cva } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/cn";

const buttonVariants = cva(
  "focus-visible:ring-primary inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:opacity-90",
        approve: "bg-approved text-white hover:opacity-90",
        reject: "bg-rejected text-white hover:opacity-90",
        outline: "border-border hover:bg-muted border",
        ghost: "text-foreground hover:bg-muted",
      },
      size: { sm: "h-8 px-3", md: "h-9 px-4", icon: "size-9" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
