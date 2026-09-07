import type { ReactNode } from "react";

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2" data-slot="settings-group">
      <h2 className="px-1 text-base font-semibold text-foreground">{title}</h2>
      <div className="overflow-hidden rounded-panel bg-card">{children}</div>
    </section>
  );
}

export function SettingsRow({
  title,
  description,
  control,
}: {
  title: string;
  description?: string;
  control: ReactNode;
}) {
  return (
    <div
      data-slot="settings-row"
      className="flex min-h-18 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1 pr-2">
        <div className="text-base font-medium text-foreground">{title}</div>
        {description ? (
          <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex w-full items-center sm:w-auto sm:shrink-0 sm:justify-end">{control}</div>
    </div>
  );
}
