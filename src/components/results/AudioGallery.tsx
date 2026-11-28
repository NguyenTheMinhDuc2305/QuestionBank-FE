"use client";

import { AudioLines, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { AudioAsset, GenerateResponse } from "@shared/types";
import { AudioPlayer, TTS_LABEL } from "../media/AudioPlayer";
import { useMedia } from "../media/MediaContext";
import { STATUS_LABEL, StatusDot } from "../media/MediaImage";
import { describeUrl } from "../media/media-utils";
import { Badge, Button } from "../ui";
import { StatusFilter, type StatusFilterValue } from "./StatusFilter";

function AudioCard({ asset, onRegenerate }: { asset: AudioAsset; onRegenerate?: (id: string) => void }) {
  const { describe } = useMedia();
  const d = describe(asset.questionId, asset.mediaKeyId);
  const busy = asset.status === "generating";
  const tts = asset.status === "done" && !asset.url;
  return (
    <li className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-3 shadow-card">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-fg">{d.question}</p>
          <p className="truncate text-[12px] text-subtle" title={d.key}>
            <span className="font-mono">{asset.mediaKeyId}</span> · {d.key}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted">
          <StatusDot status={asset.status} />
          {STATUS_LABEL[asset.status]}
        </span>
      </div>
      <AudioPlayer asset={asset} label={tts ? "Phát (TTS trình duyệt)" : "Phát audio"} />
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[12px]">
        <dt className="text-subtle">Voice</dt>
        <dd className="truncate font-mono">{asset.voice}</dd>
        <dt className="text-subtle">File</dt>
        <dd className="truncate font-mono text-muted">
          {asset.url ? describeUrl(asset.url) : tts ? <span className="font-sans text-warning">{TTS_LABEL}</span> : "—"}
        </dd>
      </dl>
      {onRegenerate && (
        <div className="mt-auto flex justify-end">
          <Button
            size="sm"
            onClick={() => onRegenerate(asset.id)}
            loading={busy}
            icon={<RefreshCw className="size-3.5" aria-hidden />}
            aria-label={`Tạo lại audio ${asset.mediaKeyId}`}
          >
            {busy ? "Đang tạo" : "Tạo lại"}
          </Button>
        </div>
      )}
    </li>
  );
}

export function AudioGallery({ result, onRegenerateAudio }: { result: GenerateResponse; onRegenerateAudio?: (assetId: string) => void }) {
  const [filter, setFilter] = useState<StatusFilterValue>("all");

  if (result.audios.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
        <AudioLines className="mb-2 size-6 text-subtle" aria-hidden />
        <p className="text-sm font-medium text-fg">Lượt tạo này không có audio</p>
        <p className="text-[13px] text-subtle">Audio có ở LISTEN, SPEAK và RESP_SEL (đoạn nghe) khi bật “Tạo audio”.</p>
      </div>
    );
  }

  const shown = filter === "all" ? result.audios : result.audios.filter((a) => a.status === filter);
  const ttsCount = result.audios.filter((a) => a.status === "done" && !a.url).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusFilter statuses={result.audios.map((a) => a.status)} value={filter} onChange={setFilter} />
        {ttsCount > 0 && (
          <Badge tone="warning" className="ml-auto">
            {ttsCount} audio dùng TTS trình duyệt
          </Badge>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong px-4 py-10 text-center text-[13px] text-subtle">
          Không có audio ở trạng thái này.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {shown.map((a) => (
            <AudioCard key={a.id} asset={a} onRegenerate={onRegenerateAudio} />
          ))}
        </ul>
      )}
    </div>
  );
}
