import {
  type AgentPromptTemplate,
  resolveEffectivePromptSettings,
  updateAgents,
  updateWorkspacePromptSettings,
  type WorkspaceProject,
  workspaceProjectPathKey,
} from "@liveagent/app/lib/settings/index";
import type { SettingsSectionProps } from "@liveagent/app/pages/settings/types";
import { ProjectPromptEditorModal } from "@liveagent/ui/components/chat/ProjectPromptEditorModal";
import {
  BookOpen,
  Eye,
  FileText,
  FolderTree,
  Pencil,
  Plus,
  Trash2,
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
import { createUuid } from "@liveagent/ui/lib/shared/id";
import { cn } from "@liveagent/ui/lib/shared/utils";
import { AgentPromptTemplateModal } from "@liveagent/ui/pages/settings/AgentPromptTemplateModal";
import { AgentActivationSwitch, ConfirmDeletePopover } from "@liveagent/ui/pages/settings/shared";
import { useState } from "react";

export function AgentsSection(props: SettingsSectionProps) {
  const { settings, setSettings } = props;
  const { t } = useLocale();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AgentPromptTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<AgentPromptTemplate | null>(null);
  const [viewingProject, setViewingProject] = useState<WorkspaceProject | null>(null);
  const [editingProject, setEditingProject] = useState<WorkspaceProject | null>(null);

  function openAdd() {
    setEditingTemplate(null);
    setModalOpen(true);
  }

  function openEdit(template: AgentPromptTemplate) {
    setEditingTemplate(template);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingTemplate(null);
  }

  function handleSave(data: Omit<AgentPromptTemplate, "id" | "enabled">) {
    setSettings((prev) => {
      if (editingTemplate) {
        return updateAgents(
          prev,
          prev.agents.map((template) =>
            template.id === editingTemplate.id ? { ...template, ...data } : template,
          ),
        );
      }

      const newTemplate: AgentPromptTemplate = {
        id: createUuid(),
        ...data,
        enabled: false,
      };
      return updateAgents(prev, [...prev.agents, newTemplate]);
    });
  }

  function handleDelete(id: string) {
    setSettings((prev) =>
      updateAgents(
        prev,
        prev.agents.filter((template) => template.id !== id),
      ),
    );
  }

  function handleToggleEnabled(id: string) {
    setSettings((prev) =>
      updateAgents(
        prev,
        prev.agents.map((template) => {
          if (template.id === id) {
            return { ...template, enabled: !template.enabled };
          }
          return template.enabled ? { ...template, enabled: false } : template;
        }),
      ),
    );
  }

  const templates = settings.agents;
  const enabledCount = templates.filter((template) => template.enabled).length;
  const projects = settings.system.workspaceProjects;
  const configuredProjectCount = projects.filter((project) => {
    const entry = settings.system.workspaceResourceSettings[workspaceProjectPathKey(project.path)];
    return Boolean(entry?.projectPrompt.trim());
  }).length;
  const viewingProjectEntry = viewingProject
    ? settings.system.workspaceResourceSettings[workspaceProjectPathKey(viewingProject.path)]
    : undefined;
  const viewingProjectPromptSettings = viewingProject
    ? resolveEffectivePromptSettings(settings, viewingProject.path)
    : null;

  return (
    <>
      <div className="settings-agents-section space-y-4">
        <div className="settings-section-heading-row flex items-center justify-between gap-4">
          <div className="settings-section-title-group flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-info/10">
              <BookOpen className="h-[18px] w-[18px] text-info" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{t("settings.agentsTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("settings.agentsDesc")}</p>
            </div>
          </div>

          <div className="settings-section-actions flex items-center gap-2">
            {templates.length > 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-2 py-2 text-xs text-muted-foreground">
                <span className="tabular-nums font-medium text-foreground">{templates.length}</span>
                {t("settings.agentsCount")}
                {enabledCount > 0 ? (
                  <>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      <span className="tabular-nums font-medium text-success">{enabledCount}</span>
                      {t("settings.agentsActive")}
                    </span>
                  </>
                ) : null}
              </div>
            ) : null}
            <Button variant="outline" size="sm" className="gap-2" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5" />
              {t("settings.agentsAdd")}
            </Button>
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold">{t("settings.agentsGlobalTab")}</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("settings.agentsGlobalConfigHint")}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-info/20 bg-info/5 px-2 py-1 text-xs text-info">
              {enabledCount} {t("settings.agentsActive")}
            </span>
          </div>

          {templates.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-info/10">
                <BookOpen className="h-6 w-6 text-info" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-medium text-foreground">
                  {t("settings.agentsNoTemplates")}
                </p>
                <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
                  {t("settings.agentsNoTemplatesHint")}
                </p>
              </div>
              <Button size="sm" className="mt-1 gap-2" onClick={openAdd}>
                <Plus className="h-3.5 w-3.5" />
                {t("settings.agentsAdd")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => {
                return (
                  <div
                    key={template.id}
                    className={cn(
                      "group rounded-2xl border transition-all",
                      template.enabled
                        ? "border-info/40 bg-info/5 shadow-control shadow-info/5"
                        : "border-border bg-card hover:border-input",
                    )}
                  >
                    <div className="settings-card-row flex items-center gap-3 px-4 py-3">
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
                        <BookOpen className="h-4 w-4" />
                        {template.enabled ? (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-base font-medium text-foreground">
                            {template.name}
                          </span>
                          {template.enabled ? (
                            <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-2xs font-medium leading-none text-success">
                              {t("settings.agentsGlobalDefault")}
                            </span>
                          ) : null}
                        </div>
                        {template.description ? (
                          <p
                            className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground"
                            title={template.description}
                          >
                            {template.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="settings-card-actions flex items-center gap-2">
                        <AgentActivationSwitch
                          checked={template.enabled}
                          title={template.enabled ? t("settings.disable") : t("settings.enable")}
                          onToggle={() => handleToggleEnabled(template.id)}
                        />
                        <div className="settings-hover-actions ml-1 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setViewingTemplate(template)}
                            title={t("settings.agentsShowPrompt")}
                            aria-label={t("settings.agentsShowPrompt")}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(template)}
                            title={t("settings.edit")}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <ConfirmDeletePopover
                            name={template.name}
                            onConfirm={() => handleDelete(template.id)}
                          >
                            {(open) => (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={open}
                                title={t("settings.delete")}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </ConfirmDeletePopover>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold">{t("settings.agentsProjectsTab")}</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("chat.projectPromptStrategyHint")}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-activity/20 bg-activity/5 px-2 py-1 text-xs text-activity">
              {configuredProjectCount}/{projects.length}
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-activity/10">
                <FolderTree className="h-6 w-6 text-activity" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-medium">{t("settings.agentsNoProjects")}</p>
                <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
                  {t("settings.agentsNoProjectsHint")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => {
                const entry =
                  settings.system.workspaceResourceSettings[workspaceProjectPathKey(project.path)];
                const configured = Boolean(entry?.projectPrompt.trim());
                return (
                  <div
                    key={project.id}
                    className={cn(
                      "group rounded-2xl border transition-all",
                      configured
                        ? "border-activity/40 bg-activity/5 shadow-control shadow-activity/5"
                        : "border-border bg-card hover:border-input",
                    )}
                  >
                    <div className="settings-card-row flex items-center gap-3 px-4 py-3">
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-activity/10 text-activity">
                        <FolderTree className="h-4 w-4" />
                        {configured ? (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-activity" />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-base font-medium text-foreground">
                            {project.name}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-2xs font-medium leading-none",
                              configured
                                ? "bg-activity/10 text-activity"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {t(
                              configured
                                ? "settings.agentsProjectConfigured"
                                : "settings.agentsProjectUnconfigured",
                            )}
                          </span>
                        </div>
                        <p
                          className="mt-1 truncate text-xs leading-relaxed text-muted-foreground"
                          title={project.path}
                        >
                          {project.path}
                        </p>
                      </div>

                      <div className="settings-card-actions flex items-center gap-2">
                        {configured ? (
                          <span className="shrink-0 rounded-full border border-border bg-muted/40 px-2 py-1 text-2xs font-medium text-muted-foreground">
                            {t(
                              entry?.projectPromptStrategy === "replace"
                                ? "settings.agentsProjectReplace"
                                : "settings.agentsProjectAppend",
                            )}
                          </span>
                        ) : null}
                        <div className="settings-hover-actions ml-1 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            disabled={!configured}
                            onClick={() => setViewingProject(project)}
                            title={t("settings.agentsShowPrompt")}
                            aria-label={t("settings.agentsShowPrompt")}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingProject(project)}
                            title={t("settings.agentsProjectEdit")}
                            aria-label={t("settings.agentsProjectEdit")}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {modalOpen ? (
        <AgentPromptTemplateModal
          initialData={editingTemplate ?? undefined}
          onSave={handleSave}
          onClose={closeModal}
        />
      ) : null}

      {viewingTemplate ? (
        <AgentPromptViewModal template={viewingTemplate} onClose={() => setViewingTemplate(null)} />
      ) : null}

      {viewingProject &&
      viewingProjectEntry?.projectPrompt.trim() &&
      viewingProjectPromptSettings ? (
        <AgentPromptViewModal
          template={{
            id: viewingProject.id,
            name: viewingProject.name,
            description: viewingProject.path,
            prompt: viewingProjectPromptSettings.prompt,
            enabled: true,
          }}
          subtitle={t("chat.projectPromptTitle")}
          hidePromptHeader
          promptSegments={[
            ...(viewingProjectPromptSettings.projectPromptStrategy === "append" &&
            viewingProjectPromptSettings.globalPrompt
              ? [
                  {
                    label: t("chat.globalPromptTitle"),
                    prompt: viewingProjectPromptSettings.globalPrompt,
                    tone: "global" as const,
                  },
                ]
              : []),
            {
              label: t("chat.projectPromptTitle"),
              prompt: viewingProjectPromptSettings.projectPrompt,
              tone: "project" as const,
            },
          ]}
          detailsTitle={t("settings.agentsProjectsTab")}
          statusTitle={t("chat.projectPromptStrategy")}
          statusLabel={t(
            viewingProjectEntry.projectPromptStrategy === "replace"
              ? "settings.agentsProjectReplace"
              : "settings.agentsProjectAppend",
          )}
          statusTone="violet"
          onClose={() => setViewingProject(null)}
        />
      ) : null}

      {editingProject ? (
        <ProjectPromptEditorModal
          project={editingProject}
          settings={settings}
          onClose={() => setEditingProject(null)}
          onSave={(draft) => {
            setSettings((prev) => updateWorkspacePromptSettings(prev, editingProject.path, draft));
          }}
        />
      ) : null}
    </>
  );
}

type AgentPromptViewModalProps = {
  template: AgentPromptTemplate;
  subtitle?: string;
  hidePromptHeader?: boolean;
  promptSegments?: Array<{
    label: string;
    prompt: string;
    tone: "global" | "project";
  }>;
  detailsTitle?: string;
  statusTitle?: string;
  statusLabel?: string;
  statusTone?: "emerald" | "muted" | "violet";
  onClose: () => void;
};

function AgentPromptViewModal({
  template,
  subtitle,
  hidePromptHeader = false,
  promptSegments,
  detailsTitle,
  statusTitle,
  statusLabel,
  statusTone,
  onClose,
}: AgentPromptViewModalProps) {
  const { t } = useLocale();
  const tone = statusTone ?? (template.enabled ? "emerald" : "muted");
  const resolvedStatusLabel =
    statusLabel ??
    (template.enabled ? t("settings.agentsActiveLabel") : t("settings.agentsInactiveLabel"));
  const statusBadgeClass =
    tone === "emerald"
      ? "border-success/20 bg-success/10 text-success"
      : tone === "violet"
        ? "border-activity/20 bg-activity/10 text-activity"
        : "border-border bg-muted/40 text-muted-foreground";
  const statusTextClass =
    tone === "emerald"
      ? "text-success"
      : tone === "violet"
        ? "text-activity"
        : "text-muted-foreground";
  const statusDotClass =
    tone === "emerald"
      ? "bg-success"
      : tone === "violet"
        ? "bg-activity"
        : "bg-muted-foreground/60";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[90dvh] max-w-4xl flex-col p-0"
        closeLabel={t("settings.cancel")}
        showCloseButton
      >
        <DialogHeader className="flex-row items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted/60 text-muted-foreground shadow-control">
            <Eye className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate">{template.name}</DialogTitle>
            <DialogDescription className="mt-0.5 text-xs">
              {subtitle ?? t("settings.agentsShowPrompt")}
            </DialogDescription>
          </div>
          <span
            className={cn(
              "hidden shrink-0 items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium sm:inline-flex",
              statusBadgeClass,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", statusDotClass)} />
            {resolvedStatusLabel}
          </span>
        </DialogHeader>

        <DialogBody>
          <div className="grid min-h-0 gap-4 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
            <aside className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-control">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                </div>
                <h3 className="text-base font-semibold">
                  {detailsTitle ?? t("settings.agentsTemplateDetails")}
                </h3>
              </div>

              <p className="mt-4 min-w-0 break-words text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
                {template.description || t("settings.agentsNoDescription")}
              </p>

              <div className="mt-6 space-y-3 border-t border-border pt-4 text-xs">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <span className="min-w-0 leading-5 text-muted-foreground">
                    {statusTitle ?? t("settings.agentsStatus")}
                  </span>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 whitespace-nowrap pt-0.5 font-medium",
                      statusTextClass,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusDotClass)} />
                    {resolvedStatusLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{t("settings.agentsCharacters")}</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {template.prompt.length.toLocaleString()}
                  </span>
                </div>
              </div>
            </aside>

            <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-control md:min-h-[420px]">
              {!hidePromptHeader ? (
                <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold">{t("settings.agentsPrompt")}</span>
                  </div>
                  <span className="rounded-full border border-border bg-muted/40 px-2 py-1 text-xs tabular-nums text-muted-foreground">
                    {template.prompt.length.toLocaleString()} {t("settings.agentsCharacters")}
                  </span>
                </div>
              ) : null}
              <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-4">
                {promptSegments ? (
                  promptSegments.map((segment, index) => (
                    <div key={segment.tone}>
                      {index > 0 ? <div className="my-4 h-px w-full bg-border/80" /> : null}
                      <PromptScopeLabel label={segment.label} tone={segment.tone} />
                      <pre className="mt-4 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-foreground/90">
                        {segment.prompt}
                      </pre>
                    </div>
                  ))
                ) : (
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-foreground/90">
                    {template.prompt}
                  </pre>
                )}
              </div>
            </section>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function PromptScopeLabel(props: { label: string; tone: "global" | "project" }) {
  const { label, tone } = props;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium",
        tone === "global"
          ? "border-info/20 bg-info/10 text-info"
          : "border-activity/20 bg-activity/10 text-activity",
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", tone === "global" ? "bg-info" : "bg-activity")}
      />
      {label}
    </span>
  );
}
