"use client";

import { AudioLines, Image as ImageIcon, KeyRound, Minus, Plus, Sparkles, TriangleAlert } from "lucide-react";
import { useId, type FormEvent } from "react";
import type { GenerateRequest, MatchMode, MetaResponse } from "@shared/types";
import { BloomPicker } from "./form/BloomPicker";
import { LoPicker } from "./form/LoPicker";
import { TypePicker } from "./form/TypePicker";
import { Button, Callout, SectionHeading, Switch, cn } from "./ui";

export interface GeneratorFormProps {
  meta: MetaResponse;
  value: GenerateRequest;
  onChange: (next: GenerateRequest) => void;
  onSubmit: (req: GenerateRequest) => void;
  loading: boolean;
  /** Allow selecting `enabled:false` question types as a preview (e.g. RESP_SEL in mock mode). Default false. */
  allowPreviewTypes?: boolean;
}

export function GeneratorForm({ meta, value, onChange, onSubmit, loading, allowPreviewTypes }: GeneratorFormProps) {
  const countId = useId();
  const max = meta.limits.maxQuestions; // per LO cháu
  const maxTotal = meta.limits.maxTotalQuestions ?? max * 5;
  const type = meta.questionTypes.find((t) => t.code === value.type);
  const withImages = value.options?.withImages ?? true;
  const withAudio = value.options?.withAudio ?? true;
  const count = Math.min(Math.max(1, value.count || 1), max);
  const isSpeak = value.type === "SPEAK";
  const isMatch = value.type === "MATCH";
  const matchMode = value.options?.matchMode ?? "auto";
  const loCount = value.loCodes.length;
  // count is PER LO cháu: total = count × number of selected LO (SPEAK: count quizzes, each covering all LO)
  const total = isSpeak ? count : count * loCount;

  const set = (patch: Partial<GenerateRequest>) => onChange({ ...value, ...patch });
  const setOption = (patch: NonNullable<GenerateRequest["options"]>) =>
    onChange({ ...value, options: { ...value.options, ...patch } });
  const setCount = (n: number) => set({ count: Math.min(Math.max(1, Math.round(n) || 1), max) });

  const typeBlocked = !type || (!type.enabled && !allowPreviewTypes);
  const blockReason = typeBlocked
    ? "Dạng câu hỏi này chưa được hỗ trợ."
    : !meta.hasApiKey && !allowPreviewTypes
      ? "Server chưa có OPENROUTER_API_KEY."
      : value.loCodes.length === 0
      ? "Chọn ít nhất 1 LO cháu."
      : total > maxTotal
      ? `Tối đa ${maxTotal} câu mỗi lần (đang là ${loCount} LO × ${count} = ${total}). Giảm số LO hoặc số câu / LO.`
      : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (blockReason || loading) return;
    const options = { ...value.options };
    if (value.type !== "MATCH") delete options.matchMode;
    onSubmit({ ...value, count, options });
  }

  return (
    <form onSubmit={submit} className="@container flex min-h-full flex-col" aria-label="Cấu hình tạo câu hỏi">
      <div className="flex-1 space-y-6 px-4 py-5 sm:px-5">
        {!meta.hasApiKey && (
          <Callout tone="warning" icon={<KeyRound className="size-4" aria-hidden />} title="Chưa cấu hình OPENROUTER_API_KEY">
            Server chưa có API key nên không gọi được AI. Thêm <code>OPENROUTER_API_KEY</code> vào <code>.env.local</code> (hoặc
            Vercel env) rồi khởi động lại.
          </Callout>
        )}

        <section aria-labelledby="sec-type">
          <SectionHeading step={1} id="sec-type" title="Dạng câu hỏi" />
          <TypePicker
            types={meta.questionTypes}
            value={value.type}
            onChange={(code) => set({ type: code })}
            allowPreviewTypes={allowPreviewTypes}
          />
          {type && !type.enabled && (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] text-warning">
              <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
              {type.phaseNote ?? "Phase 2"} — kết quả chỉ để xem trước.
            </p>
          )}
        </section>

        <section aria-labelledby="sec-lo">
          <SectionHeading
            step={2}
            id="sec-lo"
            title="Learning objectives (LO cháu)"
            aside={<span className="text-[11.5px] text-subtle">Grade {meta.loTree.generals[0]?.grade ?? 1}</span>}
          />
          <LoPicker tree={meta.loTree} selected={value.loCodes} onChange={(loCodes) => set({ loCodes })} />
        </section>

        <section aria-labelledby="sec-bloom">
          <SectionHeading step={3} id="sec-bloom" title="Mức độ (Bloom)" />
          <BloomPicker levels={meta.bloomLevels} value={value.bloom} onChange={(bloom) => set({ bloom })} />
        </section>

        <section aria-labelledby="sec-count" className="space-y-3">
          <SectionHeading step={4} id="sec-count" title="Số lượng & media" />
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={countId} className="min-w-0">
              <span className="block text-sm font-medium text-fg">{isSpeak ? "Số bài" : "Số câu / mỗi LO cháu"}</span>
              <span className={cn("block text-xs text-subtle", total > maxTotal && "text-danger")}>
                {isSpeak
                  ? "SPEAK: 1 giá trị / LO cháu"
                  : loCount > 0
                    ? `${loCount} LO × ${count} câu = ${total} câu (tối đa ${maxTotal})`
                    : `Tối đa ${max} câu / LO, ${maxTotal} câu / lần`}
              </span>
            </label>
            <div className="flex h-9 shrink-0 items-stretch overflow-hidden rounded-lg border border-border bg-surface">
              <button
                type="button"
                onClick={() => setCount(count - 1)}
                disabled={count <= 1}
                aria-label="Giảm số câu"
                className="grid w-9 place-items-center text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40"
              >
                <Minus className="size-4" aria-hidden />
              </button>
              <input
                id={countId}
                type="number"
                inputMode="numeric"
                min={1}
                max={max}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-12 border-x border-border bg-transparent text-center font-mono text-sm text-fg [appearance:textfield] focus-visible:outline-offset-[-2px] [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setCount(count + 1)}
                disabled={count >= max}
                aria-label="Tăng số câu"
                className="grid w-9 place-items-center text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40"
              >
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          {isMatch && (
            <div role="radiogroup" aria-labelledby={`${countId}-mm`}>
              <span id={`${countId}-mm`} className="mb-1.5 block text-sm font-medium text-fg">
                Kiểu nối
              </span>
              <div className="grid grid-cols-3 gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5">
                {(
                  [
                    ["auto", "Tự động"],
                    ["en_vi", "Anh – Việt"],
                    ["en_image", "Anh – Hình ảnh"],
                  ] as Array<["auto" | MatchMode, string]>
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={matchMode === v}
                    onClick={() => setOption({ matchMode: v })}
                    className={cn(
                      "rounded-md px-2 py-1.5 text-[12.5px] font-medium",
                      matchMode === v ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {matchMode === "en_image" && !withImages && (
                <p className="mt-1.5 text-[11.5px] text-warning">Kiểu Anh – Hình ảnh cần bật “Tạo hình ảnh”.</p>
              )}
            </div>
          )}
          <div className="grid gap-2 @sm:grid-cols-2">
            <Switch
              checked={withImages}
              onChange={(v) => setOption({ withImages: v })}
              label="Tạo hình ảnh"
              description="Prompt + negative prompt"
              icon={<ImageIcon className="size-4" aria-hidden />}
            />
            <Switch
              checked={withAudio}
              onChange={(v) => setOption({ withAudio: v })}
              label="Tạo audio"
              description="TTS en-US"
              icon={<AudioLines className="size-4" aria-hidden />}
            />
          </div>
        </section>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-10 border-t border-border bg-surface/90 px-4 py-3 backdrop-blur sm:px-5">
        <div className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px] text-subtle">
          <span className="font-mono font-medium text-muted">{value.type}</span>
          <span aria-hidden>·</span>
          <span className={cn(value.loCodes.length === 0 && "text-warning")}>{value.loCodes.length} LO cháu</span>
          <span aria-hidden>·</span>
          <span>{value.bloom}</span>
          <span aria-hidden>·</span>
          <span className={cn(total > maxTotal && "text-danger")}>
            {isSpeak ? `${count} bài` : `${count} câu/LO = ${total} câu`}
          </span>
        </div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={!!blockReason}
          icon={<Sparkles className="size-4" aria-hidden />}
          aria-describedby={blockReason ? "gen-block-reason" : undefined}
        >
          {loading ? "Đang tạo câu hỏi…" : "Tạo câu hỏi"}
        </Button>
        {blockReason && !loading && (
          <p id="gen-block-reason" className="mt-1.5 text-center text-[11.5px] text-subtle">
            {blockReason}
          </p>
        )}
      </div>
    </form>
  );
}
