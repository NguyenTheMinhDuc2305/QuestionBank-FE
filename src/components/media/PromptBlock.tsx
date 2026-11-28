"use client";

import { CopyButton, ExpandableText, cn } from "../ui";

export function PromptBlock({
  label,
  text,
  tone,
  lines = 4,
}: {
  label: string;
  text: string;
  tone: "neutral" | "negative";
  lines?: 2 | 3 | 4 | 6;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2",
        tone === "negative" ? "border-warning-border bg-warning-soft" : "border-border bg-surface-2/60",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className={cn("text-[11px] font-semibold tracking-wide uppercase", tone === "negative" ? "text-warning" : "text-subtle")}>
          {label}
        </span>
        <CopyButton text={text} label={`Sao chép ${label}`} />
      </div>
      <ExpandableText text={text} lines={lines} threshold={200} className="text-[12px] leading-[1.55] text-fg/85" />
    </div>
  );
}
