import type { SettingsSectionProps } from "@liveagent/app/pages/settings/types";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Circle,
  Globe,
  MessageSquare,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Terminal,
  Trash2,
  Wrench,
  Zap,
} from "@liveagent/ui/components/IconSet";
import { useLocale } from "@liveagent/ui/i18n/index";
import {
  applyHookOps,
  HOOK_EVENT_DESCRIPTION_TRANSLATION_KEYS,
  HOOK_EVENT_TRANSLATION_KEYS,
  type HookDef,
  type HookEvent,
  type HookType,
  useAutomation,
} from "@liveagent/ui/lib/automation/index";
import { cn } from "@liveagent/ui/lib/shared/utils";
import { type ReactNode, useState } from "react";
import { Button } from "../../components/ui/button";
import { HookModal } from "./HookModal";
import { AgentActivationSwitch, ConfirmDeletePopover } from "./shared";

type LifecyclePhase = {
  key: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  icon: ReactNode;
};

type PhaseGroup = {
  phase: LifecyclePhase;
  items: { event: HookEvent; index: number }[];
};

/** Conversation-order event flow; the single source for the lifecycle rail. */
const EVENT_FLOW: { event: HookEvent; phaseKey: string }[] = [
  { event: "agent_start", phaseKey: "agent" },
  { event: "turn_start", phaseKey: "turn" },
  { event: "message_start", phaseKey: "message" },
  { event: "message_end", phaseKey: "message" },
  { event: "tool_execution_start", phaseKey: "tool" },
  { event: "tool_execution_end", phaseKey: "tool" },
  { event: "turn_end", phaseKey: "turn" },
  { event: "agent_end", phaseKey: "agent" },
];

function getHookEventLabel(t: (key: string) => string, event: HookEvent) {
  return t(HOOK_EVENT_TRANSLATION_KEYS[event]);
}

function getHookTypeTone(type: HookType) {
  return type === "command" ? "bg-info/10 text-info" : "bg-success/10 text-success";
}

export function HooksSection(_props: SettingsSectionProps) {
  const { t } = useLocale();
  const [activeEvent, setActiveEvent] = useState<HookEvent>(EVENT_FLOW[0].event);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHook, setEditingHook] = useState<HookDef | null>(null);
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  const { hooks: hooksSnapshot } = useAutomation();
  const hooks = hooksSnapshot.hooks;
  const activeHooks = hooks.filter((hook) => hook.event === activeEvent);
  const enabledCount = hooks.filter((hook) => hook.enabled).length;
  const disabledCount = hooks.length - enabledCount;

  const phasesByKey: Record<string, LifecyclePhase> = {
    agent: {
      key: "agent",
      label: t("settings.hooksPhaseAgent"),
      description: t("settings.hooksPhaseAgentDesc"),
      color: "text-activity",
      bgColor: "bg-activity/10",
      borderColor: "border-activity/20",
      dotColor: "bg-activity",
      icon: <Bot className="h-3.5 w-3.5" />,
    },
    turn: {
      key: "turn",
      label: t("settings.hooksPhaseTurn"),
      description: t("settings.hooksPhaseTurnDesc"),
      color: "text-info",
      bgColor: "bg-info/10",
      borderColor: "border-info/20",
      dotColor: "bg-info",
      icon: <RefreshCw className="h-3.5 w-3.5" />,
    },
    message: {
      key: "message",
      label: t("settings.hooksPhaseMessage"),
      description: t("settings.hooksPhaseMessageDesc"),
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/20",
      dotColor: "bg-success",
      icon: <MessageSquare className="h-3.5 w-3.5" />,
    },
    tool: {
      key: "tool",
      label: t("settings.hooksPhaseTool"),
      description: t("settings.hooksPhaseToolDesc"),
      color: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-warning/20",
      dotColor: "bg-warning",
      icon: <Wrench className="h-3.5 w-3.5" />,
    },
  };

  const orderedEvents = EVENT_FLOW.map(({ event, phaseKey }) => ({
    event,
    phase: phasesByKey[phaseKey],
  }));

  function togglePhase(key: string) {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function closeModal() {
    setModalOpen(false);
    setEditingHook(null);
  }

  function openAdd() {
    setEditingHook(null);
    setModalOpen(true);
  }

  function openEdit(hook: HookDef) {
    setEditingHook(hook);
    setActiveEvent(hook.event);
    setModalOpen(true);
  }

  function runOps(run: () => Promise<unknown>) {
    setActionError(null);
    void run().catch((error) => {
      setActionError(error instanceof Error ? error.message : String(error));
    });
  }

  async function handleSave(data: Omit<HookDef, "id">) {
    setActionError(null);
    if (editingHook) {
      await applyHookOps([{ op: "update", id: editingHook.id, patch: { ...data } }]);
    } else {
      await applyHookOps([{ op: "create", item: { ...data } }]);
    }
  }

  function toggleHook(hook: HookDef) {
    runOps(() => applyHookOps([{ op: "update", id: hook.id, patch: { enabled: !hook.enabled } }]));
  }

  function deleteHook(hookId: string) {
    runOps(() => applyHookOps([{ op: "delete", id: hookId }]));
  }

  const phaseGroups: PhaseGroup[] = [];
  let currentGroup: PhaseGroup | null = null;

  for (let index = 0; index < orderedEvents.length; index += 1) {
    const { event, phase } = orderedEvents[index];
    if (!currentGroup || currentGroup.phase.key !== phase.key) {
      currentGroup = { phase, items: [] };
      phaseGroups.push(currentGroup);
    }
    currentGroup.items.push({ event, index });
  }

  return (
    <div className="settings-hooks-section flex h-full flex-col gap-4">
      <div className="settings-section-hero shrink-0 flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="settings-section-title-group flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-warning/10 text-warning">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{t("settings.hooksTitle")}</h2>
            <p className="mt-0.5 text-base leading-relaxed text-muted-foreground">
              {t("settings.hooksDesc")}
            </p>
          </div>
        </div>
        <div className="settings-section-actions settings-hooks-stats flex flex-wrap items-center gap-3">
          <div className="settings-hooks-stat flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="settings-hooks-stat-label text-xs font-medium text-muted-foreground">
              {t("settings.hooksTotalHooks")}
            </span>
            <span className="settings-hooks-stat-value ml-0.5 text-base font-bold tabular-nums">
              {hooks.length}
            </span>
          </div>
          <div className="settings-hooks-stat flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span className="settings-hooks-stat-label text-xs font-medium text-success">
              {t("settings.hooksActiveHooks")}
            </span>
            <span className="settings-hooks-stat-value ml-0.5 text-base font-bold tabular-nums text-success">
              {enabledCount}
            </span>
          </div>
          {disabledCount > 0 ? (
            <div className="settings-hooks-stat flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <Circle className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="settings-hooks-stat-label text-xs font-medium text-muted-foreground">
                {t("settings.hooksInactiveHooks")}
              </span>
              <span className="settings-hooks-stat-value ml-0.5 text-base font-bold tabular-nums text-muted-foreground">
                {disabledCount}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {actionError ? (
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{actionError}</span>
        </div>
      ) : null}

      <div className="settings-hooks-grid grid min-h-0 flex-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="settings-hooks-lifecycle flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <div className="settings-hooks-lifecycle-header shrink-0 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Play className="h-4 w-4 text-muted-foreground" />
              {t("settings.hooksLifecycle")}
            </div>
          </div>
          <div className="settings-hooks-lifecycle-body min-h-0 flex-1 overflow-y-auto p-2">
            {phaseGroups.map((group, groupIndex) => {
              const phaseHookCount = group.items.reduce(
                (sum, { event }) => sum + hooks.filter((hook) => hook.event === event).length,
                0,
              );
              const groupKey = `${group.phase.key}-${groupIndex}`;
              const isCollapsed = collapsedPhases.has(groupKey);

              return (
                <div key={groupKey} className="settings-hooks-phase-group mb-1 last:mb-0">
                  <button
                    type="button"
                    onClick={() => togglePhase(groupKey)}
                    className={cn(
                      "settings-hooks-phase-button flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-muted/40",
                      group.phase.color,
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg",
                        group.phase.bgColor,
                      )}
                    >
                      {group.phase.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide">
                          {group.phase.label}
                        </span>
                        {phaseHookCount > 0 ? (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-2xs font-semibold leading-none",
                              group.phase.bgColor,
                            )}
                          >
                            {phaseHookCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform",
                        isCollapsed ? "-rotate-90" : "",
                      )}
                    />
                  </button>

                  {!isCollapsed ? (
                    <div className="settings-hooks-event-tree relative ml-3 mt-0.5">
                      <span
                        aria-hidden
                        className="settings-hooks-event-rail pointer-events-none absolute left-3 top-2 bottom-2 w-[2px] -translate-x-1/2 rounded-full bg-border/40"
                      />
                      <ul className="space-y-0.5">
                        {group.items.map(({ event }) => {
                          const eventHooks = hooks.filter((hook) => hook.event === event);
                          const selected = activeEvent === event;
                          const hasHooks = eventHooks.length > 0;

                          return (
                            <li key={event}>
                              <button
                                type="button"
                                onClick={() => setActiveEvent(event)}
                                className={cn(
                                  "settings-hooks-event-button group relative flex w-full items-center gap-2 rounded-lg py-2 pl-8 pr-2 text-left transition-all",
                                  selected ? "bg-primary/10 shadow-control" : "hover:bg-muted/40",
                                )}
                              >
                                <span
                                  aria-hidden
                                  className="settings-hooks-event-dot pointer-events-none absolute left-3 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2"
                                >
                                  {selected ? (
                                    <span
                                      aria-hidden
                                      className={cn(
                                        "settings-hooks-event-dot-halo absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full",
                                        group.phase.dotColor,
                                        "opacity-25",
                                      )}
                                    />
                                  ) : null}
                                  <span
                                    className={cn(
                                      "settings-hooks-event-dot-core relative block h-full w-full rounded-full ring-2 ring-card transition-all duration-200",
                                      selected
                                        ? group.phase.dotColor
                                        : hasHooks
                                          ? `${group.phase.dotColor} opacity-80`
                                          : "border border-border bg-card",
                                    )}
                                  />
                                </span>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "settings-hooks-event-label text-xs font-medium transition-colors",
                                        selected
                                          ? "text-foreground"
                                          : "text-muted-foreground group-hover:text-foreground",
                                      )}
                                    >
                                      {getHookEventLabel(t, event)}
                                    </span>
                                    {hasHooks ? (
                                      <span
                                        className={cn(
                                          "rounded-full px-2 py-0.5 text-2xs font-semibold leading-none",
                                          selected
                                            ? "bg-primary/20 text-primary"
                                            : "bg-muted/60 text-muted-foreground",
                                        )}
                                      >
                                        {eventHooks.length}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="settings-hooks-detail flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <div className="settings-hooks-detail-header shrink-0 border-b border-border px-4 py-4">
            <div className="settings-section-heading-row settings-hooks-detail-heading flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="settings-section-title-group flex items-center gap-3">
                {(() => {
                  const phase = orderedEvents.find((item) => item.event === activeEvent)?.phase;
                  if (!phase) return null;
                  return (
                    <div
                      className={cn(
                        "settings-hooks-detail-icon flex h-9 w-9 items-center justify-center rounded-2xl",
                        phase.bgColor,
                        phase.color,
                      )}
                    >
                      {phase.icon}
                    </div>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="settings-hooks-detail-title text-base font-semibold">
                      {getHookEventLabel(t, activeEvent)}
                    </h3>
                  </div>
                  <p className="settings-hooks-detail-desc mt-0.5 text-base text-muted-foreground">
                    {t(HOOK_EVENT_DESCRIPTION_TRANSLATION_KEYS[activeEvent])}
                  </p>
                </div>
              </div>
              {activeHooks.length > 0 ? (
                <Button
                  className="settings-section-action settings-hooks-detail-add gap-2 self-start"
                  onClick={openAdd}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("settings.hooksAdd")}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="settings-hooks-detail-body min-h-0 flex-1 overflow-y-auto p-4">
            {activeHooks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/5 px-6 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40">
                  <Zap className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <div className="mt-4 text-base font-medium">{t("settings.hooksEmptyTitle")}</div>
                <p className="mx-auto mt-2 max-w-sm text-base leading-relaxed text-muted-foreground">
                  {t("settings.hooksEmptyDesc")}
                </p>
                <Button className="mt-4 gap-2" size="sm" onClick={openAdd}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("settings.hooksAdd")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeHooks.map((hook) => {
                  const stepCount =
                    hook.type === "command"
                      ? (hook.script ?? "").split(/\r?\n/).filter((line) => line.trim()).length
                      : (hook.requests?.length ?? 0);
                  return (
                    <div
                      key={hook.id}
                      className={cn(
                        "settings-hooks-card group rounded-2xl border bg-background/80 p-4 transition-all hover:shadow-control",
                        hook.enabled
                          ? "border-border hover:border-input"
                          : "border-border opacity-60",
                      )}
                    >
                      <div className="settings-card-row settings-hooks-card-row flex items-start gap-3">
                        <div
                          className={cn(
                            "settings-hooks-card-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                            getHookTypeTone(hook.type),
                          )}
                        >
                          {hook.type === "command" ? (
                            <Terminal className="h-4.5 w-4.5" />
                          ) : (
                            <Globe className="h-4.5 w-4.5" />
                          )}
                        </div>

                        <div className="settings-hooks-card-main min-w-0 flex-1">
                          <div className="settings-hooks-card-meta flex flex-wrap items-center gap-2">
                            <span className="settings-hooks-card-name truncate text-base font-semibold">
                              {hook.name}
                            </span>
                            <span className="settings-hooks-card-badge rounded-lg bg-muted/60 px-2 py-0.5 text-2xs font-medium tabular-nums text-muted-foreground">
                              {stepCount}{" "}
                              {hook.type === "command"
                                ? t("settings.hooksScriptLinesCount")
                                : t("settings.hooksRequestsCount")}
                            </span>
                          </div>
                          <p className="settings-hooks-card-desc mt-1 text-base leading-relaxed text-muted-foreground">
                            {hook.description || t("settings.hooksNoDescription")}
                          </p>
                        </div>

                        <div className="settings-card-actions settings-hooks-card-actions flex shrink-0 items-center gap-2">
                          <AgentActivationSwitch
                            checked={hook.enabled}
                            title={hook.enabled ? t("settings.disable") : t("settings.enable")}
                            onToggle={() => toggleHook(hook)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title={t("settings.edit")}
                            onClick={() => openEdit(hook)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <ConfirmDeletePopover
                            name={hook.name}
                            onConfirm={() => deleteHook(hook.id)}
                          >
                            {(open) => (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                title={t("settings.delete")}
                                onClick={open}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </ConfirmDeletePopover>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {modalOpen ? (
        <HookModal
          event={editingHook?.event ?? activeEvent}
          initialData={editingHook ?? undefined}
          onSave={handleSave}
          onClose={closeModal}
        />
      ) : null}
    </div>
  );
}
