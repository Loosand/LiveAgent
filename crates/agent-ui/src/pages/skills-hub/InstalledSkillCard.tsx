import {
  type Activity,
  BookOpen,
  Bot,
  Brain,
  Cable,
  CircleHelp,
  Cloud,
  Cpu,
  FileText,
  Folder,
  GitBranch,
  Globe,
  ImageIcon,
  Key,
  LayoutGrid,
  Lightbulb,
  Link2,
  ListChecks,
  Loader2,
  Lock,
  MessageSquare,
  Plug,
  Radio,
  RefreshCw,
  ScanText,
  ScrollText,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  SkillIcon,
  Sparkles,
  Terminal,
  Timer,
  Trash2,
  Waypoints,
  Wifi,
  Wrench,
  Zap,
} from "@liveagent/ui/components/IconSet";
import { ResourceActivationSwitch } from "@liveagent/ui/components/resources/ResourceActivationSwitch";
import { Badge } from "@liveagent/ui/components/ui/badge";
import { Button } from "@liveagent/ui/components/ui/button";
import { Checkbox } from "@liveagent/ui/components/ui/checkbox";
import { ConfirmDeletePopover } from "@liveagent/ui/components/ui/confirm-action-popover";
import { SearchHighlight } from "@liveagent/ui/components/ui/search-highlight";
import { useLocale } from "@liveagent/ui/i18n/index";
import { cn } from "@liveagent/ui/lib/shared/utils";
import type { ClawHubCategorySlug } from "@liveagent/ui/lib/skills/clawHubCategories";
import type { SkillSummary } from "@liveagent/ui/lib/skills/index";
import {
  getInstalledSkillCardIdentity,
  type InstalledSkillCardIconName,
} from "@liveagent/ui/lib/skills/skillCardIdentity";
import {
  getInstalledSkillCardSource,
  getRelativeInstalledAt,
} from "@liveagent/ui/lib/skills/skillCardMetadata";
import { memo, useMemo } from "react";
import { InstalledSkillCategoryChip } from "./SkillCategoryControls";

const INSTALLED_SKILL_ICON_TONES = ["border-border bg-muted text-muted-foreground"] as const;

const INSTALLED_SKILL_CARD_ICONS: Record<InstalledSkillCardIconName, typeof Activity> = {
  bookOpen: BookOpen,
  bot: Bot,
  brain: Brain,
  cable: Cable,
  circleHelp: CircleHelp,
  cloud: Cloud,
  cpu: Cpu,
  fileText: FileText,
  folder: Folder,
  gitBranch: GitBranch,
  globe: Globe,
  imageIcon: ImageIcon,
  key: Key,
  layoutGrid: LayoutGrid,
  lightbulb: Lightbulb,
  link2: Link2,
  listChecks: ListChecks,
  lock: Lock,
  messageSquare: MessageSquare,
  plug: Plug,
  radio: Radio,
  refreshCw: RefreshCw,
  scanText: ScanText,
  scrollText: ScrollText,
  search: Search,
  send: Send,
  server: Server,
  settings: Settings,
  shield: Shield,
  sparkles: Sparkles,
  terminal: Terminal,
  timer: Timer,
  waypoints: Waypoints,
  wifi: Wifi,
  wrench: Wrench,
  zap: Zap,
};

let cachedFullDateFormat: Intl.DateTimeFormat | null = null;

function getFullDateFormat() {
  cachedFullDateFormat ??= new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return cachedFullDateFormat;
}

function formatInstalledSkillMetadata(skill: SkillSummary, t: (key: string) => string): string {
  const source = getInstalledSkillCardSource(skill);
  const sourceLabel =
    source === "built-in"
      ? t("settings.skillsInstalledCardSourceBuiltIn")
      : source === "clawhub"
        ? t("settings.skillsInstalledCardSourceClawHub")
        : t("settings.skillsInstalledCardSourceLocal");
  if (source === "built-in") return sourceLabel;

  const relativeInstalledAt = getRelativeInstalledAt(skill.installedAt);
  if (!relativeInstalledAt) return sourceLabel;
  if (relativeInstalledAt.kind === "today") {
    return `${sourceLabel} · ${t("settings.skillsInstalledCardInstalledToday")}`;
  }
  if (relativeInstalledAt.kind === "days-ago") {
    return `${sourceLabel} · ${t("settings.skillsInstalledCardInstalledDaysAgo").replace(
      "{count}",
      String(relativeInstalledAt.days),
    )}`;
  }

  const date = getFullDateFormat().format(new Date(relativeInstalledAt.timestamp));
  return `${sourceLabel} · ${date}`;
}

type InstalledSkillCardProps = {
  skill: SkillSummary;
  flipKey: string;
  primaryCategory: ClawHubCategorySlug;
  alwaysEnabled: boolean;
  checked: boolean;
  skillsEnabled: boolean;
  bulkMode: boolean;
  bulkSelected: boolean;
  deleting: boolean;
  deleteDisabled: boolean;
  searchQuery: string;
  onToggle: (name: string, on: boolean) => void;
  onEnterBulkMode: (name: string) => void;
  onToggleBulkSelection: (name: string) => void;
  onBulkCardClick: (name: string, shiftKey: boolean) => void;
  onOpenPreview: (skill: SkillSummary) => void;
  onDelete: (skill: SkillSummary) => void;
  onSelectCategory: (category: ClawHubCategorySlug) => void;
};

// 安装卡片抽成 memo 组件：props 只传标量与稳定引用（布尔代替 Set 成员判断、
// primaryCategory 代替数组、latest-ref 回调），父组件的无关状态更新（搜索、
// store 轮询、抽屉开关等）不再重渲整片网格；identity/metadata 等派生计算
// 也随之只在自身输入变化时重算。技能数量大时这是主要的卡顿来源。
export const InstalledSkillCard = memo(function InstalledSkillCard(props: InstalledSkillCardProps) {
  const {
    skill,
    flipKey,
    primaryCategory,
    alwaysEnabled,
    checked,
    skillsEnabled,
    bulkMode,
    bulkSelected,
    deleting,
    deleteDisabled,
    searchQuery,
    onToggle,
    onEnterBulkMode,
    onToggleBulkSelection,
    onBulkCardClick,
    onOpenPreview,
    onDelete,
    onSelectCategory,
  } = props;
  const { t } = useLocale();
  const effectivelyEnabled = skillsEnabled && checked;
  const cardIdentity = useMemo(
    () => (alwaysEnabled ? null : getInstalledSkillCardIdentity(skill.name, primaryCategory)),
    [alwaysEnabled, primaryCategory, skill.name],
  );
  const CardIcon = alwaysEnabled
    ? SkillIcon
    : INSTALLED_SKILL_CARD_ICONS[cardIdentity?.iconName ?? "circleHelp"];
  const iconTone = cardIdentity ? INSTALLED_SKILL_ICON_TONES[cardIdentity.colorIndex] : null;
  const metadataSource = getInstalledSkillCardSource(skill);
  const MetadataIcon =
    metadataSource === "built-in" ? Lock : metadataSource === "clawhub" ? Cloud : Folder;
  const metadataLabel = useMemo(() => formatInstalledSkillMetadata(skill, t), [skill, t]);
  const key = flipKey;
  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
            alwaysEnabled ? "border-border bg-muted text-foreground" : iconTone,
          )}
        >
          <CardIcon className="h-5 w-5" />
        </div>

        <div
          data-card-action-zone=""
          role="toolbar"
          aria-label={skill.name}
          className="flex shrink-0 items-center gap-1"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {bulkMode ? (
            alwaysEnabled ? (
              <Lock
                className="h-4 w-4 text-muted-foreground"
                aria-label={t("settings.skillsBulkAlwaysOnDisabled")}
              />
            ) : (
              <Checkbox
                checked={bulkSelected}
                aria-label={`${t("settings.skillsHubBulkSelectLabel")}: ${skill.name}`}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                onCheckedChange={() => onToggleBulkSelection(skill.name)}
              />
            )
          ) : alwaysEnabled ? null : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                aria-label={`${t("settings.skillsHubBulkSelectLabel")}: ${skill.name}`}
                title={t("settings.skillsHubBulkSelect")}
                onClick={(event) => {
                  event.stopPropagation();
                  onEnterBulkMode(skill.name);
                }}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <ListChecks className="h-3.5 w-3.5" />
              </Button>
              <ResourceActivationSwitch
                checked={effectivelyEnabled}
                disabled={!skillsEnabled}
                compact
                stopPropagation
                label={`${t("skills.select")}: ${skill.name}`}
                onCheckedChange={(nextChecked) => onToggle(skill.name, nextChecked)}
              />
            </>
          )}
        </div>
      </div>

      <div className="mt-3 min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <SearchHighlight
            text={skill.name}
            query={searchQuery}
            className="truncate text-base font-semibold text-foreground"
          />
          {alwaysEnabled ? (
            <Badge variant="muted" className="h-5 gap-1 px-2 text-2xs">
              <Lock className="h-2.5 w-2.5" />
              {t("settings.skillsAlwaysOn")}
            </Badge>
          ) : effectivelyEnabled ? (
            <Badge variant="success" className="h-5 px-2 text-2xs">
              {t("settings.skillsHubEnabledBadge")}
            </Badge>
          ) : null}
        </div>
        {skill.description ? (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
            <SearchHighlight text={skill.description} query={searchQuery} />
          </p>
        ) : null}
      </div>

      {!alwaysEnabled ? (
        <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-border pt-2">
          <InstalledSkillCategoryChip category={primaryCategory} onSelect={onSelectCategory} />
          <div className="ml-auto grid min-w-0 items-center justify-items-end">
            <span
              className={cn(
                "pointer-events-none col-start-1 row-start-1 inline-flex min-w-0 items-center gap-1 text-2xs text-muted-foreground transition-opacity",
                !bulkMode &&
                  "group-hover:opacity-0 group-focus-within:opacity-0 [@media(hover:none)]:opacity-0",
              )}
            >
              <MetadataIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{metadataLabel}</span>
            </span>
            {!bulkMode ? (
              <div
                data-card-delete-zone=""
                role="toolbar"
                aria-label={`${t("settings.skillsHubDeleteSkill")}: ${skill.name}`}
                className="pointer-events-none relative z-10 col-start-1 row-start-1 flex opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"
                onPointerDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <ConfirmDeletePopover name={skill.name} onConfirm={() => onDelete(skill)}>
                  {(open) => (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      disabled={deleteDisabled}
                      aria-label={`${t("settings.skillsHubDeleteSkill")}: ${skill.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        open();
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                      title={t("settings.skillsHubDeleteSkill")}
                    >
                      {deleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </ConfirmDeletePopover>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );

  const cardClassName = cn(
    "skill-card-enter group relative flex min-h-44 w-full flex-col rounded-2xl border border-border bg-card p-4 text-left shadow-control transition-[border-color,box-shadow,background-color]",
    "[content-visibility:auto] [contain-intrinsic-size:auto_11rem]",
    bulkSelected
      ? "border-ring bg-muted/40 shadow-control"
      : effectivelyEnabled
        ? "border-success/20"
        : cn("hover:border-input hover:shadow-overlay", !skillsEnabled && "bg-muted/20"),
  );

  if (alwaysEnabled) {
    return (
      <Button
        data-flip-key={key}
        variant="ghost"
        aria-label={`${t("settings.skillsInstalledPreviewOpen")}: ${skill.name}`}
        onClick={() => {
          if (!bulkMode) onOpenPreview(skill);
        }}
        className={cn(cardClassName, "h-full items-stretch justify-start whitespace-normal")}
      >
        {cardContent}
      </Button>
    );
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: The card contains nested controls and cannot be a native button.
    <div
      data-flip-key={key}
      role="button"
      tabIndex={0}
      aria-label={`${t("settings.skillsInstalledPreviewOpen")}: ${skill.name}`}
      onClick={(event) => {
        if (bulkMode) onBulkCardClick(skill.name, event.shiftKey);
        else onOpenPreview(skill);
      }}
      onMouseDown={(event) => {
        if (bulkMode && event.shiftKey) event.preventDefault();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (bulkMode) onBulkCardClick(skill.name, event.shiftKey);
        else onOpenPreview(skill);
      }}
      className={cn(
        cardClassName,
        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {cardContent}
    </div>
  );
});
