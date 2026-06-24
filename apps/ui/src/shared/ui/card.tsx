import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border-border bg-card rounded-lg border p-4 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
