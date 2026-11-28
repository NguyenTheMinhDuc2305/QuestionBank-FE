/**
 * Mock data for UI development without a backend / API key.
 * - `mockMeta`: realistic subset of DATA/LO-grade6.csv (Grade 1, units 1, 2, 3, 4, 6, 9) with codes in the
 *   auto-generated style `AIC_G1_U{u}_{TV|NP}{n}_{k}`.
 * - `mockResults`: one GenerateResponse per question type (all 7), media in mixed statuses.
 * The real data comes from GET /api/meta and POST /api/generate (see src/lib/types.ts).
 */
import type {
  AssetStatus,
  AudioAsset,
  BloomLevel,
  GenerateResponse,
  GeneratedQuestion,
  ImageAsset,
  LOGeneral,
  LORef,
  LOTree,
  MediaKey,
  MetaResponse,
  QuestionTypeCode,
  QuestionTypeMeta,
} from "@shared/types";

// ---------------------------------------------------------------------------
// LO tree (subset)
// ---------------------------------------------------------------------------

type RawSpecific = { kind: "TV" | "NP"; name: string; items: string[] };
type RawUnit = { unit: number; nameEn: string; nameVi: string; specifics: RawSpecific[] };

const RAW_UNITS: RawUnit[] = [
  {
    unit: 1,
    nameEn: "In the school playground",
    nameVi: "Ở sân chơi của trường",
    specifics: [
      { kind: "TV", name: "Từ vựng chứa âm Bb", items: ["ball", "bike", "book"] },
      {
        kind: "NP",
        name: "Câu chào hỏi và tạm biệt",
        items: [
          "Pattern: Hi, I’m + [name]\nConstraint: common names (Bill, Ba, Nam, Lan...)",
          "Pattern: Bye, + [name]\nConstraint:\n- names: common names (Bill, Ba, Nam, Lan...)",
        ],
      },
    ],
  },
  {
    unit: 2,
    nameEn: "In the dining room",
    nameVi: "Trong phòng ăn",
    specifics: [
      { kind: "TV", name: "Từ vựng chứa âm Cc", items: ["cake", "car", "cat", "cup"] },
      {
        kind: "NP",
        name: "Câu nói mình có gì",
        items: [
          "Pattern: I have a + [noun]\nConstraint: singular, countable, familiar objects (car, cat, cup, cake, book, ball, bike,...)",
        ],
      },
    ],
  },
  {
    unit: 3,
    nameEn: "At the street market",
    nameVi: "Ở chợ đường phố",
    specifics: [
      { kind: "TV", name: "Từ vựng chứa âm Aa", items: ["apple", "bag", "can", "hat"] },
      {
        kind: "NP",
        name: "Câu giới thiệu đồ vật của mình",
        items: [
          "Pattern: This is my + [noun]\nConstraint: singular, countable, personal belongings (apple, bag, can, hat, book, pen...)",
        ],
      },
      {
        kind: "NP",
        name: "Câu giới thiệu đồ vật",
        items: [
          'Pattern: There is (There’s) + a/an + [noun]\nConstraint: singular, countable nouns (apple, cat, book, elephant...)\nRule:\n- "a" + consonant sound (a dog, a cat)\n- "an" + vowel sound (an apple, an egg)',
        ],
      },
    ],
  },
  {
    unit: 4,
    nameEn: "In the bedroom",
    nameVi: "Trong phòng ngủ",
    specifics: [
      { kind: "TV", name: "Từ vựng chứa âm Dd", items: ["desk", "dog", "door", "duck"] },
      {
        kind: "NP",
        name: "Câu giới thiệu về vật",
        items: [
          'Pattern: This is + a/an + [noun]\nConstraint: singular, countable nouns (dog, cat, book, apple...)\nRule:\n- "a" + consonant sound (a dog, a cat)\n- "an" + vowel sound (an apple, an egg)',
        ],
      },
      {
        kind: "NP",
        name: "Câu chỉ vị trí đồ vật",
        items: [
          "Pattern: It is (It’s) + on + the + [noun]\nConstraint: \n- nouns: objects with a surface (desk, table, chair, shelf, board...)",
          "Pattern: It is (It’s) + near + the + [noun]\nConstraint: \n- nouns: familiar classroom objects (desk, table, chair, door, window...)",
        ],
      },
    ],
  },
  {
    unit: 6,
    nameEn: "In the classroom",
    nameVi: "Trong lớp học",
    specifics: [
      { kind: "TV", name: "Từ vựng chứa âm Ee", items: ["bell", "pen", "pencil", "red"] },
      {
        kind: "NP",
        name: "Câu nói về màu sắc của đồ vật",
        items: [
          "Pattern: It is (It’s) + a/an + [adjective] + [noun]\nConstraint:\n- nouns: singular, countable (pen, book, bag...)\n- adjectives: basic colors (red, blue, green...)",
        ],
      },
    ],
  },
  {
    unit: 9,
    nameEn: "In the shop",
    nameVi: "Trong cửa hàng",
    specifics: [
      { kind: "TV", name: "Từ vựng chứa âm Oo", items: ["clocks", "locks", "mops", "pots"] },
      {
        kind: "TV",
        name: "Từ vựng số 1-10",
        items: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"],
      },
      {
        kind: "NP",
        name: "Câu hỏi và trả lời số lượng (cơ bản)",
        items: [
          "Pattern:\nQ: How many + [plural noun]?\nA: [number]\n\nLink: A answers Q\n\nConstraint:\n- plural nouns only (clocks, locks, mops, pots)\n- number range: 1–5",
          "Pattern:\nQ: How many + [plural noun]?\nA: There are + [number] + [plural noun]\n\nLink: A answers Q\n\nConstraint:\n- plural nouns only  (clocks, locks, mops, pots)\n- number range: 1–5",
        ],
      },
      {
        kind: "NP",
        name: "Nói về số lượng của đồ vật",
        items: [
          "Pattern: There are + [number] + [plural noun]\n\nConstraint:\n- numbers: basic numbers (two, three, four, five)\n- nouns: regular plural nouns (add -s) (locks, clocks, mops, pots)",
        ],
      },
    ],
  },
];

function buildTree(): LOTree {
  const generals: LOGeneral[] = RAW_UNITS.map((u) => {
    const counters = { TV: 0, NP: 0 };
    const generalCode = `AIC_G1_U${u.unit}`;
    return {
      code: generalCode,
      grade: 1,
      unit: u.unit,
      nameEn: u.nameEn,
      nameVi: u.nameVi,
      specifics: u.specifics.map((s) => {
        counters[s.kind] += 1;
        const code = `${generalCode}_${s.kind}${counters[s.kind]}`;
        const category = s.kind === "TV" ? "vocabulary" : "grammar";
        return {
          code,
          name: s.name,
          category,
          items: s.items.map((name, i) => ({ code: `${code}_${i + 1}`, name, category })),
        };
      }),
    };
  });
  return {
    source: "DATA/LO-grade6.csv",
    generatedAt: "2026-11-18T08:00:00.000Z",
    codesAutoGenerated: true,
    generals,
  };
}

const loTree = buildTree();

function loRef(code: string): LORef {
  for (const g of loTree.generals) {
    for (const s of g.specifics) {
      const item = s.items.find((i) => i.code === code);
      if (item) {
        return {
          code: item.code,
          name: item.name,
          specificCode: s.code,
          specificName: s.name,
          generalCode: g.code,
          generalName: g.nameEn,
        };
      }
    }
  }
  throw new Error(`mock: unknown LO code ${code}`);
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

export const questionTypes: QuestionTypeMeta[] = [
  {
    code: "COMP_SEL",
    nameEn: "Completion-based Selection",
    nameVi: "Chọn đáp án điền khuyết",
    description: "Câu khuyết một chỗ trống ____, chọn 1 trong 4 đáp án cùng loại từ.",
    enabled: true,
    questionMedia: ["text", "audio", "image"],
    answerMedia: ["text", "image"],
    aiSchemaPath: "DATA/schemas/ai/COMP_SEL.schema.json",
    questionSchemaPath: "DATA/schemas/question/COMP_SEL.schema.json",
  },
  {
    code: "RESP_SEL",
    nameEn: "Response-based Selection",
    nameVi: "Chọn câu trả lời phù hợp",
    description: "Đoạn văn / đoạn nghe + câu hỏi hoàn chỉnh, chọn câu trả lời đúng.",
    enabled: false,
    phaseNote: "Chưa làm trong phase này",
    questionMedia: ["text", "audio", "image"],
    answerMedia: ["text", "image"],
    aiSchemaPath: "DATA/schemas/ai/RESP_SEL.schema.json",
    questionSchemaPath: "DATA/schemas/question/RESP_SEL.schema.json",
  },
  {
    code: "TYPING",
    nameEn: "Typing",
    nameVi: "Gõ đáp án",
    description: "Câu khuyết 100%, học sinh tự gõ một đáp án duy nhất.",
    enabled: true,
    questionMedia: ["text", "audio", "image"],
    answerMedia: ["text"],
    aiSchemaPath: "DATA/schemas/ai/TYPING.schema.json",
    questionSchemaPath: "DATA/schemas/question/TYPING.schema.json",
  },
  {
    code: "MATCH",
    nameEn: "Matching",
    nameVi: "Nối cột A – B",
    description: "Nối các cặp tương ứng giữa cột A và cột B (3–5 cặp).",
    enabled: true,
    questionMedia: [],
    answerMedia: ["text", "image"],
    aiSchemaPath: "DATA/schemas/ai/MATCH.schema.json",
    questionSchemaPath: "DATA/schemas/question/MATCH.schema.json",
  },
  {
    code: "ORDER",
    nameEn: "Ordering",
    nameVi: "Sắp xếp thành câu",
    description: "Sắp xếp tối đa 10 từ / cụm từ thành câu hoàn chỉnh.",
    enabled: true,
    questionMedia: [],
    answerMedia: ["text", "image"],
    aiSchemaPath: "DATA/schemas/ai/ORDER.schema.json",
    questionSchemaPath: "DATA/schemas/question/ORDER.schema.json",
  },
  {
    code: "LISTEN",
    nameEn: "Listen - order",
    nameVi: "Nghe và sắp xếp tranh",
    description: "Nghe một audio gồm nhiều câu, sắp xếp các tranh theo đúng thứ tự.",
    enabled: true,
    questionMedia: ["audio"],
    answerMedia: ["image"],
    aiSchemaPath: "DATA/schemas/ai/LISTEN.schema.json",
    questionSchemaPath: "DATA/schemas/question/LISTEN.schema.json",
  },
  {
    code: "SPEAK",
    nameEn: "iSpeak",
    nameVi: "Luyện nói",
    description: "Danh sách từ / câu để luyện phát âm, mỗi LO cháu một giá trị.",
    enabled: true,
    questionMedia: [],
    answerMedia: ["text", "image", "audio"],
    aiSchemaPath: "DATA/schemas/ai/SPEAK.schema.json",
    questionSchemaPath: "DATA/schemas/question/SPEAK.schema.json",
  },
];

const MODELS = {
  text: "google/gemini-2.5-flash",
  image: "google/gemini-2.5-flash-image",
  audio: "browser-tts",
};

export const mockMeta: MetaResponse = {
  questionTypes,
  loTree,
  bloomLevels: [
    {
      code: "M1",
      nameVi: "Nhận biết",
      nameEn: "Remember",
      description: "Nhận ra, nhắc lại từ / mẫu câu đã học trong ngữ cảnh quen thuộc, có gợi ý rõ (tranh, âm).",
    },
    {
      code: "M2",
      nameVi: "Thông hiểu",
      nameEn: "Understand",
      description: "Hiểu nghĩa, phân biệt được từ / mẫu câu trong ngữ cảnh đơn giản; đáp án nhiễu cùng chủ đề.",
    },
    {
      code: "M3",
      nameVi: "Vận dụng",
      nameEn: "Apply",
      description: "Dùng đúng từ / mẫu câu trong tình huống mới, ít gợi ý hơn.",
    },
    {
      code: "M4",
      nameVi: "Vận dụng cao",
      nameEn: "Analyze",
      description: "Kết hợp nhiều kiến thức, cần suy luận; đáp án nhiễu tinh tế, gần nghĩa hoặc gần dạng.",
    },
  ],
  limits: { maxQuestions: 10, maxTotalQuestions: 50 },
  models: MODELS,
  hasApiKey: false,
};

// ---------------------------------------------------------------------------
// Placeholder illustrations (inline SVG data URLs — stand-ins for generated images)
// ---------------------------------------------------------------------------

const OUT = `stroke="#27272a" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;

const MOTIFS: Record<string, string> = {
  ball: `<circle cx="100" cy="100" r="52" fill="#f87171" ${OUT}/><path d="M50 92 Q100 70 150 92" fill="none" stroke="#fff" stroke-width="9"/><path d="M54 120 Q100 140 146 120" fill="none" stroke="#fde047" stroke-width="9"/><circle cx="100" cy="100" r="52" fill="none" ${OUT}/>`,
  book: `<path d="M100 66 L42 56 L42 140 L100 150 Z" fill="#60a5fa" ${OUT}/><path d="M100 66 L158 56 L158 140 L100 150 Z" fill="#93c5fd" ${OUT}/><path d="M56 80 L88 85 M56 98 L88 103 M112 85 L144 80 M112 103 L144 98" stroke="#1e3a8a" stroke-width="3" stroke-linecap="round"/>`,
  bike: `<circle cx="58" cy="128" r="28" fill="none" ${OUT}/><circle cx="142" cy="128" r="28" fill="none" ${OUT}/><path d="M58 128 L86 88 L128 88 L142 128 M86 88 L100 128 L58 128 M100 128 L128 88" fill="none" stroke="#22c55e" stroke-width="7" stroke-linejoin="round"/><path d="M76 78 L96 78 M120 74 L134 74 L128 88" ${OUT} fill="none"/>`,
  cat: `<path d="M58 78 L66 38 L90 64 Z M142 78 L134 38 L110 64 Z" fill="#fb923c" ${OUT}/><circle cx="100" cy="104" r="48" fill="#fdba74" ${OUT}/><circle cx="82" cy="98" r="6" fill="#27272a"/><circle cx="118" cy="98" r="6" fill="#27272a"/><path d="M94 114 L106 114 L100 121 Z" fill="#f472b6"/><path d="M64 118 L84 120 M136 118 L116 120" stroke="#27272a" stroke-width="3" stroke-linecap="round"/>`,
  dog: `<ellipse cx="56" cy="96" rx="16" ry="30" fill="#92400e" ${OUT}/><ellipse cx="144" cy="96" rx="16" ry="30" fill="#92400e" ${OUT}/><circle cx="100" cy="100" r="46" fill="#d6a46a" ${OUT}/><circle cx="84" cy="94" r="6" fill="#27272a"/><circle cx="116" cy="94" r="6" fill="#27272a"/><ellipse cx="100" cy="114" rx="11" ry="8" fill="#27272a"/><path d="M100 122 Q100 132 92 134" fill="none" stroke="#27272a" stroke-width="3"/>`,
  duck: `<ellipse cx="112" cy="124" rx="52" ry="34" fill="#fde047" ${OUT}/><circle cx="72" cy="82" r="28" fill="#fde047" ${OUT}/><path d="M44 84 L22 92 L46 98 Z" fill="#fb923c" ${OUT}/><circle cx="68" cy="76" r="5" fill="#27272a"/><path d="M104 118 Q124 104 142 122" fill="none" stroke="#ca8a04" stroke-width="4"/>`,
  desk: `<rect x="34" y="78" width="132" height="18" rx="4" fill="#b45309" ${OUT}/><rect x="44" y="96" width="14" height="62" fill="#d97706" ${OUT}/><rect x="142" y="96" width="14" height="62" fill="#d97706" ${OUT}/><rect x="100" y="96" width="42" height="30" fill="#f59e0b" ${OUT}/><circle cx="121" cy="111" r="3" fill="#27272a"/>`,
  door: `<rect x="62" y="34" width="76" height="132" rx="6" fill="#a16207" ${OUT}/><rect x="74" y="48" width="52" height="40" rx="3" fill="#ca8a04" ${OUT}/><rect x="74" y="100" width="52" height="52" rx="3" fill="#ca8a04" ${OUT}/><circle cx="126" cy="98" r="5" fill="#fde047" ${OUT}/>`,
  bag: `<path d="M76 82 Q76 50 100 50 Q124 50 124 82" fill="none" ${OUT}/><rect x="52" y="78" width="96" height="80" rx="18" fill="#a78bfa" ${OUT}/><rect x="72" y="112" width="56" height="30" rx="8" fill="#c4b5fd" ${OUT}/>`,
  apple: `<path d="M100 66 Q98 50 108 40" fill="none" ${OUT}/><path d="M104 54 Q126 38 138 52 Q122 64 104 54 Z" fill="#4ade80" ${OUT}/><path d="M100 70 C70 52 44 78 50 110 C56 144 80 160 100 150 C120 160 144 144 150 110 C156 78 130 52 100 70 Z" fill="#ef4444" ${OUT}/><path d="M70 92 Q66 104 70 116" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".7"/>`,
  cake: `<rect x="50" y="96" width="100" height="58" rx="8" fill="#fbcfe8" ${OUT}/><path d="M50 108 Q62 120 75 108 Q88 120 100 108 Q112 120 125 108 Q138 120 150 108 L150 104 Q150 96 142 96 L58 96 Q50 96 50 104 Z" fill="#fff" ${OUT}/><circle cx="100" cy="82" r="11" fill="#ef4444" ${OUT}/>`,
  car: `<path d="M34 124 L42 100 Q46 92 56 92 L72 92 L88 70 L130 70 L146 92 L156 94 Q166 96 166 108 L166 124 Z" fill="#38bdf8" ${OUT}/><path d="M92 76 L84 92 L108 92 L108 76 Z M114 76 L114 92 L138 92 L128 76 Z" fill="#e0f2fe" stroke="#27272a" stroke-width="3"/><circle cx="66" cy="126" r="15" fill="#3f3f46" ${OUT}/><circle cx="136" cy="126" r="15" fill="#3f3f46" ${OUT}/>`,
  cup: `<path d="M56 74 L144 74 L134 150 Q132 158 124 158 L76 158 Q68 158 66 150 Z" fill="#34d399" ${OUT}/><path d="M142 92 Q170 92 166 114 Q162 132 138 128" fill="none" ${OUT}/><path d="M84 60 Q78 48 86 38 M104 60 Q98 48 106 38" fill="none" stroke="#a1a1aa" stroke-width="4" stroke-linecap="round"/>`,
  hat: `<ellipse cx="100" cy="134" rx="66" ry="16" fill="#f472b6" ${OUT}/><path d="M60 132 Q58 74 100 70 Q142 74 140 132 Z" fill="#f9a8d4" ${OUT}/><path d="M62 116 Q100 126 138 116" fill="none" stroke="#be185d" stroke-width="7"/>`,
  default: `<path d="M100 44 L116 82 L156 84 L124 108 L136 148 L100 124 L64 148 L76 108 L44 84 L84 82 Z" fill="#facc15" ${OUT}/>`,
};

const BACKGROUNDS = ["#e0f2fe", "#fef3c7", "#dcfce7", "#fce7f3", "#ede9fe", "#ffedd5", "#ccfbf1"];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Inline SVG data URL used as a stand-in for a generated illustration. `seed` varies the background. */
export function mockIllustration(subject: string, seed = ""): string {
  const motif = MOTIFS[subject.toLowerCase()] ?? MOTIFS.default;
  const bg = BACKGROUNDS[hash(subject + seed) % BACKGROUNDS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${bg}"/><ellipse cx="100" cy="170" rx="62" ry="9" fill="#000" opacity=".08"/>${motif}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ---------------------------------------------------------------------------
// Placeholder audio: a short, real, playable WAV (8 kHz, 8-bit mono) built in code
// ---------------------------------------------------------------------------

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/**
 * Stand-in for a generated audio file: a little melody (one note per word, max 8) as a WAV data URL.
 * It is NOT speech — only proves the <audio> file path (play, seek, duration, download) works.
 */
export function mockToneWav(text: string): string {
  const rate = 8000;
  const words = text.split(/\s+/).filter(Boolean).slice(0, 8);
  const base = (words.length ? words : ["x"]).map((w) => PENTATONIC[hash(w) % PENTATONIC.length]);
  // at least ~1.5 s so the player's progress/seek is visible even for one-word values
  const notes = Array.from({ length: Math.max(6, base.length) }, (_, i) => base[i % base.length] * (i >= base.length ? 1.5 : 1));
  const noteLen = Math.floor(rate * 0.26);
  const n = notes.length * noteLen;
  const buf = new Uint8Array(44 + n);
  const dv = new DataView(buf.buffer);
  const str = (o: number, v: string) => [...v].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  dv.setUint32(4, 36 + n, true);
  str(8, "WAVE");
  str(12, "fmt ");
  dv.setUint32(16, 16, true); // PCM chunk size
  dv.setUint16(20, 1, true); // PCM
  dv.setUint16(22, 1, true); // mono
  dv.setUint32(24, rate, true);
  dv.setUint32(28, rate, true); // byte rate (8-bit mono)
  dv.setUint16(32, 1, true); // block align
  dv.setUint16(34, 8, true); // bits per sample
  str(36, "data");
  dv.setUint32(40, n, true);
  for (let i = 0; i < n; i++) {
    const f = notes[Math.floor(i / noteLen)];
    const t = (i % noteLen) / rate;
    const env = Math.min(1, t * 60) * Math.exp(-5 * t);
    buf[44 + i] = Math.round(128 + 100 * env * Math.sin((2 * Math.PI * f * i) / rate));
  }
  return `data:audio/wav;base64,${toBase64(buf)}`;
}

// ---------------------------------------------------------------------------
// Media helpers
// ---------------------------------------------------------------------------

const STYLE_PROMPT =
  "Friendly flat cartoon illustration for Vietnamese primary-school children (age 6–7), bright soft colors, thick clean outlines, plain light background, single clear subject, centered composition, no text.";

/** Mirrors DATA/config/image-policy.json (global negative prompt — mandatory). */
export const MOCK_GLOBAL_NEGATIVE =
  "text, letters, words, numbers, captions, speech bubbles with text, watermark, signature, logo, brand names, Chinese characters, hanzi, PRC flag, Chinese national emblem, CCP symbols, hammer and sickle, maps, nine-dash line map, territorial claim maps, Chinese-style red lanterns, Chinese dragons, Chinese traditional costume (hanfu, qipao), Chinese temple or pagoda architecture, Chinese New Year motifs, violence, weapons, blood, gore, scary or creepy content, realistic photo, photorealistic, 3D render, dark gloomy lighting, cluttered background, multiple unrelated subjects, deformed hands, extra limbs, distorted face, low quality, blurry";

function key(
  id: string,
  kind: MediaKey["kind"],
  target: MediaKey["target"],
  keywords: string[],
  description: string,
  targetValue?: string,
): MediaKey {
  return { id, kind, target, keywords, description, ...(targetValue ? { targetValue } : {}) };
}

function image(
  questionId: string,
  mk: MediaKey,
  status: AssetStatus,
  subject: string,
  extraNegative = "",
  error?: string,
): ImageAsset {
  if (extraNegative) mk.negativeExtras = extraNegative.split(", ");
  return {
    id: `img_${mk.id}`,
    questionId,
    mediaKeyId: mk.id,
    prompt: `${STYLE_PROMPT} Subject: ${mk.description}`,
    negativePrompt: extraNegative ? `${MOCK_GLOBAL_NEGATIVE}, ${extraNegative}` : MOCK_GLOBAL_NEGATIVE,
    model: MODELS.image,
    status,
    ...(status === "done" ? { url: mockIllustration(subject) } : {}),
    ...(error ? { error } : {}),
  };
}

/** `file: true` ⇒ done with a real WAV data URL; otherwise done means url == null (browser TTS fallback). */
function audio(questionId: string, mk: MediaKey, status: AssetStatus, opts: { file?: boolean; error?: string } = {}): AudioAsset {
  const file = status === "done" && opts.file;
  return {
    id: `aud_${mk.id}`,
    questionId,
    mediaKeyId: mk.id,
    text: mk.description,
    voice: "en-US",
    model: file ? "mock-wav-tone" : "browser-tts",
    status,
    ...(file ? { url: mockToneWav(mk.description) } : {}),
    ...(opts.error ? { error: opts.error } : {}),
  };
}

function run(
  type: QuestionTypeCode,
  bloom: BloomLevel,
  questions: GeneratedQuestion[],
  images: ImageAsset[],
  audios: AudioAsset[],
  warnings: string[] = [],
): GenerateResponse {
  const loCodes = Array.from(new Set(questions.map((q) => q.lo.code)));
  return {
    runId: `run_20261118_0915_${type.toLowerCase()}`,
    request: { type, loCodes, bloom, count: questions.length, options: { withImages: true, withAudio: true, language: "en" } },
    createdAt: "2026-11-18T09:15:42.000Z",
    model: MODELS.text,
    questions,
    images,
    audios,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// COMP_SEL
// ---------------------------------------------------------------------------

function compSel(): GenerateResponse {
  const q1k = key("q1_m1", "image", "question", ["ball", "toy", "playground"], "A colorful round ball on the green grass of a school playground.");
  const q2opts = ["bike", "pen", "book", "ball"];
  const q2k = q2opts.map((o, i) =>
    key(`q2_m${i + 1}`, "image", "option", [o, "object"], `A single ${o} on a plain background.`, o),
  );
  const q3k = key("q3_m1", "image", "question", ["cat", "pet", "girl"], "A happy little girl hugging her orange cat at home.");

  const questions: GeneratedQuestion[] = [
    {
      id: "q1",
      type: "COMP_SEL",
      lo: loRef("AIC_G1_U1_TV1_1"),
      bloom: "M1",
      hint: "Nhìn tranh: đồ chơi hình tròn, dùng để đá hoặc ném.",
      explanation: "Tranh vẽ quả bóng → “ball”. “bike”, “book” cùng âm /b/ nhưng không khớp với tranh.",
      mediaKeys: [q1k],
      warnings: [],
      questionContent: { stem: "Look! It is a ____." },
      answerContent: { correct: "ball", distractorPool: ["bike", "book", "cake", "cat"], options: ["book", "ball", "bike", "cat"] },
      trueAnswer: "ball",
    },
    {
      id: "q2",
      type: "COMP_SEL",
      lo: loRef("AIC_G1_U1_TV1_3"),
      bloom: "M2",
      hint: "Em dùng đồ vật này để đọc truyện.",
      explanation: "“read my book” — đọc sách. “bike”, “ball” không dùng với động từ “read”.",
      mediaKeys: q2k,
      warnings: [],
      questionContent: { stem: "I read my ____ in the classroom." },
      answerContent: { correct: "book", distractorPool: ["ball", "bike", "bag", "pen"], options: q2opts },
      trueAnswer: "book",
    },
    {
      id: "q3",
      type: "COMP_SEL",
      lo: loRef("AIC_G1_U2_NP1_1"),
      bloom: "M3",
      hint: "Con vật này kêu “meow”.",
      explanation: "Mẫu câu “I have a + [noun]”; con vật kêu “meow” là “cat”. Các đáp án khác cùng âm /k/ của Unit 2.",
      mediaKeys: [q3k],
      warnings: ["Distractor “duck” thuộc Unit 4 — ngoài LO con được chọn, CMS nên loại khỏi pool."],
      questionContent: { stem: "I have a ____. It says “meow”." },
      answerContent: { correct: "cat", distractorPool: ["car", "cup", "cake", "duck"], options: ["cup", "cat", "car", "cake"] },
      trueAnswer: "cat",
    },
  ];
  const images = [
    image("q1", q1k, "done", "ball", "other balls, children playing football"),
    image("q2", q2k[0], "done", "bike"),
    image("q2", q2k[1], "done", "default"),
    image("q2", q2k[2], "generating", "book"),
    image("q2", q2k[3], "pending", "ball"),
    image("q3", q3k, "error", "cat", "", "Image model timeout after 60s (504). Thử tạo lại."),
  ];
  return run("COMP_SEL", "M2", questions, images, []);
}

// ---------------------------------------------------------------------------
// RESP_SEL (phase 2 preview)
// ---------------------------------------------------------------------------

function respSel(): GenerateResponse {
  const q1k = key("q1_m1", "image", "question", ["boy", "red bike", "playground"], "A smiling Vietnamese boy standing next to his red bike in a school playground.");
  const q2k = key("q2_m1", "audio", "question", ["greeting", "names"], "Hi, I’m Bill. Hi, Bill! I’m Lan.");
  const questions: GeneratedQuestion[] = [
    {
      id: "q1",
      type: "RESP_SEL",
      lo: loRef("AIC_G1_U2_NP1_1"),
      bloom: "M2",
      hint: "Đọc lại câu thứ hai của Nam.",
      explanation: "Nam nói “I have a red bike.” → đáp án “A red bike.”",
      mediaKeys: [q1k],
      warnings: [],
      questionContent: {
        passage: "Hi, I’m Nam. I have a red bike. I ride my bike in the school playground.",
        passageMode: "text",
        question: "What does Nam have?",
      },
      answerContent: {
        correct: "A red bike.",
        distractorPool: ["A blue ball.", "A big book.", "A red cake.", "A cat."],
        options: ["A blue ball.", "A red bike.", "A red cake.", "A big book."],
      },
      trueAnswer: "A red bike.",
    },
    {
      id: "q2",
      type: "RESP_SEL",
      lo: loRef("AIC_G1_U1_NP1_1"),
      bloom: "M2",
      hint: "Nghe bạn nữ tự giới thiệu: “I’m …”.",
      explanation: "Bạn nữ nói “I’m Lan.” Bill là tên bạn nam.",
      mediaKeys: [q2k],
      warnings: [],
      questionContent: { passage: "Hi, I’m Bill. Hi, Bill! I’m Lan.", passageMode: "audio", question: "What is the girl’s name?" },
      answerContent: { correct: "Lan.", distractorPool: ["Bill.", "Nam.", "Ba.", "Mai."], options: ["Bill.", "Ba.", "Lan.", "Nam."] },
      trueAnswer: "Lan.",
    },
  ];
  return run(
    "RESP_SEL",
    "M2",
    questions,
    [image("q1", q1k, "done", "bike", "girls, other bikes")],
    [audio("q2", q2k, "done", { file: true })],
    ["RESP_SEL thuộc Phase 2 — kết quả chỉ để xem trước, chưa đưa vào CMS."],
  );
}

// ---------------------------------------------------------------------------
// TYPING
// ---------------------------------------------------------------------------

function typing(): GenerateResponse {
  const q1k = key("q1_m1", "image", "question", ["bag", "school bag", "purple"], "A purple school bag held by a child's hand.");
  const q2k = key("q2_m1", "image", "question", ["apple", "desk"], "A red apple on a wooden desk.");
  const q3k = key("q3_m1", "image", "question", ["book", "desk", "bedroom"], "A blue book lying on top of a small desk in a child's bedroom.");
  const questions: GeneratedQuestion[] = [
    {
      id: "q1",
      type: "TYPING",
      lo: loRef("AIC_G1_U3_NP1_1"),
      bloom: "M1",
      hint: "Đồ vật em đeo trên vai khi đi học, bắt đầu bằng chữ b.",
      explanation: "Mẫu câu “This is my + [noun]” → “This is my bag.”",
      mediaKeys: [q1k],
      warnings: [],
      questionContent: { stem: "This is my ____." },
      answerContent: { answer: "bag", acceptedVariants: [] },
      trueAnswer: { answer: "bag", fullSentence: "This is my bag." },
    },
    {
      id: "q2",
      type: "TYPING",
      lo: loRef("AIC_G1_U3_NP2_1"),
      bloom: "M2",
      hint: "Giới thiệu có một vật ở đâu đó: “There …”.",
      explanation: "“There is + an + apple” — “apple” bắt đầu bằng nguyên âm nên dùng “an”. Chấp nhận dạng rút gọn “There’s”.",
      mediaKeys: [q2k],
      warnings: [],
      questionContent: { stem: "____ an apple on the desk." },
      answerContent: { answer: "There is", acceptedVariants: ["There’s", "There's"] },
      trueAnswer: { answer: "There is", fullSentence: "There is an apple on the desk." },
    },
    {
      id: "q3",
      type: "TYPING",
      lo: loRef("AIC_G1_U4_NP2_1"),
      bloom: "M3",
      hint: "Nhìn tranh: cuốn sách nằm trên đồ vật có mặt phẳng.",
      explanation: "“It is on the + [noun]” — cuốn sách ở trên bàn học → “desk”.",
      mediaKeys: [q3k],
      warnings: [],
      questionContent: { stem: "It is on the ____." },
      answerContent: { answer: "desk", acceptedVariants: [] },
      trueAnswer: { answer: "desk", fullSentence: "It is on the desk." },
    },
  ];
  return run("TYPING", "M2", questions, [
    image("q1", q1k, "done", "bag"),
    image("q2", q2k, "done", "apple", "bitten apple, worm"),
    image("q3", q3k, "pending", "desk"),
  ], []);
}

// ---------------------------------------------------------------------------
// MATCH
// ---------------------------------------------------------------------------

function match(): GenerateResponse {
  const words = ["cake", "car", "cat", "cup"];
  const q1k = words.map((w, i) => key(`q1_m${i + 1}`, "image", "pairA", [w], `A single ${w} on a plain background.`, w));
  const q3words = ["cake", "car", "cat", "cup"];
  // en_image: column B holds the words again; each is rendered by the pairB key with targetValue = word.
  const q3k = q3words.map((w, i) => key(`q3_m${i + 1}`, "image", "pairB", [w], `A single ${w} on a plain background.`, w));
  const questions: GeneratedQuestion[] = [
    {
      id: "q1",
      type: "MATCH",
      lo: loRef("AIC_G1_U2_TV1_1"),
      bloom: "M1",
      hint: "Các từ đều bắt đầu bằng âm /k/ (chữ c).",
      explanation: "cake – bánh ngọt, car – ô tô, cat – con mèo, cup – cái cốc.",
      mediaKeys: q1k,
      warnings: [],
      questionContent: null,
      answerContent: { columnA: words, columnB: ["con mèo", "cái cốc", "bánh ngọt", "ô tô"] },
      trueAnswer: [
        { a: "cake", b: "bánh ngọt" },
        { a: "car", b: "ô tô" },
        { a: "cat", b: "con mèo" },
        { a: "cup", b: "cái cốc" },
      ],
    },
    {
      id: "q2",
      type: "MATCH",
      lo: loRef("AIC_G1_U9_TV2_1"),
      bloom: "M2",
      hint: "Đếm từ 1 đến 5.",
      explanation: "one = 1, two = 2, three = 3, four = 4, five = 5.",
      mediaKeys: [],
      warnings: [],
      questionContent: null,
      answerContent: { columnA: ["one", "two", "three", "four", "five"], columnB: ["4", "1", "5", "2", "3"] },
      trueAnswer: [
        { a: "one", b: "1" },
        { a: "two", b: "2" },
        { a: "three", b: "3" },
        { a: "four", b: "4" },
        { a: "five", b: "5" },
      ],
    },
    {
      id: "q3",
      type: "MATCH",
      lo: loRef("AIC_G1_U2_TV1_1"),
      bloom: "M1",
      hint: "Look at each picture and find the English word.",
      explanation: "Each word matches the picture that shows it.",
      mediaKeys: q3k,
      warnings: [],
      questionContent: null,
      answerContent: { columnA: q3words, columnB: ["cup", "cake", "cat", "car"], matchMode: "en_image" },
      trueAnswer: q3words.map((w) => ({ a: w, b: w })),
    },
  ];
  return run("MATCH", "M1", questions, [
    image("q1", q1k[0], "done", "cake"),
    image("q1", q1k[1], "done", "car"),
    image("q1", q1k[2], "done", "cat"),
    image("q1", q1k[3], "pending", "cup"),
    image("q3", q3k[0], "done", "cake"),
    image("q3", q3k[1], "done", "car"),
    image("q3", q3k[2], "generating", "cat"),
    image("q3", q3k[3], "pending", "cup"),
  ], []);
}

// ---------------------------------------------------------------------------
// ORDER
// ---------------------------------------------------------------------------

function order(): GenerateResponse {
  const q1k = key("q1_m1", "image", "answer", ["girl", "cake", "birthday"], "A cheerful girl holding a pink cake with a cherry on top.");
  const q2k = key("q2_m1", "image", "answer", ["dog", "door", "bedroom"], "A small brown dog sitting near a wooden bedroom door.");
  const t1 = ["I", "have", "a cake"];
  const t2 = ["It", "is", "near", "the door"];
  const t3 = ["There", "are", "three", "clocks", "in", "the shop"];
  const questions: GeneratedQuestion[] = [
    {
      id: "q1",
      type: "ORDER",
      lo: loRef("AIC_G1_U2_NP1_1"),
      bloom: "M1",
      hint: "Câu bắt đầu bằng “I”.",
      explanation: "Mẫu câu “I have a + [noun]” → “I have a cake.” (“a cake” là một cụm, giữ nguyên).",
      mediaKeys: [q1k],
      warnings: [],
      questionContent: null,
      answerContent: { tokens: t1, tokenString: t1.join("/space/"), shuffled: ["a cake", "I", "have"] },
      trueAnswer: { sentence: "I have a cake." },
    },
    {
      id: "q2",
      type: "ORDER",
      lo: loRef("AIC_G1_U4_NP2_2"),
      bloom: "M2",
      hint: "“near” đứng ngay trước “the door”.",
      explanation: "“It is (It’s) + near + the + [noun]” → “It is near the door.”",
      mediaKeys: [q2k],
      warnings: [],
      questionContent: null,
      answerContent: { tokens: t2, tokenString: t2.join("/space/"), shuffled: ["near", "the door", "It", "is"] },
      trueAnswer: { sentence: "It is near the door." },
    },
    {
      id: "q3",
      type: "ORDER",
      lo: loRef("AIC_G1_U9_NP2_1"),
      bloom: "M4",
      hint: "Số lượng đứng trước danh từ số nhiều.",
      explanation: "“There are + [number] + [plural noun]” + nơi chốn “in the shop”.",
      mediaKeys: [],
      warnings: ["Đã bỏ dấu chấm cuối câu khỏi token cuối (“the shop.” → “the shop”)."],
      questionContent: null,
      answerContent: { tokens: t3, tokenString: t3.join("/space/"), shuffled: ["clocks", "in", "There", "the shop", "three", "are"] },
      trueAnswer: { sentence: "There are three clocks in the shop." },
    },
  ];
  return run("ORDER", "M2", questions, [image("q1", q1k, "done", "cake"), image("q2", q2k, "generating", "dog")], []);
}

// ---------------------------------------------------------------------------
// LISTEN
// ---------------------------------------------------------------------------

function listen(): GenerateResponse {
  const labels1 = ["dog", "duck", "desk", "door"];
  const items1 = labels1.map((l, i) => ({ index: i + 1, sentence: `This is a ${l}.` }));
  const script1 = items1.map((it) => `Number ${it.index}. ${it.sentence}`).join(" ");
  const q1a = key("q1_m1", "audio", "question", ["listen", "this is a"], script1);
  const q1i = labels1.map((l, i) => key(`q1_i${i + 1}`, "image", "item", [l], `A single ${l} in a child's bedroom, plain background.`, l));

  const labels2 = ["apple", "hat", "bag"];
  const items2 = [
    { index: 1, sentence: "I have an apple." },
    { index: 2, sentence: "I have a hat." },
    { index: 3, sentence: "I have a bag." },
  ];
  const script2 = items2.map((it) => `Number ${it.index}. ${it.sentence}`).join(" ");
  const q2a = key("q2_m1", "audio", "question", ["listen", "i have"], script2);
  const q2i = labels2.map((l, i) => key(`q2_i${i + 1}`, "image", "item", [l], `A single ${l} at a street market stall, plain background.`, l));

  const questions: GeneratedQuestion[] = [
    {
      id: "q1",
      type: "LISTEN",
      lo: loRef("AIC_G1_U4_TV1_2"),
      bloom: "M2",
      hint: "Nghe kỹ từ cuối mỗi câu.",
      explanation: "Thứ tự trong audio: dog → duck → desk → door.",
      mediaKeys: [q1a, ...q1i],
      warnings: [],
      questionContent: { items: items1, audioScript: script1 },
      answerContent: { orderedLabels: labels1, shuffledLabels: ["desk", "door", "dog", "duck"] },
      trueAnswer: labels1.map((label, i) => ({ position: i + 1, label })),
    },
    {
      id: "q2",
      type: "LISTEN",
      lo: loRef("AIC_G1_U3_TV1_1"),
      bloom: "M3",
      hint: "Chú ý “an apple” và “a hat”.",
      explanation: "Thứ tự trong audio: apple → hat → bag.",
      mediaKeys: [q2a, ...q2i],
      warnings: [],
      questionContent: { items: items2, audioScript: script2 },
      answerContent: { orderedLabels: labels2, shuffledLabels: ["bag", "apple", "hat"] },
      trueAnswer: labels2.map((label, i) => ({ position: i + 1, label })),
    },
  ];
  return run(
    "LISTEN",
    "M2",
    questions,
    [
      image("q1", q1i[0], "done", "dog"),
      image("q1", q1i[1], "done", "duck"),
      image("q1", q1i[2], "done", "desk"),
      image("q1", q1i[3], "generating", "door"),
      image("q2", q2i[0], "done", "apple"),
      image("q2", q2i[1], "error", "hat", "", "Content policy: output contained text, discarded."),
      image("q2", q2i[2], "pending", "bag"),
    ],
    [audio("q1", q1a, "done", { file: true }), audio("q2", q2a, "pending")],
  );
}

// ---------------------------------------------------------------------------
// SPEAK
// ---------------------------------------------------------------------------

function speak(): GenerateResponse {
  const values = [
    { text: "ball", kind: "word" as const, lo: "AIC_G1_U1_TV1_1" },
    { text: "bike", kind: "word" as const, lo: "AIC_G1_U1_TV1_2" },
    { text: "book", kind: "word" as const, lo: "AIC_G1_U1_TV1_3" },
    { text: "Hi, I’m Nam.", kind: "sentence" as const, lo: "AIC_G1_U1_NP1_1" },
  ];
  const keys = values.flatMap((v, i) => [
    key(`q1_v${i + 1}_img`, "image", "item", [v.text.toLowerCase()], v.kind === "sentence" ? "A friendly Vietnamese boy waving hello in a school playground." : `A single ${v.text} on a plain background.`, v.text),
    key(`q1_v${i + 1}_aud`, "audio", "item", [v.text.toLowerCase()], v.text, v.text),
  ]);
  const imgStatus: AssetStatus[] = ["done", "done", "pending", "done"];
  const subjects = ["ball", "bike", "book", "default"];
  const questions: GeneratedQuestion[] = [
    {
      id: "q1",
      type: "SPEAK",
      lo: loRef("AIC_G1_U1_TV1_1"),
      bloom: "M1",
      hint: "Nghe mẫu rồi đọc to, rõ âm /b/ ở đầu từ.",
      explanation: "Mỗi giá trị tương ứng một LO cháu đã chọn; CMS lấy ảnh + voice theo key mapping.",
      mediaKeys: keys,
      warnings: [],
      questionContent: null,
      answerContent: {
        values: values.map((v, i) => ({ text: v.text, kind: v.kind, loCode: v.lo, mediaKeyIds: [`q1_v${i + 1}_img`, `q1_v${i + 1}_aud`] })),
      },
      trueAnswer: null,
    },
  ];
  const images = values.map((_, i) => image("q1", keys[i * 2], imgStatus[i], subjects[i]));
  // v1: real file · v2: browser TTS (url null) · v3: generating · v4: error
  const audioStates: Array<[AssetStatus, { file?: boolean; error?: string }]> = [
    ["done", { file: true }],
    ["done", {}],
    ["generating", {}],
    ["error", { error: "TTS provider returned 429 (rate limited)." }],
  ];
  const audios = values.map((_, i) => audio("q1", keys[i * 2 + 1], audioStates[i][0], audioStates[i][1]));
  return run("SPEAK", "M1", questions, images, audios);
}

export const mockResults: Record<QuestionTypeCode, GenerateResponse> = {
  COMP_SEL: compSel(),
  RESP_SEL: respSel(),
  TYPING: typing(),
  MATCH: match(),
  ORDER: order(),
  LISTEN: listen(),
  SPEAK: speak(),
};
