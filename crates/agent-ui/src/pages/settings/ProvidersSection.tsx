import {
  ProviderCopyConfigButton,
  ProviderSettingsExtension,
} from "@liveagent/adapters/providerSettings";
import {
  getProviderUsageCardDisplay,
  type ProviderUsageState,
  useProviderUsage,
  useUsageNowTicker,
} from "@liveagent/app/lib/providers/usageQuery";
import {
  type CustomProvider,
  hasProviderFailoverConfiguration,
  MODEL_FAILOVER_QUEUE_LIMIT,
  type ProviderFailoverSettings,
  type ProviderId,
  type SelectedModel,
  updateCustomProviders,
  updateCustomSettings,
  updateModelFailover,
} from "@liveagent/app/lib/settings";
import type { SettingsSectionProps } from "@liveagent/app/pages/settings/types";
import {
  Activity,
  ChevronDown,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Trash2,
  WandSparkles,
  Waypoints,
  X,
} from "@liveagent/ui/components/IconSet";
import { Button } from "@liveagent/ui/components/ui/button";
import { NumberInput } from "@liveagent/ui/components/ui/number-input";
import { SegmentedSlider } from "@liveagent/ui/components/ui/segmented-slider";
import { Sheet, SheetContent, SheetTitle } from "@liveagent/ui/components/ui/sheet";
import { Switch } from "@liveagent/ui/components/ui/switch";
import { useVerticalListReorder } from "@liveagent/ui/components/ui/useVerticalListReorder";
import { useLocale } from "@liveagent/ui/i18n/index";
import { buildModelOptions } from "@liveagent/ui/lib/models/modelOptions";
import { parseModelValue, toModelValue } from "@liveagent/ui/lib/models/modelValue";
import { createUuid } from "@liveagent/ui/lib/shared/id";
import { cn } from "@liveagent/ui/lib/shared/utils";
import { ModelPicker, type ModelPickerOption } from "@liveagent/ui/pages/settings/modelPicker";
import { ConfirmDeletePopover } from "@liveagent/ui/pages/settings/shared";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ProviderEditor } from "./ProviderModal";
import {
  DrawerFieldLabel,
  DrawerGroupLabel,
  DrawerSectionHeader,
  getProviderLabel,
  PROVIDER_TABS,
  ProviderBrandIcon,
  UsagePlanLine,
  usageRelativeTimeText,
} from "./ProviderPresentation";
import { isProviderConnectionEnabled, providerMatchesQuery } from "./providerWorkspace";
import { RetryErrorSection } from "./RetryErrorSection";

function FailoverNumberField(props: {
  label: string;
  ariaLabel: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}) {
  const { label, ariaLabel, hint, value, min, max, onCommit } = props;
  const [draft, setDraft] = useState<number | null>(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commitDraft(nextValue: number | null) {
    const next = nextValue ?? value;
    setDraft(next);
    if (next !== value) onCommit(next);
  }

  return (
    <div className="space-y-1.5">
      <DrawerFieldLabel label={label} hint={hint} />
      <NumberInput
        aria-label={ariaLabel}
        incrementLabel={`${ariaLabel} +`}
        decrementLabel={`${ariaLabel} -`}
        min={min}
        max={max}
        step={1}
        snapOnStep
        value={draft}
        onValueChange={setDraft}
        onValueCommitted={commitDraft}
        className="h-8 rounded-lg"
        inputClassName="px-2 py-1 text-[12.5px]"
      />
    </div>
  );
}

function FailoverSettingsCard(props: SettingsSectionProps & { providerType: ProviderId }) {
  const { settings, setSettings, providerType } = props;
  const { t } = useLocale();
  const failover = settings.modelFailover[providerType];
  const vendorLabel = getProviderLabel(providerType);
  // Same-vendor guard: only providers of this tab's vendor type are offered,
  // so a Claude queue can never contain a Codex provider (and vice versa).
  // Failover keeps the conversation's model and only switches which provider
  // serves it, so the queue holds providers, not models.
  const vendorProviders = useMemo(
    () => settings.customProviders.filter((provider) => provider.type === providerType),
    [settings.customProviders, providerType],
  );

  const queueValues = useMemo(() => new Set(failover.queue), [failover.queue]);
  const addableProviders = useMemo(
    () =>
      vendorProviders.filter(
        (provider) => !queueValues.has(provider.id) && hasProviderFailoverConfiguration(provider),
      ),
    [vendorProviders, queueValues],
  );
  const unavailableProviderCount = useMemo(
    () =>
      vendorProviders.filter(
        (provider) => !queueValues.has(provider.id) && !hasProviderFailoverConfiguration(provider),
      ).length,
    [vendorProviders, queueValues],
  );
  const unavailableQueuedProviderCount = useMemo(
    () =>
      failover.queue.filter((providerId) => {
        const provider = settings.customProviders.find((item) => item.id === providerId);
        return provider ? !hasProviderFailoverConfiguration(provider) : false;
      }).length,
    [failover.queue, settings.customProviders],
  );
  const addableProviderOptions = useMemo<ModelPickerOption[]>(
    () =>
      addableProviders.map((provider) => ({
        value: provider.id,
        label: provider.name,
        description: provider.baseUrl,
        // Keep all queue entries under the current vendor group, matching the
        // grouping used by the title/commit model picker.
        providerId: providerType,
        providerName: vendorLabel,
        providerType,
      })),
    [addableProviders, providerType, vendorLabel],
  );

  function patchFailover(patch: Partial<ProviderFailoverSettings>) {
    setSettings((prev) => updateModelFailover(prev, providerType, patch));
  }

  function queueEntryLabel(providerId: string) {
    const provider = settings.customProviders.find((item) => item.id === providerId);
    return provider?.name ?? providerId;
  }

  function queueEntryDetail(providerId: string) {
    const provider = settings.customProviders.find((item) => item.id === providerId);
    return provider?.baseUrl ?? "";
  }

  function addQueueEntry(providerId: string) {
    if (!providerId || queueValues.has(providerId)) return;
    patchFailover({ queue: [...failover.queue, providerId] });
  }

  function removeQueueEntry(index: number) {
    patchFailover({ queue: failover.queue.filter((_, i) => i !== index) });
  }

  // Queue priority is reordered by dragging (or arrow keys on the focused
  // handle) instead of per-row up/down buttons.
  const {
    draggingItemId: draggingQueueId,
    getItemProps: getQueueReorderProps,
    renderDragHandle: renderQueueDragHandle,
    scrollContainerRef: queueListRef,
  } = useVerticalListReorder({
    itemIds: failover.queue,
    canReorder: true,
    reorderLabel: t("settings.reorderProvider"),
    reorderHint: t("settings.reorderVerticalHint"),
    disabledHint: t("settings.reorderNeedsTwoItems"),
    onReorder: (nextIds) => patchFailover({ queue: nextIds }),
  });

  return (
    <section className="py-5">
      <DrawerSectionHeader
        icon={<Shield className="h-3.5 w-3.5" />}
        title={t("settings.failoverTitle")}
        hint={t("settings.failoverToggleHint").replaceAll("{vendor}", vendorLabel)}
        badge={
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[10.5px] font-medium text-foreground/60">
            <ProviderBrandIcon type={providerType} />
            {vendorLabel}
          </span>
        }
        action={
          <Switch
            tone="success"
            checked={failover.enabled}
            onCheckedChange={(checked) => patchFailover({ enabled: checked === true })}
            aria-label={t("settings.failoverTitle")}
          />
        }
      />

      {/* 开关直接控制配置区的展开/收起：关闭时抽屉只留一行分区头。 */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        style={{ gridTemplateRows: failover.enabled ? "1fr" : "0fr" }}
      >
        <div
          className="min-h-0 overflow-hidden"
          inert={!failover.enabled}
          aria-hidden={!failover.enabled}
        >
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <DrawerGroupLabel
                label={t("settings.failoverQueueTitle")}
                hint={t("settings.failoverQueueHint").replaceAll("{vendor}", vendorLabel)}
              />
              {failover.queue.length > 0 ? (
                <div ref={queueListRef} className="space-y-1.5">
                  {failover.queue.map((entry, index) => (
                    <div
                      key={entry}
                      {...getQueueReorderProps(entry)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border border-foreground/[0.06] bg-background/60 py-1.5 pl-1 pr-1.5 transition-colors",
                        draggingQueueId === entry
                          ? "border-foreground/[0.14] bg-accent shadow-lg"
                          : "hover:border-foreground/[0.12]",
                      )}
                    >
                      {renderQueueDragHandle(entry, queueEntryLabel(entry))}
                      <span className="flex h-5 w-6 shrink-0 items-center justify-center rounded-md bg-foreground/[0.05] font-mono text-[10px] font-semibold text-foreground/55">
                        P{index + 1}
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-[12.5px] font-medium text-foreground/90">
                          {queueEntryLabel(entry)}
                        </span>
                        {queueEntryDetail(entry) ? (
                          <span className="block truncate text-[10.5px] text-muted-foreground/70">
                            {queueEntryDetail(entry)}
                          </span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeQueueEntry(index)}
                        title={t("settings.failoverQueueRemove")}
                        aria-label={`${t("settings.failoverQueueRemove")} ${queueEntryLabel(entry)}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                  {t("settings.failoverQueueEmpty")}
                </div>
              )}
              {failover.queue.length < MODEL_FAILOVER_QUEUE_LIMIT && addableProviders.length > 0 ? (
                <ModelPicker
                  options={addableProviderOptions}
                  value=""
                  onChange={addQueueEntry}
                  placeholder={t("settings.failoverQueueAdd")}
                  ariaLabel={t("settings.failoverQueueAdd")}
                  collapsibleGroups={false}
                  searchPlaceholder={t("settings.failoverQueueSearch")}
                  emptyLabel={t("settings.failoverQueueNoMatch")}
                  triggerClassName="h-8 rounded-lg border-dashed border-foreground/[0.13] bg-transparent py-0 text-xs text-muted-foreground shadow-none transition-colors hover:border-foreground/[0.24] hover:bg-foreground/[0.02]"
                />
              ) : null}
              {unavailableProviderCount > 0 ? (
                <p className="text-[10.5px] leading-relaxed text-amber-700/90 dark:text-amber-300/90">
                  {t("settings.failoverQueueUnavailableCandidates").replace(
                    "{count}",
                    String(unavailableProviderCount),
                  )}
                </p>
              ) : null}
              {unavailableQueuedProviderCount > 0 ? (
                <p className="text-[10.5px] leading-relaxed text-amber-700/90 dark:text-amber-300/90">
                  {t("settings.failoverQueueUnavailableExisting").replace(
                    "{count}",
                    String(unavailableQueuedProviderCount),
                  )}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <DrawerGroupLabel label={t("settings.failoverParamsTitle")} />
              <div className="grid grid-cols-3 gap-2">
                <FailoverNumberField
                  label={t("settings.failoverMaxSwitchesShort")}
                  ariaLabel={t("settings.failoverMaxSwitches")}
                  hint={t("settings.failoverMaxSwitchesHint")}
                  value={failover.maxSwitches}
                  min={1}
                  max={10}
                  onCommit={(value) => patchFailover({ maxSwitches: value })}
                />
                <FailoverNumberField
                  label={t("settings.failoverFailureThresholdShort")}
                  ariaLabel={t("settings.failoverFailureThreshold")}
                  hint={t("settings.failoverFailureThresholdHint")}
                  value={failover.failureThreshold}
                  min={1}
                  max={10}
                  onCommit={(value) => patchFailover({ failureThreshold: value })}
                />
                <FailoverNumberField
                  label={t("settings.failoverCooldownSecondsShort")}
                  ariaLabel={t("settings.failoverCooldownSeconds")}
                  hint={t("settings.failoverCooldownSecondsHint")}
                  value={failover.cooldownSeconds}
                  min={5}
                  max={3600}
                  onCommit={(value) => patchFailover({ cooldownSeconds: value })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CustomSettingsModelField(props: {
  label: string;
  hint: string;
  followCurrentLabel: string;
  selected: SelectedModel | undefined;
  modelOptions: ModelPickerOption[];
  onChange: (value: string) => void;
}) {
  const { label, hint, followCurrentLabel, selected, modelOptions, onChange } = props;
  const selectedValue = selected ? toModelValue(selected.customProviderId, selected.model) : "";
  // A stored model that is no longer among the active options still shows as
  // selected (same fallback-entry approach as the cron prompt form).
  const options =
    selected && !modelOptions.some((option) => option.value === selectedValue)
      ? [
          ...modelOptions,
          {
            value: selectedValue,
            label: selected.model,
            providerName: selected.customProviderId,
          },
        ]
      : modelOptions;

  return (
    <div className="space-y-1.5">
      <DrawerFieldLabel label={label} hint={hint} />
      <ModelPicker
        options={options}
        value={selectedValue}
        onChange={onChange}
        placeholder={followCurrentLabel}
        noneLabel={followCurrentLabel}
        ariaLabel={label}
        triggerClassName="h-9 rounded-lg border-foreground/10 bg-white/70 text-[13px] shadow-sm dark:bg-background/40"
      />
    </div>
  );
}

function CustomSettingsDrawer(
  props: SettingsSectionProps & { providerType: ProviderId; onClose: () => void },
) {
  const { settings, setSettings, providerType, onClose } = props;
  const { t } = useLocale();
  const modelOptions = useMemo(() => buildModelOptions(settings), [settings]);
  // 上下文占用展示三档的动态描述：只解释当前选中档，取代原先罗列三档的长段落。
  const contextDisplayModeDesc = {
    statsBar: t("settings.composerContextDisplayStatsBarDesc"),
    both: t("settings.composerContextDisplayBothDesc"),
    ring: t("settings.composerContextDisplayRingDesc"),
  } as const;

  function handleModelSettingChange(
    key: "conversationTitleModel" | "commitMessageModel",
    value: string,
  ) {
    // "" comes from the picker's follow-current entry and parses to undefined.
    setSettings((prev) =>
      updateCustomSettings(prev, {
        [key]: parseModelValue(value) ?? undefined,
      }),
    );
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        variant="inset"
        className="settings-provider-custom-sheet max-w-none border-border bg-background sm:max-w-[440px]"
        closeLabel={t("settings.closeCustomSettings")}
        showCloseButton={false}
      >
        <div className="settings-provider-custom-sheet-header relative flex items-center gap-3 px-6 pb-4 pt-[22px]">
          <SheetTitle className="min-w-0 flex-1 text-[17px] leading-tight tracking-tight text-foreground/95">
            {t("settings.customSettings")}
          </SheetTitle>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground/80 transition-colors hover:bg-foreground/[0.12] hover:text-foreground"
            title={t("settings.closeCustomSettings")}
            aria-label={t("settings.closeCustomSettings")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div
          aria-hidden="true"
          className="relative mx-6 h-px bg-gradient-to-r from-transparent via-foreground/[0.08] to-transparent"
        />

        <div className="settings-provider-custom-sheet-body relative min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <div className="divide-y divide-foreground/[0.06]">
            <section className="py-5 first:pt-4">
              <DrawerSectionHeader
                icon={<WandSparkles className="h-3.5 w-3.5" />}
                title={t("settings.customSettingsModelsTitle")}
              />
              <div className="mt-3.5 space-y-3">
                <CustomSettingsModelField
                  label={t("settings.conversationTitleModel")}
                  hint={t("settings.conversationTitleModelHint")}
                  followCurrentLabel={t("settings.conversationTitleModelFollowCurrent")}
                  selected={settings.customSettings.conversationTitleModel}
                  modelOptions={modelOptions}
                  onChange={(value) => handleModelSettingChange("conversationTitleModel", value)}
                />
                <CustomSettingsModelField
                  label={t("settings.commitMessageModel")}
                  hint={t("settings.commitMessageModelHint")}
                  followCurrentLabel={t("settings.conversationTitleModelFollowCurrent")}
                  selected={settings.customSettings.commitMessageModel}
                  modelOptions={modelOptions}
                  onChange={(value) => handleModelSettingChange("commitMessageModel", value)}
                />
                {modelOptions.length === 0 ? (
                  <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                    {t("settings.customSettingsModelEmpty")}
                  </div>
                ) : null}
              </div>
            </section>
            {/* Composer 上下文占用展示样式（三档滑块，docs/design/composer-context-stats-bar.md §4.7）：
                从左到右 状态栏 / 都显示 / 用量环，对应 statsBar / both / ring。
                通用说明收进分区头的提示气泡，滑块下方只保留当前档位的一行动态描述。 */}
            <section className="py-5">
              <DrawerSectionHeader
                icon={<Activity className="h-3.5 w-3.5" />}
                title={t("settings.composerContextDisplay")}
                hint={t("settings.composerContextDisplayHint")}
              />
              <div className="mt-3.5 space-y-2">
                <SegmentedSlider
                  aria-label={t("settings.composerContextDisplay")}
                  className="w-full"
                  value={settings.customSettings.composerContextDisplay}
                  options={[
                    { value: "statsBar", label: t("settings.composerContextDisplayStatsBar") },
                    { value: "both", label: t("settings.composerContextDisplayBoth") },
                    { value: "ring", label: t("settings.composerContextDisplayRing") },
                  ]}
                  onValueChange={(mode) =>
                    setSettings((prev) =>
                      updateCustomSettings(prev, { composerContextDisplay: mode }),
                    )
                  }
                />
                <p className="text-[11px] leading-relaxed text-muted-foreground/70">
                  {contextDisplayModeDesc[settings.customSettings.composerContextDisplay]}
                </p>
              </div>
            </section>
            <FailoverSettingsCard
              settings={settings}
              setSettings={setSettings}
              providerType={providerType}
            />
            <RetryErrorSection settings={settings} setSettings={setSettings} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const PROVIDER_ACTION_CLASS =
  "h-8 min-w-0 gap-1.5 rounded-md px-3 text-[12px] font-medium shadow-none";

const PROVIDER_CARD_GRID_CLASS =
  "grid grid-cols-1 gap-3 min-[1280px]:grid-cols-2 min-[1480px]:grid-cols-3";

const PROVIDER_PROTOCOL_LABELS: Record<ProviderId, string> = {
  claude_code: "Anthropic Messages",
  codex: "OpenAI Responses",
  gemini: "Gemini API",
  xai: "xAI API",
  deepseek: "DeepSeek API",
};

function ProviderMark({ type, compact = false }: { type: ProviderId; compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center border border-border bg-muted text-foreground",
        compact ? "size-8 rounded-md text-[18px]" : "size-11 rounded-lg text-[24px]",
      )}
    >
      <ProviderBrandIcon type={type} />
    </span>
  );
}

function ProviderStateDot({ enabled }: { enabled: boolean }) {
  const { t } = useLocale();
  return (
    <span
      className="inline-flex size-5 shrink-0 items-center justify-center"
      title={enabled ? t("settings.providerEnabledGroup") : t("settings.providerInactiveGroup")}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          enabled
            ? "bg-emerald-500 shadow-[0_0_0_3px_rgb(16_185_129/0.12)]"
            : "bg-muted-foreground/25",
        )}
      />
      <span className="sr-only">
        {enabled ? t("settings.providerEnabledGroup") : t("settings.providerInactiveGroup")}
      </span>
    </span>
  );
}

function ProviderActionGroup(props: {
  activeTab: ProviderId;
  settings: SettingsSectionProps["settings"];
  setSettings: SettingsSectionProps["setSettings"];
  customSettingsOpen: boolean;
  onAdd: () => void;
  onOpenCustomSettings: () => void;
}) {
  const { t } = useLocale();
  const { activeTab, settings, setSettings, customSettingsOpen, onAdd, onOpenCustomSettings } =
    props;

  return (
    <fieldset
      className="settings-provider-overview-actions flex min-w-0 flex-wrap items-center justify-end gap-2 border-0 p-0"
      aria-label={t("settings.providerActionGroup")}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={PROVIDER_ACTION_CLASS}
        onClick={onAdd}
        title={t("settings.addProvider")}
        aria-label={t("settings.addProvider")}
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="settings-provider-action-label">
          {t("settings.addProviderShort")} {getProviderLabel(activeTab)}
        </span>
      </Button>
      <ProviderSettingsExtension
        activeTab={activeTab}
        settings={settings}
        setSettings={setSettings}
        triggerClassName={PROVIDER_ACTION_CLASS}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(PROVIDER_ACTION_CLASS, customSettingsOpen && "bg-accent text-foreground")}
        onClick={onOpenCustomSettings}
        title={t("settings.openCustomSettings")}
        aria-label={t("settings.openCustomSettings")}
      >
        <Settings className="h-3.5 w-3.5" />
        <span className="settings-provider-action-label">
          {t("settings.providerActionSettings")}
        </span>
      </Button>
    </fieldset>
  );
}

function ProviderDirectory(props: {
  providers: CustomProvider[];
  selectedProviderId: string | null;
  showingOverview: boolean;
  onSelectOverview: () => void;
  onSelectProvider: (provider: CustomProvider) => void;
  onAddProvider: (type: ProviderId) => void;
}) {
  const {
    providers,
    selectedProviderId,
    showingOverview,
    onSelectOverview,
    onSelectProvider,
    onAddProvider,
  } = props;
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const providerGroups = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLocaleLowerCase();
    return PROVIDER_TABS.flatMap((type) => {
      const vendorLabel = getProviderLabel(type);
      const vendorMatches = `${vendorLabel} ${PROVIDER_PROTOCOL_LABELS[type]}`
        .toLocaleLowerCase()
        .includes(normalizedQuery);
      const vendorProviders = providers.filter((provider) => provider.type === type);
      const matchingProviders =
        !normalizedQuery || vendorMatches
          ? vendorProviders
          : vendorProviders.filter((provider) =>
              providerMatchesQuery(provider, normalizedQuery, vendorLabel),
            );

      if (normalizedQuery && !vendorMatches && matchingProviders.length === 0) return [];
      return [{ type, providers: matchingProviders }];
    });
  }, [deferredQuery, providers]);

  const renderProviders = (items: CustomProvider[]) => (
    <div className="space-y-0.5">
      {items.map((provider) => {
        const enabled = isProviderConnectionEnabled(provider);
        const active = selectedProviderId === provider.id;
        return (
          <button
            key={provider.id}
            type="button"
            aria-current={active ? "page" : undefined}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
            data-active={active || undefined}
            onClick={() => onSelectProvider(provider)}
          >
            <ProviderMark type={provider.type} compact />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{provider.name}</span>
              <span className="block truncate font-mono text-[10px] text-muted-foreground">
                {PROVIDER_PROTOCOL_LABELS[provider.type]}
              </span>
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                enabled ? "bg-emerald-500" : "bg-muted-foreground/25",
              )}
            />
            <span className="sr-only">
              {enabled ? t("settings.providerEnabledGroup") : t("settings.providerInactiveGroup")}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <aside className="settings-provider-directory flex min-h-0 flex-col border-b border-border bg-muted/20 min-[900px]:border-b-0 min-[900px]:border-r">
      <header className="shrink-0 border-b border-border px-3 pb-3 pt-4">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {t("settings.providerDirectoryEyebrow")}
            </p>
            <h1 className="mt-1 text-[15px] font-medium">{t("settings.navProviders")}</h1>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{providers.length}</span>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            className="h-8 w-full rounded-md border border-transparent bg-background/85 pl-8 pr-2.5 text-[12px] outline-none placeholder:text-muted-foreground focus:border-border focus:ring-2 focus:ring-foreground/5"
            placeholder={t("settings.providerSearchPlaceholder")}
            aria-label={t("settings.providerSearchPlaceholder")}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </div>
      </header>

      <nav className="min-h-0 flex-1 overflow-y-auto p-2" aria-label={t("settings.navProviders")}>
        <button
          type="button"
          aria-current={showingOverview ? "page" : undefined}
          className="mb-2 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          data-active={showingOverview || undefined}
          onClick={onSelectOverview}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
            <List className="size-4" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
            {t("settings.providerAllConnections")}
          </span>
          <span className="text-[10px] tabular-nums text-muted-foreground">{providers.length}</span>
        </button>

        {providerGroups.map(({ type, providers: groupProviders }, groupIndex) => {
          const vendorLabel = getProviderLabel(type);
          const groupId = `provider-directory-${type}`;
          return (
            <section
              key={type}
              className={cn("border-t border-border/70 pt-3", groupIndex === 0 ? "mt-2" : "mt-3")}
              aria-labelledby={groupId}
            >
              <div className="flex items-center justify-between gap-2 px-2 pb-1.5">
                <h2
                  id={groupId}
                  className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
                >
                  {vendorLabel}
                </h2>
                {groupProviders.length > 0 ? (
                  <span className="text-[10px] tabular-nums text-muted-foreground/70">
                    {groupProviders.length}
                  </span>
                ) : null}
              </div>
              {groupProviders.length > 0 ? renderProviders(groupProviders) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-0.5 w-full justify-start gap-2 px-2 text-[11px] text-muted-foreground"
                onClick={() => onAddProvider(type)}
              >
                <Plus className="size-3.5" />
                {t("settings.providerAddVendorConnection").replace("{vendor}", vendorLabel)}
              </Button>
            </section>
          );
        })}

        {providerGroups.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] font-medium">{t("settings.providerNoMatches")}</p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {t("settings.providerNoMatchesHint")}
            </p>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}

function ProviderOverviewCard(props: {
  provider: CustomProvider;
  usageDisplay: ReturnType<typeof getProviderUsageCardDisplay>;
  refreshing: boolean;
  usageExpanded: boolean;
  onToggleUsageExpanded: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefreshUsage: () => void;
}) {
  const { t } = useLocale();
  const {
    provider,
    usageDisplay,
    refreshing,
    usageExpanded,
    onToggleUsageExpanded,
    onEdit,
    onDelete,
    onRefreshUsage,
  } = props;
  const [firstUsagePlan, ...extraUsagePlans] = usageDisplay.plans;
  const enabled = isProviderConnectionEnabled(provider);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the named header button provides the same keyboard action; this handler only extends the mouse hit area around non-interactive card content.
    <article
      className="settings-provider-overview-card group flex min-h-40 min-w-0 cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-card transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-sm"
      onClick={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest("button, a, input, select, textarea, [role='button']")
        ) {
          return;
        }
        onEdit();
      }}
    >
      <div className="min-w-0 flex-1 p-4">
        <button
          type="button"
          className="flex w-full min-w-0 items-start gap-3 text-left"
          onClick={onEdit}
        >
          <ProviderMark type={provider.type} compact />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[14px] font-medium">{provider.name}</span>
              {provider.useSystemProxy ? (
                <span
                  className="shrink-0 text-blue-500 dark:text-blue-400"
                  title={t("settings.providerUseSystemProxy")}
                >
                  <Waypoints className="size-3" />
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
              {getProviderLabel(provider.type)} · {PROVIDER_PROTOCOL_LABELS[provider.type]}
            </span>
          </span>
          <ProviderStateDot enabled={enabled} />
        </button>
        <p className="mt-3 truncate font-mono text-[10.5px] text-muted-foreground">
          {provider.baseUrl || t("settings.noBaseUrl")}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {provider.activeModels.length} {t("settings.activeModels")}
        </p>
        {usageDisplay.show ? (
          <div
            className="mt-2 min-w-0 text-xs text-muted-foreground"
            aria-busy={usageDisplay.loading}
          >
            <div className="flex min-h-4 min-w-0 items-center">
              {firstUsagePlan ? (
                <span className="settings-usage-reveal flex min-w-0">
                  <UsagePlanLine plan={firstUsagePlan} />
                </span>
              ) : usageDisplay.loading ? (
                <span
                  aria-hidden="true"
                  className="h-2 w-32 max-w-full animate-pulse rounded-full bg-foreground/[0.08] motion-reduce:animate-none"
                />
              ) : (
                <span
                  className={cn(
                    "settings-usage-reveal truncate",
                    usageDisplay.error && "text-destructive",
                  )}
                >
                  {usageDisplay.error ?? t("settings.providerUsageNoData")}
                </span>
              )}
            </div>
            {extraUsagePlans.length > 0 ? (
              <div
                className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
                style={{ gridTemplateRows: usageExpanded ? "1fr" : "0fr" }}
                aria-hidden={!usageExpanded}
              >
                <div className="min-h-0 overflow-hidden">
                  {extraUsagePlans.map((plan, index) => (
                    <div
                      key={`${plan.title.kind === "text" ? plan.title.text : plan.title.kind}:${
                        // biome-ignore lint/suspicious/noArrayIndexKey: 套餐无稳定 id,索引即位置语义
                        index
                      }`}
                      className="flex min-h-4 min-w-0 items-center pt-0.5"
                    >
                      <UsagePlanLine plan={plan} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-0.5 flex min-h-4 min-w-0 items-center">
              {usageDisplay.loading ? (
                <span
                  aria-hidden="true"
                  className="h-2 w-16 animate-pulse rounded-full bg-foreground/[0.06] motion-reduce:animate-none"
                />
              ) : (
                <span className="settings-usage-reveal flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                  {extraUsagePlans.length > 0 ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-0.5 text-primary hover:underline"
                      aria-expanded={usageExpanded}
                      onClick={onToggleUsageExpanded}
                    >
                      {usageExpanded
                        ? t("settings.providerUsageCollapse")
                        : t("settings.providerUsageMorePlans").replace(
                            "{count}",
                            String(extraUsagePlans.length),
                          )}
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-transform duration-200 motion-reduce:transition-none",
                          usageExpanded && "rotate-180",
                        )}
                      />
                    </button>
                  ) : null}
                  {usageDisplay.isStale ? (
                    <span title={t("settings.providerUsageStaleTitle")}>
                      {t("settings.providerUsageStale")}
                    </span>
                  ) : null}
                  {usageDisplay.error && firstUsagePlan ? (
                    <span className="min-w-0 truncate text-destructive">{usageDisplay.error}</span>
                  ) : null}
                  {usageDisplay.updatedAt ? (
                    <time>{usageRelativeTimeText(t, usageDisplay.updatedAt)}</time>
                  ) : null}
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
      <footer className="flex items-center justify-end gap-3 border-t border-border px-4 py-2.5">
        <div className="settings-card-actions settings-hover-actions flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <ProviderCopyConfigButton provider={provider} />
          {usageDisplay.show ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              disabled={usageDisplay.refreshDisabled}
              onClick={onRefreshUsage}
              title={t("settings.providerUsageRefresh")}
              aria-label={t("settings.providerUsageRefresh")}
            >
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
            title={t("settings.edit")}
          >
            <Pencil className="size-3.5" />
          </Button>
          <ConfirmDeletePopover name={provider.name} onConfirm={onDelete}>
            {(open) => (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={open}
                title={t("settings.delete")}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </ConfirmDeletePopover>
        </div>
      </footer>
    </article>
  );
}

function ProviderTemplateCard(props: { type: ProviderId; onAdd: () => void }) {
  const { type, onAdd } = props;
  const { t } = useLocale();
  return (
    <article className="flex min-h-40 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/20">
      <button type="button" className="min-w-0 flex-1 p-4 text-left" onClick={onAdd}>
        <div className="flex min-w-0 items-start gap-3">
          <ProviderMark type={type} compact />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium">{getProviderLabel(type)}</span>
            <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
              {PROVIDER_PROTOCOL_LABELS[type]}
            </span>
          </span>
        </div>
        <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
          {t("settings.providerTemplateHint")}
        </p>
      </button>
      <footer className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <span className="text-xs text-muted-foreground">{t("settings.providerPendingStatus")}</span>
        <Plus className="size-3.5 text-muted-foreground" />
      </footer>
    </article>
  );
}

function ProviderOverview(props: {
  providers: CustomProvider[];
  activeTab: ProviderId;
  settings: SettingsSectionProps["settings"];
  setSettings: SettingsSectionProps["setSettings"];
  customSettingsOpen: boolean;
  onAdd: (type: ProviderId) => void;
  onEdit: (provider: CustomProvider) => void;
  onDelete: (id: string) => void;
  onOpenCustomSettings: () => void;
  usageByProvider: ProviderUsageState;
  refreshingProviderIds: ReadonlySet<string>;
  onRefreshUsage: (providerId: string) => void;
}) {
  const { t } = useLocale();
  const {
    providers,
    activeTab,
    settings,
    setSettings,
    customSettingsOpen,
    onAdd,
    onEdit,
    onDelete,
    onOpenCustomSettings,
    usageByProvider,
    refreshingProviderIds,
    onRefreshUsage,
  } = props;
  const usageNow = useUsageNowTicker(
    providers.some((provider) => provider.usageQuery?.enabled) ||
      Object.keys(usageByProvider).length > 0,
  );
  const [expandedUsageProviderIds, setExpandedUsageProviderIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  function toggleUsageExpanded(providerId: string) {
    setExpandedUsageProviderIds((previous) => {
      const next = new Set(previous);
      if (next.has(providerId)) next.delete(providerId);
      else next.add(providerId);
      return next;
    });
  }
  const providerGroups = useMemo(
    () =>
      PROVIDER_TABS.map((type) => ({
        type,
        providers: providers.filter((provider) => provider.type === type),
      })),
    [providers],
  );

  const renderProviderGroup = (type: ProviderId, items: CustomProvider[]) => {
    const vendorLabel = getProviderLabel(type);
    return (
      <section className="space-y-3" aria-label={vendorLabel} key={type}>
        <div className="flex min-w-0 items-center gap-3 border-b border-border/70 pb-2.5">
          <ProviderMark type={type} compact />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h2 className="truncate text-[15px] font-medium">{vendorLabel}</h2>
              <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
            </div>
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              {PROVIDER_PROTOCOL_LABELS[type]}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1.5 px-2.5 text-[11px] text-muted-foreground"
            onClick={() => onAdd(type)}
          >
            <Plus className="size-3.5" />
            {t("settings.providerAddVendorConnection").replace("{vendor}", vendorLabel)}
          </Button>
        </div>
        <div className={PROVIDER_CARD_GRID_CLASS}>
          {items.length === 0 ? (
            <ProviderTemplateCard type={type} onAdd={() => onAdd(type)} />
          ) : (
            items.map((provider) => {
              const refreshing = refreshingProviderIds.has(provider.id);
              return (
                <ProviderOverviewCard
                  key={provider.id}
                  provider={provider}
                  usageDisplay={getProviderUsageCardDisplay(
                    provider,
                    usageByProvider[provider.id],
                    refreshing,
                    usageNow,
                  )}
                  refreshing={refreshing}
                  usageExpanded={expandedUsageProviderIds.has(provider.id)}
                  onToggleUsageExpanded={() => toggleUsageExpanded(provider.id)}
                  onEdit={() => onEdit(provider)}
                  onDelete={() => onDelete(provider.id)}
                  onRefreshUsage={() => onRefreshUsage(provider.id)}
                />
              );
            })
          )}
        </div>
      </section>
    );
  };

  return (
    <section className="settings-provider-overview min-h-0 overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-5xl space-y-8 px-[clamp(20px,4vw,48px)] pb-24 pt-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {t("settings.navProviders")}
            </p>
            <h1 className="mt-1 text-xl font-medium tracking-[-0.02em]">
              {t("settings.providerAllConnections")}
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted-foreground">
              {t("settings.providerAllConnectionsDesc")}
            </p>
          </div>
          <ProviderActionGroup
            activeTab={activeTab}
            settings={settings}
            setSettings={setSettings}
            customSettingsOpen={customSettingsOpen}
            onAdd={() => onAdd(activeTab)}
            onOpenCustomSettings={onOpenCustomSettings}
          />
        </header>

        {providerGroups.map(({ type, providers: groupProviders }) =>
          renderProviderGroup(type, groupProviders),
        )}
      </div>
    </section>
  );
}

type ProviderEditorSelection =
  | { kind: "edit"; providerId: string }
  | { kind: "add"; type: ProviderId };

export function ProvidersSection(
  props: SettingsSectionProps & {
    initialProviderId?: string;
    onInitialProviderHandled?: () => void;
  },
) {
  const { settings, setSettings, initialProviderId, onInitialProviderHandled } = props;

  const [activeTab, setActiveTab] = useState<ProviderId>("claude_code");
  const [customSettingsOpen, setCustomSettingsOpen] = useState(false);
  const [editorSelection, setEditorSelection] = useState<ProviderEditorSelection | null>(null);
  const { usageByProvider, refreshingProviderIds, refreshProvider } = useProviderUsage(
    settings.customProviders,
  );
  const openedInitialProviderIdRef = useRef<string | null>(null);
  const editingProvider =
    editorSelection?.kind === "edit"
      ? (settings.customProviders.find((provider) => provider.id === editorSelection.providerId) ??
        null)
      : null;
  const editorProviderType =
    editorSelection?.kind === "add" ? editorSelection.type : editingProvider?.type;
  const showingEditor = Boolean(editorSelection && editorProviderType);

  useEffect(() => {
    const providerId = initialProviderId?.trim();
    if (!providerId || openedInitialProviderIdRef.current === providerId) return;
    const provider = settings.customProviders.find((item) => item.id === providerId);
    if (!provider) return;
    openedInitialProviderIdRef.current = providerId;
    setActiveTab(provider.type);
    setEditorSelection({ kind: "edit", providerId: provider.id });
    onInitialProviderHandled?.();
  }, [initialProviderId, onInitialProviderHandled, settings.customProviders]);

  function openAdd(type: ProviderId) {
    setActiveTab(type);
    setEditorSelection({ kind: "add", type });
  }

  function openEdit(provider: CustomProvider) {
    setActiveTab(provider.type);
    setEditorSelection({ kind: "edit", providerId: provider.id });
  }

  function closeEditor() {
    setEditorSelection(null);
  }

  function handleSave(data: Omit<CustomProvider, "id">) {
    setSettings((prev) => {
      if (editingProvider) {
        const updated = prev.customProviders.map((provider) =>
          provider.id === editingProvider.id ? { ...provider, ...data } : provider,
        );
        return updateCustomProviders(prev, updated);
      }

      const newProvider: CustomProvider = {
        id: createUuid(),
        ...data,
      };
      return updateCustomProviders(prev, [...prev.customProviders, newProvider]);
    });
  }

  function handleDelete(id: string) {
    setSettings((prev) =>
      updateCustomProviders(
        prev,
        prev.customProviders.filter((provider) => provider.id !== id),
      ),
    );
  }

  return (
    <>
      <div className="settings-provider-section settings-provider-workspace grid h-full min-h-0 flex-1 grid-cols-[minmax(230px,280px)_minmax(0,1fr)] max-[900px]:grid-cols-1 max-[900px]:grid-rows-[minmax(180px,34vh)_minmax(0,1fr)]">
        <ProviderDirectory
          providers={settings.customProviders}
          selectedProviderId={editingProvider?.id ?? null}
          showingOverview={!showingEditor}
          onSelectOverview={closeEditor}
          onSelectProvider={openEdit}
          onAddProvider={openAdd}
        />
        {showingEditor && editorProviderType ? (
          <ProviderEditor
            key={
              editorSelection?.kind === "edit"
                ? `edit:${editorSelection.providerId}`
                : `add:${editorProviderType}`
            }
            providerType={editorProviderType}
            initialData={editingProvider ?? undefined}
            onSave={handleSave}
            onClose={closeEditor}
          />
        ) : (
          <ProviderOverview
            providers={settings.customProviders}
            activeTab={activeTab}
            settings={settings}
            setSettings={setSettings}
            customSettingsOpen={customSettingsOpen}
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={handleDelete}
            onOpenCustomSettings={() => setCustomSettingsOpen(true)}
            usageByProvider={usageByProvider}
            refreshingProviderIds={refreshingProviderIds}
            onRefreshUsage={(providerId) => void refreshProvider(providerId)}
          />
        )}
      </div>

      {customSettingsOpen ? (
        <CustomSettingsDrawer
          settings={settings}
          setSettings={setSettings}
          providerType={activeTab}
          onClose={() => setCustomSettingsOpen(false)}
        />
      ) : null}
    </>
  );
}
