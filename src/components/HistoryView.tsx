"use client";

import { Ban, CheckCircle2, ChevronLeft, ChevronRight, History, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { BloomLevel, GenerateResponse } from "@shared/types";
import { type QuestionPage, type ReviewStatus, type WorkerType, workerApi } from "@/lib/api-client";
import { findLoById, loadQuestions } from "@/lib/api-backend";
import { bloomCode } from "@/lib/convert";
import { BLOOM_LABEL, TYPE_LABEL, formatDateTime, summarizeLo } from "./labels";
import { MediaProvider } from "./media/MediaContext";
import { QuestionCard } from "./results/QuestionCard";
import { Badge, Button, Callout, Spinner, cn, type Tone } from "./ui";

const PAGE_SIZE = 20;
const TYPES: WorkerType[] = ["COMP_SEL", "TYPING", "MATCH", "ORDER", "LISTEN"];
const STATUS: Array<{ v: ReviewStatus; label: string; tone: Tone }> = [
  { v: "draft", label: "Nháp", tone: "warning" },
  { v: "approved", label: "Đã duyệt", tone: "success" },
  { v: "retired", label: "Ngừng dùng", tone: "neutral" },
];
const statusOf = (v: ReviewStatus) => STATUS.find((s) => s.v === v) ?? STATUS[0];
const noop = () => {};

type Filters = { question_type: "" | WorkerType; status: "" | ReviewStatus; bloom_level: "" | "1" | "2" | "3" | "4" };

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ v: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[11.5px] font-medium text-subtle">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-0.5 rounded-lg bg-surface-2 p-0.5 text-[12px] font-medium">
        {options.map((o) => (
          <button
            key={o.v || "all"}
            type="button"
            role="radio"
            aria-checked={value === o.v}
            onClick={() => onChange(o.v)}
            className={cn(
              "h-7 rounded-md px-2.5 transition-colors",
              value === o.v ? "bg-surface text-fg shadow-card" : "text-subtle hover:text-fg",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** "Câu đã tạo": browse every generated question, preview it with the generator's cards, approve/retire it. */
export function HistoryView() {
  const [filters, setFilters] = useState<Filters>({ question_type: "", status: "", bloom_level: "" });
  const [offset, setOffset] = useState(0);
  const [tick, setTick] = useState(0);
  // The list state remembers which query it answers, so "loading" is derived instead of set in the effect.
  const queryKey = JSON.stringify({ filters, offset, tick });
  const [list, setList] = useState<{ key: string; page: QuestionPage | null; error: string | null } | null>(null);
  const listLoading = list?.key !== queryKey;
  const page = list?.page ?? null;
  const listError = list?.key === queryKey ? list.error : null;

  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ run: GenerateResponse; status: ReviewStatus } | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    const ctl = new AbortController();
    workerApi
      .questions({ ...filters, offset, limit: PAGE_SIZE }, ctl.signal)
      .then((p) => setList({ key: queryKey, page: p, error: null }))
      .catch((e) => {
        if (!ctl.signal.aborted) setList((l) => ({ key: queryKey, page: l?.page ?? null, error: e instanceof Error ? e.message : String(e) }));
      });
    return () => ctl.abort();
  }, [filters, offset, queryKey]);

  const open = useCallback(async (id: string, status: ReviewStatus, createdAt: string) => {
    setSelected(id);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const run = await loadQuestions([id]);
      setDetail({
        status,
        run: {
          runId: id,
          request: { type: run.questions[0].type, loCodes: [run.questions[0].lo.code], bloom: run.questions[0].bloom, count: 1 },
          createdAt,
          model: "",
          warnings: [],
          ...run,
        },
      });
    } catch (e) {
      setDetail(null);
      setDetailError(e instanceof Error ? e.message : String(e));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const review = async (status: "approved" | "retired") => {
    if (!selected) return;
    const label = status === "approved" ? "Duyệt" : "Ngừng sử dụng";
    if (!confirm(`${label} câu này? Hãy chắc chắn đã kiểm tra đáp án, ảnh và audio.`)) return;
    setReviewing(true);
    try {
      await workerApi.review(selected, status);
      setDetail((d) => (d ? { ...d, status } : d));
      setTick((t) => t + 1);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : String(e));
    } finally {
      setReviewing(false);
    }
  };

  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setOffset(0);
  };

  return (
    <div className="lg:grid lg:grid-cols-[minmax(380px,440px)_minmax(0,1fr)]">
      <aside
        aria-label="Danh sách câu đã tạo"
        className="scrollbar-thin border-b border-border bg-surface lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:overflow-y-auto lg:border-r lg:border-b-0"
      >
        <div className="space-y-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <History className="size-4 text-muted" aria-hidden />
            <h2 className="text-[13px] font-semibold tracking-tight text-fg">Câu đã tạo</h2>
            <Button
              size="xs"
              variant="ghost"
              className="ml-auto"
              icon={<RefreshCw className="size-3.5" aria-hidden />}
              onClick={() => setTick((t) => t + 1)}
              loading={listLoading}
            >
              Làm mới
            </Button>
          </div>
          <Segmented
            label="Dạng bài"
            value={filters.question_type}
            onChange={(v) => setFilter("question_type", v)}
            options={[{ v: "", label: "Tất cả" }, ...TYPES.map((t) => ({ v: t, label: t }))]}
          />
          <Segmented
            label="Trạng thái"
            value={filters.status}
            onChange={(v) => setFilter("status", v)}
            options={[{ v: "", label: "Tất cả" }, ...STATUS.map((s) => ({ v: s.v, label: s.label }))]}
          />
          <Segmented
            label="Bloom"
            value={filters.bloom_level}
            onChange={(v) => setFilter("bloom_level", v)}
            options={[{ v: "", label: "Tất cả" }, ...(["1", "2", "3", "4"] as const).map((b) => ({ v: b, label: `M${b}` }))]}
          />
        </div>

        {listError && (
          <div className="p-4">
            <Callout tone="danger" title="Không tải được danh sách">
              {listError}
            </Callout>
          </div>
        )}
        {page && page.items.length === 0 && !listLoading && (
          <p className="px-5 py-10 text-center text-[13px] text-subtle">Chưa có câu hỏi phù hợp bộ lọc.</p>
        )}
        <ul className="divide-y divide-border">
          {page?.items.map((q) => {
            const lo = findLoById(q.lo?.id);
            const st = statusOf(q.status);
            const bloom = bloomCode(q.bloom_level) as BloomLevel;
            return (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => void open(q.id, q.status, q.created_at)}
                  aria-current={selected === q.id || undefined}
                  className={cn(
                    "w-full space-y-1 px-5 py-3 text-left transition-colors hover:bg-surface-2",
                    selected === q.id && "bg-accent-soft hover:bg-accent-soft",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="neutral" mono title={TYPE_LABEL[q.question_type]}>
                      {q.question_type}
                    </Badge>
                    <Badge tone="outline" title={BLOOM_LABEL[bloom]}>
                      <span className="font-mono">{bloom}</span>
                    </Badge>
                    <Badge tone={st.tone}>{st.label}</Badge>
                    <span className="ml-auto text-[11px] text-subtle">{formatDateTime(q.created_at)}</span>
                  </div>
                  <p className="line-clamp-2 text-[13px] text-fg">{q.summary || q.instruction_text || "—"}</p>
                  {q.lo && (
                    <p className="truncate text-[11.5px] text-subtle">
                      U{q.lo.unit} · {q.lo.specific_name} · {summarizeLo(q.lo.content).title}
                      {lo?.general_name ? ` · ${lo.general_name}` : ""}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {page && (page.offset > 0 || page.has_more) && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <Button
              size="sm"
              icon={<ChevronLeft className="size-4" aria-hidden />}
              disabled={offset === 0 || listLoading}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              Trước
            </Button>
            <span className="text-[12px] text-subtle">Trang {Math.floor(offset / PAGE_SIZE) + 1}</span>
            <Button size="sm" disabled={!page.has_more || listLoading} onClick={() => setOffset((o) => o + PAGE_SIZE)}>
              Sau
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        )}
      </aside>

      <main className="min-w-0 px-4 py-5 sm:px-6 lg:py-6">
        <div className="mx-auto max-w-[1200px] space-y-4">
          {detailError && (
            <Callout tone="danger" title="Không tải được câu hỏi">
              {detailError}
            </Callout>
          )}
          {detailLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-subtle">
              <Spinner /> Đang tải câu hỏi…
            </div>
          ) : detail ? (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 shadow-card">
                <span className="text-[13px] text-muted">Trạng thái</span>
                <Badge tone={statusOf(detail.status).tone}>{statusOf(detail.status).label}</Badge>
                <span className="text-[12px] text-subtle">Link ảnh/audio hết hạn sau 10 phút; bấm lại câu để làm mới.</span>
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<CheckCircle2 className="size-4" aria-hidden />}
                    disabled={detail.status === "approved"}
                    loading={reviewing}
                    onClick={() => void review("approved")}
                  >
                    Duyệt
                  </Button>
                  <Button
                    size="sm"
                    icon={<Ban className="size-4" aria-hidden />}
                    disabled={detail.status === "retired"}
                    loading={reviewing}
                    onClick={() => void review("retired")}
                  >
                    Ngừng dùng
                  </Button>
                </div>
              </div>
              <MediaProvider result={detail.run} onRegenerateImage={noop} onRegenerateAudio={noop}>
                {detail.run.questions.map((q, i) => (
                  <QuestionCard key={q.id} q={q} index={i} />
                ))}
              </MediaProvider>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border-strong px-6 py-20 text-center text-[13px] text-subtle">
              Chọn một câu ở danh sách bên trái để xem lại nội dung, ảnh và audio.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
