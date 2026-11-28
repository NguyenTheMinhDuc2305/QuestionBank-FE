"use client";

import { Download, RefreshCw, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ImageAsset } from "@shared/types";
import { Badge, Button } from "../ui";
import { describeUrl, downloadName } from "./media-utils";
import { MediaImage, STATUS_LABEL, StatusDot } from "./MediaImage";
import { PromptBlock } from "./PromptBlock";

/** Full-size image viewer (native <dialog>: focus trap + Esc for free). */
export function ImageLightbox({
  asset,
  caption,
  onClose,
  onRegenerate,
}: {
  asset: ImageAsset | null;
  caption?: string;
  onClose: () => void;
  onRegenerate?: (assetId: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = !!asset;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // backdrop click
      }}
      aria-labelledby="lightbox-title"
      className="m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface p-0 text-fg shadow-pop backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      {asset && (
        <div className="flex max-h-[92dvh] flex-col md:grid md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="grid min-h-0 shrink-0 place-items-center bg-surface-2 p-3 md:p-5">
            {asset.status === "done" && asset.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URLs / local API paths
              <img
                src={asset.url}
                alt={caption ?? asset.mediaKeyId}
                className="max-h-[45dvh] w-auto max-w-full rounded-lg border border-border bg-white object-contain md:max-h-[80dvh]"
              />
            ) : (
              <MediaImage asset={asset} alt={caption ?? asset.mediaKeyId} zoomable={false} className="max-w-xs" />
            )}
          </div>
          <div className="flex min-h-0 flex-col">
            <div className="flex items-start gap-2 border-b border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 id="lightbox-title" className="truncate text-[14px] font-semibold">
                  {caption ?? "Hình ảnh"}
                </h2>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-subtle">
                  <span className="font-mono">{asset.mediaKeyId}</span>
                  <span className="inline-flex items-center gap-1">
                    <StatusDot status={asset.status} />
                    {STATUS_LABEL[asset.status]}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="grid size-8 shrink-0 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-fg"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
              {asset.error && <p className="rounded-md bg-danger-soft px-2 py-1 text-[12px] text-danger">{asset.error}</p>}
              <PromptBlock label="Prompt" text={asset.prompt} tone="neutral" lines={6} />
              <PromptBlock label="Negative prompt" text={asset.negativePrompt} tone="negative" lines={6} />
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[12px]">
                <dt className="text-subtle">File</dt>
                <dd className="truncate font-mono text-muted">{asset.url ? describeUrl(asset.url) : "—"}</dd>
                <dt className="text-subtle">Asset</dt>
                <dd className="truncate font-mono text-muted">{asset.id}</dd>
              </dl>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
              {asset.url && asset.status === "done" ? (
                <a
                  href={asset.url}
                  download={downloadName(asset.id, asset.url)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-2.5 text-[13px] font-medium text-accent-fg hover:bg-accent-hover"
                >
                  <Download className="size-4" aria-hidden /> Tải ảnh
                </a>
              ) : (
                <Badge tone="neutral">Chưa có file để tải</Badge>
              )}
              {onRegenerate && (
                <Button
                  size="sm"
                  onClick={() => onRegenerate(asset.id)}
                  loading={asset.status === "generating"}
                  icon={<RefreshCw className="size-3.5" aria-hidden />}
                >
                  Tạo lại
                </Button>
              )}
              <Button size="sm" variant="ghost" className="ml-auto" onClick={onClose}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
