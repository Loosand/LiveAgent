import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Register custom scales so role tokens replace built-in values, while keeping
// text sizes separate from colors and shadows separate from focus variants.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["2xs"],
      radius: ["item", "control", "panel", "overlay", "composer"],
      shadow: ["control", "overlay", "inset", "focus", "separator"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
