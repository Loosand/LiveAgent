import type {
  AssistantMessage,
  Message,
  ToolCall,
  ToolResultMessage,
  Usage,
} from "@liveagent/app/lib/agentTypes";
import type { StoredSummaryMessage } from "@liveagent/app/lib/chat/conversation/conversationState";
import type {
  DeleteResultDetails,
  EditResultDetails,
  GlobResultDetails,
  GrepResultDetails,
  ListResultDetails,
  ReadImageResultDetails,
  ReadPdfResultDetails,
  ReadTextResultDetails,
  WriteResultDetails,
} from "@liveagent/ui/contracts/builtinTools";
import type { AskUserQuestionResultDetails } from "@liveagent/ui/lib/chat/askUserQuestion";
import type { HostedSearchBlock } from "@liveagent/ui/lib/chat/hostedSearch";
import type { ExitPlanModeResultDetails } from "@liveagent/ui/lib/chat/planMode";
import type { PendingUploadedFile } from "@liveagent/ui/lib/chat/uploadedFiles";

/**
 * Deterministic, display-only inputs for the chat gallery.
 *
 * These fixtures deliberately stop at the production `Message[]` boundary. They do not
 * execute tools, write history, contact a provider, or hand-author transcript DOM data.
 */
export type ChatGalleryFixture = {
  title: string;
  description: string;
  messages: Message[];
  summary?: StoredSummaryMessage;
  tags?: readonly string[];
};

type GalleryUserMessage = Extract<Message, { role: "user" }> & {
  id: string;
  liveAgentDisplayContent?: string;
  liveAgentAttachments?: PendingUploadedFile[];
};

type GalleryAssistantMessage = AssistantMessage & {
  id: string;
  liveAgentContextUsage?: {
    totalTokens: number;
    fixedTokens: number;
  };
  promptVersion?: string;
  compactionStats?: {
    conversationTokens?: number;
    summarizer?: {
      inputTokens?: number;
      outputTokens?: number;
    };
  };
};

type GalleryToolResultMessage = ToolResultMessage & { id: string };

const BASE_TIMESTAMP = Date.UTC(2026, 0, 15, 9, 30, 0);
const ONE_MINUTE = 60_000;

const ZERO_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  total: 0,
} satisfies Usage["cost"];

function usage(input: number, output: number, cacheRead = 0): Usage {
  return {
    input,
    output,
    cacheRead,
    cacheWrite: 0,
    reasoning: Math.min(output, Math.floor(output * 0.35)),
    totalTokens: input + output,
    cost: ZERO_COST,
  };
}

function at(minuteOffset: number) {
  return BASE_TIMESTAMP + minuteOffset * ONE_MINUTE;
}

function userMessage(params: {
  id: string;
  content: GalleryUserMessage["content"];
  minute: number;
  displayContent?: string;
  attachments?: PendingUploadedFile[];
}): GalleryUserMessage {
  return {
    role: "user",
    id: params.id,
    content: params.content,
    timestamp: at(params.minute),
    ...(params.displayContent !== undefined
      ? { liveAgentDisplayContent: params.displayContent }
      : {}),
    ...(params.attachments ? { liveAgentAttachments: params.attachments } : {}),
  };
}

function assistantMessage(params: {
  id: string;
  content: AssistantMessage["content"];
  minute: number;
  stopReason?: AssistantMessage["stopReason"];
  messageUsage?: Usage;
  contextTokens?: number;
  provider?: string;
  model?: string;
  api?: string;
  errorMessage?: string;
}): GalleryAssistantMessage {
  const messageUsage = params.messageUsage ?? usage(1_840, 420, 640);
  return {
    role: "assistant",
    id: params.id,
    responseId: `response-${params.id}`,
    content: params.content,
    provider: params.provider ?? "gallery",
    model: params.model ?? "gallery-model",
    api: params.api ?? "openai-responses",
    stopReason: params.stopReason ?? "stop",
    usage: messageUsage,
    timestamp: at(params.minute),
    ...(params.errorMessage ? { errorMessage: params.errorMessage } : {}),
    ...(params.contextTokens
      ? {
          liveAgentContextUsage: {
            totalTokens: params.contextTokens,
            fixedTokens: 1_100,
          },
        }
      : {}),
  };
}

function toolCall(id: string, name: string, args: Record<string, unknown>): ToolCall {
  return {
    type: "toolCall",
    id,
    name,
    arguments: args,
  };
}

function toolResult(params: {
  id: string;
  toolCallId: string;
  toolName: string;
  text: string;
  minute: number;
  isError?: boolean;
  details?: unknown;
  image?: { data: string; mimeType: string };
}): GalleryToolResultMessage {
  return {
    role: "toolResult",
    id: params.id,
    toolCallId: params.toolCallId,
    toolName: params.toolName,
    content: [
      { type: "text", text: params.text },
      ...(params.image
        ? [{ type: "image" as const, data: params.image.data, mimeType: params.image.mimeType }]
        : []),
    ],
    isError: params.isError ?? false,
    timestamp: at(params.minute),
    ...(params.details !== undefined ? { details: params.details } : {}),
  };
}

function hostedSearch(block: HostedSearchBlock): AssistantMessage["content"][number] {
  // pi-ai intentionally models provider-neutral content only; LiveAgent enriches that
  // boundary with hosted-search blocks before projecting it through the real renderer.
  return block as unknown as AssistantMessage["content"][number];
}

const RICH_CONTENT_MESSAGES: Message[] = [
  userMessage({
    id: "gallery-rich-user",
    minute: 0,
    content: "请给我一个能覆盖聊天富文本渲染的完整示例。",
  }),
  assistantMessage({
    id: "gallery-rich-assistant",
    minute: 1,
    contextTokens: 8_960,
    messageUsage: usage(7_820, 1_140, 2_400),
    content: [
      {
        type: "text",
        text: [
          "下面是一条用于 UI 回归的**综合富文本回复**，包含 `inline code`、链接和引用。",
          "",
          "> 设计原则：fixture 只提供输入，渲染仍走生产组件。",
          "",
          "## 状态矩阵",
          "",
          "| 状态 | 预期 | 备注 |",
          "| --- | ---: | --- |",
          "| streaming | 16 ms | 应保持稳定布局 |",
          "| settled | 0 次重挂载 | 支持复制与选择 |",
          "",
          "1. 用户消息与附件",
          "2. 推理、工具调用和结果",
          "3. Markdown、数学公式与 Mermaid",
          "",
          "行内公式 $E = mc^2$，块级公式：",
          "",
          "$$",
          "L(\\theta) = -\\sum_i y_i \\log p_\\theta(y_i \\mid x_i)",
          "$$",
          "",
          "```ts",
          "type ChatState = 'idle' | 'streaming' | 'waiting' | 'failed';",
          "",
          "export function statusLabel(state: ChatState): string {",
          "  return state === 'streaming' ? '正在生成' : state;",
          "}",
          "```",
          "",
          "```mermaid",
          "flowchart LR",
          "  Fixture[Raw Message fixture] --> Projection[Production projection]",
          "  Projection --> Transcript[Chat transcript]",
          "```",
          "",
          "可点击文件：[ChatTranscript.tsx](/Volumes/ssd/LiveAgent/crates/agent-gui/src/pages/chat/transcript/ChatTranscript.tsx)。",
          "",
          "- [x] 完成态",
          "- [ ] 待处理态",
          "",
          "最后附上一段很长的不可断路径用于测试溢出：",
          "`packages/chat/surfaces/a-very-long-component-name-that-must-not-break-the-layout/ConversationSurface.tsx`",
        ].join("\n"),
      },
    ],
  }),
];

const ATTACHMENTS: PendingUploadedFile[] = [
  {
    relativePath: "uploads/architecture.png",
    absolutePath: "/mock-workspace/uploads/architecture.png",
    fileName: "architecture.png",
    kind: "image",
    sizeBytes: 248_320,
  },
  {
    relativePath: "uploads/product-spec.pdf",
    absolutePath: "/mock-workspace/uploads/product-spec.pdf",
    fileName: "product-spec.pdf",
    kind: "pdf",
    sizeBytes: 1_245_184,
  },
  {
    relativePath: "uploads/metrics.xlsx",
    absolutePath: "/mock-workspace/uploads/metrics.xlsx",
    fileName: "metrics.xlsx",
    kind: "spreadsheet",
    sizeBytes: 86_016,
  },
  {
    relativePath: "uploads/pasted-text-1.txt",
    absolutePath: "/mock-workspace/uploads/pasted-text-1.txt",
    fileName: "pasted-text-1.txt",
    kind: "text",
    sizeBytes: 18_420,
    displayMode: "largePaste",
    displayLabel: "Pasted text 1",
    displayCharCount: 18_420,
    displayLineCount: 326,
  },
];

const ATTACHMENT_DISPLAY_TEXT = [
  "请比较这些附件，并结合下面粘贴的日志给出结论。",
  "",
  "[Pasted text 1: uploads/pasted-text-1.txt]",
].join("\n");

const ATTACHMENT_MESSAGES: Message[] = [
  userMessage({
    id: "gallery-attachments-user",
    minute: 10,
    displayContent: ATTACHMENT_DISPLAY_TEXT,
    attachments: ATTACHMENTS,
    content: [
      ATTACHMENT_DISPLAY_TEXT,
      "",
      "The user attached the files below to this message.",
      "Use Read with these exact paths before analyzing or modifying them:",
      ...ATTACHMENTS.map((file) => `- ${file.absolutePath} (${file.kind})`),
    ].join("\n"),
  }),
  assistantMessage({
    id: "gallery-attachments-assistant",
    minute: 11,
    content: [
      {
        type: "text",
        text: "已收到 1 张图片、1 份 PDF、1 份表格和一段长粘贴文本。这个 fixture 不会读取这些虚拟路径。",
      },
    ],
  }),
];

const THINKING_AND_SEARCH_MESSAGES: Message[] = [
  userMessage({
    id: "gallery-thinking-user",
    minute: 20,
    content: "先分析问题，再展示一次带来源的联网搜索结果。",
  }),
  assistantMessage({
    id: "gallery-thinking-assistant",
    minute: 21,
    contextTokens: 12_640,
    content: [
      {
        type: "thinking",
        thinking: [
          "我需要先拆分问题：",
          "",
          "1. 确认 UI 的展示边界；",
          "2. 收集来源；",
          "3. 将事实与推断分开。",
          "",
          "这里故意保留多段推理，用来测试折叠、展开与长内容滚动。",
        ].join("\n"),
      },
      hostedSearch({
        type: "hostedSearch",
        id: "gallery-search-completed",
        provider: "gallery-search",
        status: "completed",
        queries: ["React streaming UI stable keys", "accessible chat transcript patterns"],
        sources: [
          {
            url: "https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key",
            title: "React: Keeping list items in order with key",
            snippet: "Keys let React identify items across updates.",
            sourceType: "source",
          },
          {
            url: "https://www.w3.org/WAI/ARIA/apg/",
            title: "ARIA Authoring Practices Guide",
            snippet: "Patterns and guidance for accessible web widgets.",
            sourceType: "source",
          },
        ],
        updatedAt: at(21),
      }),
      {
        type: "text",
        text: [
          "综合来源后，建议让静态历史和流式状态共享稳定标识，并为交互卡片保留清晰焦点顺序。",
          "",
          "参考：[React keys](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key) 与 [ARIA APG](https://www.w3.org/WAI/ARIA/apg/)。",
        ].join("\n"),
      },
      hostedSearch({
        type: "hostedSearch",
        id: "gallery-search-failed",
        provider: "gallery-search",
        status: "failed",
        queries: ["intentionally failed secondary query"],
        sources: [],
        updatedAt: at(22),
      }),
    ],
  }),
];

const TOOL_STATE_MESSAGES: Message[] = [
  userMessage({
    id: "gallery-tool-states-user",
    minute: 30,
    content: "展示等待、成功、失败、审批和 MCP 工具状态。",
  }),
  assistantMessage({
    id: "gallery-tool-states-assistant",
    minute: 31,
    stopReason: "toolUse",
    content: [
      { type: "thinking", thinking: "先并行检查工作区，再运行验证命令。" },
      toolCall("gallery-tool-waiting", "Read", { path: "README.md", start_line: 1, limit: 40 }),
      toolCall("gallery-tool-success", "Bash", {
        command: "pnpm --filter liveagent test:frontend",
        cwd: ".",
        timeout_ms: 120_000,
      }),
      toolCall("gallery-tool-error", "mcp_github_search_issues", {
        query: "label:bug chat transcript",
        limit: 10,
      }),
      toolCall("gallery-tool-approval", "Bash", {
        command: "git push origin preview/chat-gallery",
        cwd: ".",
        __toolApprovalPending: true,
        __toolApprovalSummary: "Push preview/chat-gallery to origin",
      }),
    ],
  }),
  toolResult({
    id: "gallery-tool-success-result",
    toolCallId: "gallery-tool-success",
    toolName: "Bash",
    minute: 32,
    text: [
      "> liveagent test:frontend",
      "✓ transcript projection (18 tests)",
      "✓ assistant bubble (27 tests)",
      "Test Files  8 passed",
    ].join("\n"),
  }),
  toolResult({
    id: "gallery-tool-error-result",
    toolCallId: "gallery-tool-error",
    toolName: "mcp_github_search_issues",
    minute: 32.1,
    isError: true,
    text: "MCP server `github` is unavailable. Reconnect the server and retry.",
    details: { serverId: "github", tool: "search_issues", phase: "connect" },
  }),
  assistantMessage({
    id: "gallery-tool-states-final",
    minute: 33,
    content: [
      {
        type: "text",
        text: "本轮保留两个没有结果的调用：普通 Read 显示等待态，Bash 带审批标记供支持该协议的宿主显示审批态。",
      },
    ],
  }),
];

const READ_TEXT_DETAILS = {
  kind: "read_text",
  path: "src/pages/chat/ChatPage.tsx",
  scope: "workspace",
  absolutePath: "/mock-workspace/src/pages/chat/ChatPage.tsx",
  relativePath: "src/pages/chat/ChatPage.tsx",
  displayPath: "src/pages/chat/ChatPage.tsx",
  fileId: "gallery-file-chat-page",
  startLine: 1,
  numLines: 32,
  totalLines: 418,
  truncated: true,
  isPartialView: true,
  mtimeMs: at(39),
  contentHash: "sha256:gallery-read-text",
  reusedExisting: false,
} satisfies ReadTextResultDetails;

const READ_IMAGE_DETAILS = {
  kind: "read_image",
  path: "assets/status-dot.png",
  scope: "workspace",
  absolutePath: "/mock-workspace/assets/status-dot.png",
  relativePath: "assets/status-dot.png",
  displayPath: "assets/status-dot.png",
  fileId: "gallery-file-status-dot",
  mimeType: "image/png",
  sizeBytes: 68,
  mtimeMs: at(39),
  contentHash: "sha256:gallery-read-image",
  reusedExisting: false,
} satisfies ReadImageResultDetails;

const READ_PDF_DETAILS = {
  kind: "read_pdf",
  path: "docs/chat-spec.pdf",
  scope: "workspace",
  absolutePath: "/mock-workspace/docs/chat-spec.pdf",
  relativePath: "docs/chat-spec.pdf",
  displayPath: "docs/chat-spec.pdf",
  fileId: "gallery-file-chat-spec",
  pageStart: 2,
  numPages: 3,
  totalPages: 18,
  truncated: true,
  mtimeMs: at(39),
  contentHash: "sha256:gallery-read-pdf",
  reusedExisting: false,
} satisfies ReadPdfResultDetails;

const GLOB_DETAILS = {
  kind: "glob",
  path: "src",
  scope: "workspace",
  relativePath: "src",
  displayPath: "src",
  targetKind: "dir",
  pattern: "**/*Chat*.tsx",
  sortBy: "path",
  offset: 0,
  maxResults: 20,
  total: 3,
  hasMore: false,
  paths: [
    "src/pages/chat/ChatPage.tsx",
    "src/pages/chat/transcript/ChatTranscript.tsx",
    "src/pages/chat/surfaces/ConversationPaneHost.tsx",
  ],
} satisfies GlobResultDetails;

const GREP_DETAILS = {
  kind: "grep",
  path: "src/pages/chat",
  scope: "workspace",
  relativePath: "src/pages/chat",
  displayPath: "src/pages/chat",
  targetKind: "dir",
  pattern: "isSending",
  filePattern: "*.tsx",
  ignoreCase: false,
  outputMode: "content",
  headLimit: 20,
  offset: 0,
  context: 1,
  multiline: false,
  matchCount: 2,
  fileCount: 2,
  hasMore: false,
  matches: [
    {
      path: "src/pages/chat/transcript/ChatTranscript.tsx",
      line: 84,
      text: "  isSending,",
      before: ["  liveTranscriptStore,"],
      after: ["  compaction,"],
    },
    {
      path: "src/pages/chat/surfaces/ConversationPaneHost.tsx",
      line: 202,
      text: "        isSending={binding.isSending}",
      before: ["        historyItems={binding.historyItems}"],
      after: ["        compaction={binding.compaction}"],
    },
  ],
  files: [
    { path: "src/pages/chat/transcript/ChatTranscript.tsx", count: 1, firstLine: 84 },
    { path: "src/pages/chat/surfaces/ConversationPaneHost.tsx", count: 1, firstLine: 202 },
  ],
} satisfies GrepResultDetails;

const LIST_DETAILS = {
  kind: "list",
  path: "src/pages/chat",
  scope: "workspace",
  relativePath: "src/pages/chat",
  displayPath: "src/pages/chat",
  targetKind: "dir",
  depth: 2,
  offset: 0,
  maxResults: 20,
  total: 4,
  hasMore: false,
  entries: [
    { path: "src/pages/chat/surfaces", kind: "dir" },
    { path: "src/pages/chat/transcript", kind: "dir" },
    { path: "src/pages/chat/ChatPage.tsx", kind: "file" },
    { path: "src/pages/chat/chatPageUtils.ts", kind: "file" },
  ],
} satisfies ListResultDetails;

const EDIT_DETAILS = {
  kind: "edit",
  path: "src/pages/chat/ChatPage.tsx",
  scope: "workspace",
  absolutePath: "/mock-workspace/src/pages/chat/ChatPage.tsx",
  relativePath: "src/pages/chat/ChatPage.tsx",
  displayPath: "src/pages/chat/ChatPage.tsx",
  fileId: "gallery-file-chat-page",
  replacements: 1,
  replaceAll: false,
  matchStrategy: "exact",
  expectedReplacements: 1,
  mtimeMs: at(42),
  contentHash: "sha256:gallery-edit",
  totalLines: 421,
  oldPreview: [
    "const title = isSending ? 'Working' : 'Ready';",
    "return <Header title={title} />;",
  ].join("\n"),
  newPreview: [
    "const title = isSending ? t('chat.working') : t('chat.ready');",
    "return <Header title={title} />;",
  ].join("\n"),
} satisfies EditResultDetails;

const WRITE_DETAILS = {
  kind: "write",
  path: "src/dev/chat-gallery/README.md",
  scope: "workspace",
  absolutePath: "/mock-workspace/src/dev/chat-gallery/README.md",
  relativePath: "src/dev/chat-gallery/README.md",
  displayPath: "src/dev/chat-gallery/README.md",
  fileId: "gallery-file-readme",
  mode: "rewrite",
  existedBefore: false,
  bytesWritten: 246,
  mtimeMs: at(42),
  contentHash: "sha256:gallery-write",
  totalLines: 12,
  preview: "# Chat Gallery\n\nDevelopment-only transcript scenarios.",
} satisfies WriteResultDetails;

const DELETE_DETAILS = {
  kind: "delete",
  path: "src/dev/chat-gallery/obsolete.fixture.json",
  scope: "workspace",
  absolutePath: "/mock-workspace/src/dev/chat-gallery/obsolete.fixture.json",
  relativePath: "src/dev/chat-gallery/obsolete.fixture.json",
  displayPath: "src/dev/chat-gallery/obsolete.fixture.json",
  fileId: "gallery-file-obsolete",
  targetKind: "file",
} satisfies DeleteResultDetails;

// A valid 1 x 1 transparent PNG. It is embedded so the fixture never reads the filesystem.
const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const FILE_OPERATION_MESSAGES: Message[] = [
  userMessage({
    id: "gallery-file-ops-user",
    minute: 40,
    content: "检查聊天页面，展示读取、搜索和文件变更结果。",
  }),
  assistantMessage({
    id: "gallery-file-ops-read-round",
    minute: 41,
    stopReason: "toolUse",
    content: [
      { type: "thinking", thinking: "先读取入口和资源，再搜索相关状态引用。" },
      toolCall("gallery-read-text", "Read", {
        path: "src/pages/chat/ChatPage.tsx",
        start_line: 1,
        limit: 32,
      }),
      toolCall("gallery-read-image", "Read", { path: "assets/status-dot.png" }),
      toolCall("gallery-read-pdf", "Read", {
        path: "docs/chat-spec.pdf",
        page_start: 2,
        page_limit: 3,
      }),
      toolCall("gallery-list", "List", { path: "src/pages/chat", depth: 2 }),
      toolCall("gallery-glob", "Glob", { pattern: "**/*Chat*.tsx", path: "src" }),
      toolCall("gallery-grep", "Grep", {
        pattern: "isSending",
        path: "src/pages/chat",
        file_pattern: "*.tsx",
        ignore_case: false,
        output_mode: "content",
        context: 1,
      }),
    ],
  }),
  toolResult({
    id: "gallery-read-text-result",
    toolCallId: "gallery-read-text",
    toolName: "Read",
    minute: 41.1,
    text: [
      "Read: src/pages/chat/ChatPage.tsx",
      "1 import { ChatTranscript } from './transcript/ChatTranscript';",
      "2 export function ChatPage() {",
      "3   return <ChatTranscript />;",
      "4 }",
    ].join("\n"),
    details: READ_TEXT_DETAILS,
  }),
  toolResult({
    id: "gallery-read-image-result",
    toolCallId: "gallery-read-image",
    toolName: "Read",
    minute: 41.2,
    text: "Read image: assets/status-dot.png\nmime=image/png\nsizeBytes=68",
    details: READ_IMAGE_DETAILS,
    image: { data: TRANSPARENT_PNG_BASE64, mimeType: "image/png" },
  }),
  toolResult({
    id: "gallery-read-pdf-result",
    toolCallId: "gallery-read-pdf",
    toolName: "Read",
    minute: 41.3,
    text: "Read PDF: docs/chat-spec.pdf\npages=2-4/18\n\nAcceptance criteria and transcript states…",
    details: READ_PDF_DETAILS,
  }),
  toolResult({
    id: "gallery-list-result",
    toolCallId: "gallery-list",
    toolName: "List",
    minute: 41.4,
    text: "[DIR] surfaces\n[DIR] transcript\n[FILE] ChatPage.tsx\n[FILE] chatPageUtils.ts",
    details: LIST_DETAILS,
  }),
  toolResult({
    id: "gallery-glob-result",
    toolCallId: "gallery-glob",
    toolName: "Glob",
    minute: 41.5,
    text: GLOB_DETAILS.paths.join("\n"),
    details: GLOB_DETAILS,
  }),
  toolResult({
    id: "gallery-grep-result",
    toolCallId: "gallery-grep",
    toolName: "Grep",
    minute: 41.6,
    text: GREP_DETAILS.matches
      .map((match) => `${match.path}:${match.line}:${match.text.trim()}`)
      .join("\n"),
    details: GREP_DETAILS,
  }),
  assistantMessage({
    id: "gallery-file-ops-write-round",
    minute: 42,
    stopReason: "toolUse",
    content: [
      { type: "text", text: "定位完成，现在展示三种文件变更。" },
      toolCall("gallery-edit", "Edit", {
        path: "src/pages/chat/ChatPage.tsx",
        old_string: EDIT_DETAILS.oldPreview,
        new_string: EDIT_DETAILS.newPreview,
        expected_replacements: 1,
      }),
      toolCall("gallery-write", "Write", {
        path: "src/dev/chat-gallery/README.md",
        content: WRITE_DETAILS.preview,
      }),
      toolCall("gallery-delete", "Delete", {
        path: "src/dev/chat-gallery/obsolete.fixture.json",
      }),
    ],
  }),
  toolResult({
    id: "gallery-edit-result",
    toolCallId: "gallery-edit",
    toolName: "Edit",
    minute: 42.1,
    text: "Edit: src/pages/chat/ChatPage.tsx\nreplacements=1\nreplaceAll=false",
    details: EDIT_DETAILS,
  }),
  toolResult({
    id: "gallery-write-result",
    toolCallId: "gallery-write",
    toolName: "Write",
    minute: 42.2,
    text: "File created successfully at: src/dev/chat-gallery/README.md",
    details: WRITE_DETAILS,
  }),
  toolResult({
    id: "gallery-delete-result",
    toolCallId: "gallery-delete",
    toolName: "Delete",
    minute: 42.3,
    text: "Delete: src/dev/chat-gallery/obsolete.fixture.json\nkind=file",
    details: DELETE_DETAILS,
  }),
  assistantMessage({
    id: "gallery-file-ops-final",
    minute: 43,
    contextTokens: 18_240,
    content: [
      {
        type: "text",
        text: "检查结束：读取与搜索结果完整，文件变更包括 1 次编辑、1 次新建和 1 次删除。",
      },
    ],
  }),
];

const INTERACTIVE_DECISION_MESSAGES: Message[] = [
  userMessage({
    id: "gallery-decisions-user",
    minute: 50,
    content: "展示已经回答、超时、取消的问题卡，以及已批准的计划卡。",
  }),
  assistantMessage({
    id: "gallery-decisions-ask-round",
    minute: 51,
    stopReason: "toolUse",
    content: [
      toolCall("gallery-ask-answered", "AskUserQuestion", {
        questions: [
          {
            id: "scope",
            header: "范围",
            prompt: "这次 gallery 首版覆盖哪一端？",
            options: [
              { label: "桌面端", description: "先覆盖主使用场景", recommended: true },
              { label: "桌面端与 Web", description: "范围更广，维护成本更高" },
            ],
          },
        ],
      }),
      toolCall("gallery-ask-timeout", "AskUserQuestion", {
        questions: [
          {
            id: "density",
            header: "密度",
            prompt: "工具结果默认采用哪种密度？",
            options: [{ label: "紧凑", recommended: true }, { label: "舒展" }],
          },
        ],
      }),
      toolCall("gallery-ask-cancelled", "AskUserQuestion", {
        questions: [
          {
            id: "secondary",
            header: "次要项",
            prompt: "是否继续添加实验状态？",
            options: [{ label: "继续" }, { label: "取消", recommended: true }],
          },
        ],
      }),
    ],
  }),
  toolResult({
    id: "gallery-ask-answered-result",
    toolCallId: "gallery-ask-answered",
    toolName: "AskUserQuestion",
    minute: 52,
    text: "用户已回答：桌面端",
    details: {
      kind: "ask_user_question",
      questions: [
        {
          id: "scope",
          header: "范围",
          prompt: "这次 gallery 首版覆盖哪一端？",
          options: [
            { label: "桌面端", description: "先覆盖主使用场景", recommended: true },
            { label: "桌面端与 Web", description: "范围更广，维护成本更高" },
          ],
        },
      ],
      answers: [
        {
          questionId: "scope",
          prompt: "这次 gallery 首版覆盖哪一端？",
          selectedLabel: "桌面端",
        },
      ],
    } satisfies AskUserQuestionResultDetails,
  }),
  toolResult({
    id: "gallery-ask-timeout-result",
    toolCallId: "gallery-ask-timeout",
    toolName: "AskUserQuestion",
    minute: 52.1,
    text: "等待超时，已采用推荐项：紧凑",
    details: {
      kind: "ask_user_question",
      questions: [
        {
          id: "density",
          header: "密度",
          prompt: "工具结果默认采用哪种密度？",
          options: [{ label: "紧凑", recommended: true }, { label: "舒展" }],
        },
      ],
      answers: [
        {
          questionId: "density",
          prompt: "工具结果默认采用哪种密度？",
          selectedLabel: "紧凑",
        },
      ],
      timedOut: true,
    } satisfies AskUserQuestionResultDetails,
  }),
  toolResult({
    id: "gallery-ask-cancelled-result",
    toolCallId: "gallery-ask-cancelled",
    toolName: "AskUserQuestion",
    minute: 52.2,
    text: "问题已取消",
    details: {
      kind: "ask_user_question",
      questions: [
        {
          id: "secondary",
          header: "次要项",
          prompt: "是否继续添加实验状态？",
          options: [{ label: "继续" }, { label: "取消", recommended: true }],
        },
      ],
      answers: [],
      cancelled: true,
    } satisfies AskUserQuestionResultDetails,
  }),
  assistantMessage({
    id: "gallery-decisions-plan-round",
    minute: 53,
    stopReason: "toolUse",
    content: [
      toolCall("gallery-plan-approved", "ExitPlanMode", {
        plan: [
          "## 实施计划",
          "",
          "1. 建立独立 DEV 入口。",
          "2. 用 raw `Message[]` 驱动生产 transcript。",
          "3. 增加主题、宽度和场景切换。",
          "4. 运行类型检查与浏览器验证。",
        ].join("\n"),
        __exitPlanModeApproved: true,
      }),
    ],
  }),
  toolResult({
    id: "gallery-plan-approved-result",
    toolCallId: "gallery-plan-approved",
    toolName: "ExitPlanMode",
    minute: 54,
    text: "计划已批准，可以开始实施。",
    details: {
      kind: "exit_plan_mode",
      plan: [
        "## 实施计划",
        "",
        "1. 建立独立 DEV 入口。",
        "2. 用 raw `Message[]` 驱动生产 transcript。",
        "3. 增加主题、宽度和场景切换。",
        "4. 运行类型检查与浏览器验证。",
      ].join("\n"),
      decision: "approve",
    } satisfies ExitPlanModeResultDetails,
  }),
];

const COMPACTION_SUMMARY_TEXT = [
  "## 已压缩的会话摘要",
  "",
  "用户要求建立一个仅开发环境可用的聊天 UI gallery。此前已经确认：",
  "",
  "- gallery 必须复用生产 transcript 与消息投影；",
  "- mock 仅位于消息和运行时事件输入边界；",
  "- 默认不得执行工具、调用模型或写入聊天历史；",
  "- 首版覆盖桌面端，并提供窄屏、深色和中文状态。",
].join("\n");

const COMPACTION_SUMMARY: StoredSummaryMessage = {
  role: "summary",
  id: "response-gallery-compaction-checkpoint",
  timestamp: at(63),
  content: COMPACTION_SUMMARY_TEXT,
  summaryMeta: {
    format: "plain-text-v1",
    strategy: "cumulative-checkpoint",
    coversThroughMessageId: "gallery-compaction-before-assistant",
    coveredMessageCount: 2,
    generatedBy: {
      providerId: "gallery",
      model: "gallery-summary-model",
      promptVersion: "gallery-summary-v1",
    },
    stats: {
      sourceMessageCount: 2,
      estimatedInputTokens: 42_680,
      outputTokens: 286,
      contextTokensAfter: 7_420,
      summarizer: { inputTokens: 5_800, outputTokens: 286 },
    },
  },
};

const COMPACTION_CHECKPOINT: GalleryAssistantMessage = {
  ...assistantMessage({
    id: "gallery-compaction-checkpoint",
    minute: 63,
    api: "liveagent-compaction",
    provider: "gallery",
    model: "gallery-summary-model",
    messageUsage: usage(0, 0),
    content: [{ type: "text", text: COMPACTION_SUMMARY_TEXT }],
  }),
  responseId: COMPACTION_SUMMARY.id,
  promptVersion: "gallery-summary-v1",
  compactionStats: {
    conversationTokens: 42_680,
    summarizer: { inputTokens: 5_800, outputTokens: 286 },
  },
};

const COMPACTION_MESSAGES: Message[] = [
  userMessage({
    id: "gallery-compaction-before-user",
    minute: 61,
    content: "我们已经讨论了很久，请整理已有决定后继续。",
  }),
  assistantMessage({
    id: "gallery-compaction-before-assistant",
    minute: 62,
    contextTokens: 42_680,
    content: [{ type: "text", text: "我会先压缩此前上下文，再从确定的实施边界继续。" }],
  }),
  COMPACTION_CHECKPOINT,
  userMessage({
    id: "gallery-compaction-after-user",
    minute: 64,
    content: "继续实现，并确保 gallery 不污染真实会话。",
  }),
  assistantMessage({
    id: "gallery-compaction-after-assistant",
    minute: 65,
    contextTokens: 7_940,
    content: [
      {
        type: "text",
        text: "收到。后续场景只消费确定性 fixture，所有按钮默认使用本地受控回调。",
      },
    ],
  }),
];

const ERROR_AND_ABORT_MESSAGES: Message[] = [
  userMessage({
    id: "gallery-error-user",
    minute: 70,
    content: "再展示一次被中止和一次 provider 错误。",
  }),
  assistantMessage({
    id: "gallery-aborted-assistant",
    minute: 71,
    stopReason: "aborted",
    errorMessage: "The request was cancelled by the user.",
    content: [
      { type: "thinking", thinking: "正在整理剩余步骤……" },
      { type: "text", text: "我已经完成前两项，接下来准备——" },
    ],
  }),
  userMessage({
    id: "gallery-error-retry-user",
    minute: 72,
    content: "重试一次。",
  }),
  assistantMessage({
    id: "gallery-error-assistant",
    minute: 73,
    stopReason: "error",
    errorMessage: "Provider returned HTTP 429: rate limit exceeded.",
    content: [
      {
        type: "text",
        text: "请求失败：服务当前限流。稍后重试，或切换到其他可用模型。",
      },
    ],
  }),
];

export const CHAT_GALLERY_FIXTURES = {
  empty: {
    title: "空会话",
    description: "没有历史消息，用于展示起始态和空态布局。",
    messages: [],
    tags: ["empty", "onboarding"],
  },
  richContent: {
    title: "综合富文本",
    description: "Markdown、代码、表格、数学公式、Mermaid、文件链接和 usage。",
    messages: RICH_CONTENT_MESSAGES,
    tags: ["markdown", "code", "math", "mermaid"],
  },
  attachments: {
    title: "用户附件",
    description: "图片、PDF、表格和大段粘贴文本的生产消息元数据。",
    messages: ATTACHMENT_MESSAGES,
    tags: ["user", "attachments", "large-paste"],
  },
  thinkingAndSearch: {
    title: "推理与联网搜索",
    description: "多段 thinking、成功搜索、失败搜索、来源卡和引用链接。",
    messages: THINKING_AND_SEARCH_MESSAGES,
    tags: ["thinking", "hosted-search", "sources"],
  },
  toolStates: {
    title: "工具状态",
    description: "等待、成功、失败、MCP 和带审批协议标记的工具调用。",
    messages: TOOL_STATE_MESSAGES,
    tags: ["tools", "waiting", "success", "error", "approval", "mcp"],
  },
  fileOperations: {
    title: "读取、搜索与文件变更",
    description: "Read/Image/PDF、List/Glob/Grep 以及 Edit/Write/Delete 结果。",
    messages: FILE_OPERATION_MESSAGES,
    tags: ["tools", "read", "search", "file-changes"],
  },
  interactiveDecisions: {
    title: "问题与计划决策",
    description: "已回答、超时、取消的提问卡，以及已批准的计划卡。",
    messages: INTERACTIVE_DECISION_MESSAGES,
    tags: ["ask-user", "plan", "answered", "timed-out", "cancelled"],
  },
  compaction: {
    title: "上下文压缩",
    description: "真实 checkpoint assistant schema、摘要卡元数据和压缩后的新一轮。",
    messages: COMPACTION_MESSAGES,
    summary: COMPACTION_SUMMARY,
    tags: ["compaction", "checkpoint", "summary"],
  },
  errorAndAbort: {
    title: "中止与错误",
    description: "部分回复被用户中止，以及 provider 错误的落定消息。",
    messages: ERROR_AND_ABORT_MESSAGES,
    tags: ["aborted", "error", "retry"],
  },
  kitchenSink: {
    title: "全部静态状态",
    description: "一个可滚动的综合会话，集中展示绝大多数历史消息 UI。",
    messages: [
      ...COMPACTION_MESSAGES,
      ...ATTACHMENT_MESSAGES,
      ...RICH_CONTENT_MESSAGES,
      ...THINKING_AND_SEARCH_MESSAGES,
      ...TOOL_STATE_MESSAGES,
      ...FILE_OPERATION_MESSAGES,
      ...INTERACTIVE_DECISION_MESSAGES,
      ...ERROR_AND_ABORT_MESSAGES,
    ],
    summary: COMPACTION_SUMMARY,
    tags: ["regression", "all-static-states"],
  },
} satisfies Record<string, ChatGalleryFixture>;

export type ChatGalleryFixtureId = keyof typeof CHAT_GALLERY_FIXTURES;

/** Return an isolated copy so a replay/projection may safely annotate or reorder messages. */
export function createChatGalleryFixture(id: ChatGalleryFixtureId): ChatGalleryFixture {
  const fixture: ChatGalleryFixture = CHAT_GALLERY_FIXTURES[id];
  return {
    title: fixture.title,
    description: fixture.description,
    messages: structuredClone(fixture.messages),
    ...(fixture.summary ? { summary: structuredClone(fixture.summary) } : {}),
    ...(fixture.tags ? { tags: [...fixture.tags] } : {}),
  };
}

export function isChatGalleryFixtureId(value: string): value is ChatGalleryFixtureId {
  return Object.hasOwn(CHAT_GALLERY_FIXTURES, value);
}
