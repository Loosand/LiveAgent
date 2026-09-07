import { X } from "@liveagent/ui/components/IconSet";
import { cn } from "@liveagent/ui/lib/shared/utils";
import { type ReactNode, useMemo, useState } from "react";
import type { PendingUploadedFile } from "../../lib/chat/uploadedFiles";
import {
  ImagePreview,
  ImagePreviewActionFeedback,
  ImagePreviewContextMenu,
  type ImagePreviewSlide,
} from "./ImagePreview";

export function ComposerAttachmentCard(props: {
  file?: PendingUploadedFile;
  workspaceRoot?: string;
  fileName: string;
  pathTitle: string;
  imageSrc?: string | null;
  isImageLoading?: boolean;
  fallbackIcon: ReactNode;
  disabled: boolean;
  removeLabel: string;
  previewLabel?: string;
  closePreviewLabel?: string;
  onRemove: () => void;
}) {
  const {
    file,
    workspaceRoot,
    fileName,
    pathTitle,
    imageSrc,
    isImageLoading = false,
    fallbackIcon,
    disabled,
    removeLabel,
    previewLabel,
    closePreviewLabel,
    onRemove,
  } = props;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [imageLoadState, setImageLoadState] = useState<{
    src: string | null;
    status: "loaded" | "error";
  } | null>(null);
  const previewSlides = useMemo<ImagePreviewSlide[]>(() => {
    if (!imageSrc) return [];
    const workdir = workspaceRoot?.trim() ?? "";
    const absolutePath = file?.absolutePath?.trim() ?? "";
    const relativePath = file?.relativePath.trim() ?? "";
    return [
      {
        src: imageSrc,
        alt: fileName,
        title: fileName,
        fileName,
        sizeBytes: file?.sizeBytes,
        ...(file && workdir && absolutePath && relativePath
          ? {
              attachment: {
                workdir,
                absolutePath,
                relativePath,
              },
            }
          : {}),
      },
    ];
  }, [file, fileName, imageSrc, workspaceRoot]);
  const previewSlide = previewSlides[0];
  const imageLoadFailed = Boolean(
    imageSrc && imageLoadState?.src === imageSrc && imageLoadState.status === "error",
  );
  const canPreview = Boolean(
    imageSrc && imageLoadState?.src === imageSrc && imageLoadState.status === "loaded",
  );

  // 图片附件：纯缩略图方块，点击放大预览，文件名放悬浮提示，角标删除。
  if (imageSrc || isImageLoading) {
    return (
      <div
        title={fileName}
        className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-black/5 transition-[border-color] hover:border-input dark:bg-white/5"
      >
        {imageSrc && !imageLoadFailed ? (
          <button
            type="button"
            disabled={!canPreview}
            onClick={() => setPreviewOpen(true)}
            className={cn(
              "block h-full w-full outline-hidden focus-visible:ring-2 focus-visible:ring-ring/60",
              canPreview ? "cursor-zoom-in" : "cursor-default",
            )}
            aria-label={previewLabel ? `${previewLabel}: ${fileName}` : fileName}
            title={previewLabel}
            onContextMenu={(event) => {
              if (!canPreview) return;
              event.preventDefault();
              setContextMenu({ x: event.clientX, y: event.clientY });
            }}
          >
            <img
              src={imageSrc}
              alt=""
              draggable={false}
              className="block h-full w-full object-cover"
              onLoad={() => setImageLoadState({ src: imageSrc, status: "loaded" })}
              onError={() => {
                setImageLoadState({ src: imageSrc, status: "error" });
                setContextMenu(null);
              }}
            />
          </button>
        ) : imageLoadFailed ? (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
            {fallbackIcon}
          </span>
        ) : (
          <span className="block h-full w-full animate-pulse bg-black/5 dark:bg-white/10" />
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="absolute right-0.5 top-0.5 z-10 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-[background-color,scale] hover:bg-black/80 active:scale-90 focus-visible:bg-black/80 disabled:pointer-events-none disabled:opacity-35"
          aria-label={`${removeLabel} ${fileName}`}
          title={removeLabel}
        >
          <X className="h-2.5 w-2.5" />
        </button>
        {previewOpen ? (
          <ImagePreview
            open={previewOpen}
            slides={previewSlides}
            closeLabel={closePreviewLabel}
            onClose={() => setPreviewOpen(false)}
          />
        ) : null}
        {contextMenu && previewSlide ? (
          <ImagePreviewContextMenu
            slide={previewSlide}
            position={contextMenu}
            onOpen={() => setPreviewOpen(true)}
            onClose={() => setContextMenu(null)}
            onActionError={setActionError}
          />
        ) : null}
        <ImagePreviewActionFeedback message={actionError} onDismiss={() => setActionError(null)} />
      </div>
    );
  }

  return (
    <div
      title={pathTitle}
      className="group flex h-9 w-36 max-w-[calc(100vw-5rem)] shrink-0 items-center gap-1 rounded-lg border border-border bg-black/5 p-1 pr-2 shadow-none transition-[border-color,background-color] hover:border-input hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/5 text-muted-foreground dark:bg-white/10">
        {fallbackIcon}
      </span>

      <span className="min-w-0 flex-1 truncate text-xs font-medium leading-4 tracking-tight text-foreground/90">
        {fileName}
      </span>

      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/80 outline-hidden transition-[background-color,color,scale] hover:bg-foreground/5 hover:text-foreground active:scale-90 focus-visible:bg-foreground/5 focus-visible:text-foreground disabled:pointer-events-none disabled:opacity-35"
        aria-label={`${removeLabel} ${fileName}`}
        title={removeLabel}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
