"use client";

import { Download, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { GenerateResponse } from "@shared/types";
import { BLOOM_LABEL, TYPE_LABEL, formatDateTime } from "../labels";
import { Badge, Button, Callout, CopyButton } from "../ui";

function Stat({ label, children, title }: { label: string; children: ReactNode; title?: string }) {
  return (
    <div className="min-w-0 bg-surface px-3 py-2" title={title}>
      <dt className="text-[11px] text-subtle">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-medium text-fg tabular-nums">{children}</dd>
    </div>
  );
}

export function RunHeader({ result, onExportJson }: { result: GenerateResponse; onExportJson: () => void }) {
  const { request } = result;
  const loCount = request.loCodes.length;
  const imgDone = result.images.filter((a) => a.status === "done").length;
  const audDone = result.audios.filter((a) => a.status === "done").length;
  const imgErr = result.images.filter((a) => a.status === "error").length;

  return (
    <section aria-label="Thông tin lượt tạo" className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex flex-wrap items-start gap-3 px-4 pt-3.5 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-[15px] font-semibold tracking-tight text-fg">{TYPE_LABEL[request.type]}</h2>
            <Badge tone="neutral" mono>
              {request.type}
            </Badge>
            <Badge tone="outline">
              <span className="font-mono">{request.bloom}</span> {BLOOM_LABEL[request.bloom]}
            </Badge>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1 text-[12px] text-subtle">
            <span className="shrink-0">Run</span>
            <span className="truncate font-mono text-muted">{result.runId}</span>
            <CopyButton text={result.runId} label="Sao chép runId" />
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onExportJson} icon={<Download className="size-4" aria-hidden />}>
          Export JSON
        </Button>
      </div>
      <dl className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
        <Stat label="Thời gian">{formatDateTime(result.createdAt)}</Stat>
        <Stat label="Câu hỏi">
          {result.questions.length}
          <span className="text-subtle">
            {" "}
            · {loCount} LO × {request.count} câu
          </span>
        </Stat>
        <Stat label="Hình ảnh">
          {imgDone}/{result.images.length}
          {imgErr > 0 && <span className="text-danger"> · {imgErr} lỗi</span>}
        </Stat>
        <Stat label="Audio">
          {audDone}/{result.audios.length}
        </Stat>
      </dl>
      {result.warnings.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <Callout tone="warning" icon={<TriangleAlert className="size-4" aria-hidden />} title={`Cảnh báo (${result.warnings.length})`}>
            <ul className="list-disc space-y-0.5 pl-4">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Callout>
        </div>
      )}
    </section>
  );
}
