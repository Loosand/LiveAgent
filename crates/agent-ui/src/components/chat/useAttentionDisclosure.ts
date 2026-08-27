import { useEffect, useState } from "react";

/**
 * Keeps disclosure ownership with the user, except when a new blocking
 * interaction appears. Attention opens the disclosure once; it never closes
 * it on completion and does not fight a manual collapse while still pending.
 */
export function useAttentionDisclosure(attentionRequired: boolean) {
  const [open, setOpen] = useState(attentionRequired);

  useEffect(() => {
    if (attentionRequired) setOpen(true);
  }, [attentionRequired]);

  return [open, setOpen] as const;
}
