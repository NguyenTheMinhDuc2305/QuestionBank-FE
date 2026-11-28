"use client";

import { Check, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { LOGeneral, LOItem, LOSpecific, LOTree } from "@shared/types";
import { normalize, summarizeLo } from "../labels";
import { Badge, cn } from "../ui";

interface Indexed {
  item: LOItem;
  specific: LOSpecific;
  general: LOGeneral;
}

function filterTree(generals: LOGeneral[], q: string): LOGeneral[] {
  if (!q) return generals;
  const hit = (...parts: string[]) => parts.some((p) => normalize(p).includes(q));
  const out: LOGeneral[] = [];
  for (const g of generals) {
    if (hit(g.nameEn, g.nameVi, g.code, `unit ${g.unit}`, `u${g.unit}`)) {
      out.push(g);
      continue;
    }
    const specifics: LOSpecific[] = [];
    for (const s of g.specifics) {
      if (hit(s.name, s.code, s.category === "grammar" ? "ngu phap grammar" : "tu vung vocabulary")) {
        specifics.push(s);
        continue;
      }
      const items = s.items.filter((i) => hit(i.name, i.code));
      if (items.length) specifics.push({ ...s, items });
    }
    if (specifics.length) out.push({ ...g, specifics });
  }
  return out;
}

export function LoPicker({
  tree,
  selected,
  onChange,
}: {
  tree: LOTree;
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [openUnits, setOpenUnits] = useState<Set<string>>(() => new Set(tree.generals.slice(0, 1).map((g) => g.code)));
  const [openItems, setOpenItems] = useState<Set<string>>(() => new Set());

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const index = useMemo(() => {
    const m = new Map<string, Indexed>();
    for (const general of tree.generals)
      for (const specific of general.specifics) for (const item of specific.items) m.set(item.code, { item, specific, general });
    return m;
  }, [tree]);

  const q = normalize(query.trim());
  const visible = useMemo(() => filterTree(tree.generals, q), [tree.generals, q]);

  const toggleSet = (set: Set<string>, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  const toggleItem = (code: string) =>
    onChange(selectedSet.has(code) ? selected.filter((c) => c !== code) : [...selected, code]);

  const setMany = (codes: string[], on: boolean) => {
    if (on) onChange([...selected, ...codes.filter((c) => !selectedSet.has(c))]);
    else {
      const drop = new Set(codes);
      onChange(selected.filter((c) => !drop.has(c)));
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Search */}
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          Tìm LO
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle" aria-hidden />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm unit, LO con, từ vựng, pattern…"
          className="h-9 w-full rounded-lg border border-border bg-surface pr-8 pl-8 text-sm text-fg placeholder:text-subtle hover:border-border-strong focus-visible:border-accent"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Xoá tìm kiếm"
            className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="rounded-lg border border-border bg-surface-2/60 p-2">
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="font-medium text-fg" aria-live="polite">
              Đã chọn {selected.length} LO cháu
            </span>
            <button type="button" onClick={() => onChange([])} className="text-subtle hover:text-danger">
              Bỏ chọn tất cả
            </button>
          </div>
          <ul className="scrollbar-thin flex max-h-24 flex-wrap gap-1 overflow-y-auto">
            {selected.map((code) => {
              const entry = index.get(code);
              const title = entry ? summarizeLo(entry.item.name).title : code;
              return (
                <li key={code}>
                  <span
                    className="inline-flex max-w-[15rem] items-center gap-1 rounded-md border border-border bg-surface py-0.5 pr-0.5 pl-1.5 text-[12px] text-fg"
                    title={`${code}\n${entry?.item.name ?? ""}`}
                  >
                    <span className="font-mono text-[10.5px] text-subtle">{code.replace(/^AIC_G\d+_/, "")}</span>
                    <span className="truncate">{title}</span>
                    <button
                      type="button"
                      onClick={() => toggleItem(code)}
                      aria-label={`Bỏ chọn ${title}`}
                      className="grid size-4 shrink-0 place-items-center rounded text-subtle hover:bg-danger-soft hover:text-danger"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Tree */}
      <div className="scrollbar-thin max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-surface lg:max-h-[420px]">
        {visible.length === 0 && (
          <p className="px-3 py-6 text-center text-[13px] text-subtle">Không tìm thấy LO phù hợp với “{query}”.</p>
        )}
        <ul className="divide-y divide-border">
          {visible.map((g) => {
            const open = q.length > 0 || openUnits.has(g.code);
            const allCodes = g.specifics.flatMap((s) => s.items.map((i) => i.code));
            const fullCodes = tree.generals.find((x) => x.code === g.code)?.specifics.flatMap((s) => s.items.map((i) => i.code)) ?? allCodes;
            const nSel = fullCodes.filter((c) => selectedSet.has(c)).length;
            const panelId = `lo-unit-${g.code}`;
            return (
              <li key={g.code}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenUnits((s) => toggleSet(s, g.code))}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-2/70"
                >
                  {open ? (
                    <ChevronDown className="size-4 shrink-0 text-subtle" aria-hidden />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden />
                  )}
                  <span className="w-8 shrink-0 font-mono text-[11px] font-semibold text-muted">U{g.unit}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-fg">{g.nameEn}</span>
                    <span className="block truncate text-[11.5px] text-subtle">{g.nameVi}</span>
                  </span>
                  {nSel > 0 && (
                    <Badge tone="accent">
                      {nSel}/{fullCodes.length}
                    </Badge>
                  )}
                </button>
                {open && (
                  <div id={panelId} className="space-y-2 px-3 pb-3">
                    {g.specifics.map((s) => (
                      <SpecificGroup
                        key={s.code}
                        specific={s}
                        selected={selectedSet}
                        openItems={openItems}
                        onToggleItem={toggleItem}
                        onToggleExpand={(code) => setOpenItems((set) => toggleSet(set, code))}
                        onSetMany={setMany}
                      />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function SpecificGroup({
  specific: s,
  selected,
  openItems,
  onToggleItem,
  onToggleExpand,
  onSetMany,
}: {
  specific: LOSpecific;
  selected: Set<string>;
  openItems: Set<string>;
  onToggleItem: (code: string) => void;
  onToggleExpand: (code: string) => void;
  onSetMany: (codes: string[], on: boolean) => void;
}) {
  const codes = s.items.map((i) => i.code);
  const n = codes.filter((c) => selected.has(c)).length;
  const all = n === codes.length && n > 0;
  const some = n > 0 && !all;
  const grammar = s.category === "grammar";

  return (
    <fieldset className="rounded-md border border-border bg-surface-2/40 px-2.5 pt-2 pb-2.5">
      <legend className="sr-only">{s.name}</legend>
      <div className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={grammar ? "grammar" : "vocab"}>{grammar ? "Ngữ pháp" : "Từ vựng"}</Badge>
            <span className="text-[12.5px] leading-tight font-medium text-fg">{s.name}</span>
          </div>
          <span className="mt-0.5 block font-mono text-[10.5px] text-subtle">{s.code}</span>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11.5px] text-muted hover:text-fg">
          <input
            type="checkbox"
            checked={all}
            ref={(el) => {
              if (el) el.indeterminate = some;
            }}
            onChange={() => onSetMany(codes, !all)}
            className="size-3.5 accent-accent"
          />
          Chọn tất cả
        </label>
      </div>

      {grammar ? (
        <ul className="space-y-1">
          {s.items.map((item) => {
            const { title, rest } = summarizeLo(item.name);
            const expanded = openItems.has(item.code);
            const checked = selected.has(item.code);
            return (
              <li
                key={item.code}
                className={cn(
                  "rounded-md border transition-colors",
                  checked ? "border-accent-border bg-accent-soft" : "border-transparent bg-surface hover:border-border",
                )}
              >
                <div className="flex items-start gap-2 px-2 py-1.5">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleItem(item.code)}
                      className="mt-0.5 size-3.5 shrink-0 accent-accent"
                    />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] leading-snug text-fg">{title}</span>
                      <span className="block font-mono text-[10.5px] text-subtle">{item.code}</span>
                    </span>
                  </label>
                  {rest.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onToggleExpand(item.code)}
                      aria-expanded={expanded}
                      aria-label={expanded ? "Ẩn chi tiết pattern" : "Xem chi tiết pattern / constraint"}
                      className="grid size-6 shrink-0 place-items-center rounded text-subtle hover:bg-surface-2 hover:text-fg"
                    >
                      <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} aria-hidden />
                    </button>
                  )}
                </div>
                {expanded && rest.length > 0 && (
                  <pre className="mx-2 mb-2 overflow-x-auto rounded border border-border bg-surface-2 px-2 py-1.5 font-mono text-[11px] leading-[1.55] whitespace-pre-wrap text-muted">
                    {rest.join("\n")}
                  </pre>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {s.items.map((item) => {
            const checked = selected.has(item.code);
            return (
              <li key={item.code}>
                <label
                  title={item.code}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[12.5px] transition-colors",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-ring",
                    checked
                      ? "border-accent bg-accent-soft font-medium text-accent-text"
                      : "border-border bg-surface text-fg hover:border-border-strong",
                  )}
                >
                  <input type="checkbox" checked={checked} onChange={() => onToggleItem(item.code)} className="sr-only" />
                  {checked && <Check className="size-3" aria-hidden />}
                  {item.name.trim()}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
