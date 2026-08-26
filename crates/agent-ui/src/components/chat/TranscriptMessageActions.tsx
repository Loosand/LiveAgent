import {
  Check,
  Copy,
  GitBranch,
  Loader2,
  Pencil,
  RefreshCw,
  Undo2,
} from "@liveagent/ui/components/IconSet";
import { useSyncExternalStore } from "react";
import { type Locale, useLocale } from "../../i18n/index";
import { useCheckpointRewindAction } from "../../lib/chat/checkpointRewind";
import { cn } from "../../lib/shared/utils";
import { ConfirmActionPopover } from "../ui/confirm-action-popover";
import { LabelTooltip } from "../ui/label-tooltip";
import { type UsageDetailEntry, UsageInfoPopover } from "./UsagePanel";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** 相对时间标签："just now" / "8m ago" / "1h ago" / "1d ago" / "2mo ago" / "1y ago"。 */
export function formatTranscriptMessageRelativeTime(
  timestamp: number | undefined,
  now: number = Date.now(),
) {
  if (!timestamp || !Number.isFinite(timestamp)) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const elapsed = Math.max(0, now - date.getTime());
  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m ago`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h ago`;
  const days = Math.floor(elapsed / DAY_MS);
  if (days >= 365) return `${Math.floor(days / 365)}y ago`;
  if (days >= 30) return `${Math.floor(days / 30)}mo ago`;
  return `${days}d ago`;
}

const ZH_ABSOLUTE_TIME_FORMAT = new Intl.DateTimeFormat("zh-CN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const EN_ABSOLUTE_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** 悬停提示的完整时间：zh 为「2026年08月26日 下午3:43」，en 为「Aug 26, 2026, 3:43 PM」。 */
export function formatTranscriptMessageAbsoluteTime(
  timestamp: number | undefined,
  locale: Locale,
) {
  if (!timestamp || !Number.isFinite(timestamp)) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  if (locale === "en-US") return EN_ABSOLUTE_FORMAT.format(date);
  const pad = (value: number) => String(value).padStart(2, "0");
  const ymd = `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日`;
  return `${ymd} ${ZH_ABSOLUTE_TIME_FORMAT.format(date)}`;
}

/* 所有消息行共享一个分钟级刷新源，让"xx ago"随时间推移保持准确，
 * 而不是每行各挂一个定时器。无订阅者时定时器自动停止。 */
const minuteTickListeners = new Set<() => void>();
let minuteTickNow = Date.now();
let minuteTickTimer: ReturnType<typeof setInterval> | undefined;

function subscribeMinuteTick(listener: () => void) {
  if (minuteTickListeners.size === 0) {
    minuteTickNow = Date.now();
    minuteTickTimer = setInterval(() => {
      minuteTickNow = Date.now();
      for (const notify of minuteTickListeners) notify();
    }, MINUTE_MS);
  }
  minuteTickListeners.add(listener);
  return () => {
    minuteTickListeners.delete(listener);
    if (minuteTickListeners.size === 0 && minuteTickTimer !== undefined) {
      clearInterval(minuteTickTimer);
      minuteTickTimer = undefined;
    }
  };
}

const getMinuteTickNow = () => minuteTickNow;

function useMinuteTickNow() {
  return useSyncExternalStore(subscribeMinuteTick, getMinuteTickNow, getMinuteTickNow);
}

function TranscriptMessageTimestamp({
  timestamp,
  className,
}: {
  timestamp: number | undefined;
  className: string;
}) {
  const { locale } = useLocale();
  const now = useMinuteTickNow();
  const relative = formatTranscriptMessageRelativeTime(timestamp, now);
  if (!relative) return null;
  return (
    <LabelTooltip label={formatTranscriptMessageAbsoluteTime(timestamp, locale)}>
      <span className={className}>{relative}</span>
    </LabelTooltip>
  );
}

type SharedActionProps = {
  copied: boolean;
  copyDisabled?: boolean;
  onCopy: () => void;
  alwaysShowActions?: boolean;
};

export function TranscriptUserMessageActions(
  props: SharedActionProps & {
    timestamp?: number;
    editDisabled: boolean;
    editTitle: string;
    onEdit: () => void;
    readOnly?: boolean;
    /** 本行用户消息的稳定 ID:检查点回退按 turnId=消息 ID 命中该轮。 */
    rewindTurnId?: string;
  },
) {
  const {
    copied,
    copyDisabled = false,
    onCopy,
    alwaysShowActions = false,
    timestamp,
    editDisabled,
    editTitle,
    onEdit,
    readOnly = false,
    rewindTurnId,
  } = props;
  const { t } = useLocale();
  // Provider 外(只读分享页等)返回 null:整颗按钮不渲染。
  const rewind = useCheckpointRewindAction(rewindTurnId);
  const rewindTitle = rewind?.available ? t("chat.rewindCode") : t("chat.rewindUnavailable");

  return (
    <div className="chat-user-bubble-actions mt-1 flex items-center justify-end gap-1.5">
      {!readOnly ? (
        <div
          className={cn(
            "flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
            alwaysShowActions && "[@media(hover:none)]:opacity-100",
          )}
        >
          <button
            type="button"
            className="chat-user-bubble-action rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            title={t("chat.copy")}
            aria-label={t("chat.copy")}
            disabled={copyDisabled}
            onClick={onCopy}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            className="chat-user-bubble-action rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            title={editTitle}
            aria-label={editTitle}
            disabled={editDisabled}
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {rewind ? (
            <button
              type="button"
              className="chat-user-bubble-action rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              title={rewindTitle}
              aria-label={rewindTitle}
              disabled={rewind.disabled}
              onClick={rewind.onRewind}
            >
              {rewind.pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Undo2 className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
        </div>
      ) : null}
      <TranscriptMessageTimestamp
        timestamp={timestamp}
        className={cn(
          "select-none text-[calc(11px*var(--zone-font-scale,1))] tabular-nums text-muted-foreground/70 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none",
          alwaysShowActions && "[@media(hover:none)]:opacity-100",
        )}
      />
    </div>
  );
}

export function TranscriptAssistantMessageActions(
  props: SharedActionProps & {
    timestamp?: number;
    usageEntries?: readonly UsageDetailEntry[];
    usageContextWindow?: number;
    retryDisabled: boolean;
    retryTitle: string;
    onRetry: () => void;
    branchDisabled: boolean;
    branchTitle: string;
    branchPending: boolean;
    onBranch: () => void;
    withAvatarSpacer?: boolean;
  },
) {
  const {
    copied,
    copyDisabled = false,
    onCopy,
    alwaysShowActions = false,
    timestamp,
    usageEntries,
    usageContextWindow,
    retryDisabled,
    retryTitle,
    onRetry,
    branchDisabled,
    branchTitle,
    branchPending,
    onBranch,
    withAvatarSpacer = false,
  } = props;
  const { t } = useLocale();
  const actions = (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center justify-start gap-0.5",
        !withAvatarSpacer && "pl-10",
      )}
    >
      <div
        className={cn(
          "pointer-events-none flex gap-0.5 opacity-0 transition-opacity duration-150 group-data-[actions-visible=true]/assistant:pointer-events-auto group-data-[actions-visible=true]/assistant:opacity-100 group-focus-within/assistant:pointer-events-auto group-focus-within/assistant:opacity-100 group-hover/assistant:pointer-events-auto group-hover/assistant:opacity-100 motion-reduce:transition-none",
          alwaysShowActions &&
            "[@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100",
          branchPending && "pointer-events-auto opacity-100",
        )}
      >
        <button
          type="button"
          className="chat-assistant-action inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          title={t("chat.copy")}
          aria-label={t("chat.copy")}
          disabled={copyDisabled}
          onClick={onCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <ConfirmActionPopover
          title={t("chat.retryConfirmTitle")}
          description={t("chat.retryConfirmDescription")}
          confirmLabel={t("chat.retry")}
          align="start"
          side="top"
          onConfirm={onRetry}
        >
          {(open) => (
            <button
              type="button"
              className="chat-assistant-action inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              title={retryTitle}
              aria-label={retryTitle}
              disabled={retryDisabled}
              onClick={open}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </ConfirmActionPopover>
        <ConfirmActionPopover
          title={t("chat.branchConfirmTitle")}
          description={t("chat.branchConfirmDescription")}
          confirmLabel={t("chat.branch")}
          tone="default"
          align="start"
          side="top"
          onConfirm={onBranch}
        >
          {(open) => (
            <button
              type="button"
              className="chat-assistant-action inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              title={branchTitle}
              aria-label={branchTitle}
              disabled={branchDisabled}
              onClick={open}
            >
              {branchPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <GitBranch className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </ConfirmActionPopover>
        <UsageInfoPopover entries={usageEntries} contextWindow={usageContextWindow} />
      </div>
      <TranscriptMessageTimestamp
        timestamp={timestamp}
        className={cn(
          "ml-1 select-none text-[calc(11px*var(--zone-font-scale,1))] tabular-nums text-muted-foreground/70 opacity-0 transition-opacity duration-150 group-data-[actions-visible=true]/assistant:opacity-100 group-focus-within/assistant:opacity-100 group-hover/assistant:opacity-100 motion-reduce:transition-none",
          alwaysShowActions && "[@media(hover:none)]:opacity-100",
        )}
      />
    </div>
  );

  if (!withAvatarSpacer) {
    return <div className="mt-1 flex items-center justify-start gap-1.5">{actions}</div>;
  }
  return (
    <div className="assistant-bubble-shell flex w-full max-w-full items-start gap-3">
      <div className="assistant-bubble-avatar w-7 shrink-0" aria-hidden="true" />
      {actions}
    </div>
  );
}
