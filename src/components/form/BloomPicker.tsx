"use client";

import type { BloomLevel, MetaResponse } from "@shared/types";
import { cn } from "../ui";

export function BloomPicker({
  levels,
  value,
  onChange,
}: {
  levels: MetaResponse["bloomLevels"];
  value: BloomLevel;
  onChange: (level: BloomLevel) => void;
}) {
  const current = levels.find((l) => l.code === value);
  return (
    <div>
      <div role="radiogroup" aria-label="Mức độ Bloom" className="grid grid-cols-4 gap-1 rounded-lg bg-surface-2 p-1">
        {levels.map((l) => {
          const selected = l.code === value;
          return (
            <label
              key={l.code}
              className={cn(
                "flex min-w-0 cursor-pointer flex-col items-center rounded-md px-1 py-1.5 text-center transition-colors",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                selected ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
              )}
            >
              <input
                type="radio"
                name="bloom"
                value={l.code}
                checked={selected}
                onChange={() => onChange(l.code)}
                className="sr-only"
              />
              <span className={cn("font-mono text-[12px] font-semibold", selected && "text-accent-text")}>{l.code}</span>
              <span className="w-full truncate text-[11px] leading-tight">{l.nameVi}</span>
            </label>
          );
        })}
      </div>
      {current && (
        <p className="mt-2 text-[12px] leading-snug text-subtle" aria-live="polite">
          <span className="font-medium text-muted">
            {current.nameVi} · {current.nameEn}:
          </span>{" "}
          {current.description}
        </p>
      )}
    </div>
  );
}
