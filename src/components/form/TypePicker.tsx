"use client";

import { AudioLines, Image as ImageIcon, Type } from "lucide-react";
import type { QuestionTypeCode, QuestionTypeMeta } from "@shared/types";
import { Badge, cn } from "../ui";

const MEDIA_ICON = { text: Type, audio: AudioLines, image: ImageIcon } as const;
const MEDIA_LABEL = { text: "Text", audio: "Audio", image: "Ảnh" } as const;

function MediaRow({ label, media }: { label: string; media: QuestionTypeMeta["questionMedia"] }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-subtle">
      <span className="w-[34px] shrink-0">{label}</span>
      {media.length === 0 ? (
        <span aria-label="không có">—</span>
      ) : (
        media.map((m) => {
          const Icon = MEDIA_ICON[m];
          return (
            <span
              key={m}
              title={MEDIA_LABEL[m]}
              className="inline-flex items-center gap-0.5 rounded bg-surface-2 px-1 py-px text-[10.5px] text-muted"
            >
              <Icon className="size-3" aria-hidden />
              {MEDIA_LABEL[m]}
            </span>
          );
        })
      )}
    </span>
  );
}

export function TypePicker({
  types,
  value,
  onChange,
  allowPreviewTypes = false,
}: {
  types: QuestionTypeMeta[];
  value: QuestionTypeCode;
  onChange: (code: QuestionTypeCode) => void;
  /** When true, `enabled:false` types can still be selected (shown as "Phase 2 · preview"). */
  allowPreviewTypes?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Dạng câu hỏi" className="grid grid-cols-1 gap-2 @sm:grid-cols-2">
      {types.map((t) => {
        const selected = t.code === value;
        const selectable = t.enabled || allowPreviewTypes;
        return (
          <label
            key={t.code}
            className={cn(
              "group relative flex cursor-pointer flex-col gap-1.5 rounded-lg border p-2.5 transition-colors",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
              selected
                ? "border-accent bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent)]"
                : "border-border bg-surface hover:border-border-strong hover:bg-surface-2/60",
              !selectable && "cursor-not-allowed opacity-55",
              !t.enabled && !selected && "border-dashed",
            )}
          >
            <input
              type="radio"
              name="question-type"
              value={t.code}
              checked={selected}
              disabled={!selectable}
              onChange={() => onChange(t.code)}
              className="sr-only"
            />
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "font-mono text-[11px] font-semibold tracking-tight",
                  selected ? "text-accent-text" : "text-muted",
                )}
              >
                {t.code}
              </span>
              {!t.enabled && (
                <Badge tone="warning" className="ml-auto" title={t.phaseNote}>
                  Phase 2
                </Badge>
              )}
            </span>
            <span className="text-[13px] leading-tight font-semibold text-fg">{t.nameVi}</span>
            <span className="line-clamp-2 text-[11.5px] leading-snug text-subtle">{t.description}</span>
            <span className="mt-auto flex flex-col gap-0.5 pt-0.5">
              <MediaRow label="Đề" media={t.questionMedia} />
              <MediaRow label="Đ.án" media={t.answerMedia} />
            </span>
          </label>
        );
      })}
    </div>
  );
}
