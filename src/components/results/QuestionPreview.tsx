"use client";

import { ArrowDown, Check } from "lucide-react";
import type { ReactNode } from "react";
import type {
  CompSelQuestion,
  GeneratedQuestion,
  ListenQuestion,
  MatchQuestion,
  MediaKey,
  OrderQuestion,
  RespSelQuestion,
  SpeakQuestion,
  TypingQuestion,
} from "@shared/types";
import { AudioPlayer } from "../media/AudioPlayer";
import { useMedia } from "../media/MediaContext";
import { MediaImage } from "../media/MediaImage";
import { Badge, cn } from "../ui";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const PAIR_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316"];

function findKey(q: GeneratedQuestion, kind: MediaKey["kind"], target: MediaKey["target"], value?: string) {
  return q.mediaKeys.find(
    (k) => k.kind === kind && k.target === target && (value === undefined || (k.targetValue ?? "").toLowerCase() === value.toLowerCase()),
  );
}

/** Image asset lookup by media key (undefined when the question has no such key). */
function useImage(mk?: MediaKey) {
  const { imageByKey, onRegenerateImage } = useMedia();
  return { asset: mk ? imageByKey.get(mk.id) : undefined, onRetry: onRegenerateImage, planned: !!mk };
}

function useAudio(mk?: MediaKey) {
  const { audioByKey } = useMedia();
  return mk ? audioByKey.get(mk.id) : undefined;
}

// ---------------------------------------------------------------------------
// Frame + shared bits
// ---------------------------------------------------------------------------

function Frame({ instruction, showAnswer, children }: { instruction: string; showAnswer: boolean; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-preview p-3.5 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[12.5px] font-semibold text-muted">{instruction}</p>
        <Badge tone={showAnswer ? "success" : "outline"}>{showAnswer ? "Answer key" : "Học sinh"}</Badge>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function QuestionImage({ q, target = "question" }: { q: GeneratedQuestion; target?: MediaKey["target"] }) {
  const mk = findKey(q, "image", target);
  const { asset, onRetry } = useImage(mk);
  if (!mk) return null;
  return <MediaImage asset={asset} alt={mk.description} onRetry={onRetry} className="mx-auto max-w-[200px]" />;
}

/** Renders a stem, replacing the first "____" with a highlighted blank. */
function Stem({ stem, fill, variant }: { stem: string; fill?: string; variant: "select" | "typing" }) {
  const m = /_{2,}/.exec(stem);
  const before = m ? stem.slice(0, m.index) : stem;
  const after = m ? stem.slice(m.index + m[0].length) : "";
  const blank =
    variant === "select" ? (
      <span
        className={cn(
          "mx-1 inline-flex min-w-[4.5rem] justify-center rounded-md px-2 align-baseline",
          fill ? "bg-success-soft font-semibold text-success" : "border-b-2 border-accent bg-accent-soft text-transparent",
        )}
      >
        {fill ?? "____"}
      </span>
    ) : (
      <span
        className={cn(
          "mx-1 inline-flex h-9 min-w-[6.5rem] items-center rounded-lg border-2 px-2.5 align-middle text-[17px]",
          fill ? "border-success-border bg-success-soft font-semibold text-success" : "border-dashed border-border-strong bg-surface",
        )}
      >
        {fill ?? <span className="h-5 w-px animate-pulse bg-fg/60" aria-hidden />}
        {!fill && <span className="sr-only">ô trống</span>}
      </span>
    );
  return (
    <p className="text-[18px] leading-[2.1] font-medium text-fg">
      {before}
      {m ? blank : null}
      {after}
    </p>
  );
}

function Options({
  q,
  options,
  correct,
  showAnswer,
  layout,
}: {
  q: GeneratedQuestion;
  options: string[];
  correct: string;
  showAnswer: boolean;
  layout: "grid" | "list";
}) {
  const { imageByKey, onRegenerateImage } = useMedia();
  return (
    <ul className={cn("gap-2", layout === "grid" ? "grid grid-cols-1 @md:grid-cols-2" : "flex flex-col")}>
      {options.map((opt, i) => {
        const isCorrect = opt === correct;
        const mk = findKey(q, "image", "option", opt);
        const marked = showAnswer && isCorrect;
        return (
          <li
            key={`${opt}-${i}`}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border bg-surface px-2.5 py-2 text-[15px] text-fg",
              marked ? "border-success bg-success-soft shadow-[inset_0_0_0_1px_var(--success)]" : "border-border",
              showAnswer && !isCorrect && "opacity-70",
            )}
          >
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-md font-mono text-[12px] font-semibold",
                marked ? "bg-success text-surface" : "bg-surface-2 text-muted",
              )}
            >
              {LETTERS[i]}
            </span>
            {mk && (
              <MediaImage asset={imageByKey.get(mk.id)} alt={opt} compact onRetry={onRegenerateImage} className="w-11! shrink-0 rounded-md" />
            )}
            <span className="min-w-0 flex-1 font-medium break-words">{opt}</span>
            {marked && <Check className="size-4 shrink-0 text-success" aria-label="Đáp án đúng" />}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Per type
// ---------------------------------------------------------------------------

function CompSel({ q, showAnswer }: { q: CompSelQuestion; showAnswer: boolean }) {
  return (
    <Frame instruction="Choose the correct answer." showAnswer={showAnswer}>
      <QuestionImage q={q} />
      <Stem stem={q.questionContent.stem} variant="select" fill={showAnswer ? q.answerContent.correct : undefined} />
      <Options q={q} options={q.answerContent.options} correct={q.answerContent.correct} showAnswer={showAnswer} layout="grid" />
    </Frame>
  );
}

function RespSel({ q, showAnswer }: { q: RespSelQuestion; showAnswer: boolean }) {
  const { passage, passageMode, question } = q.questionContent;
  const audio = useAudio(findKey(q, "audio", "question"));
  return (
    <Frame instruction={passageMode === "audio" ? "Listen and choose the correct answer." : "Read and choose the correct answer."} showAnswer={showAnswer}>
      <QuestionImage q={q} />
      {passageMode === "audio" ? (
        <AudioPlayer asset={audio} text={passage} label="Đoạn nghe" />
      ) : (
        <blockquote className="rounded-lg border-l-4 border-accent bg-surface px-3.5 py-2.5 text-[15px] leading-relaxed text-fg">{passage}</blockquote>
      )}
      <p className="text-[17px] font-semibold text-fg">{question}</p>
      <Options q={q} options={q.answerContent.options} correct={q.answerContent.correct} showAnswer={showAnswer} layout="list" />
    </Frame>
  );
}

function Typing({ q, showAnswer }: { q: TypingQuestion; showAnswer: boolean }) {
  return (
    <Frame instruction="Look and type the missing word." showAnswer={showAnswer}>
      <QuestionImage q={q} />
      <Stem stem={q.questionContent.stem} variant="typing" fill={showAnswer ? q.answerContent.answer : undefined} />
      {showAnswer && (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px]">
          <dt className="text-subtle">Đáp án</dt>
          <dd className="font-semibold text-success">{q.trueAnswer.answer}</dd>
          <dt className="text-subtle">Câu đầy đủ</dt>
          <dd className="text-fg">{q.trueAnswer.fullSentence}</dd>
          <dt className="text-subtle">Chấp nhận</dt>
          <dd className="flex flex-wrap gap-1">
            {q.answerContent.acceptedVariants.length === 0 ? (
              <span className="text-subtle">— (chỉ đáp án chính)</span>
            ) : (
              q.answerContent.acceptedVariants.map((v) => (
                <Badge key={v} tone="neutral" mono>
                  {v}
                </Badge>
              ))
            )}
          </dd>
        </dl>
      )}
    </Frame>
  );
}

function Match({ q, showAnswer }: { q: MatchQuestion; showAnswer: boolean }) {
  const { columnA, columnB } = q.answerContent;
  const mode = q.answerContent.matchMode ?? "en_vi";
  const imageB = mode === "en_image";
  const { imageByKey, onRegenerateImage } = useMedia();
  const n = Math.max(columnA.length, columnB.length);
  const pairs = q.trueAnswer
    .map((p) => ({ a: columnA.indexOf(p.a), b: columnB.indexOf(p.b) }))
    .filter((p) => p.a >= 0 && p.b >= 0);
  const colorOfA = (ai: number) => PAIR_COLORS[ai % PAIR_COLORS.length];
  const aForB = new Map(pairs.map((p) => [p.b, p.a]));

  return (
    <Frame instruction="Match." showAnswer={showAnswer}>
      <div>
      <div className="mb-2">
        <Badge tone="accent" title={imageB ? "Cột B là hình ảnh" : "Cột B là nghĩa tiếng Việt"}>
          {imageB ? "Anh – Hình ảnh" : "Anh – Việt"}
        </Badge>
      </div>
      <div className="mb-1 grid text-[11px] font-semibold tracking-wide text-subtle uppercase" style={{ gridTemplateColumns: "minmax(0,1fr) 56px minmax(0,1fr)" }}>
        <span>Cột A</span>
        <span className="col-start-3">Cột B</span>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) 56px minmax(0,1fr)", gridAutoRows: "1fr" }}>
        {columnA.map((a, i) => {
          const mk = findKey(q, "image", "pairA", a);
          return (
            <div key={`a-${i}`} className="col-start-1 flex items-center py-1" style={{ gridRow: i + 1 }}>
              <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5">
                <span
                  className="grid size-5 shrink-0 place-items-center rounded font-mono text-[11px] font-semibold text-white"
                  style={{ background: showAnswer ? colorOfA(i) : "var(--fg-subtle)" }}
                >
                  {i + 1}
                </span>
                {mk && (
                  <MediaImage asset={imageByKey.get(mk.id)} alt={a} compact onRetry={onRegenerateImage} className="w-9! shrink-0 rounded-md" />
                )}
                <span className="min-w-0 flex-1 text-[15px] font-medium break-words text-fg">
                  {a}
                </span>
                <span className="size-2 shrink-0 rounded-full border-2 border-border-strong bg-surface" aria-hidden />
              </div>
            </div>
          );
        })}
        <svg
          className="col-start-2 h-full w-full overflow-visible"
          style={{ gridRow: `1 / span ${n}` }}
          viewBox={`0 0 100 ${n * 100}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          {showAnswer &&
            pairs.map((p) => (
              <line
                key={`${p.a}-${p.b}`}
                x1={0}
                y1={(p.a + 0.5) * 100}
                x2={100}
                y2={(p.b + 0.5) * 100}
                stroke={colorOfA(p.a)}
                strokeWidth={2.5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
        </svg>
        {columnB.map((b, j) => {
          const ai = aForB.get(j);
          const mkB = imageB ? findKey(q, "image", "pairB", b) : undefined;
          return (
            <div key={`b-${j}`} className="col-start-3 flex items-center py-1" style={{ gridRow: j + 1 }}>
              <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5">
                <span className="size-2 shrink-0 rounded-full border-2 border-border-strong bg-surface" aria-hidden />
                {imageB ? (
                  <div className="min-w-0 flex-1">
                    <MediaImage
                      asset={mkB ? imageByKey.get(mkB.id) : undefined}
                      alt={showAnswer ? b : `Hình ${LETTERS[j].toLowerCase()}`}
                      onRetry={onRegenerateImage}
                      className="mx-auto max-w-[110px]"
                    />
                    {showAnswer && <p className="mt-1 text-center text-[13px] font-medium break-words text-fg">{b}</p>}
                  </div>
                ) : (
                  <span className="min-w-0 flex-1 text-[15px] break-words text-fg">{b}</span>
                )}
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded font-mono text-[11px] font-semibold",
                    showAnswer && ai !== undefined ? "text-white" : "bg-surface-2 text-muted",
                  )}
                  style={showAnswer && ai !== undefined ? { background: colorOfA(ai) } : undefined}
                  title={showAnswer && ai !== undefined ? `Nối với A${ai + 1}` : undefined}
                >
                  {showAnswer && ai !== undefined ? ai + 1 : LETTERS[j].toLowerCase()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </Frame>
  );
}

function TokenChip({ children, tone = "neutral", index }: { children: ReactNode; tone?: "neutral" | "success"; index?: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[15px] font-medium shadow-card",
        tone === "success" ? "border-success-border bg-success-soft text-success" : "border-border-strong bg-surface text-fg",
      )}
    >
      {index !== undefined && <span className="font-mono text-[10.5px] opacity-70">{index}</span>}
      {children}
    </span>
  );
}

function Order({ q, showAnswer }: { q: OrderQuestion; showAnswer: boolean }) {
  const { tokens, shuffled, tokenString } = q.answerContent;
  const parts = tokenString.split("/space/");
  return (
    <Frame instruction="Put the words in order." showAnswer={showAnswer}>
      <QuestionImage q={q} target="answer" />
      <div>
        <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-subtle uppercase">Word bank</p>
        <div className="flex flex-wrap gap-1.5">
          {shuffled.map((t, i) => (
            <TokenChip key={`${t}-${i}`}>{t}</TokenChip>
          ))}
        </div>
      </div>
      <ArrowDown className="mx-auto size-4 text-subtle" aria-hidden />
      <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-border-strong bg-surface/60 p-2">
        {showAnswer
          ? tokens.map((t, i) => (
              <TokenChip key={`${t}-${i}`} tone="success" index={i + 1}>
                {t}
              </TokenChip>
            ))
          : tokens.map((_, i) => (
              <span key={i} className="h-9 w-14 rounded-lg border border-border bg-surface-2" aria-hidden />
            ))}
        {!showAnswer && <span className="sr-only">{tokens.length} ô trống</span>}
      </div>
      {showAnswer && (
        <p className="text-[16px] font-semibold text-success">
          <Check className="mr-1 inline size-4 align-[-2px]" aria-hidden />
          {q.trueAnswer.sentence}
        </p>
      )}
      <div className="rounded-lg border border-border bg-surface px-3 py-2">
        <p className="mb-1 text-[11px] font-semibold tracking-wide text-subtle uppercase">
          tokenString <span className="font-normal normal-case">(CMS · {tokens.length}/10 tokens)</span>
        </p>
        <p className="font-mono text-[12.5px] break-words text-fg">
          {parts.map((p, i) => (
            <span key={i}>
              {i > 0 && <span className="rounded bg-accent-soft px-0.5 text-accent-text">/space/</span>}
              {p}
            </span>
          ))}
        </p>
      </div>
    </Frame>
  );
}

function Listen({ q, showAnswer }: { q: ListenQuestion; showAnswer: boolean }) {
  const audio = useAudio(findKey(q, "audio", "question"));
  const { imageByKey, onRegenerateImage } = useMedia();
  const { orderedLabels, shuffledLabels } = q.answerContent;
  return (
    <Frame instruction="Listen and number the pictures." showAnswer={showAnswer}>
      <AudioPlayer asset={audio} text={q.questionContent.audioScript} label="Audio đề bài" />
      {showAnswer && (
        <ol className="space-y-0.5 rounded-lg border border-dashed border-border-strong px-3 py-2 text-[13px] text-muted">
          {q.questionContent.items.map((it) => (
            <li key={it.index}>
              <span className="font-mono text-subtle">{it.index}.</span> {it.sentence}
            </li>
          ))}
        </ol>
      )}
      <ul className="grid grid-cols-2 gap-2.5 @md:grid-cols-4">
        {shuffledLabels.map((label, i) => {
          const mk = findKey(q, "image", "item", label);
          const pos = orderedLabels.indexOf(label) + 1;
          return (
            <li key={`${label}-${i}`} className="flex flex-col items-center gap-1.5">
              <MediaImage asset={mk ? imageByKey.get(mk.id) : undefined} alt={label} onRetry={onRegenerateImage} />
              <span className={cn("text-[12px]", showAnswer ? "font-medium text-fg" : "text-transparent select-none")} aria-hidden={!showAnswer}>
                {label}
              </span>
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-lg border-2 font-mono text-[15px] font-semibold",
                  showAnswer ? "border-success-border bg-success-soft text-success" : "border-dashed border-border-strong bg-surface text-transparent",
                )}
                aria-label={showAnswer ? `Vị trí ${pos}` : "Ô trống"}
              >
                {showAnswer ? pos : "?"}
              </span>
            </li>
          );
        })}
      </ul>
      {showAnswer && (
        <p className="flex flex-wrap items-center gap-1.5 text-[13px] text-fg">
          <span className="text-subtle">Thứ tự đúng:</span>
          {q.trueAnswer.map((t) => (
            <Badge key={t.position} tone="success">
              {t.position} · {t.label}
            </Badge>
          ))}
        </p>
      )}
    </Frame>
  );
}

function Speak({ q, showAnswer }: { q: SpeakQuestion; showAnswer: boolean }) {
  const { imageByKey, audioByKey, onRegenerateImage } = useMedia();
  const keyById = new Map(q.mediaKeys.map((k) => [k.id, k]));
  return (
    <Frame instruction="Listen and repeat." showAnswer={showAnswer}>
      <ul className="space-y-2">
        {q.answerContent.values.map((v, i) => {
          const keys = v.mediaKeyIds.map((id) => keyById.get(id)).filter((k): k is MediaKey => !!k);
          const imgKey = keys.find((k) => k.kind === "image");
          const audKey = keys.find((k) => k.kind === "audio");
          const audio = audKey ? audioByKey.get(audKey.id) : undefined;
          return (
            <li key={`${v.text}-${i}`} className="flex gap-3 rounded-lg border border-border bg-surface p-2.5">
              <MediaImage
                asset={imgKey ? imageByKey.get(imgKey.id) : undefined}
                alt={v.text}
                compact
                onRetry={onRegenerateImage}
                className="w-20! shrink-0 self-start"
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono text-[11px] text-subtle">{i + 1}.</span>
                  <p className="text-[17px] font-semibold break-words text-fg">{v.text}</p>
                  <Badge tone="outline">{v.kind}</Badge>
                  {v.loCode && <span className="font-mono text-[10.5px] text-subtle">{v.loCode}</span>}
                </div>
                <AudioPlayer
                  asset={audio}
                  text={audio?.text ?? v.text}
                  label="Audio mẫu"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Frame>
  );
}

export function QuestionPreview({ q, showAnswer }: { q: GeneratedQuestion; showAnswer: boolean }) {
  switch (q.type) {
    case "COMP_SEL":
      return <CompSel q={q} showAnswer={showAnswer} />;
    case "RESP_SEL":
      return <RespSel q={q} showAnswer={showAnswer} />;
    case "TYPING":
      return <Typing q={q} showAnswer={showAnswer} />;
    case "MATCH":
      return <Match q={q} showAnswer={showAnswer} />;
    case "ORDER":
      return <Order q={q} showAnswer={showAnswer} />;
    case "LISTEN":
      return <Listen q={q} showAnswer={showAnswer} />;
    case "SPEAK":
      return <Speak q={q} showAnswer={showAnswer} />;
  }
}
