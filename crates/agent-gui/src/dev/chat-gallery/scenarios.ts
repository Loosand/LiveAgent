export const CHAT_GALLERY_SCENARIOS = [
  {
    id: "conversation-overview",
    group: "conversation",
    title: { "zh-CN": "综合会话", "en-US": "Conversation overview" },
    description: {
      "zh-CN": "真实消息投影生成的用户、富文本、思考、工具与摘要组合。",
      "en-US": "Users, rich content, reasoning, tools, and summaries through the real projector.",
    },
  },
  {
    id: "rich-content",
    group: "conversation",
    title: { "zh-CN": "富文本回复", "en-US": "Rich assistant content" },
    description: {
      "zh-CN": "Markdown、代码、表格、数学公式、链接与用量详情。",
      "en-US": "Markdown, code, tables, math, links, and usage details.",
    },
  },
  {
    id: "liveagent-overview",
    group: "conversation",
    title: { "zh-CN": "LiveAgent 项目介绍", "en-US": "LiveAgent project overview" },
    description: {
      "zh-CN": "参照桌面端阅读排版的项目介绍，集中核对标题、表格、代码、引用与列表。",
      "en-US":
        "A project overview for checking desktop typography, tables, code, quotes, and lists.",
    },
  },
  {
    id: "user-attachments",
    group: "conversation",
    title: { "zh-CN": "用户附件", "en-US": "User attachments" },
    description: {
      "zh-CN": "图片、PDF、表格和大段粘贴文本的真实消息元数据。",
      "en-US": "Real message metadata for images, PDFs, spreadsheets, and large pasted text.",
    },
  },
  {
    id: "thinking-search",
    group: "conversation",
    title: { "zh-CN": "思考与联网搜索", "en-US": "Reasoning and search" },
    description: {
      "zh-CN": "多段思考、成功/失败搜索、来源卡和引用链接。",
      "en-US": "Reasoning blocks, successful and failed searches, sources, and citations.",
    },
  },
  {
    id: "tool-results",
    group: "conversation",
    title: { "zh-CN": "工具结果矩阵", "en-US": "Tool result matrix" },
    description: {
      "zh-CN": "终端、读写、编辑、搜索与错误结果使用真实工具组件呈现。",
      "en-US": "Shell, read, write, edit, search, and error results in production components.",
    },
  },
  {
    id: "streaming-run",
    group: "conversation",
    title: { "zh-CN": "流式运行", "en-US": "Streaming run" },
    description: {
      "zh-CN": "可播放、暂停和逐步推进的思考、文本、工具及重试过程。",
      "en-US": "Play, pause, or step through reasoning, text, tools, and retries.",
    },
  },
  {
    id: "empty-start",
    group: "conversation",
    title: { "zh-CN": "空会话", "en-US": "Empty conversation" },
    description: {
      "zh-CN": "已配置模型时的开始聊天引导。",
      "en-US": "Start-chat guidance when models are configured.",
    },
  },
  {
    id: "empty-no-model",
    group: "conversation",
    title: { "zh-CN": "未配置模型", "en-US": "No models" },
    description: {
      "zh-CN": "没有可用模型时的设置引导。",
      "en-US": "Settings guidance when no model is available.",
    },
  },
  {
    id: "history-loading",
    group: "conversation",
    title: { "zh-CN": "切换会话", "en-US": "History switching" },
    description: {
      "zh-CN": "历史恢复与会话切换加载层。",
      "en-US": "History restoration and conversation-switch loading overlay.",
    },
  },
  {
    id: "history-decisions",
    group: "conversation",
    title: { "zh-CN": "历史决策卡", "en-US": "Settled decision history" },
    description: {
      "zh-CN": "已回答、超时、取消的问题，以及已批准计划在历史中的形态。",
      "en-US": "Answered, timed-out, cancelled questions and approved plans in history.",
    },
  },
  {
    id: "compaction-summary",
    group: "conversation",
    title: { "zh-CN": "压缩与摘要", "en-US": "Compaction and summary" },
    description: {
      "zh-CN": "生产 checkpoint schema、摘要卡和压缩后的下一轮。",
      "en-US": "Production checkpoint schema, summary card, and post-compaction turn.",
    },
  },
  {
    id: "error-abort",
    group: "conversation",
    title: { "zh-CN": "中止与错误", "en-US": "Abort and provider error" },
    description: {
      "zh-CN": "用户中止的部分回复与 provider 错误落定状态。",
      "en-US": "A user-aborted partial reply and a settled provider error.",
    },
  },
  {
    id: "ask-user",
    group: "interactive",
    title: { "zh-CN": "向用户提问", "en-US": "Ask user" },
    description: {
      "zh-CN": "待回答、已回答、超时与取消四种状态。",
      "en-US": "Pending, answered, timed-out, and cancelled states.",
    },
  },
  {
    id: "plan-mode",
    group: "interactive",
    title: { "zh-CN": "计划审批", "en-US": "Plan decision" },
    description: {
      "zh-CN": "待批准、已批准和只读计划卡片。",
      "en-US": "Pending, approved, and read-only plan cards.",
    },
  },
  {
    id: "tool-approval",
    group: "interactive",
    title: { "zh-CN": "工具审批", "en-US": "Tool approval" },
    description: {
      "zh-CN": "单项、批量与失败反馈，行为在页面内隔离。",
      "en-US": "Single, batched, and failed decisions isolated inside the gallery.",
    },
  },
  {
    id: "task-progress",
    group: "interactive",
    title: { "zh-CN": "任务进度", "en-US": "Task progress" },
    description: {
      "zh-CN": "运行中、暂停和完成状态。",
      "en-US": "Running, paused, and completed task states.",
    },
  },
  {
    id: "composer-idle",
    group: "composer",
    title: { "zh-CN": "输入框基础态", "en-US": "Composer basics" },
    description: {
      "zh-CN": "空白、预填、禁用与无模型状态。",
      "en-US": "Empty, prefilled, disabled, and no-model states.",
    },
  },
  {
    id: "composer-busy",
    group: "composer",
    title: { "zh-CN": "生成与队列", "en-US": "Running and queued" },
    description: {
      "zh-CN": "发送中、停止、排队轮次和上下文用量。",
      "en-US": "Sending, stop, queued turns, and context usage.",
    },
  },
  {
    id: "composer-files",
    group: "composer",
    title: { "zh-CN": "附件与拖放", "en-US": "Attachments and drop" },
    description: {
      "zh-CN": "多种待上传附件、上传中与文件拖放反馈。",
      "en-US": "Pending attachment types, uploading, and file-drop feedback.",
    },
  },
  {
    id: "composer-overlays",
    group: "composer",
    title: { "zh-CN": "审批与任务覆盖", "en-US": "Approval and task layers" },
    description: {
      "zh-CN": "真实输入框中组合任务进度和工具审批面板。",
      "en-US": "Task progress and tool approval composed inside the real composer.",
    },
  },
] as const;

export type ChatGalleryScenario = (typeof CHAT_GALLERY_SCENARIOS)[number];
export type ChatGalleryScenarioId = ChatGalleryScenario["id"];
export type ChatGalleryScenarioGroup = ChatGalleryScenario["group"];

export const DEFAULT_CHAT_GALLERY_SCENARIO: ChatGalleryScenarioId = "conversation-overview";

export function isChatGalleryScenarioId(value: string | null): value is ChatGalleryScenarioId {
  return CHAT_GALLERY_SCENARIOS.some((scenario) => scenario.id === value);
}
