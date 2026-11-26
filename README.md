# QuestionBank Studio (internal POC)

Independent Next.js + TypeScript frontend. Can be moved to its own repository and deployed on Vercel. No Python or imports from `ai-core`.

## Local setup

```bash
npm ci
# Copy .env.example to .env.local and fill the three PUBLIC configuration values.
npm run dev
```

- `NEXT_PUBLIC_SUPABASE_URL`: project API URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key (legacy anon also works). NEVER service_role / sb_secret_ / OpenRouter or image-provider keys.
- `NEXT_PUBLIC_AI_CORE_URL`: backend base URL, e.g. `http://localhost:8000`.

Supabase Dashboard → Authentication → Users: create internal users and confirm their emails. Disable public sign-ups. Add their emails to backend `ADMIN_EMAILS`. No public signup screen is implemented. Supabase session refresh is managed by the browser SDK; backend independently verifies each token and checks the allowlist.

## Vercel

Import this folder as a repository (or set Root Directory to `front-end` while testing the parent workspace). Select Next.js. Set the three environment variables before building and redeploy after changing them. Set `NEXT_PUBLIC_AI_CORE_URL` to the backend HTTPS URL. Add your exact Vercel/custom-domain origin to backend `CORS_ORIGINS`. Do not permit every Vercel preview origin indiscriminately.

Frontend sends a short authenticated request to create a job, then polls the independent backend every five seconds. Generation does NOT run in a Vercel route handler. Preview includes correct answers and separate image/audio players; it is for internal authors, not learners. Signed asset URLs expire after ten minutes; reopen a question to refresh.

## Included

- Email/password login, logout; allowlist enforcement on backend.
- Grade/LO selector, five question types, Bloom 1–4, 1–10 questions per job.
- Optional images and per-answer/item audio; LISTEN requires both, ORDER is text/audio only.
- Job progress/failure display, draft detail and media preview, human approval/retirement.
- Safe missing-configuration state; no secret keys exposed.

`npm run build` and `npm run typecheck` validate production build and TypeScript. There is no live provider E2E test yet. Draft preview currently shows structured data instead of the final student game UI. Generation can incur provider costs; start with one question after explicitly configuring models.
