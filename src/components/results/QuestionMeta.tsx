"use client";

import { AudioLines, Image as ImageIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { GeneratedQuestion } from "@shared/types";
import { BLOOM_LABEL, TARGET_LABEL, summarizeLo } from "../labels";
import { useMedia } from "../media/MediaContext";
import { STATUS_LABEL, StatusDot } from "../media/MediaImage";
import { Badge, CopyButton, ExpandableText, cn } from "../ui";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2 @md:grid-cols-[6.5rem_minmax(0,1fr)] @md:gap-3">
      <dt className="text-[11.5px] font-medium text-subtle">{label}</dt>
      <dd className="min-w-0 text-[13px] text-fg">{children}</dd>
    </div>
  );
}

function TrueAnswer({ q }: { q: GeneratedQuestion }) {
  switch (q.type) {
    case "COMP_SEL":
    case "RESP_SEL":
      return <span className="font-semibold text-success">{q.trueAnswer}</span>;
    case "TYPING":
      return (
        <span>
          <span className="font-semibold text-success">{q.trueAnswer.answer}</span>
          <span className="text-subtle"> — </span>
          {q.trueAnswer.fullSentence}
        </span>
      );
    case "MATCH":
      return (
        <ul className="space-y-0.5">
          {q.trueAnswer.map((p, i) => (
            <li key={i}>
              <span className="font-medium">{p.a}</span> <span className="text-subtle">↔</span> {p.b}
            </li>
          ))}
        </ul>
      );
    case "ORDER":
      return <span className="font-semibold text-success">{q.trueAnswer.sentence}</span>;
    case "LISTEN":
      return (
        <span className="flex flex-wrap gap-1">
          {q.trueAnswer.map((t) => (
            <Badge key={t.position} tone="success">
              {t.position} – {t.label}
            </Badge>
          ))}
        </span>
      );
    case "SPEAK":
      return <span className="text-subtle">Không có (luyện nói)</span>;
  }
}

export function QuestionMeta({ q }: { q: GeneratedQuestion }) {
  const { imageByKey, audioByKey } = useMedia();
  const lo = summarizeLo(q.lo.name);
  const pool = q.type === "COMP_SEL" || q.type === "RESP_SEL" ? q.answerContent : null;

  return (
    <dl className="divide-y divide-border">
      <Row label="LO cháu">
        <div className="flex flex-wrap items-center gap-1">
          <Badge tone="accent" mono>
            {q.lo.code}
          </Badge>
          <CopyButton text={q.lo.code} label="Sao chép mã LO" />
        </div>
        <p className="mt-1 font-medium">{lo.title}</p>
        {lo.rest.length > 0 && (
          <ExpandableText text={lo.rest.join("\n")} lines={2} threshold={80} mono className="mt-0.5 text-muted" />
        )}
        <p className="mt-1 text-[11.5px] text-subtle">
          {q.lo.generalName} <span aria-hidden>›</span> {q.lo.specificName}
        </p>
      </Row>
      <Row label="Bloom">
        <Badge tone="neutral">
          <span className="font-mono">{q.bloom}</span> · {BLOOM_LABEL[q.bloom]}
        </Badge>
      </Row>
      <Row label="Gợi ý (hint)">{q.hint || <span className="text-subtle">—</span>}</Row>
      <Row label="Giải thích">{q.explanation || <span className="text-subtle">—</span>}</Row>
      <Row label="Đáp án đúng">
        <TrueAnswer q={q} />
      </Row>
      {pool && (
        <Row label="Distractor pool">
          <span className="flex flex-wrap gap-1">
            {pool.distractorPool.map((d) => {
              const used = pool.options.includes(d);
              return (
                <span
                  key={d}
                  title={used ? "Được CMS chọn làm đáp án nhiễu" : "Không được chọn"}
                  className={cn(
                    "rounded-md border px-1.5 py-px text-[12px]",
                    used ? "border-border-strong bg-surface-2 text-fg" : "border-dashed border-border text-subtle line-through decoration-border-strong",
                  )}
                >
                  {d}
                </span>
              );
            })}
          </span>
        </Row>
      )}
      {q.variation && Object.keys(q.variation).length > 0 && (
        <Row label="Biến thể ngẫu nhiên">
          <span className="flex flex-wrap gap-1">
            {Object.entries(q.variation).map(([k, v]) => (
              <span key={k} title={k} className="rounded-md border border-border bg-surface-2 px-1.5 py-px text-[12px]">
                <span className="text-subtle">{k}:</span> {v}
              </span>
            ))}
          </span>
        </Row>
      )}
      <Row label={`Media keys (${q.mediaKeys.length})`}>
        {q.mediaKeys.length === 0 ? (
          <span className="text-subtle">Không có media</span>
        ) : (
          <ul className="space-y-1.5">
            {q.mediaKeys.map((k) => {
              const asset = k.kind === "image" ? imageByKey.get(k.id) : audioByKey.get(k.id);
              const Icon = k.kind === "image" ? ImageIcon : AudioLines;
              return (
                <li key={k.id} className="rounded-md border border-border bg-surface-2/50 px-2 py-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Icon className="size-3.5 text-subtle" aria-label={k.kind} />
                    <span className="font-mono text-[11.5px] text-fg">{k.id}</span>
                    <Badge tone="outline">
                      {TARGET_LABEL[k.target]}
                      {k.targetValue ? ` = ${k.targetValue}` : ""}
                    </Badge>
                    {asset && (
                      <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-subtle">
                        <StatusDot status={asset.status} />
                        {STATUS_LABEL[asset.status]}
                      </span>
                    )}
                  </div>
                  {k.keywords.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {k.keywords.map((w) => (
                        <span key={w} className="rounded bg-surface px-1 text-[11px] text-muted ring-1 ring-border">
                          #{w}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-[12px] leading-snug text-muted">{k.description}</p>
                  {k.negativeExtras && k.negativeExtras.length > 0 && (
                    <p className="mt-1 text-[11.5px] leading-snug text-warning">
                      <span className="font-medium">Tránh:</span> {k.negativeExtras.join(", ")}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Row>
    </dl>
  );
}
