"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "./ui";

type Theme = "system" | "light" | "dark";
const EVENT = "qb-theme-change";

function read(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

function apply(t: Theme) {
  const root = document.documentElement;
  if (t === "system") delete root.dataset.theme;
  else root.dataset.theme = t;
  try {
    if (t === "system") localStorage.removeItem("qb-theme");
    else localStorage.setItem("qb-theme", t);
  } catch {
    // storage unavailable — theme still applies for this page view
  }
  window.dispatchEvent(new Event(EVENT));
}

const OPTIONS: Array<{ id: Theme; label: string; Icon: typeof Sun }> = [
  { id: "system", label: "Theo hệ thống", Icon: Monitor },
  { id: "light", label: "Sáng", Icon: Sun },
  { id: "dark", label: "Tối", Icon: Moon },
];

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  return (
    <div role="radiogroup" aria-label="Giao diện" className="flex rounded-lg border border-border bg-surface-2 p-0.5">
      {OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={theme === id}
          aria-label={label}
          title={label}
          onClick={() => apply(id)}
          className={cn(
            "grid size-7 place-items-center rounded-md transition-colors",
            theme === id ? "bg-surface text-fg shadow-card" : "text-subtle hover:text-fg",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
