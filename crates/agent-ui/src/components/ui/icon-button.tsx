import type { ComponentProps } from "react";
import { Button } from "./button";

type IconButtonProps = Omit<ComponentProps<typeof Button>, "size" | "aria-label"> & {
  "aria-label": string;
  size?: "icon" | "icon-xs" | "icon-sm" | "icon-lg";
};

/** Require an accessible name at the call site, including translated labels. */
export function IconButton({ size = "icon-sm", variant = "ghost", ...props }: IconButtonProps) {
  return <Button size={size} variant={variant} {...props} />;
}
