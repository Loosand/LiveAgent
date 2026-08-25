import {
  TranscriptAssistantMessageActions,
  TranscriptUserMessageActions,
} from "@liveagent/ui/components/chat/TranscriptMessageActions";
import type { UsageDetailEntry } from "@liveagent/ui/components/chat/UsagePanel";
import { useLocale } from "@liveagent/ui/i18n/index";
import type { PendingUploadedFile } from "@liveagent/ui/lib/chat/uploadedFiles";
import type {
  HistoryMessageRef,
  RenderUserMessage,
} from "../../../lib/chat/conversation/conversationState";
import { useRowInteraction } from "./rowInteraction";
import { useCopiedFlag } from "./useCopiedFlag";

export type AssistantRowFooterProps = {
  timestamp?: number;
  replyText: string;
  usageEntries?: readonly UsageDetailEntry[];
  usageContextWindow?: number;
  retryTarget: RenderUserMessage | null;
  onResendFromEdit: (
    messageRef: HistoryMessageRef,
    text: string,
    attachments: PendingUploadedFile[],
  ) => void;
  onBranchConversation?: (messageRef: HistoryMessageRef) => void;
};

export function AssistantRowFooter(props: AssistantRowFooterProps) {
  const { timestamp, replyText, usageEntries, usageContextWindow } = props;
  const { copied, markCopied } = useCopiedFlag();

  return (
    <TranscriptAssistantMessageActions
      timestamp={timestamp}
      copied={copied}
      copyDisabled={!replyText}
      onCopy={() => {
        void navigator.clipboard.writeText(replyText);
        markCopied();
      }}
      usageEntries={usageEntries}
      usageContextWindow={usageContextWindow}
    />
  );
}

export type UserRowFooterProps = {
  itemKey: string;
  text: string;
  timestamp: number;
  hasStableRef: boolean;
  messageId?: string;
  onStartEdit: (key: string) => void;
};

export function UserRowFooter(props: UserRowFooterProps) {
  const { itemKey, text, timestamp, hasStableRef, messageId, onStartEdit } = props;
  const { t } = useLocale();
  const { copied, markCopied } = useCopiedFlag();
  const { isSending } = useRowInteraction();

  return (
    <TranscriptUserMessageActions
      timestamp={timestamp}
      copied={copied}
      onCopy={() => {
        void navigator.clipboard.writeText(text);
        markCopied();
      }}
      editDisabled={isSending || !hasStableRef}
      editTitle={hasStableRef ? t("chat.edit") : "旧历史缺少稳定消息标识，无法编辑重发"}
      onEdit={() => {
        if (hasStableRef) onStartEdit(itemKey);
      }}
      rewindTurnId={messageId}
    />
  );
}
