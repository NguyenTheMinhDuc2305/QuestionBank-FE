# QuestionBank — Frontend

Giao diện của POC sinh câu hỏi tiếng Anh tiểu học bằng AI. Người dùng chọn dạng bài, learning objective (LO), mức Bloom và số câu; hệ thống sinh câu hỏi kèm ảnh và audio để xem, nghe, kiểm tra, rồi **duyệt** hoặc **ngừng dùng**.

| | |
|---|---|
| **Địa chỉ** | https://question-bank-generator-six.vercel.app |
| **Host** | Vercel, project `question-bank-generator` (deploy bằng CLI) |
| **Backend** | [QuestionBank-BE](https://github.com/NguyenTheMinhDuc2305/QuestionBank-BE): Cloudflare Worker `https://questionbank-worker.nguyentheminhduc23052002.workers.dev` |
| **Công nghệ** | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, lucide-react |
| **Đăng nhập** | Không có (POC mở cho mọi người test) |
| **Key** | **Không có key nào** trong frontend hay trên Vercel |

---

## Mục lục
1. [Giao diện có gì](#1-giao-diện-có-gì)
2. [Cấu trúc repo](#2-cấu-trúc-repo)
3. [Cách frontend nói chuyện với backend](#3-cách-frontend-nói-chuyện-với-backend)
4. [Chuyển đổi dữ liệu cho giao diện](#4-chuyển-đổi-dữ-liệu-cho-giao-diện)
5. [Chạy local](#5-chạy-local)
6. [Deploy lên Vercel](#6-deploy-lên-vercel)
7. [Bảo mật](#7-bảo-mật)
8. [Khác biệt so với QuestionBank bản cũ](#8-khác-biệt-so-với-questionbank-bản-cũ)
9. [Sửa đổi thường gặp](#9-sửa-đổi-thường-gặp)

---

## 1. Giao diện có gì

Giữ nguyên **giao diện của QuestionBank bản cũ**. Trên header có 2 tab:

### Tab "Tạo câu hỏi"
- **Cột trái (form):**
  1. **Dạng câu hỏi**: COMP_SEL (chọn đáp án điền khuyết), TYPING (gõ đáp án), MATCH (nối cột), ORDER (sắp xếp câu), LISTEN (nghe và sắp xếp tranh). RESP_SEL và SPEAK hiện nhãn "Phase 2", chưa chọn được.
  2. **LO cháu**: cây Unit → nhóm LO → LO cháu, chọn được **nhiều LO**, có ô tìm kiếm (gõ không dấu cũng được).
  3. **Mức Bloom** M1–M4 (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao).
  4. **Số câu cho mỗi LO** (1–10; tối đa 30 câu mỗi lần), bật/tắt **ảnh** và **audio**. MATCH chọn thêm kiểu nối: Anh–Việt, Anh–Hình, hoặc Tự động.
- **Cột phải (kết quả):**
  - Thông tin lần chạy; các tab **Câu hỏi / Hình ảnh / Audio**; chế độ **Học sinh** (ẩn đáp án) hoặc **Answer key**; xuất JSON.
  - Mỗi câu hiển thị như học sinh nhìn thấy, kèm phần thông tin: LO, Bloom, gợi ý, giải thích, đáp án, danh sách media (prompt/negative prompt của ảnh, transcript của audio).
  - Trong lúc chờ (thường 1–3 phút) có dòng tiến độ, ví dụ "1/3 LO xong · 2 câu".

### Tab "Câu đã tạo"
- Danh sách **mọi câu đã sinh** (mới nhất trước), lọc theo **dạng bài**, **trạng thái** (Nháp / Đã duyệt / Ngừng dùng), **Bloom**; phân trang 20 câu/trang.
- Bấm một câu để xem lại bằng đúng thẻ câu hỏi ở trên (ảnh, audio, đáp án, JSON), kèm nút **Duyệt** và **Ngừng dùng**.
- Chuyển qua lại giữa 2 tab không mất form hay kết quả đang xem.

Khác: giao diện sáng/tối/theo hệ thống; `?mock=1` trên URL hiển thị dữ liệu mẫu, không gọi backend.

---

## 2. Cấu trúc repo

```
QuestionBank-FE/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Font Geist (có tiếng Việt), theme sáng/tối
│   │   ├── page.tsx             # Trang chính: header + tab "Tạo câu hỏi" / "Câu đã tạo"
│   │   └── globals.css          # Tailwind v4 + biến màu (theme)
│   ├── components/
│   │   ├── AppHeader.tsx        # Header + nút chuyển tab
│   │   ├── GeneratorForm.tsx    # Form tạo câu hỏi
│   │   ├── form/                # TypePicker, LoPicker (cây LO), BloomPicker
│   │   ├── ResultsView.tsx      # Kết quả: tab Câu hỏi / Hình ảnh / Audio, trạng thái chờ
│   │   ├── results/             # QuestionCard, QuestionPreview (hiển thị theo dạng bài),
│   │   │                        # QuestionMeta, ImageGallery, AudioGallery, RunHeader
│   │   ├── media/               # MediaImage, ImageLightbox, AudioPlayer, MediaContext
│   │   ├── HistoryView.tsx      # Tab "Câu đã tạo"
│   │   ├── useGenerator.ts      # Hook quản lý trạng thái + interface GeneratorBackend
│   │   ├── labels.ts, ui.tsx    # Nhãn tiếng Việt, component cơ bản (Button, Badge, Callout…)
│   │   └── ThemeToggle.tsx
│   ├── lib/
│   │   ├── api-client.ts        # Gọi API Worker (fetch tới NEXT_PUBLIC_AI_CORE_URL)
│   │   ├── api-backend.ts       # Cài đặt GeneratorBackend cho Worker: tạo job, chờ, tải kết quả
│   │   ├── convert.ts           # Đổi dữ liệu Worker → kiểu dữ liệu của giao diện
│   │   └── mock.ts              # Dữ liệu mẫu (?mock=1) + danh mục dạng bài, Bloom
│   └── shared/
│       └── types.ts             # Kiểu dữ liệu dùng chung của giao diện (từ bản cũ)
├── public/                      # Icon tĩnh
├── next.config.ts               # Tailwind qua Turbopack; không có API route nào
├── vercel.json                  # framework: nextjs
├── .env.example                 # NEXT_PUBLIC_AI_CORE_URL=...
└── package.json
```

Frontend **không có API route nào**. Toàn bộ trang chạy trên trình duyệt và gọi thẳng Worker.

---

## 3. Cách frontend nói chuyện với backend

Giao diện cũ được thiết kế quanh một interface `GeneratorBackend` (`src/components/useGenerator.ts`):

```ts
interface GeneratorBackend {
  loadMeta(): Promise<MetaResponse>;           // dạng bài, cây LO, Bloom, giới hạn, model
  generate(req: GenerateRequest): Promise<GenerateResponse>;
  regenerateImage(...); regenerateAudio(...);  // backend mới chưa hỗ trợ (báo lỗi rõ ràng)
  autoMedia?: boolean;                         // false: ảnh/audio do backend sinh sẵn
}
```

`src/lib/api-backend.ts` cài đặt interface này cho Worker:

### 3.1 `loadMeta()`
- `GET /v1/config` → model đang dùng; `hasApiKey` = backend đã đủ cấu hình hay chưa (chưa đủ thì form hiện cảnh báo và khóa nút Tạo).
- `GET /v1/learning-objectives?limit=1000` → dựng **cây LO** 3 tầng (`buildLoTree` trong `convert.ts`): Unit (cha) → tên LO cụ thể + phân loại Từ vựng/Ngữ pháp (con) → nội dung LO (cháu). Thứ tự giữ đúng như trong file CSV gốc. Mã LO cháu là `code` trong database (ví dụ `EN_G1_U1_03dc12faeaab`).

### 3.2 `generate(req)`
```
Chọn N LO cháu ──► tạo N job (mỗi LO 1 job), chạy tối đa 3 job cùng lúc
                      │  POST /v1/jobs  { request_key, lo_id, question_type, bloom_level,
                      │                   count, include_images, include_audio, instructions }
                      │  (gặp 429 thì chờ 5 giây và thử lại với CÙNG request_key ⇒ không tạo trùng)
                      ▼
                 hỏi GET /v1/jobs/:id mỗi 5 giây (tối đa 20 phút) → completed / failed
                      ▼
                 GET /v1/questions/:id cho từng câu → convertQuestion() → hiển thị
```
- Bloom `M1..M4` → `bloom_level 1..4`.
- LISTEN luôn bật ảnh + audio; ORDER luôn tắt ảnh (backend yêu cầu như vậy).
- Kiểu nối MATCH (Anh–Việt / Anh–Hình) và danh sách câu đã tạo trước đó (giao diện lưu trong `localStorage`, dùng để tránh tạo câu lặp lại) được gửi dưới dạng `instructions`.
- Job nào lỗi thì hiện thành cảnh báo; nếu mọi job đều lỗi thì hiện lỗi chung.
- Tiến độ được gửi tới dòng chờ qua `onGenerationProgress`.

### 3.3 Tab "Câu đã tạo"
- `GET /v1/questions?question_type=&status=&bloom_level=&offset=&limit=20` → danh sách.
- Bấm vào câu → `GET /v1/questions/:id` → hiển thị.
- Duyệt / Ngừng dùng → `PATCH /v1/questions/:id/review`.

### 3.4 Gọi API (`src/lib/api-client.ts`)
- Địa chỉ gốc lấy từ `NEXT_PUBLIC_AI_CORE_URL`.
- Lỗi được đổi thành câu tiếng Việt dễ hiểu, ví dụ thiếu cấu hình → "Backend còn thiếu cấu hình: …"; mất mạng → "Không kết nối được backend…".

---

## 4. Chuyển đổi dữ liệu cho giao diện

Backend lưu dữ liệu theo bảng (Supabase); giao diện cũ cần kiểu `GeneratedQuestion` + `ImageAsset`/`AudioAsset` (`src/shared/types.ts`). `src/lib/convert.ts` làm cầu nối:

| Dạng bài | Từ backend | Thành dữ liệu giao diện |
|---|---|---|
| COMP_SEL | `stem_text`, các option (`text_content`, `is_correct`, `position`) | `questionContent.stem`, `answerContent.correct/options/distractorPool`, `trueAnswer` |
| TYPING | `stem_text`, `answer_text`, `completed_sentence` | `stem`, `answer`, `trueAnswer.fullSentence` |
| MATCH | các cặp `left_text`/`right_text` | `columnA`, `columnB` (xáo trộn), `trueAnswer`; có ảnh ở cột phải ⇒ `matchMode = en_image` |
| ORDER | token theo `correct_position`, `correct_sentence` | `tokens`, `tokenString` (nối bằng `/space/`), `shuffled` |
| LISTEN | item theo `correct_position` (`label`, `spoken_text`) | `items`, `audioScript`, `orderedLabels`, `shuffledLabels` |

- **Ảnh/audio:** mỗi chỗ dùng ảnh/audio thành một `MediaKey` (gắn vào đề bài / đáp án / cột A / cột B / item…), kèm asset trạng thái `done` và `url` là **link ký tạm 10 phút** từ backend.
- **Xáo trộn đáp án** dùng seed là id câu hỏi, nên thứ tự cố định mỗi lần mở (không đổi khi tải lại trang).
- Chỗ trống `___` của backend được đổi thành `____` cho đúng cách giao diện cũ hiển thị.
- **LISTEN:** backend sinh **1 audio riêng cho mỗi item** (nghe trong tab Audio). Trình phát ở đầu câu đọc cả đoạn bằng **giọng của trình duyệt** (có nhãn rõ ràng), giống cách bản cũ làm khi TTS lỗi.

---

## 5. Chạy local

Yêu cầu: Node.js 20+.

```bash
npm ci
cp .env.example .env.local
# Sửa NEXT_PUBLIC_AI_CORE_URL trong .env.local:
#   - Worker trên Cloudflare: https://questionbank-worker.nguyentheminhduc23052002.workers.dev
#   - Worker chạy local (npm run dev trong QuestionBank-BE): http://localhost:8787
npm run dev            # http://localhost:3000
```

- Worker chỉ cho phép các domain trong `CORS_ORIGINS`; `http://localhost:3000` đã có sẵn. Chạy cổng khác thì thêm vào `CORS_ORIGINS` rồi deploy lại backend.
- Xem giao diện mà không cần backend: http://localhost:3000/?mock=1
- **Lưu ý:** tạo câu hỏi ở local dùng backend thật nên **tốn tiền thật**.

Kiểm tra trước khi deploy:
```bash
npm run typecheck
npx eslint src
npm run build
```

---

## 6. Deploy lên Vercel

Project Vercel: **`question-bank-generator`** (team `nguyentheminhduc23052002-4317's projects`).
- **Không nối Git**: push lên GitHub **không** tự deploy, phải chạy lệnh dưới đây.
- Thư mục `.vercel/` (đã nối sẵn với project, bị git bỏ qua) cho biết deploy vào project nào. Nếu mất, chạy `vercel link` rồi chọn `question-bank-generator`.

```bash
npm i -g vercel
vercel login             # lần đầu
vercel whoami

vercel deploy            # bản PREVIEW: link riêng, không ảnh hưởng link chính (cần đăng nhập Vercel mới xem được)
vercel deploy --prod     # PRODUCTION: cập nhật https://question-bank-generator-six.vercel.app
```

**Biến môi trường trên Vercel** (Project → Settings → Environment Variables):
| Tên | Môi trường | Giá trị |
|---|---|---|
| `NEXT_PUBLIC_AI_CORE_URL` | Production, Preview | `https://questionbank-worker.nguyentheminhduc23052002.workers.dev` |

Biến `NEXT_PUBLIC_*` được **nhúng vào code lúc build**: đổi giá trị thì phải deploy lại. Thêm hoặc sửa bằng CLI:
```bash
vercel env add NEXT_PUBLIC_AI_CORE_URL production
vercel env ls
```

**Domain mới:** nếu gắn domain riêng cho giao diện, phải thêm domain đó vào `CORS_ORIGINS` của backend rồi deploy lại backend. Nếu không, trình duyệt sẽ bị chặn khi gọi API.

**Rollback:** Vercel Dashboard → `question-bank-generator` → Deployments → chọn bản cũ → **Promote to Production**.

---

## 7. Bảo mật

- Frontend **không chứa key nào**: key OpenRouter, tguru và Supabase chỉ nằm trong Worker Secrets trên Cloudflare. Đã quét toàn bộ HTML/JS trên production và không tìm thấy key.
- Trên Vercel chỉ có `NEXT_PUBLIC_AI_CORE_URL`, là địa chỉ public, không phải bí mật.
- **Không bao giờ** đặt key vào biến `NEXT_PUBLIC_*`, vì trình duyệt đọc được mọi biến dạng này.
- `.env*` (trừ `.env.example`) và `.vercel/` bị git bỏ qua.
- Ảnh/audio nằm trong bucket private; trình duyệt chỉ nhận link ký tạm 10 phút.
- POC **không có đăng nhập**: ai có link đều tạo được câu hỏi (tốn tiền AI), xem và duyệt được câu. Đây là lựa chọn có chủ ý để mọi người test thoải mái.

---

## 8. Khác biệt so với QuestionBank bản cũ

| | Bản cũ | Bản hiện tại |
|---|---|---|
| Backend | Hono chạy trên Vercel cùng project, đường dẫn `/api/*` | Cloudflare Worker riêng, đường dẫn `/v1/*` |
| Sinh ảnh/audio | Trình duyệt gọi từng ảnh/audio sau khi có câu hỏi | Backend sinh sẵn trong Workflow; giao diện nhận kết quả hoàn chỉnh |
| Ảnh | OpenRouter (`gpt-image-2`), trả data URL | tguru, lưu trong Supabase Storage |
| Lưu trữ | Không lưu (tải lại trang là mất) | Lưu trong Supabase; xem lại ở tab "Câu đã tạo" |
| Duyệt câu | Không có | Duyệt / Ngừng dùng |
| Mật khẩu | `APP_PASSWORD` (tùy chọn) | Không có |
| Dạng bài | 5 + RESP_SEL, SPEAK (preview) | 5 dạng; RESP_SEL, SPEAK bị khóa |
| Tạo lại từng ảnh/audio | Có | Chưa có |

---

## 9. Sửa đổi thường gặp

| Muốn | Sửa ở |
|---|---|
| Đổi chữ, nhãn tiếng Việt | `src/components/labels.ts`, `src/lib/mock.ts` (mô tả dạng bài, Bloom) |
| Đổi cách hiển thị một dạng bài | `src/components/results/QuestionPreview.tsx` |
| Đổi giới hạn số câu | `limits` trong `loadMeta()` (`src/lib/api-backend.ts`); backend cho tối đa 10 câu/job |
| Đổi số job chạy cùng lúc | `JOB_CONCURRENCY` trong `api-backend.ts` (không vượt `MAX_ACTIVE_JOBS` của backend) |
| Thêm bộ lọc cho tab "Câu đã tạo" | `src/components/HistoryView.tsx` (backend còn hỗ trợ lọc `grade`, `lo_id`, `job_id`) |
| Mở dạng bài mới | Backend hỗ trợ trước, sau đó thêm vào `SUPPORTED` và `convertQuestion()` |
