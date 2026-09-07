import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/shared/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-medium leading-none transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-background text-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",
        success: "border-success/20 bg-success/10 text-success",
        warning: "border-warning/20 bg-warning/10 text-warning",
        info: "border-info/20 bg-info/10 text-info",
        activity: "border-activity/20 bg-activity/10 text-activity",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = Omit<React.HTMLAttributes<HTMLSpanElement>, "className"> &
  VariantProps<typeof badgeVariants> & {
    className?: string;
    render?: React.ReactElement;
  };

export const Badge = React.forwardRef<HTMLElement, BadgeProps>(
  ({ className, variant, render, ...props }, ref) =>
    useRender({
      defaultTagName: "span",
      render,
      ref,
      props: {
        ...props,
        "data-slot": "badge",
        className: cn(badgeVariants({ variant }), className),
      },
    }),
);

Badge.displayName = "Badge";

export { badgeVariants };
