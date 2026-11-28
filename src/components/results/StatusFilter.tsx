"use client";

import type { AssetStatus } from "@shared/types";
import { STATUS_LABEL, StatusDot } from "../media/MediaImage";
import { cn } from "../ui";

export type StatusFilterValue = "all" | AssetStatus;

/** Summary counts per status that double as filter buttons. */
export function StatusFilter({
  statuses,
  value,
  onChange,
}: {
  statuses: AssetStatus[];
  value: StatusFilterValue;
  onChange: (v: StatusFilterValue) => void;
}) {
  const counts: Record<AssetStatus, number> = { pending: 0, generating: 0, done: 0, error: 0, skipped: 0 };
  for (const s of statuses) counts[s] += 1;
  const items: Array<{ id: StatusFilterValue; label: string; n: number }> = [
    { id: "all", label: "Tất cả", n: statuses.length },
    { id: "done", label: STATUS_LABEL.done, n: counts.done },
    { id: "generating", label: STATUS_LABEL.generating, n: counts.generating },
    { id: "pending", label: STATUS_LABEL.pending, n: counts.pending },
    { id: "error", label: STATUS_LABEL.error, n: counts.error },
  ];
  if (counts.skipped) items.push({ id: "skipped", label: STATUS_LABEL.skipped, n: counts.skipped });

  return (
    <div role="group" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-1">
      {items.map((f) => (
        <button
          key={f.id}
          type="button"
          aria-pressed={value === f.id}
          onClick={() => onChange(f.id)}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] font-medium transition-colors",
            value === f.id ? "border-fg/20 bg-fg text-bg" : "border-border bg-surface text-muted hover:text-fg",
          )}
        >
          {f.id !== "all" && <StatusDot status={f.id} />}
          {f.label}
          <span className={cn("tabular-nums", value === f.id ? "opacity-70" : "text-subtle")}>{f.n}</span>
        </button>
      ))}
    </div>
  );
}
