"use client";

import { AudioLines, Image as ImageIcon, ListChecks, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { type GenerationProgress, onGenerationProgress } from "@/lib/api-backend";
import type { GenerateResponse, GeneratedQuestion } from "@shared/types";
import { MediaProvider } from "./media/MediaContext";
import { AudioGallery } from "./results/AudioGallery";
import { ImageGallery } from "./results/ImageGallery";
import { QuestionCard } from "./results/QuestionCard";
import { summarizeLo } from "./labels";

import { RunHeader } from "./results/RunHeader";
import { Callout, cn } from "./ui";

function groupByLo(questions: GeneratedQuestion[]) {
  const groups: Array<{ code: string; name: string; items: Array<{ q: GeneratedQuestion; i: number }> }> = [];
  questions.forEach((q, i) => {
    let g = groups.find((x) => x.code === q.lo.code);
    if (!g) groups.push((g = { code: q.lo.code, name: q.lo.name, items: [] }));
    g.items.push({ q, i });
  });
  return groups;
}

export interface ResultsViewProps {
  result: GenerateResponse | null;
  onRegenerateImage: (assetId: string) => void;
  onExportJson: () => void;
  /** Optional: regenerate one audio asset (shows "Tạo lại" in the Audio tab when provided). */
  onRegenerateAudio?: (assetId: string) => void;
  /** Optional: show a skeleton while a generation is running. */
  loading?: boolean;
  /** Optional: error message from the last generation. */
  error?: string | null;
}

type TabId = "questions" | "images" | "audios";

export function ResultsView({ result, onRegenerateImage, onRegenerateAudio, onExportJson, loading, error }: ResultsViewProps) {
  if (loading) return <LoadingState />;
  return (
    <div className="space-y-4">
      {error && (
        <Callout tone="danger" title="Không tạo được câu hỏi">
          {error}
        </Callout>
      )}
      {result ? (
        <MediaProvider result={result} onRegenerateImage={onRegenerateImage} onRegenerateAudio={onRegenerateAudio}>
          <Results result={result} onRegenerateImage={onRegenerateImage} onRegenerateAudio={onRegenerateAudio} onExportJson={onExportJson} />
        </MediaProvider>
      ) : (
        !error && <EmptyState />
      )}
    </div>
  );
}

function Results({
  result,
  onRegenerateImage,
  onRegenerateAudio,
  onExportJson,
}: {
  result: GenerateResponse;
  onRegenerateImage: (assetId: string) => void;
  onRegenerateAudio?: (assetId: string) => void;
  onExportJson: () => void;
}) {
  const baseId = useId();
  const [tab, setTab] = useState<TabId>("questions");
  const [answerMode, setAnswerMode] = useState(true);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ questions: null, images: null, audios: null });

  const tabs: Array<{ id: TabId; label: string; count: number; icon: typeof ListChecks }> = [
    { id: "questions", label: "Câu hỏi", count: result.questions.length, icon: ListChecks },
    { id: "images", label: "Hình ảnh", count: result.images.length, icon: ImageIcon },
    { id: "audios", label: "Audio", count: result.audios.length, icon: AudioLines },
  ];

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const order = tabs.map((t) => t.id);
    const i = order.indexOf(tab);
    let next: TabId | null = null;
    if (e.key === "ArrowRight") next = order[(i + 1) % order.length];
    else if (e.key === "ArrowLeft") next = order[(i - 1 + order.length) % order.length];
    else if (e.key === "Home") next = order[0];
    else if (e.key === "End") next = order[order.length - 1];
    if (next) {
      e.preventDefault();
      setTab(next);
      tabRefs.current[next]?.focus();
    }
  }

  return (
    <div className="space-y-4">
      <RunHeader result={result} onExportJson={onExportJson} />

      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border">
        <div role="tablist" aria-label="Kết quả" className="-mb-px flex gap-0.5 sm:gap-1" onKeyDown={onKeyDown}>
          {tabs.map((t) => {
            const selected = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 border-b-2 px-2 text-[13.5px] sm:gap-2 sm:px-3 font-medium transition-colors focus-visible:outline-offset-[-2px]",
                  selected ? "border-accent text-fg" : "border-transparent text-subtle hover:text-fg",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {t.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] tabular-nums",
                    selected ? "bg-accent-soft text-accent-text" : "bg-surface-2 text-subtle",
                  )}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
        {tab === "questions" && (
          <div role="group" aria-label="Chế độ xem" className="mb-1.5 flex rounded-lg bg-surface-2 p-0.5 text-[12px] font-medium">
            {[
              { v: false, label: "Học sinh" },
              { v: true, label: "Answer key" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={answerMode === o.v}
                onClick={() => setAnswerMode(o.v)}
                className={cn(
                  "h-7 rounded-md px-2.5 transition-colors",
                  answerMode === o.v ? "bg-surface text-fg shadow-card" : "text-subtle hover:text-fg",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-questions`}
        aria-labelledby={`${baseId}-tab-questions`}
        hidden={tab !== "questions"}
        tabIndex={0}
        className="space-y-4 focus-visible:outline-none"
      >
        {result.questions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-strong px-4 py-10 text-center text-[13px] text-subtle">
            Không có câu hỏi nào được tạo.
          </p>
        ) : (
          // Grouped by LO cháu (backend returns them grouped, in the order the LO were selected).
          groupByLo(result.questions).map((g) => (
            <section key={g.code} aria-label={`LO ${g.code}`} className="space-y-3">
              <h3 className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border pb-1.5 text-[13px] font-semibold text-fg">
                <span className="font-mono text-accent-text">{g.code}</span>
                <span className="min-w-0">{summarizeLo(g.name).title}</span>
                <span className="ml-auto text-[12px] font-normal text-subtle">{g.items.length} câu</span>
              </h3>
              {g.items.map(({ q, i }) => (
                // Re-key on answerMode so the global toggle resets every card's local state.
                <QuestionCard key={`${result.runId}-${q.id}-${answerMode}`} q={q} index={i} defaultShowAnswer={answerMode} />
              ))}
            </section>
          ))
        )}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-images`}
        aria-labelledby={`${baseId}-tab-images`}
        hidden={tab !== "images"}
        tabIndex={0}
        className="focus-visible:outline-none"
      >
        {tab === "images" && <ImageGallery result={result} onRegenerateImage={onRegenerateImage} />}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-audios`}
        aria-labelledby={`${baseId}-tab-audios`}
        hidden={tab !== "audios"}
        tabIndex={0}
        className="focus-visible:outline-none"
      >
        {tab === "audios" && <AudioGallery result={result} onRegenerateAudio={onRegenerateAudio} />}
      </div>
    </div>
  );
}

function EmptyState() {
  const steps = ["Chọn dạng câu hỏi", "Chọn LO cháu (có thể nhiều)", "Chọn mức Bloom và số câu", "Nhấn “Tạo câu hỏi”"];
  return (
    <div className="grid min-h-[50vh] place-items-center rounded-xl border border-dashed border-border-strong bg-surface/50 px-6 py-12 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-text">
          <Sparkles className="size-5" aria-hidden />
        </div>
        <h2 className="text-[15px] font-semibold text-fg">Chưa có kết quả</h2>
        <p className="mt-1 text-[13px] text-subtle">Câu hỏi, hình ảnh (prompt + negative prompt) và audio sẽ hiển thị ở đây.</p>
        <ol className="mt-5 space-y-1.5 text-left text-[13px] text-muted">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-md bg-surface-3 font-mono text-[11px] font-semibold text-muted">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ProgressLine() {
  const [p, setP] = useState<GenerationProgress | null>(null);
  useEffect(() => onGenerationProgress(setP), []);
  return (
    <p className="text-center text-[12.5px] text-subtle">
      AI đang tạo câu hỏi, ảnh và audio…{" "}
      {p ? `(${p.done}/${p.total} LO xong · ${p.questions} câu)` : ""} Thường mất 1–3 phút.
    </p>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4" aria-busy aria-live="polite">
      <span className="sr-only">AI đang tạo câu hỏi…</span>
      <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <div className="skeleton h-4 w-48 rounded" />
        <div className="skeleton mt-2 h-3 w-72 max-w-full rounded" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-9 rounded" />
          ))}
        </div>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="flex gap-2">
            <div className="skeleton h-5 w-16 rounded" />
            <div className="skeleton h-5 w-20 rounded" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
            <div className="skeleton h-56 rounded-xl" />
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, j) => (
                <div key={j} className="skeleton h-6 rounded" />
              ))}
            </div>
          </div>
        </div>
      ))}
      <ProgressLine />
    </div>
  );
}
