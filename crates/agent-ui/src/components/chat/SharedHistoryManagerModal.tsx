import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  Share2,
} from "@liveagent/ui/components/IconSet";
import { Button } from "@liveagent/ui/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@liveagent/ui/components/ui/dialog";
import { useLocale } from "@liveagent/ui/i18n/index";
import { buildShareUrl, resolveShareOrigin } from "@liveagent/ui/lib/chat/historyShareOrigin";
import { cn } from "@liveagent/ui/lib/shared/utils";
import { useMemo, useState } from "react";
import { Switch } from "../ui/switch";

export type ManagedHistoryShareStatus = {
  conversationId?: string;
  conversation_id?: string;
  enabled: boolean;
  token?: string;
  redactToolContent?: boolean;
  redact_tool_content?: boolean;
};

export type SharedHistorySummary = {
  id: string;
  title: string;
  model: string;
  providerId: string;
  cwd?: string;
  messageCount?: number;
  updatedAt: number;
};

type SharedHistoryManagerModalProps<Conversation extends SharedHistorySummary> = {
  conversations: Conversation[];
  statuses: Readonly<Record<string, ManagedHistoryShareStatus | undefined>>;
  loadingIds: ReadonlySet<string>;
  updatingIds: ReadonlySet<string>;
  errors: Readonly<Record<string, string | undefined>>;
  listError?: string | null;
  shareOrigin?: string;
  shareOriginPort?: number;
  shareOriginLoading?: boolean;
  onRefresh: () => void;
  onLoadStatus: (conversation: Conversation) => void;
  onDisableShare: (conversation: Conversation) => void;
  onSetRedactToolContent: (conversation: Conversation, redactToolContent: boolean) => void;
  onClose: () => void;
};

function formatConversationTime(timestamp: number | undefined, locale: string, fallback: string) {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) {
    return fallback;
  }
  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function ShareSwitch(props: { disabled: boolean; onDisable: () => void }) {
  const { disabled, onDisable } = props;
  const { t } = useLocale();
  return (
    <Switch
      checked
      size="lg"
      disabled={disabled}
      aria-label={t("sharedHistory.disableShare")}
      title={t("sharedHistory.disableShare")}
      onCheckedChange={onDisable}
    />
  );
}

function RedactionPicker(props: {
  value: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  const { value, disabled, onChange } = props;
  const { t } = useLocale();
  return (
    <fieldset
      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: ARIA in HTML 允许 fieldset 担任 radiogroup；互斥单选语义需要向读屏表达。
      role="radiogroup"
      aria-label={t("sharedHistory.redactionTitle")}
      className={cn(
        "inline-flex min-w-0 shrink-0 items-center rounded-full border border-border bg-muted/40 p-0.5",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: 分段控件保留 button 样式；互斥语义用 radio 表达，改原生 radio input 需要视觉重构。 */}
      <button
        type="button"
        role="radio"
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange(true)}
        className={cn(
          "relative rounded-full px-2 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/40 disabled:cursor-not-allowed",
          value
            ? "bg-success text-success-foreground shadow-control"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {t("settings.enable")}
      </button>
      {/* biome-ignore lint/a11y/useSemanticElements: 同上——radio 语义配 button 样式。 */}
      <button
        type="button"
        role="radio"
        aria-checked={!value}
        disabled={disabled}
        onClick={() => onChange(false)}
        className={cn(
          "relative rounded-full px-2 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/40 disabled:cursor-not-allowed",
          !value
            ? "bg-background text-foreground shadow-control"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {t("settings.disable")}
      </button>
    </fieldset>
  );
}

function isShareStatusRedacted(status: ManagedHistoryShareStatus | undefined) {
  return status?.redactToolContent === true || status?.redact_tool_content === true;
}

function EmptyState(props: { isFiltered: boolean }) {
  const { isFiltered } = props;
  const { t } = useLocale();
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-info/20 bg-info/10 text-info">
        <Share2 className="h-5 w-5" />
      </div>
      <div className="mt-4 text-base font-semibold text-foreground">
        {isFiltered ? t("sharedHistory.emptyFilteredTitle") : t("sharedHistory.emptyTitle")}
      </div>
      <div className="mt-1 max-w-[22rem] text-xs leading-5 text-muted-foreground">
        {isFiltered ? t("sharedHistory.emptyFilteredDesc") : t("sharedHistory.emptyDesc")}
      </div>
    </div>
  );
}

export function SharedHistoryManagerModal<Conversation extends SharedHistorySummary>({
  conversations,
  statuses,
  loadingIds,
  updatingIds,
  errors,
  listError,
  shareOrigin,
  shareOriginPort,
  shareOriginLoading = false,
  onRefresh,
  onLoadStatus,
  onDisableShare,
  onSetRedactToolContent,
  onClose,
}: SharedHistoryManagerModalProps<Conversation>) {
  const { locale, t } = useLocale();
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const publicOrigin = resolveShareOrigin(shareOrigin, shareOriginPort);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) => {
        if (!normalizedQuery) {
          return true;
        }
        return [
          conversation.title,
          conversation.model,
          conversation.providerId,
          conversation.cwd ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      }),
    [conversations, normalizedQuery],
  );
  const readyCount = conversations.filter((conversation) => {
    const status = statuses[conversation.id];
    return status?.enabled === true && Boolean(status.token?.trim());
  }).length;
  const hasLoading = conversations.some((conversation) => loadingIds.has(conversation.id));
  const copyableCount = publicOrigin ? readyCount : 0;

  function handleCopy(conversationId: string, url: string) {
    if (!url || !navigator.clipboard?.writeText) {
      return;
    }
    void navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiedId(conversationId);
        window.setTimeout(() => setCopiedId(null), 1500);
      })
      .catch(() => setCopiedId(null));
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[86dvh] max-w-3xl flex-col p-0"
        closeLabel={t("sharedHistory.close")}
        showCloseButton
      >
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-info/20 bg-info/10 text-info">
                <Share2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base leading-normal">
                  {t("sharedHistory.title")}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-5">
                  {t("sharedHistory.subtitle")}
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="min-w-0 rounded-2xl border border-border bg-muted/20 px-2 py-2 sm:px-3">
              <div className="truncate text-2xs font-medium uppercase leading-4 text-muted-foreground sm:text-xs">
                {t("sharedHistory.summaryShared")}
              </div>
              <div className="mt-1 text-base font-semibold text-foreground">
                {conversations.length}
              </div>
            </div>
            <div className="min-w-0 rounded-2xl border border-border bg-muted/20 px-2 py-2 sm:px-3">
              <div className="truncate text-2xs font-medium uppercase leading-4 text-muted-foreground sm:text-xs">
                {t("sharedHistory.summaryCopyable")}
              </div>
              <div className="mt-1 text-base font-semibold text-foreground">{copyableCount}</div>
            </div>
            <div className="min-w-0 rounded-2xl border border-border bg-muted/20 px-2 py-2 sm:px-3">
              <div className="truncate text-2xs font-medium uppercase leading-4 text-muted-foreground sm:text-xs">
                {t("sharedHistory.summaryStatus")}
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-2 text-base font-medium text-foreground">
                {hasLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-info" /> : null}
                <span className="truncate">
                  {hasLoading ? t("sharedHistory.syncing") : t("sharedHistory.synced")}
                </span>
              </div>
            </div>
          </div>

          {!shareOriginLoading && !publicOrigin ? (
            <div className="mt-3 rounded-2xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs leading-5 text-warning">
              {t("sharedHistory.originUnavailable")}
            </div>
          ) : shareOriginLoading && !publicOrigin ? (
            <div className="mt-3 rounded-2xl border border-info/20 bg-info/10 px-3 py-2 text-xs leading-5 text-info">
              {t("sharedHistory.originLoading")}
            </div>
          ) : null}

          {listError ? (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{listError}</span>
            </div>
          ) : null}

          <div className="mt-4 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder={t("sharedHistory.searchPlaceholder")}
                className="h-9 w-full rounded-2xl border border-border bg-background px-8 text-xs outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-info/40 focus:ring-2 focus:ring-info/20"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onRefresh}
              size="icon"
              className="h-9 w-9 shrink-0 rounded-2xl border-border"
              title={t("sharedHistory.refresh")}
              aria-label={t("sharedHistory.refresh")}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <DialogBody>
          {filteredConversations.length === 0 ? (
            <EmptyState isFiltered={conversations.length > 0 && Boolean(normalizedQuery)} />
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conversation) => {
                const status = statuses[conversation.id];
                const token = status?.enabled === true ? (status.token?.trim() ?? "") : "";
                const redactToolContent = isShareStatusRedacted(status);
                const shareUrl = buildShareUrl(token, publicOrigin);
                const isLoading = loadingIds.has(conversation.id);
                const isUpdating = updatingIds.has(conversation.id);
                const error = errors[conversation.id];
                const messageCount =
                  typeof conversation.messageCount === "number"
                    ? t("sharedHistory.messageCount").replace(
                        "{count}",
                        String(conversation.messageCount),
                      )
                    : t("sharedHistory.messageCountUnknown");

                return (
                  <div
                    key={conversation.id}
                    className="rounded-2xl border border-border bg-background px-4 py-3 shadow-control"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="min-w-0 truncate text-base font-semibold text-foreground">
                            {conversation.title}
                          </span>
                          <span className="shrink-0 rounded-full border border-info/20 bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
                            {t("sharedHistory.publicBadge")}
                          </span>
                          {redactToolContent ? (
                            <span className="shrink-0 rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                              {t("sharedHistory.redactedBadge")}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{messageCount}</span>
                          <span>
                            {t("sharedHistory.updatedAt").replace(
                              "{time}",
                              formatConversationTime(
                                conversation.updatedAt,
                                locale,
                                t("sharedHistory.timeUnknown"),
                              ),
                            )}
                          </span>
                          <span className="max-w-[18rem] truncate">{conversation.model}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-info" /> : null}
                        <ShareSwitch
                          disabled={isUpdating}
                          onDisable={() => onDisableShare(conversation)}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-muted/20 px-3 py-2">
                      <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {shareUrl ? (
                        <a
                          href={shareUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 flex-1 truncate font-mono text-xs text-info underline-offset-4 hover:underline"
                          title={shareUrl}
                        >
                          {shareUrl}
                        </a>
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          {isLoading
                            ? t("sharedHistory.loadingLink")
                            : shareOriginLoading && token
                              ? t("sharedHistory.loadingGateway")
                              : token
                                ? token
                                : t("sharedHistory.linkPending")}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopy(conversation.id, shareUrl)}
                        disabled={!shareUrl}
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl transition-colors",
                          shareUrl
                            ? "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                            : "cursor-not-allowed text-muted-foreground/40",
                        )}
                        title={t("sharedHistory.copyLink")}
                        aria-label={t("sharedHistory.copyLink")}
                      >
                        {copiedId === conversation.id ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                      <a
                        href={shareUrl || undefined}
                        target="_blank"
                        rel="noreferrer"
                        aria-disabled={!shareUrl}
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl transition-colors",
                          shareUrl
                            ? "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                            : "pointer-events-none text-muted-foreground/40",
                        )}
                        title={t("sharedHistory.openLink")}
                        aria-label={t("sharedHistory.openLink")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>

                    <div
                      className={cn(
                        "mt-2 flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 transition-colors",
                        redactToolContent
                          ? "border-success/20 bg-success/5"
                          : "border-border bg-muted/20",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors",
                            redactToolContent
                              ? "border-success/20 bg-success/10 text-success"
                              : "border-border bg-background text-muted-foreground",
                          )}
                        >
                          {redactToolContent ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground">
                            {t("sharedHistory.redactionTitle")}
                          </div>
                          <div
                            className="mt-0.5 truncate text-xs leading-4 text-muted-foreground"
                            title={t("sharedHistory.redactionDescriptionTitle")}
                          >
                            {t("sharedHistory.redactionDescription")}
                          </div>
                        </div>
                      </div>
                      <RedactionPicker
                        value={redactToolContent}
                        disabled={isLoading || isUpdating || status?.enabled !== true}
                        onChange={(next) => {
                          if (next === redactToolContent) return;
                          onSetRedactToolContent(conversation, next);
                        }}
                      />
                    </div>

                    {error ? (
                      <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        <span className="min-w-0">{error}</span>
                        <button
                          type="button"
                          onClick={() => onLoadStatus(conversation)}
                          className="shrink-0 font-medium underline-offset-4 hover:underline"
                        >
                          {t("sharedHistory.retry")}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
