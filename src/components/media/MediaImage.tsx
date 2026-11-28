"use client";

import { ImageOff, Maximize2, RefreshCw, TriangleAlert } from "lucide-react";
import type { ImageAsset } from "@shared/types";
import { Spinner, cn } from "../ui";
import { useMedia } from "./MediaContext";

/**
 * Renders an ImageAsset by status: pending → skeleton, generating → spinner, error → message (+ retry),
 * done → the image (click opens the lightbox when inside a MediaProvider). `asset` undefined means no image
 * was planned for this slot.
 */
export function MediaImage({
  asset,
  alt,
  className,
  compact,
  onRetry,
  zoomable = true,
}: {
  asset?: ImageAsset;
  alt: string;
  className?: string;
  /** Small thumbnails: hide status text, keep icon only. */
  compact?: boolean;
  onRetry?: (assetId: string) => void;
  /** Click to open the full-size lightbox (default true, needs a MediaProvider). */
  zoomable?: boolean;
}) {
  const { openImage } = useMedia();
  const base = cn("relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface-2", className);

  if (!asset || asset.status === "skipped") {
    return (
      <div className={cn(base, "grid place-items-center text-subtle")} role="img" aria-label={`${alt}: không có ảnh`}>
        <div className="flex flex-col items-center gap-1 text-center">
          <ImageOff className="size-5" aria-hidden />
          {!compact && <span className="text-[11px]">{asset ? "Đã bỏ qua" : "Không có ảnh"}</span>}
        </div>
      </div>
    );
  }

  if (asset.status === "done" && asset.url) {
    return (
      <div className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element -- data URLs / local API paths, no optimisation needed */}
        <img src={asset.url} alt={alt} className="size-full object-cover" loading="lazy" decoding="async" />
        {zoomable && openImage && (
          <button
            type="button"
            onClick={() => openImage(asset.id)}
            aria-label={`Phóng to ảnh: ${alt}`}
            title="Xem ảnh lớn"
            className="group absolute inset-0 grid cursor-zoom-in place-items-center bg-black/0 transition-colors hover:bg-black/25 focus-visible:bg-black/25 focus-visible:outline-offset-[-2px]"
          >
            <span className="grid size-7 place-items-center rounded-full bg-white/90 text-zinc-900 opacity-0 shadow-pop transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Maximize2 className="size-3.5" aria-hidden />
            </span>
          </button>
        )}
      </div>
    );
  }

  if (asset.status === "error") {
    return (
      <div className={cn(base, "grid place-items-center border-danger-border bg-danger-soft p-2 text-danger")} role="img" aria-label={`${alt}: lỗi tạo ảnh`}>
        <div className="flex flex-col items-center gap-1 text-center">
          <TriangleAlert className="size-5" aria-hidden />
          {!compact && (
            <>
              <span className="text-[11px] font-medium">Lỗi tạo ảnh</span>
              {asset.error && <span className="line-clamp-2 text-[10.5px] text-danger/80">{asset.error}</span>}
              {onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(asset.id)}
                  className="mt-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium hover:bg-danger/10"
                >
                  <RefreshCw className="size-3" aria-hidden /> Thử lại
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  const generating = asset.status === "generating";
  return (
    <div
      className={cn(base, !generating && "skeleton", "grid place-items-center")}
      role="img"
      aria-label={`${alt}: ${generating ? "đang tạo ảnh" : "đang chờ tạo"}`}
      aria-busy
    >
      <div className="flex flex-col items-center gap-1 text-subtle">
        {generating ? <Spinner className="size-5 text-accent-text" /> : null}
        {!compact && <span className="text-[11px]">{generating ? "Đang tạo ảnh…" : "Đang chờ"}</span>}
      </div>
    </div>
  );
}

export function StatusDot({ status }: { status: ImageAsset["status"] }) {
  const tone = {
    pending: "bg-subtle/50",
    generating: "bg-accent animate-pulse",
    done: "bg-success",
    error: "bg-danger",
    skipped: "bg-border-strong",
  }[status];
  return <span className={cn("inline-block size-1.5 shrink-0 rounded-full", tone)} aria-hidden />;
}

export const STATUS_LABEL: Record<ImageAsset["status"], string> = {
  pending: "Đang chờ",
  generating: "Đang tạo",
  done: "Hoàn thành",
  error: "Lỗi",
  skipped: "Bỏ qua",
};
