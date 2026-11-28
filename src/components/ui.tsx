"use client";

import { clsx } from "clsx";
import { Check, Copy, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

export const cn = clsx;

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "xs" | "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover shadow-card disabled:opacity-50",
  secondary: "bg-surface text-fg border border-border hover:bg-surface-2 hover:border-border-strong shadow-card disabled:opacity-50",
  ghost: "text-muted hover:text-fg hover:bg-surface-2 disabled:opacity-40",
  danger: "text-danger hover:bg-danger-soft disabled:opacity-40",
};

const SIZE: Record<ButtonSize, string> = {
  xs: "h-6 px-2 text-xs gap-1 rounded-md",
  sm: "h-8 px-2.5 text-[13px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-lg",
  lg: "h-11 px-4 text-[15px] gap-2 rounded-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
}

export function Button({ variant = "secondary", size = "md", icon, loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "vocab" | "grammar" | "outline";

const TONE: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-border",
  outline: "bg-transparent text-muted border-border",
  accent: "bg-accent-soft text-accent-text border-accent-border",
  success: "bg-success-soft text-success border-success-border",
  warning: "bg-warning-soft text-warning border-warning-border",
  danger: "bg-danger-soft text-danger border-danger-border",
  vocab: "bg-vocab-soft text-vocab border-transparent",
  grammar: "bg-grammar-soft text-grammar border-transparent",
};

export function Badge({
  tone = "neutral",
  mono,
  className,
  children,
  title,
}: {
  tone?: Tone;
  mono?: boolean;
  className?: string;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-px text-[11px] leading-4 font-medium whitespace-nowrap",
        mono && "font-mono tracking-tight",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Switch
// ---------------------------------------------------------------------------

export function Switch({
  checked,
  onChange,
  label,
  description,
  icon,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-border-strong disabled:opacity-50"
    >
      {icon && <span className="text-subtle">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description && <span className="block text-xs text-subtle">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-accent" : "bg-surface-3",
        )}
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-white shadow-card transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

export function CopyButton({ text, label = "Sao chép", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for non-secure contexts.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Đã sao chép" : label}
      title={label}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium transition-colors",
        copied ? "text-success" : "text-subtle hover:bg-surface-2 hover:text-fg",
        className,
      )}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      <span>{copied ? "Đã chép" : "Copy"}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Callout
// ---------------------------------------------------------------------------

export function Callout({
  tone = "warning",
  icon,
  title,
  children,
  className,
}: {
  tone?: "warning" | "danger" | "accent" | "neutral";
  icon?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const tones = {
    warning: "bg-warning-soft border-warning-border text-warning",
    danger: "bg-danger-soft border-danger-border text-danger",
    accent: "bg-accent-soft border-accent-border text-accent-text",
    neutral: "bg-surface-2 border-border text-muted",
  } as const;
  return (
    <div role={tone === "danger" ? "alert" : undefined} className={cn("flex gap-2.5 rounded-lg border px-3 py-2.5 text-[13px]", tones[tone], className)}>
      {icon && <span className="mt-px shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1 space-y-0.5">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className="text-fg/80 [&_code]:font-mono [&_code]:text-[12px]">{children}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expandable text (long prompts, grammar patterns)
// ---------------------------------------------------------------------------

export function ExpandableText({
  text,
  lines = 4,
  threshold = 220,
  className,
  mono,
}: {
  text: string;
  lines?: 2 | 3 | 4 | 6;
  threshold?: number;
  className?: string;
  mono?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const long = text.length > threshold || text.split("\n").length > lines;
  const clamp = { 2: "line-clamp-2", 3: "line-clamp-3", 4: "line-clamp-4", 6: "line-clamp-6" }[lines];
  return (
    <div className={className}>
      <p className={cn("break-words whitespace-pre-wrap", mono && "font-mono text-[12px] leading-5", long && !open && clamp)}>{text}</p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-1 text-[12px] font-medium text-accent-text hover:underline"
        >
          {open ? "Thu gọn" : "Xem đầy đủ"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("size-4 animate-spin", className)} aria-hidden />;
}

export function SectionHeading({ step, title, aside, id }: { step: number; title: string; aside?: ReactNode; id?: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="grid size-5 place-items-center rounded-md bg-surface-3 font-mono text-[11px] font-semibold text-muted" aria-hidden>
        {step}
      </span>
      <h2 id={id} className="text-[13px] font-semibold tracking-tight text-fg">
        {title}
      </h2>
      {aside && <div className="ml-auto flex items-center gap-2">{aside}</div>}
    </div>
  );
}
