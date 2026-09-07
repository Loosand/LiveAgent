import type { WorkbenchRect } from "../../lib/workbench/geometry";

export type DockIntentOverlayProps = {
  /** Final rect the drop would produce, in canvas coordinates. */
  rect: WorkbenchRect;
  /** Action text, e.g. "Open on the right". */
  label?: string;
};

/**
 * Drop preview shown only while a workbench drag is active. Pure overlay:
 * never intercepts pointer events and never affects layout.
 */
export function DockIntentOverlay(props: DockIntentOverlayProps) {
  const { rect, label } = props;
  return (
    <div
      data-workbench-drop-preview=""
      aria-hidden="true"
      className="pointer-events-none absolute z-20 flex items-center justify-center rounded-lg border border-ring bg-primary/10 shadow-inset"
      style={{
        left: rect.left + 3,
        top: rect.top + 3,
        width: Math.max(0, rect.width - 6),
        height: Math.max(0, rect.height - 6),
      }}
    >
      {label ? (
        <span className="max-w-[80%] truncate rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground shadow-overlay">
          {label}
        </span>
      ) : null}
    </div>
  );
}
