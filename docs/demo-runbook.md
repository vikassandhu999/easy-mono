# Demo runbook — deploy, verify, record

How to get the app live, shareable, and recorded for a customer demo (Loom + a
"try it yourself" link). Code is green when `mix test` + the three `pnpm build`s pass.

Order matters: **Phase 1 first** — email is the gate and the Resend DNS is the long pole.

---

## Phase 1 — Backend live + email (the gate) 🔴

```bash
just deploy                      # from repo root; builds + runs release_command = bin/migrate
                                 # → migrations + priv/repo/seeds.exs (system library) run automatically
fly secrets list                 # confirm the required secrets below exist
curl -fsS https://easy-backend.fly.dev/api/health && echo OK
```

### Required Fly secrets

| Secret | Why | Missing → |
|---|---|---|
| `DATABASE_URL` | Postgres | **boot raises** (crash loop) |
| `SECRET_KEY_BASE` | cookie/signing | **boot raises** |
| `JWT_SECRET` | auth tokens | **boot raises** |
| `RESEND_API_KEY` | all auth/invite email | **boot raises** (unless `MAILER_ADAPTER=smtp`) |
| `EMAIL_FROM_ADDRESS` | sender on a **verified** domain | email silently rejected/spam |
| `CLIENT_FRONTEND_URL` | the client **invite-email link** (`/invite/:token`) | invite link points at `localhost:1314` → accept flow broken |

Already handled by `fly.toml` / Dockerfile (no action): `PHX_HOST`, `PORT`, `ECTO_IPV6`,
`PHX_SERVER`. Leave `CORS_ALLOWED_ORIGINS` **unset** → permissive fallback, so no frontend
is blocked.

### The real email test (make-or-break)
1. Verify the Resend **sending domain** (SPF/DKIM DNS records). DNS can take a while — start now.
   - **Fallback if it won't verify in time:** `fly secrets set MAILER_ADAPTER=smtp SMTP_RELAY=… SMTP_USERNAME=… SMTP_PASSWORD=…` (Gmail/transactional SMTP; supported in `runtime.exs`).
2. Open the deployed coachapp, sign up with a **real inbox you control**, and confirm the OTP
   lands within seconds. If it doesn't, fix here before doing anything else.

> Seeds run on **every** deploy (via `release_command`); `seeds.exs` is idempotent (system
> library is `business_id: nil`, shared). A fresh business has exercises/foods immediately.

---

## Phase 2 — Deploy frontends (env is the trap) 🟠

Vite inlines env at **build time** — set these in each Vercel project (Production), **then redeploy**.

| Vercel project | Env |
|---|---|
| **coachapp-v2** | `VITE_API_BASE_URL=https://easy-backend.fly.dev` · `VITE_PUBLIC_SITE_URL=<website URL>` |
| **clientapp-v2** | `VITE_API_BASE_URL=https://easy-backend.fly.dev` |
| **website** | `NEXT_PUBLIC_API_BASE_URL=https://easy-backend.fly.dev` · `NEXT_PUBLIC_COACHAPP_URL=<coachapp URL>` |

Also set `fly secrets set CLIENT_FRONTEND_URL=<clientapp URL>` (see Phase 1).

**Smoke each:** open the URL → DevTools console has **no** `[config] VITE_API_BASE_URL…` error
(the guard in `api/base.ts`), and network calls hit `easy-backend.fly.dev`, not localhost.

Then run the automated backend smoke:
```bash
BACKEND=https://easy-backend.fly.dev SLUG=<your-published-slug> ./scripts/demo-smoke.sh
```

---

## Phase 3 — Rehearse the exact path (this *is* the Loom script) 🟢

Click it end-to-end once before recording. The **link customers get = the coachapp signup URL**
(buyers are coaches); show the website landing funnel inside the video.

1. **Coach** → coachapp → Sign up (OTP) → register business → **dashboard**.
2. **Library** → create a training plan + a nutrition plan (seeded exercises/foods).
3. **Clients** → invite a client *with a second email you control* → invite email arrives.
4. **Settings → Landing page** → pick a template, add a program + fit points + proof points + headline → **Publish** → open the public URL.
5. **Public page** → Apply → success state (+ WhatsApp CTA if a business WhatsApp number is set).
6. **Prospects** → the applicant appears → **Enroll** → client invited.
7. **Client** → open invite link → accept → log in → open plan → **start workout** → log sets → **Finish wrap-up** (soreness + note) → log a meal → **Progress**.

### Spoken beats (copy-paste for the Loom)
- "This is CoachEasy — everything a fitness coach needs in one place. I'll sign up as a coach." *(signup → OTP → business)*
- "Here's my home — clients, prospects, and what needs my attention. Let me build a plan." *(training + nutrition plan from the library)*
- "I invite a client by email; they get a link to join." *(invite)*
- "Now the growth side — my public landing page. I pick a template, add my programs and proof, and publish." *(landing editor → publish → open public URL)*
- "A visitor applies here…" *(apply → success)* "…and lands in my Prospects inbox, where I enroll them as a client in one click." *(prospects → enroll)*
- "On the client's phone: they accept, see their plan, and log a workout — sets, then a quick soreness check-in for me." *(client accept → workout → finish wrap-up)*
- "They log meals and track progress. That's the full loop — acquire, coach, retain." *(nutrition + progress)*

---

## If time runs short — cut in this order
1. Skip the website/landing-funnel deploy; demo coachapp + clientapp only (funnel = "coming soon").
2. Skip the business WhatsApp number → success state just says "your coach will review."
3. Pre-create the demo coach account so the live recording doesn't hinge on an OTP arriving on camera.

---

## One-glance pre-flight
- [ ] `mix test` green · all three `pnpm build`s green
- [ ] Fly: the 6 required secrets set; Resend domain verified; test OTP received
- [ ] `CLIENT_FRONTEND_URL` = deployed clientapp URL (invite links)
- [ ] Vercel: API-base env set on all three apps; redeployed
- [ ] `./scripts/demo-smoke.sh` passes + the 3 manual gates checked
- [ ] Full happy path clicked through once before recording
