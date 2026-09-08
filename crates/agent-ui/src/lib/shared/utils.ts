import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const isSizeToken = (value: string) =>
  /^(?:scaled-|minus-)?\d+(?:p\d+)?(?:px|rem|em|ch|d?vh|vw)?$/.test(value);
const isNamedToken = (value: string) => !value.startsWith("[") && !value.startsWith("(");

// Teach the class merger about the additional @theme names. In particular,
// text-14px must remain a font size when paired with a text-color utility.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [isSizeToken],
      spacing: [isNamedToken],
      "font-weight": [isSizeToken],
      animate: [isNamedToken],
      ease: [isNamedToken],
      leading: [isSizeToken],
      radius: [isSizeToken, "half"],
      tracking: [isSizeToken],
      blur: [isSizeToken],
      shadow: [(value: string) => /^(?:ui-|gateway-|chat-|status-board-|login-)/.test(value)],
      "drop-shadow": ["sync-loading-logo"],
    },
    classGroups: {
      "ring-w": [{ ring: [isSizeToken] }],
      "bg-image": [
        { bg: [(value: string) => /^(?:surface-glow-|trajectory-|diff-deleted$)/.test(value)] },
      ],
      "vertical-align": ["align-minus-0p05em"],
      "grid-cols": [{ "grid-cols": [isNamedToken] }],
      "grid-rows": [{ "grid-rows": [isNamedToken] }],
      duration: [{ duration: [(value: string) => /^\d+ms$/.test(value)] }],
      "underline-offset": [{ "underline-offset": [isSizeToken] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
