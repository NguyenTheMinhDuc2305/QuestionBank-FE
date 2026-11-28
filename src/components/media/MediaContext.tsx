"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AudioAsset, GenerateResponse, ImageAsset, MediaKey } from "@shared/types";
import { TARGET_LABEL } from "../labels";
import { ImageLightbox } from "./ImageLightbox";

interface MediaCtx {
  imageByKey: Map<string, ImageAsset>;
  audioByKey: Map<string, AudioAsset>;
  onRegenerateImage?: (assetId: string) => void;
  onRegenerateAudio?: (assetId: string) => void;
  /** Opens the full-size lightbox for an image asset. Undefined outside a provider. */
  openImage?: (assetId: string) => void;
  /** "Câu 2 · COMP_SEL" + "Đáp án = bike" style labels for an asset. */
  describe: (questionId: string, mediaKeyId: string) => { question: string; key: string };
}

const Ctx = createContext<MediaCtx>({
  imageByKey: new Map(),
  audioByKey: new Map(),
  describe: (q, k) => ({ question: q, key: k }),
});

/**
 * Indexes `result.images` / `result.audios` by `mediaKeyId` so question previews can look assets up,
 * and hosts the image lightbox.
 */
export function MediaProvider({
  result,
  onRegenerateImage,
  onRegenerateAudio,
  children,
}: {
  result: GenerateResponse;
  onRegenerateImage?: (assetId: string) => void;
  onRegenerateAudio?: (assetId: string) => void;
  children: ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const describe = useMemo(() => {
    const qIndex = new Map(result.questions.map((q, i) => [q.id, { index: i, type: q.type }]));
    const keys = new Map<string, MediaKey>();
    for (const q of result.questions) for (const k of q.mediaKeys) keys.set(`${q.id}@${k.id}`, k);
    return (questionId: string, mediaKeyId: string) => {
      const q = qIndex.get(questionId);
      const k = keys.get(`${questionId}@${mediaKeyId}`);
      return {
        question: q ? `Câu ${q.index + 1} · ${q.type}` : questionId,
        key: k ? `${TARGET_LABEL[k.target]}${k.targetValue ? ` = ${k.targetValue}` : ""}` : mediaKeyId,
      };
    };
  }, [result.questions]);

  const openImage = useCallback((id: string) => setOpenId(id), []);

  const value = useMemo<MediaCtx>(
    () => ({
      imageByKey: new Map(result.images.map((a) => [a.mediaKeyId, a])),
      audioByKey: new Map(result.audios.map((a) => [a.mediaKeyId, a])),
      onRegenerateImage,
      onRegenerateAudio,
      openImage,
      describe,
    }),
    [result.images, result.audios, onRegenerateImage, onRegenerateAudio, openImage, describe],
  );

  const open = openId ? (result.images.find((a) => a.id === openId) ?? null) : null;
  const caption = open ? (() => {
    const d = describe(open.questionId, open.mediaKeyId);
    return `${d.question} · ${d.key}`;
  })() : undefined;

  return (
    <Ctx.Provider value={value}>
      {children}
      <ImageLightbox asset={open} caption={caption} onClose={() => setOpenId(null)} onRegenerate={onRegenerateImage} />
    </Ctx.Provider>
  );
}

export function useMedia() {
  return useContext(Ctx);
}
