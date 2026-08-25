import { FileDropOverlay } from "@liveagent/ui/components/chat/FileDropOverlay";
import type { MentionComposerHandle } from "@liveagent/ui/components/chat/MentionComposer";
import { TaskProgressBar } from "@liveagent/ui/components/chat/TaskProgressBar";
import {
  type PendingApprovalItem,
  ToolApprovalBar,
  type ToolApprovalDecision,
} from "@liveagent/ui/components/chat/ToolApprovalBar";
import { createTaskProgressSnapshot } from "@liveagent/ui/lib/chat/taskProgress";
import type { PendingUploadedFile } from "@liveagent/ui/lib/chat/uploadTypes";
import type { SharedModelOption } from "@liveagent/ui/lib/models/modelOptions";
import { toModelValue } from "@liveagent/ui/lib/models/modelValue";
import {
  type ChatRuntimeControls,
  DEFAULT_CHAT_RUNTIME_CONTROLS,
  type ProviderId,
} from "@liveagent/ui/lib/settings";
import {
  ChatComposerBar,
  type ChatQueueTurnPreview,
} from "@liveagent/ui/pages/chat/ChatComposerBar";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../../i18n/config";
import { GalleryComponentCard } from "./GalleryComponentCard";
import type { ChatGalleryScenarioId } from "./scenarios";

type ComposerVariant =
  | "empty"
  | "prefilled"
  | "disabled"
  | "sending"
  | "queued"
  | "attachments"
  | "uploading"
  | "drop"
  | "overlays";

const MODEL_OPTIONS: SharedModelOption<ProviderId>[] = [
  {
    value: toModelValue("gallery-codex", "gpt-5.6"),
    label: "GPT-5.6",
    providerId: "gallery-codex",
    providerName: "Gallery Codex",
    providerType: "codex",
    model: "gpt-5.6",
  },
  {
    value: toModelValue("gallery-claude", "claude-sonnet-4.6"),
    label: "Claude Sonnet 4.6",
    providerId: "gallery-claude",
    providerName: "Gallery Anthropic",
    providerType: "claude_code",
    model: "claude-sonnet-4.6",
  },
];

const ATTACHMENTS: PendingUploadedFile[] = [
  {
    relativePath: ".liveagent/uploads/gallery/screenshot.png",
    fileName: "screenshot.png",
    kind: "image",
    sizeBytes: 184_320,
  },
  {
    relativePath: ".liveagent/uploads/gallery/spec.pdf",
    fileName: "chat-ui-spec.pdf",
    kind: "pdf",
    sizeBytes: 982_144,
  },
  {
    relativePath: ".liveagent/uploads/gallery/metrics.xlsx",
    fileName: "metrics.xlsx",
    kind: "spreadsheet",
    sizeBytes: 42_810,
  },
  {
    relativePath: ".liveagent/uploads/gallery/paste.txt",
    fileName: "pasted-text.txt",
    kind: "text",
    sizeBytes: 13_410,
    displayMode: "largePaste",
    displayLabel: "Pasted text 1",
    displayCharCount: 13_410,
    displayLineCount: 284,
  },
];

const INITIAL_QUEUE: ChatQueueTurnPreview[] = [
  { id: "queue-1", previewText: "补充移动端窄屏和长文件名场景", fileCount: 0 },
  { id: "queue-2", previewText: "验证 dark theme 下工具错误状态", fileCount: 2 },
  { id: "queue-3", previewText: "生成一份 UI 状态覆盖清单", fileCount: 1 },
];

function ComposerApprovalBar({ locale }: { locale: Locale }) {
  const [pending, setPending] = useState<PendingApprovalItem[]>([
    {
      toolCallId: "gallery-composer-approval",
      toolName: "Bash",
      summary: "pnpm --filter liveagent build",
      deadlineAt: Date.now() + 3 * 60_000,
    },
  ]);
  const decide = async (toolCallId: string, _decision: ToolApprovalDecision) => {
    setPending((current) => current.filter((item) => item.toolCallId !== toolCallId));
    return { ok: true };
  };
  return pending.length > 0 ? (
    <ToolApprovalBar pending={pending} onDecide={decide} onDecideAll={async () => setPending([])} />
  ) : (
    <div className="flex h-32 items-center justify-center rounded-3xl border border-border bg-background/80 text-xs text-muted-foreground">
      {locale === "zh-CN"
        ? "审批已在本地落定，刷新场景可重置"
        : "Settled locally; reload the scenario to reset"}
    </div>
  );
}

export function GalleryComposerHarness(props: {
  variant: ComposerVariant;
  locale: Locale;
  embedded?: boolean;
  conversationId?: string;
  hasModels?: boolean;
  isSending?: boolean;
  onHeightChange?: (height: number) => void;
}) {
  const {
    variant,
    locale,
    embedded = false,
    conversationId = `chat-gallery-${variant}`,
    hasModels: hasModelsOverride,
    isSending: isSendingOverride,
    onHeightChange,
  } = props;
  const composerRef = useRef<MentionComposerHandle | null>(null);
  const [localIsSending, setLocalIsSending] = useState(
    variant === "sending" || variant === "queued",
  );
  const [runtimeControls, setRuntimeControls] = useState<ChatRuntimeControls>({
    ...DEFAULT_CHAT_RUNTIME_CONTROLS,
    planModeEnabled: variant === "prefilled",
  });
  const [selectedValue, setSelectedValue] = useState(MODEL_OPTIONS[0].value);
  const [uploads, setUploads] = useState<PendingUploadedFile[]>(
    variant === "attachments" || variant === "uploading" || variant === "drop" ? ATTACHMENTS : [],
  );
  const [queue, setQueue] = useState<ChatQueueTurnPreview[]>(
    variant === "queued" ? INITIAL_QUEUE : [],
  );
  const [dropActive, setDropActive] = useState(variant === "drop");
  const hasModels = hasModelsOverride ?? variant !== "disabled";
  const isSending = isSendingOverride ?? localIsSending;
  const isDisabled = variant === "disabled" || !hasModels;
  const zh = locale === "zh-CN";

  useEffect(() => {
    if (variant === "prefilled") {
      composerRef.current?.setText(
        zh
          ? "请检查 @src/pages/chat 下的 UI，并补齐流式工具调用场景。"
          : "Review the chat UI and add streaming tool-call coverage.",
      );
    }
  }, [variant, zh]);

  const moveQueuedTurnUp = (id: string) => {
    setQueue((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index <= 0) return current;
      const next = [...current];
      const previous = next[index - 1];
      const target = next[index];
      if (!previous || !target) return current;
      next[index - 1] = target;
      next[index] = previous;
      return next;
    });
  };

  const removeQueueItem = (id: string) => {
    setQueue((current) => current.filter((item) => item.id !== id));
  };

  const taskSnapshot = createTaskProgressSnapshot("gallery-composer-task", 2, [
    {
      id: "fixture",
      subject: zh ? "准备消息 fixture" : "Prepare message fixtures",
      description: "Build raw Message[] data",
      activeForm: "Preparing fixtures",
      status: "completed",
    },
    {
      id: "preview",
      subject: zh ? "核对输入区组合" : "Verify composer combinations",
      description: "Check overlays and queue",
      activeForm: "Verifying composer combinations",
      status: "in_progress",
    },
    {
      id: "browser",
      subject: zh ? "执行浏览器验证" : "Run browser verification",
      description: "Test theme and viewport",
      activeForm: "Running browser verification",
      status: "pending",
    },
  ]);

  const composer = (
    <ChatComposerBar
      surface="desktop"
      conversationId={conversationId}
      composerRef={composerRef}
      isSending={isSending}
      isUploadingFiles={variant === "uploading"}
      isInputDisabled={isDisabled}
      inputPlaceholder={
        hasModels
          ? zh
            ? "发送消息，@ 引用文件，/ 引用技能"
            : "Send a message, @ files, / skills"
          : zh
            ? "请先配置模型"
            : "Configure a model first"
      }
      workdir="/workspace/liveagent"
      enabledSkills={[
        {
          name: "ui-review",
          description: "Review production UI states",
          skillFile: "/workspace/liveagent/.agents/skills/ui-review/SKILL.md",
          baseDir: "/workspace/liveagent/.agents/skills/ui-review",
        },
      ]}
      executionMode="tools"
      hasModels={hasModels}
      currentModelLabel={hasModels ? "gpt-5.6" : zh ? "未选择模型" : "No model"}
      modelOptions={hasModels ? MODEL_OPTIONS : []}
      selectedValue={hasModels ? selectedValue : undefined}
      chatRuntimeControls={runtimeControls}
      commandSafetyMode="ask"
      onCommandSafetyModeChange={() => undefined}
      reasoningOptions={["low", "medium", "high", "xhigh"]}
      thinkingAlwaysOn={false}
      gitClient={null}
      contextUsageTokens={variant === "queued" ? 92_400 : 18_200}
      contextWindow={128_000}
      onManualCompactConfirm={() => undefined}
      manualCompactBlocked={variant === "uploading"}
      onSend={() => setLocalIsSending(true)}
      onStop={() => setLocalIsSending(false)}
      onComposerBusyChange={() => undefined}
      onSelectModel={(selection) => {
        setSelectedValue(toModelValue(selection.customProviderId, selection.model));
      }}
      onSelectExecutionMode={() => undefined}
      onOpenSettings={() => undefined}
      onChatRuntimeControlsChange={(patch) => {
        setRuntimeControls((current) => ({ ...current, ...patch }));
      }}
      onPickReadableFiles={() => undefined}
      onPasteFiles={() => undefined}
      pendingUploadedFiles={uploads}
      onRemovePendingUpload={(relativePath) => {
        setUploads((current) => current.filter((file) => file.relativePath !== relativePath));
      }}
      queuedTurns={queue}
      onRunQueuedTurnNow={removeQueueItem}
      onMoveQueuedTurnUp={moveQueuedTurnUp}
      onEditQueuedTurn={(id) => {
        const item = queue.find((entry) => entry.id === id);
        if (item) composerRef.current?.setText(item.previewText);
        removeQueueItem(id);
      }}
      onRemoveQueuedTurn={removeQueueItem}
      onHeightChange={onHeightChange}
      taskProgressBar={
        variant === "overlays" ? (
          <TaskProgressBar snapshot={taskSnapshot} isConversationRunning />
        ) : undefined
      }
      approvalBar={variant === "overlays" ? <ComposerApprovalBar locale={locale} /> : undefined}
      fileDropOverlay={
        dropActive ? (
          <FileDropOverlay
            variant="composer"
            canDropUpload
            title={zh ? "松开即可添加到对话" : "Drop to attach"}
            description={
              zh ? "样例只展示界面，不会读取本地文件。" : "The gallery will not read local files."
            }
            limitHint={zh ? "最多 20 个文件" : "Up to 20 files"}
          />
        ) : undefined
      }
    />
  );

  if (embedded) return composer;

  return (
    <div className="relative h-[22rem] min-h-0 overflow-hidden bg-background">
      {variant === "drop" ? (
        <button
          type="button"
          className="chat-gallery-button absolute right-3 top-3 z-50"
          aria-pressed={dropActive}
          onClick={() => setDropActive((active) => !active)}
        >
          {dropActive ? (zh ? "结束拖放" : "End drag") : zh ? "模拟拖放" : "Simulate drag"}
        </button>
      ) : null}
      {composer}
    </div>
  );
}

function ComposerCard(props: {
  variant: ComposerVariant;
  locale: Locale;
  title: string;
  description: string;
  badge?: string;
  tone?: "running" | "success" | "error";
  fullWidth?: boolean;
}) {
  const { variant, locale, title, description, badge, tone, fullWidth } = props;
  return (
    <GalleryComponentCard
      title={title}
      description={description}
      badge={badge}
      tone={tone}
      fullWidth={fullWidth}
      flush
      footer="ChatComposerBar · desktop surface · isolated callbacks"
    >
      <GalleryComposerHarness variant={variant} locale={locale} />
    </GalleryComponentCard>
  );
}

export function ComposerGallery(props: { scenarioId: ChatGalleryScenarioId; locale: Locale }) {
  const { scenarioId, locale } = props;
  const zh = locale === "zh-CN";
  if (scenarioId === "composer-idle") {
    return (
      <div className="chat-gallery-component-grid">
        <ComposerCard
          variant="empty"
          locale={locale}
          title={zh ? "空白输入框" : "Empty composer"}
          description={
            zh
              ? "模型、思考档位、上下文用量和 Git 控件均为真实组件。"
              : "Real model, reasoning, context usage, and Git controls."
          }
          badge="idle"
        />
        <ComposerCard
          variant="prefilled"
          locale={locale}
          title={zh ? "预填草稿 + Plan" : "Prefilled draft + Plan"}
          description={
            zh ? "可编辑草稿并切换运行时控件。" : "Edit the draft and toggle runtime controls."
          }
          badge="draft"
          tone="running"
        />
        <ComposerCard
          variant="disabled"
          locale={locale}
          title={zh ? "无模型 / 禁用" : "No model / disabled"}
          description={
            zh ? "无可用模型时的不可发送状态。" : "Non-sendable state without a configured model."
          }
          badge="disabled"
          tone="error"
          fullWidth
        />
      </div>
    );
  }

  if (scenarioId === "composer-busy") {
    return (
      <div className="chat-gallery-component-grid">
        <ComposerCard
          variant="sending"
          locale={locale}
          title={zh ? "生成中" : "Generating"}
          description={
            zh
              ? "主操作变为停止；输入草稿后可加入队列。"
              : "Primary action stops the run; a draft can be queued."
          }
          badge="running"
          tone="running"
        />
        <ComposerCard
          variant="queued"
          locale={locale}
          title={zh ? "多轮排队" : "Queued turns"}
          description={
            zh
              ? "支持排序、编辑、立即执行、移除和折叠。"
              : "Reorder, edit, run now, remove, or collapse queued turns."
          }
          badge="3 queued"
          tone="running"
        />
      </div>
    );
  }

  if (scenarioId === "composer-files") {
    return (
      <div className="chat-gallery-component-grid">
        <ComposerCard
          variant="attachments"
          locale={locale}
          title={zh ? "待发送附件" : "Pending attachments"}
          description={
            zh
              ? "图片、PDF、表格和大段粘贴文本。"
              : "Image, PDF, spreadsheet, and large pasted text."
          }
          badge="4 files"
          tone="success"
        />
        <ComposerCard
          variant="uploading"
          locale={locale}
          title={zh ? "上传中" : "Uploading"}
          description={
            zh
              ? "发送和压缩操作在上传期间被阻止。"
              : "Send and compaction are blocked during upload."
          }
          badge="uploading"
          tone="running"
        />
        <ComposerCard
          variant="drop"
          locale={locale}
          title={zh ? "文件拖放反馈" : "File-drop feedback"}
          description={
            zh ? "切换按钮模拟拖拽命中输入框。" : "Toggle a drag-over state on the composer."
          }
          badge="drag over"
          fullWidth
        />
      </div>
    );
  }

  return (
    <div className="chat-gallery-component-grid">
      <ComposerCard
        variant="overlays"
        locale={locale}
        title={zh ? "任务进度 + 工具审批" : "Task progress + approval"}
        description={
          zh
            ? "审批面板替换输入卡片，任务进度保留在其上方。"
            : "Approval replaces the input card while task progress remains above it."
        }
        badge="composed"
        tone="running"
        fullWidth
      />
    </div>
  );
}
