import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/shared/utils";

type EmptyProps = Omit<ComponentProps<"div">, "title"> & {
  icon?: ReactNode;
  title: string;
  description?: string;
};

/** Actions are children so the caller owns labels and behavior. */
export function Empty({ icon, title, description, children, className, ...props }: EmptyProps) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-8 text-center",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div aria-hidden="true" className="text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">{title}</p>
        {description ? (
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
