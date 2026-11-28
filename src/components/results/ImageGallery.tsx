"use client";

import { Download, ImageOff, Maximize2, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { GenerateResponse, ImageAsset } from "@shared/types";
import { useMedia } from "../media/MediaContext";
import { MediaImage, STATUS_LABEL, StatusDot } from "../media/MediaImage";
import { PromptBlock } from "../media/PromptBlock";
import { describeUrl, downloadName } from "../media/media-utils";
import { Badge, Button } from "../ui";
import { StatusFilter, type StatusFilterValue } from "./StatusFilter";

function ImageCard({ asset, onRegenerate }: { asset: ImageAsset; onRegenerate: (id: string) => void }) {
  const { describe, openImage } = useMedia();
  const d = describe(asset.questionId, asset.mediaKeyId);
  const busy = asset.status === "generating";
  const done = asset.status === "done" && !!asset.url;
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="relative bg-surface-2 p-2">
        <MediaImage asset={asset} alt={`${d.question} · ${d.key}`} onRetry={onRegenerate} className="rounded-lg" />
        <span className="pointer-events-none absolute top-3.5 left-3.5 inline-flex items-center gap-1 rounded-md bg-surface/90 px-1.5 py-0.5 text-[11px] font-medium text-fg shadow-card backdrop-blur">
          <StatusDot status={asset.status} />
          {STATUS_LABEL[asset.status]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-fg">{d.question}</p>
          <p className="truncate text-[12px] text-subtle" title={d.key}>
            <span className="font-mono">{asset.mediaKeyId}</span> · {d.key}
          </p>
          {asset.url && <p className="mt-0.5 truncate font-mono text-[11px] text-subtle">{describeUrl(asset.url)}</p>}
        </div>
        {asset.status === "error" && asset.error && (
          <p className="rounded-md bg-danger-soft px-2 py-1 text-[12px] text-danger">{asset.error}</p>
        )}
        <PromptBlock label="Prompt" text={asset.prompt} tone="neutral" />
        <PromptBlock label="Negative prompt" text={asset.negativePrompt} tone="negative" />
        <div className="mt-auto flex items-center gap-1.5 pt-1">
          <span className="mr-auto" />
          {done && (
            <>
              <button
                type="button"
                onClick={() => openImage?.(asset.id)}
                aria-label={`Xem ảnh lớn ${asset.mediaKeyId}`}
                title="Xem ảnh lớn"
                className="grid size-8 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-fg"
              >
                <Maximize2 className="size-4" aria-hidden />
              </button>
              <a
                href={asset.url}
                download={downloadName(asset.id, asset.url!)}
                aria-label={`Tải ảnh ${asset.mediaKeyId}`}
                title="Tải ảnh"
                className="grid size-8 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-fg"
              >
                <Download className="size-4" aria-hidden />
              </a>
            </>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onRegenerate(asset.id)}
            loading={busy}
            icon={<RefreshCw className="size-3.5" aria-hidden />}
            aria-label={`Tạo lại ảnh ${asset.mediaKeyId}`}
          >
            {busy ? "Đang tạo" : "Tạo lại"}
          </Button>
        </div>
      </div>
    </li>
  );
}

export function ImageGallery({ result, onRegenerateImage }: { result: GenerateResponse; onRegenerateImage: (assetId: string) => void }) {
  const [filter, setFilter] = useState<StatusFilterValue>("all");

  if (result.images.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
        <ImageOff className="mb-2 size-6 text-subtle" aria-hidden />
        <p className="text-sm font-medium text-fg">Lượt tạo này không có hình ảnh</p>
        <p className="text-[13px] text-subtle">Bật “Tạo hình ảnh” hoặc chọn dạng câu hỏi có media ảnh.</p>
      </div>
    );
  }

  const shown = filter === "all" ? result.images : result.images.filter((a) => a.status === filter);
  const retryable = result.images.filter((a) => a.status === "error");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusFilter statuses={result.images.map((a) => a.status)} value={filter} onChange={setFilter} />
        {retryable.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            icon={<RefreshCw className="size-3.5" aria-hidden />}
            onClick={() => retryable.forEach((a) => onRegenerateImage(a.id))}
          >
            Tạo lại {retryable.length} ảnh lỗi
          </Button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong px-4 py-10 text-center text-[13px] text-subtle">
          Không có ảnh ở trạng thái này.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {shown.map((a) => (
            <ImageCard key={a.id} asset={a} onRegenerate={onRegenerateImage} />
          ))}
        </ul>
      )}
      <p className="text-[11.5px] text-subtle">
        <Badge tone="warning" className="mr-1">
          Policy
        </Badge>
        Negative prompt luôn gồm danh sách global (không chữ/logo/watermark, loại trừ nội dung liên quan Trung Quốc: chữ Hán, cờ, bản đồ
        đường lưỡi bò, đèn lồng/rồng kiểu Trung Quốc…) + phần riêng của từng ảnh. Bấm vào ảnh để xem cỡ lớn.
      </p>
    </div>
  );
}
