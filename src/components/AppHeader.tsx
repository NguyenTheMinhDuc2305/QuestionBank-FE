"use client";

import { History, Layers, Sparkles } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Badge, cn } from "./ui";

export type AppView = "generate" | "history";

const VIEWS: Array<{ id: AppView; label: string; icon: typeof Sparkles }> = [
  { id: "generate", label: "Tạo câu hỏi", icon: Sparkles },
  { id: "history", label: "Câu đã tạo", icon: History },
];

export function AppHeader({ mock, view, onViewChange }: { mock?: boolean; view?: AppView; onViewChange?: (v: AppView) => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-5">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-fg shadow-card">
          <Layers className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[14px] leading-tight font-semibold tracking-tight text-fg">Question Bank Generator</h1>
          <p className="truncate text-[11.5px] leading-tight text-subtle">Tiếng Anh tiểu học · Grade 1 · AI</p>
        </div>
        {view && onViewChange && (
          <nav aria-label="Chế độ" className="ml-2 flex rounded-lg bg-surface-2 p-0.5 text-[12.5px] font-medium sm:ml-4">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-current={view === v.id ? "page" : undefined}
                onClick={() => onViewChange(v.id)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 transition-colors sm:px-3",
                  view === v.id ? "bg-surface text-fg shadow-card" : "text-subtle hover:text-fg",
                )}
              >
                <v.icon className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          {mock && (
            <Badge tone="warning" title="Đang dùng dữ liệu mẫu (src/lib/mock.ts)">
              Mock data
            </Badge>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
