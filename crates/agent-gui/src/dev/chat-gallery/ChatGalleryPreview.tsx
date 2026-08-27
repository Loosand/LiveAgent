import type { Locale } from "../../i18n/config";
import { ComposerGallery } from "./ComposerGallery";
import { InteractionGallery } from "./InteractionGallery";
import type { ChatGalleryScenarioId } from "./scenarios";
import { ToolCategoryGallery } from "./ToolCategoryGallery";
import { TranscriptGallery } from "./TranscriptGallery";

export function ChatGalleryPreview(props: { scenarioId: ChatGalleryScenarioId; locale: Locale }) {
  const { scenarioId, locale } = props;
  if (scenarioId === "tool-categories") {
    return <ToolCategoryGallery locale={locale} />;
  }
  if (
    scenarioId === "ask-user" ||
    scenarioId === "plan-mode" ||
    scenarioId === "tool-approval" ||
    scenarioId === "task-progress"
  ) {
    return <InteractionGallery scenarioId={scenarioId} locale={locale} />;
  }
  if (
    scenarioId === "composer-idle" ||
    scenarioId === "composer-busy" ||
    scenarioId === "composer-files" ||
    scenarioId === "composer-overlays"
  ) {
    return <ComposerGallery scenarioId={scenarioId} locale={locale} />;
  }
  return <TranscriptGallery scenarioId={scenarioId} locale={locale} />;
}
