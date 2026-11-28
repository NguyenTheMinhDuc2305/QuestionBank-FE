"use client";

import { Braces, Eye, EyeOff, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { GeneratedQuestion } from "@shared/types";
import { BLOOM_LABEL, summarizeLo } from "../labels";
import { Badge, Callout, CopyButton, cn } from "../ui";
import { QuestionMeta } from "./QuestionMeta";
import { QuestionPreview } from "./QuestionPreview";

function ToggleChip({
  pressed,
  onClick,
  icon,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] font-medium transition-colors",
        pressed ? "border-accent-border bg-accent-soft text-accent-text" : "border-border bg-surface text-muted hover:text-fg",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function QuestionCard({
  q,
  index,
  defaultShowAnswer = true,
}: {
  q: GeneratedQuestion;
  index: number;
  /** Initial "answer key" state; the parent re-keys cards to reset it globally. */
  defaultShowAnswer?: boolean;
}) {
  const [showAnswer, setShowAnswer] = useState(defaultShowAnswer);
  const [showJson, setShowJson] = useState(false);
  const json = showJson ? JSON.stringify(q, null, 2) : "";
  const jsonId = `json-${q.id}`;

  return (
    <article
      aria-labelledby={`qtitle-${q.id}`}
      className="@container overflow-hidden rounded-xl border border-border bg-surface shadow-card"
    >
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border px-3.5 py-2.5 sm:px-4">
        <h3 id={`qtitle-${q.id}`} className="text-[14px] font-semibold text-fg">
          Câu {index + 1}
        </h3>
        <Badge tone="neutral" mono>
          {q.type}
        </Badge>
        <Badge tone="outline" title={BLOOM_LABEL[q.bloom]}>
          <span className="font-mono">{q.bloom}</span> {BLOOM_LABEL[q.bloom]}
        </Badge>
        {q.warnings.length > 0 && (
          <Badge tone="warning">
            <TriangleAlert className="size-3" aria-hidden />
            {q.warnings.length}
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <ToggleChip
            pressed={showAnswer}
            onClick={() => setShowAnswer((v) => !v)}
            icon={showAnswer ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
          >
            Đáp án
          </ToggleChip>
          <ToggleChip pressed={showJson} onClick={() => setShowJson((v) => !v)} icon={<Braces className="size-3.5" aria-hidden />}>
            JSON
          </ToggleChip>
        </div>
      </header>

      {/* LO note — always visible */}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border bg-surface-2 px-3.5 py-1.5 text-[12px] sm:px-4">
        <span className="shrink-0 font-medium text-muted">LO cháu</span>
        <span className="font-mono font-medium text-accent-text">{q.lo.code}</span>
        <span className="min-w-0 text-fg" title={q.lo.name}>
          {summarizeLo(q.lo.name).title}
        </span>
        <span className="min-w-0 text-subtle">
          · {q.lo.specificName} · {q.lo.generalName}
        </span>
      </div>

      {q.warnings.length > 0 && (
        <div className="px-3.5 pt-3 sm:px-4">
          <Callout tone="warning" icon={<TriangleAlert className="size-4" aria-hidden />} title="Cảnh báo kiểm tra">
            <ul className="list-disc space-y-0.5 pl-4">
              {q.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Callout>
        </div>
      )}

      <div className="grid gap-4 p-3.5 sm:p-4 @3xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] @3xl:gap-5">
        <QuestionPreview q={q} showAnswer={showAnswer} />
        <QuestionMeta q={q} />
      </div>

      {showJson && (
        <div id={jsonId} className="border-t border-border bg-surface-2/60">
          <div className="flex items-center justify-between px-3.5 pt-2 sm:px-4">
            <span className="text-[11.5px] font-medium text-subtle">Raw question JSON</span>
            <CopyButton text={json} label="Sao chép JSON" />
          </div>
          <pre className="scrollbar-thin max-h-96 overflow-auto px-3.5 pt-1 pb-3 font-mono text-[11.5px] leading-[1.6] text-muted sm:px-4">
            {json}
          </pre>
        </div>
      )}
    </article>
  );
}
