"use client";

import { Clock, Download, Pause, Play, VolumeX } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { AudioAsset } from "@shared/types";
import { Badge, Spinner, cn } from "../ui";
import { downloadName } from "./media-utils";

/** Only one player plays at a time: each player broadcasts its id when it starts. */
const PLAY_EVENT = "qb:audio-play";

/** Shown wherever audio is synthesised by the browser instead of a generated file. */
export const TTS_LABEL = "TTS trình duyệt (chưa có file audio)";

type Mode = "file" | "tts" | "waiting" | "none";

function resolveMode(asset: AudioAsset | undefined, text: string): Mode {
  // Browser TTS is used ONLY for a done asset without a file (url == null).
  if (!asset) return "none"; // nothing generated for this slot
  switch (asset.status) {
    case "done":
      return asset.url ? "file" : text ? "tts" : "none"; // url == null ⇒ browser speechSynthesis fallback
    case "error":
    case "skipped":
      return "none";
    default:
      return "waiting";
  }
}

function fmt(sec: number) {
  if (!Number.isFinite(sec) || sec <= 0) return "0:00";
  const s = Math.max(1, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Rough speaking-time estimate for TTS (≈ 2.3 words/s at rate 0.85). */
function estimateTts(text: string) {
  return Math.max(1, text.split(/\s+/).filter(Boolean).length / 2.3);
}

export interface AudioPlayerProps {
  asset?: AudioAsset;
  /** Text to speak when there is no asset (or as override). Defaults to `asset.text`. */
  text?: string;
  /** Visible label, e.g. "Audio đề bài". */
  label?: string;
  /** compact = round play button only (no seek). Prefer "full" wherever reviewers check audio. */
  variant?: "full" | "compact";
  /** Show the spoken text under the player (full variant). Default true. */
  showText?: boolean;
  className?: string;
}

/**
 * Plays an AudioAsset.
 * - `url` set + done ⇒ real file through <audio> (play/pause, seek, duration, download).
 * - `url == null` + done ⇒ window.speechSynthesis (en-US), clearly labelled as browser TTS (no file).
 * - pending/generating ⇒ disabled; error/skipped ⇒ no playback, status shown.
 */
export function AudioPlayer({ asset, text, label, variant = "full", showText = true, className }: AudioPlayerProps) {
  const id = useId();
  const speakText = (text ?? asset?.text ?? "").trim();
  const mode = resolveMode(asset, speakText);

  const audioRef = useRef<HTMLAudioElement>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ttsUnavailable, setTtsUnavailable] = useState(false);

  // Stop when another player starts; cancel own speech on unmount.
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail === id) return;
      audioRef.current?.pause();
      if (utterRef.current) {
        utterRef.current = null;
        setPlaying(false);
        setProgress(0);
      }
    };
    window.addEventListener(PLAY_EVENT, onOther);
    return () => {
      window.removeEventListener(PLAY_EVENT, onOther);
      if (utterRef.current && "speechSynthesis" in window) {
        utterRef.current = null;
        window.speechSynthesis.cancel();
      }
    };
  }, [id]);

  function stop() {
    if (mode === "file") audioRef.current?.pause();
    if (utterRef.current) {
      utterRef.current = null;
      window.speechSynthesis.cancel();
      setProgress(0);
    }
    setPlaying(false);
  }

  function play() {
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: id }));
    if (mode === "file") {
      void audioRef.current?.play().catch(() => setPlaying(false));
      return;
    }
    if (mode !== "tts") return;
    if (!("speechSynthesis" in window)) {
      setTtsUnavailable(true);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(speakText);
    u.lang = "en-US";
    u.rate = 0.85; // slightly slower for young learners
    const voices = synth.getVoices();
    const voice = voices.find((v) => v.lang === "en-US") ?? voices.find((v) => v.lang.startsWith("en"));
    if (voice) u.voice = voice;
    const done = () => {
      if (utterRef.current !== u) return;
      utterRef.current = null;
      setPlaying(false);
      setProgress(0);
    };
    u.onend = done;
    u.onerror = done;
    u.onboundary = (e) => {
      if (utterRef.current === u) setProgress(Math.min(1, e.charIndex / Math.max(1, speakText.length)));
    };
    utterRef.current = u;
    synth.speak(u);
    setPlaying(true);
    setProgress(0.02);
  }

  const status = asset?.status;
  const disabled = mode === "waiting" || mode === "none" || ttsUnavailable;
  const ariaLabel = `${playing ? "Dừng" : "Phát"}${label ? `: ${label}` : ""}`;

  const icon =
    mode === "waiting" ? (
      status === "generating" ? <Spinner className="size-4" /> : <Clock className="size-4" aria-hidden />
    ) : disabled ? (
      <VolumeX className="size-4" aria-hidden />
    ) : playing ? (
      <Pause className="size-4" aria-hidden fill="currentColor" />
    ) : (
      <Play className="ml-0.5 size-4" aria-hidden fill="currentColor" />
    );

  const button = (
    <button
      type="button"
      onClick={playing ? stop : play}
      disabled={disabled}
      aria-label={ariaLabel}
      title={mode === "waiting" ? (status === "generating" ? "Đang tạo audio…" : "Audio đang chờ tạo") : mode === "tts" ? TTS_LABEL : ariaLabel}
      className={cn(
        "grid shrink-0 place-items-center rounded-full transition-colors disabled:cursor-not-allowed",
        variant === "compact" ? "size-8" : "size-9",
        disabled ? "bg-surface-3 text-subtle" : mode === "tts" ? "bg-warning text-surface hover:opacity-90" : "bg-accent text-accent-fg hover:bg-accent-hover",
      )}
    >
      {icon}
    </button>
  );

  const fileEl =
    mode === "file" && asset?.url ? (
      <audio
        ref={audioRef}
        src={asset.url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setProgress(el.currentTime / el.duration);
        }}
        className="hidden"
      />
    ) : null;

  if (variant === "compact") {
    return (
      <span className={cn("inline-flex", className)}>
        {button}
        {fileEl}
      </span>
    );
  }

  const time =
    mode === "file"
      ? `${fmt(progress * duration)} / ${fmt(duration)}`
      : mode === "tts"
        ? `~${fmt(estimateTts(speakText))}`
        : "";

  const statusLine =
    ttsUnavailable
      ? "Trình duyệt không hỗ trợ TTS"
      : mode === "tts"
        ? TTS_LABEL
        : mode === "waiting"
          ? status === "generating"
            ? "Đang tạo audio…"
            : "Audio đang chờ tạo"
          : mode === "none"
            ? status === "error"
              ? `Lỗi tạo audio${asset?.error ? `: ${asset.error}` : ""}`
              : status === "skipped"
                ? "Đã bỏ qua audio"
                : "Không có audio"
            : null;

  return (
    <div className={cn("rounded-xl border border-border bg-surface px-2.5 py-2", mode === "tts" && "border-warning-border", className)}>
      <div className="flex items-center gap-3">
        {button}
        {fileEl}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-medium text-fg">{label ?? "Audio"}</span>
            {mode === "file" && <Badge tone="success">File</Badge>}
            {mode === "tts" && <Badge tone="warning">TTS</Badge>}
            {playing && (
              <span className="flex h-3 items-end gap-[2px]" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn("w-[3px] origin-bottom animate-eq rounded-full", mode === "tts" ? "bg-warning" : "bg-accent")}
                    style={{ height: "100%", animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            {mode === "file" ? (
              <input
                type="range"
                min={0}
                max={1000}
                step={1}
                value={Math.round(progress * 1000)}
                aria-label={`Tua audio${label ? `: ${label}` : ""}`}
                aria-valuetext={time}
                onChange={(e) => {
                  const el = audioRef.current;
                  const v = Number(e.target.value) / 1000;
                  setProgress(v);
                  if (el && el.duration) el.currentTime = v * el.duration;
                }}
                className="h-1 min-w-0 flex-1 cursor-pointer accent-accent"
              />
            ) : (
              <span className="relative h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                <span
                  className={cn("absolute inset-y-0 left-0 rounded-full transition-[width]", mode === "tts" ? "bg-warning" : "bg-accent")}
                  style={{ width: `${progress * 100}%` }}
                />
              </span>
            )}
            {time && <span className="shrink-0 text-[11px] text-subtle tabular-nums">{time}</span>}
          </div>
        </div>
        {mode === "file" && asset?.url ? (
          <a
            href={asset.url}
            download={downloadName(asset.id, asset.url)}
            aria-label={`Tải audio${label ? `: ${label}` : ""}`}
            title="Tải file audio"
            className="grid size-8 shrink-0 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-fg"
          >
            <Download className="size-4" aria-hidden />
          </a>
        ) : (
          <span
            className="grid size-8 shrink-0 cursor-not-allowed place-items-center rounded-md text-subtle/40"
            title="Chưa có file audio để tải"
            aria-hidden
          >
            <Download className="size-4" />
          </span>
        )}
      </div>
      {statusLine && (
        <p className={cn("mt-1.5 text-[11px]", mode === "none" && status === "error" ? "text-danger" : mode === "tts" ? "text-warning" : "text-subtle")}>
          {statusLine}
        </p>
      )}
      {showText && speakText && (
        <p className="mt-1.5 border-t border-border pt-1.5 text-[12.5px] leading-snug text-muted">
          <span className="text-subtle">Nội dung: </span>“{speakText}”
        </p>
      )}
    </div>
  );
}
