import { LiveSparkle } from "@liveagent/ui/components/chat/LiveSparkle";
import type { ChatFileLink } from "@liveagent/ui/lib/chat/chatFileLinks";
import type { ConversationMentionReference } from "@liveagent/ui/lib/chat/mentionReferences";
import type { PendingUploadedFile } from "@liveagent/ui/lib/chat/uploadedFiles";
import { memo } from "react";
import type { HistoryMessageRef } from "../../../lib/chat/conversation/conversationState";
import type { RetryAttemptRecord } from "../../../lib/chat/conversation/liveTranscriptStore";
import { AssistantRenderUnit } from "./AssistantRenderUnit";
import type { AssistantActivityRow as AssistantActivityRowModel } from "./rowModel";

export const AssistantActivityRow = memo(function AssistantActivityRow(props: {
  row: AssistantActivityRowModel;
  showUsage?: boolean;
  usageContextWindow?: number;
  isCompactionRunning: boolean;
  toolStatus: string | null;
  actionsVisible?: boolean;
  retryAttempts?: RetryAttemptRecord[];
  workdir?: string;
  onOpenFileLink?: (link: ChatFileLink) => void;
  onResendFromEdit: (
    messageRef: HistoryMessageRef,
    text: string,
    attachments: PendingUploadedFile[],
    referencedConversations: ConversationMentionReference[],
  ) => void;
  onBranchConversation?: (messageRef: HistoryMessageRef) => void;
}) {
  const {
    row,
    showUsage,
    usageContextWindow,
    isCompactionRunning,
    toolStatus,
    actionsVisible,
    retryAttempts,
    workdir,
    onOpenFileLink,
    onResendFromEdit,
    onBranchConversation,
  } = props;

  return (
    <div data-live-activity={row.live ? "true" : undefined} className="min-w-0 w-full max-w-full">
      {row.units.map((unit, index) => (
        <div key={unit.key} data-activity-key={unit.key} className="min-w-0 max-w-full">
          <AssistantRenderUnit
            row={unit}
            showUsage={showUsage}
            usageContextWindow={usageContextWindow}
            isCompactionRunning={unit.mutable ? isCompactionRunning : false}
            toolStatus={unit.mutable ? toolStatus : null}
            actionsVisible={actionsVisible}
            retryAttempts={unit.mutable ? retryAttempts : undefined}
            workdir={workdir}
            onOpenFileLink={onOpenFileLink}
            onResendFromEdit={onResendFromEdit}
            onBranchConversation={onBranchConversation}
          />
          {unit.gapAfter > 0 && index < row.units.length - 1 ? (
            <div aria-hidden="true" style={{ height: unit.gapAfter }} />
          ) : null}
        </div>
      ))}
      {/* 整个回合存活期间常驻的脉冲星标：工具/思考的空档、压缩总结阶段都
          保持可见，告诉用户对话仍在进行；回合落定（live=false）即消失。 */}
      {row.live ? <LiveSparkle className="pl-10 pt-1" /> : null}
    </div>
  );
});
