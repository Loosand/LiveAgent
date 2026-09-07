import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/shared/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control text-xs font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        success: "bg-success text-success-foreground hover:bg-success/90",
        info: "bg-info text-info-foreground hover:bg-info/90 active:bg-info/80",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-6 px-2",
        sm: "h-8 px-3",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
        "icon-xs": "size-6",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
    /** Base UI composition: replace the host element. */
    render?:
      | React.ReactElement
      | ((
          props: React.HTMLAttributes<HTMLElement>,
          state: Record<string, unknown>,
        ) => React.ReactElement);
  };

export const Button = React.forwardRef<HTMLElement, ButtonProps>(
  ({ className, variant, size, render, type = "button", ...props }, ref) => {
    return useRender({
      defaultTagName: "button",
      render,
      ref,
      props: {
        type: render ? undefined : type,
        "data-slot": "button",
        ...props,
        className: cn(buttonVariants({ variant, size }), className),
      },
    });
  },
);

Button.displayName = "Button";

export { buttonVariants };
