import { AskUserQuestionCard } from "@liveagent/ui/components/chat/AskUserQuestionCard";
import { PlanModeCard } from "@liveagent/ui/components/chat/PlanModeCard";
import { TaskProgressBar } from "@liveagent/ui/components/chat/TaskProgressBar";
import {
  type PendingApprovalItem,
  ToolApprovalBar,
  type ToolApprovalDecision,
} from "@liveagent/ui/components/chat/ToolApprovalBar";
import type {
  AskUserQuestionAnswer,
  AskUserQuestionItem,
} from "@liveagent/ui/lib/chat/askUserQuestion";
import { createTaskProgressSnapshot } from "@liveagent/ui/lib/chat/taskProgress";
import { useState } from "react";
import type { Locale } from "../../i18n/config";
import { GalleryComponentCard } from "./GalleryComponentCard";
import type { ChatGalleryScenarioId } from "./scenarios";

const QUESTIONS: AskUserQuestionItem[] = [
  {
    id: "framework",
    header: "UI",
    prompt: "你希望用哪种方式承载聊天组件展厅？",
    options: [
      {
        label: "独立开发页面",
        description: "直接复用当前 Vite、生产 CSS 和宿主适配器。",
        recommended: true,
      },
      { label: "Storybook", description: "组件 controls 完整，但需要维护第二套构建配置。" },
      { label: "正常聊天路由", description: "最接近应用，但会绑定真实历史和运行时。" },
    ],
  },
  {
    id: "data",
    header: "Data",
    prompt: "样例数据应采用哪种层级？",
    options: [
      {
        label: "原始消息 + 真实投影",
        description: "只 mock 输入边界，消息 UI 仍走生产转换链路。",
        recommended: true,
      },
      { label: "直接构造 UI rows", description: "更省事，但可能绕过真实业务逻辑。" },
      { label: "调用真实模型", description: "最不可控，并可能产生费用和副作用。" },
    ],
  },
];

const ANSWERS: AskUserQuestionAnswer[] = [
  {
    questionId: "framework",
    prompt: QUESTIONS[0].prompt,
    selectedLabel: "独立开发页面",
  },
  {
    questionId: "data",
    prompt: QUESTIONS[1].prompt,
    selectedLabel: "原始消息 + 真实投影",
  },
];

const PLAN = `## 实施计划

1. 增加一个仅在开发服务器使用的独立入口。
2. 用原始消息 fixture 经过生产投影渲染 \`ChatTranscript\`。
3. 用真实 live store 回放流式状态，并隔离所有外部副作用。
4. 为主题、语言、视口和场景建立可分享的 URL。`;

function AskUserPendingCard() {
  const [answers, setAnswers] = useState<AskUserQuestionAnswer[]>();
  return (
    <AskUserQuestionCard
      questions={QUESTIONS}
      answers={answers}
      interactive={!answers}
      deadlineAt={Date.now() + 3 * 60_000}
      onSubmit={async (nextAnswers) => {
        setAnswers(nextAnswers);
        return { ok: true };
      }}
    />
  );
}

function PlanPendingCard() {
  const [approved, setApproved] = useState(false);
  return (
    <PlanModeCard
      plan={PLAN}
      pending={!approved}
      approved={approved}
      onSubmit={async () => {
        setApproved(true);
        return { ok: true };
      }}
    />
  );
}

function ApprovalHarness(props: { initialItems: PendingApprovalItem[]; shouldFail?: boolean }) {
  const { initialItems, shouldFail = false } = props;
  const [pending, setPending] = useState(initialItems);
  const decide = async (toolCallId: string, _decision: ToolApprovalDecision) => {
    if (shouldFail) return { ok: false, message: "Gallery simulated rejection from the host." };
    setPending((current) => current.filter((item) => item.toolCallId !== toolCallId));
    return { ok: true };
  };
  return pending.length > 0 ? (
    <ToolApprovalBar pending={pending} onDecide={decide} onDecideAll={async () => setPending([])} />
  ) : (
    <div className="chat-gallery-empty-state">
      <p className="chat-gallery-empty-title">Decision recorded locally</p>
      <p className="chat-gallery-empty-description">
        Reset the scenario to restore the pending approval. No tool was executed.
      </p>
    </div>
  );
}

function AskUserGallery({ locale }: { locale: Locale }) {
  const zh = locale === "zh-CN";
  return (
    <div className="chat-gallery-component-grid">
      <GalleryComponentCard
        title={zh ? "等待回答" : "Pending answer"}
        description={
          zh ? "可完成两个问题并在当前卡片内落定。" : "Answer both questions and settle locally."
        }
        badge="interactive"
        tone="running"
      >
        <AskUserPendingCard />
      </GalleryComponentCard>
      <GalleryComponentCard
        title={zh ? "已回答" : "Answered"}
        description={zh ? "历史消息中的只读结果。" : "Read-only result stored in history."}
        badge="settled"
        tone="success"
      >
        <AskUserQuestionCard questions={QUESTIONS} answers={ANSWERS} interactive={false} />
      </GalleryComponentCard>
      <GalleryComponentCard
        title={zh ? "超时自动选择" : "Timed out"}
        description={zh ? "按推荐项自动落定的结果。" : "Auto-settled using recommended answers."}
        badge="timeout"
      >
        <AskUserQuestionCard questions={QUESTIONS} answers={ANSWERS} timedOut interactive={false} />
      </GalleryComponentCard>
      <GalleryComponentCard
        title={zh ? "运行被取消" : "Cancelled"}
        description={
          zh ? "尚未产生答案时终止本轮。" : "The run ended before answers were submitted."
        }
        badge="cancelled"
        tone="error"
      >
        <AskUserQuestionCard questions={QUESTIONS} cancelled interactive={false} />
      </GalleryComponentCard>
    </div>
  );
}

function PlanGallery({ locale }: { locale: Locale }) {
  const zh = locale === "zh-CN";
  return (
    <div className="chat-gallery-component-grid">
      <GalleryComponentCard
        title={zh ? "待批准" : "Pending approval"}
        description={
          zh ? "按钮仅改变当前样例的本地状态。" : "The button only changes local gallery state."
        }
        badge="interactive"
        tone="running"
      >
        <PlanPendingCard />
      </GalleryComponentCard>
      <GalleryComponentCard
        title={zh ? "已批准" : "Approved"}
        description={zh ? "计划已落定并转入执行。" : "The plan is settled and ready for execution."}
        badge="approved"
        tone="success"
      >
        <PlanModeCard plan={PLAN} approved />
      </GalleryComponentCard>
      <GalleryComponentCard
        title={zh ? "只读" : "Read only"}
        description={
          zh
            ? "轨迹或历史查看中的不可操作状态。"
            : "Non-interactive state used by history and trajectory views."
        }
        badge="readOnly"
        fullWidth
      >
        <PlanModeCard plan={PLAN} pending readOnly />
      </GalleryComponentCard>
    </div>
  );
}

function ToolApprovalGallery({ locale }: { locale: Locale }) {
  const zh = locale === "zh-CN";
  const deadlineAt = Date.now() + 3 * 60_000;
  return (
    <div className="chat-gallery-component-grid">
      <GalleryComponentCard
        title={zh ? "单项审批" : "Single approval"}
        description={
          zh
            ? "Enter 批准、Esc 拒绝；不会执行命令。"
            : "Enter approves and Escape denies; no command runs."
        }
        badge="1 pending"
        tone="running"
      >
        <ApprovalHarness
          initialItems={[
            {
              toolCallId: "gallery-approval-single",
              toolName: "Bash",
              summary: "pnpm --filter liveagent test:frontend",
              deadlineAt,
            },
          ]}
        />
      </GalleryComponentCard>
      <GalleryComponentCard
        title={zh ? "批量审批" : "Approval batch"}
        description={
          zh
            ? "下拉菜单包含本项免审和全部批准/拒绝。"
            : "The menu includes session and batch decisions."
        }
        badge="3 pending"
        tone="running"
      >
        <ApprovalHarness
          initialItems={[
            {
              toolCallId: "gallery-approval-1",
              toolName: "Bash",
              summary: "pnpm build",
              deadlineAt,
            },
            {
              toolCallId: "gallery-approval-2",
              toolName: "Write",
              summary: "src/dev/chat-gallery/scenarios.ts",
              deadlineAt,
            },
            {
              toolCallId: "gallery-approval-3",
              toolName: "Delete",
              summary: "tmp/gallery-output.txt",
              deadlineAt,
            },
          ]}
        />
      </GalleryComponentCard>
      <GalleryComponentCard
        title={zh ? "提交失败" : "Submission error"}
        description={
          zh ? "用于核对宿主错误反馈和重试状态。" : "Checks host error feedback and retry behavior."
        }
        badge="error path"
        tone="error"
        fullWidth
      >
        <ApprovalHarness
          shouldFail
          initialItems={[
            {
              toolCallId: "gallery-approval-error",
              toolName: "Bash",
              summary: "git push origin main",
              deadlineAt,
            },
          ]}
        />
      </GalleryComponentCard>
    </div>
  );
}

function TaskProgressGallery({ locale }: { locale: Locale }) {
  const zh = locale === "zh-CN";
  const running = createTaskProgressSnapshot("gallery-running", 3, [
    {
      id: "inspect",
      subject: zh ? "梳理聊天 UI 状态" : "Map chat UI states",
      description: "Inventory production surfaces",
      activeForm: "Mapping chat UI states",
      status: "completed",
    },
    {
      id: "build",
      subject: zh ? "实现展厅页面" : "Build gallery page",
      description: "Mount production components",
      activeForm: "Building gallery page",
      status: "in_progress",
    },
    {
      id: "verify",
      subject: zh ? "浏览器验证" : "Verify in browser",
      description: "Check themes and viewports",
      activeForm: "Verifying in browser",
      status: "pending",
    },
  ]);
  const completed = createTaskProgressSnapshot(
    "gallery-complete",
    4,
    running?.tasks.map((task) => ({ ...task, status: "completed" as const })) ?? [],
  );
  return (
    <div className="chat-gallery-component-grid">
      <GalleryComponentCard
        title={zh ? "运行中" : "Running"}
        description={
          zh
            ? "进行中的任务默认展开，点击任一行可查看详情。"
            : "The active task opens by default; click any row for details."
        }
        badge="2 / 3"
        tone="running"
      >
        <div className="flex min-h-32 items-end justify-center pb-4">
          <TaskProgressBar snapshot={running} isConversationRunning />
        </div>
      </GalleryComponentCard>
      <GalleryComponentCard
        title={zh ? "运行暂停" : "Paused"}
        description={
          zh ? "会话停止但任务清单仍保留。" : "The checklist remains after the conversation stops."
        }
        badge="paused"
      >
        <div className="flex min-h-32 items-end justify-center pb-4">
          <TaskProgressBar snapshot={running} isConversationRunning={false} />
        </div>
      </GalleryComponentCard>
      <GalleryComponentCard
        title={zh ? "已完成" : "Completed"}
        description={zh ? "所有任务均已完成。" : "Every task is complete."}
        badge="3 / 3"
        tone="success"
        fullWidth
      >
        <div className="flex min-h-32 items-end justify-center pb-4">
          <TaskProgressBar snapshot={completed} isConversationRunning={false} />
        </div>
      </GalleryComponentCard>
    </div>
  );
}

export function InteractionGallery(props: { scenarioId: ChatGalleryScenarioId; locale: Locale }) {
  const { scenarioId, locale } = props;
  if (scenarioId === "ask-user") return <AskUserGallery locale={locale} />;
  if (scenarioId === "plan-mode") return <PlanGallery locale={locale} />;
  if (scenarioId === "tool-approval") return <ToolApprovalGallery locale={locale} />;
  return <TaskProgressGallery locale={locale} />;
}
