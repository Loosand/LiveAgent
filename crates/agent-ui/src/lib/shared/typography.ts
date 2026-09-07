/** Resolve CSS typography for renderers whose API requires a pixel number. */
export function readUiFontSize(container: HTMLElement): number {
  const probe = container.ownerDocument.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;font-size:var(--text-xs)";
  container.append(probe);
  const size = Number.parseFloat(getComputedStyle(probe).fontSize);
  probe.remove();
  // Non-layout environments cannot resolve CSS variables; use the same 12px tier.
  return Number.isFinite(size) && size > 0 ? size : 12;
}
