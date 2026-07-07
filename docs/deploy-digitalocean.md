# Backend Deployment — DigitalOcean App Platform + Managed Postgres

Plan for a fresh **backend-only** production deployment including the two features merged this week: **business billing/seats (Razorpay)** and the **nutrition day-types + meal-options builder**. Frontends (coachapp, clientapp, website) stay on **Vercel** with their existing push-to-main CI — they only need env/CORS alignment (section 5). Written 2026-07-07 against main `2d603f48`.

## Topology

| Component | Source | Where |
|---|---|---|
| API (Phoenix release) | `backend/` (has `Dockerfile`, listens on **8080**, health check `GET /api/health`) | DO App Platform **service** (Dockerfile build) |
| Database | — | DO **Managed Postgres** cluster |
| Coach app / client app / website | `frontend/apps/*` | Vercel (already wired, out of scope here) |

Suggested API domain: `api.coacheasy.app`. The Vercel production domains appear in the backend env below — fill in the real ones.

## 1. Managed Postgres

1. Create a PG **16** cluster (basic, 1 node is fine to start), same region as the app (e.g. `blr1`).
2. Create database `easy_prod` and a dedicated user; **do not** use `doadmin`.
3. Use the **connection pool** (PgBouncer, *transaction* mode, size ~10) connection string for the app; keep the direct string for migrations/console.
4. Managed PG requires TLS. The release already reads `DATABASE_URL`; add `ssl=true`:
   - `DATABASE_URL=ecto://USER:PASS@POOL_HOST:25061/easy_prod?ssl=true`
   - If connects fail with cert errors, verify `config/runtime.exs` repo `ssl:` options accept DO's CA (set `ssl: [verify: :verify_none]` fallback or ship DO's CA cert — check on first boot, don't guess).
5. Restrict the cluster's **trusted sources** to the App Platform app once attached.

Fresh DB = all migrations run from zero. The nutrition backfill migration (`20260706120000`) is a no-op on an empty DB; billing tables (`20260706000100`) and nutrition day tables + indexes (`202607061…`, `20260707100000`) just create.

## 2. Backend service (API)

- Build: Dockerfile at `backend/Dockerfile` (monorepo: set source dir `backend`). HTTP port **8080**. Health check path `/api/health`.
- **Pre-deploy job**: run `bin/migrate` (the release overlay in `backend/rel/overlays/bin/migrate`) with the same env, using the **direct** (non-pooled) `DATABASE_URL`. App Platform supports a `PRE_DEPLOY` job component — use it so migrations gate each deploy.
- Auto-deploy on push to `main` (App Platform GitHub integration, watch path `backend/`), matching the frontend's push-to-main flow. Note the ordering caveat in section 6.
- Instance: 1× basic (512MB–1GB) to start; scale later.

### Required env vars (boot **raises** if missing)

| Var | Notes |
|---|---|
| `DATABASE_URL` | pooled string for the service; direct string for the migrate job |
| `SECRET_KEY_BASE` | `mix phx.gen.secret` |
| `JWT_SECRET` | ≥32 chars; **losing/rotating it invalidates all sessions** |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | from Razorpay dashboard (start with test keys, swap to live) |
| `RAZORPAY_WEBHOOK_SECRET` | the secret you set when registering the webhook (step 3) |
| `RAZORPAY_PLAN_ID` | created manually in the Razorpay dashboard (step 3) |
| `RESEND_API_KEY` | login is email-OTP — no key, no logins. Verify the sender domain in Resend. (Or `MAILER_ADAPTER=smtp` + `SMTP_*`.) |

### Other env vars

| Var | Value |
|---|---|
| `PHX_HOST` | `api.coacheasy.app` |
| `PORT` | `8080` |
| `APP_URL` | `https://api.coacheasy.app` |
| `FRONTEND_URL` | Vercel coach-app production URL |
| `CLIENT_FRONTEND_URL` | Vercel client-app production URL |
| `CORS_ALLOWED_ORIGINS` | comma-separated Vercel production domains (coach, client, website). Add Vercel preview domains only if you want previews hitting prod API — better: leave them out. |
| `BILLING_SEAT_PRICE_INR` | optional, defaults `499` — **must match the Razorpay plan amount** |
| `EMAIL_FROM_NAME` / `EMAIL_FROM_ADDRESS` | `Coach Easy` / `noreply@coacheasy.app` |
| `POOL_SIZE` | ≤ PgBouncer pool size (e.g. `10`) |

(`PHX_SERVER` is set by the release's `bin/server`; don't set it on the migrate job.)

## 3. Razorpay setup (billing feature)

Do this once per environment (test mode first, then live):

1. **Create the subscription plan** in the Razorpay dashboard: period *monthly*, amount = seat price (₹499 → `49900` paise), currency INR. Put its id in `RAZORPAY_PLAN_ID`.
2. **Register the webhook**: URL `https://api.coacheasy.app/v1/webhooks/razorpay`, events: `subscription.activated`, `subscription.charged`, `subscription.updated`, `subscription.halted`, `subscription.cancelled`, `payment.failed`. Set a strong secret and mirror it in `RAZORPAY_WEBHOOK_SECRET`.
3. After first deploy, verify signature handling: a test webhook with a bad signature must return **401**; a valid duplicate event must 200 as a no-op (dedupe on event id).
4. Reminder from the feature's ship notes: the real checkout modal and the cancel happy path were never exercised against live keys — run one **manual test-mode purchase** end-to-end (buy 2 seats, watch `subscription.charged` land, seat limit rise, awaiting client auto-activate) before going live.

## 4. DNS + TLS

Add `api.coacheasy.app` to the App Platform app and point a CNAME at it; Let's Encrypt is automatic. Do this before the Razorpay webhook registration and the Vercel env update (both depend on the final hostname).

## 5. Vercel side (config only, no redeploy pipeline changes)

- Set `VITE_API_BASE_URL=https://api.coacheasy.app` on **both** SPA projects (production env). The apps hard-warn and fail silently to localhost without it (`src/api/base.ts` guard).
- Website: point whatever API-origin env it uses (landing-funnel pages call the public `/v1/public` API) at the same host — audit `apps/website` env before cutover.
- Trigger one redeploy of each project after setting envs (Vite bakes them at build time).
- Give the backend's `CORS_ALLOWED_ORIGINS` exactly these production domains.

## 6. Deploy order

1. Postgres cluster + db/user → note both connection strings.
2. Backend service + migrate pre-deploy job with full env (test-mode Razorpay values) → deploy → `GET /api/health` 200, logs clean.
3. API domain + DNS.
4. Razorpay dashboard plan + webhook (step 3) → update secrets → redeploy.
5. Vercel env vars (step 5) → redeploy frontends.
6. Smoke (section 7), then swap Razorpay test → live keys.

**Ongoing ordering caveat**: both sides auto-deploy on push to main, but Vercel builds usually finish before an App Platform image build + migrate job. For API-contract changes (new endpoints/fields), the frontends may briefly hit an older API. Our convention (delete-then-use, both sides in one push) makes this a short window, not a correctness bug — but for destructive API changes, push backend-first, wait for DO to go green, then push the frontend change.

## 7. Post-deploy smoke checklist

Auth/base: sign up a coach (OTP email arrives — proves Resend), log in on both apps.

**Billing/seats** (test keys):
- Settings → Billing shows the free state (2 seats).
- Invite 2 clients, then a 3rd → blocked-invite panel with seat summary (409 path).
- Buy seats via checkout modal (test card) → webhook lands, plan shows paid seats, awaiting client auto-activates oldest-first.
- Cancel → status `cancel_at_period_end`, period end shown.

**Nutrition builder**:
- New plan → single-day builder (six slots, no tabs), add 2 meals, add both as breakfast options → "Default" tag + "Totals use default options." caption.
- "Add day" → tabs + weekday chips; assign Sat/Sun; delete day → confirm shows reassignment.
- Assign to a client; client app Today: option switcher, switch-before-log instant, switch-after-log shows "Switching clears what you've logged for this meal", off-plan extra survives a switch.

**Webhook hardening**: bad-signature POST → 401; replayed event → 200 no-op.

## 8. Rollback / ops notes

- App Platform keeps prior deployments — rollback is one click; DB migrations are the constraint. The nutrition drop-schedule-entries migration (`20260706140000`) **raises on down** — on a fresh environment this never matters (no old code exists to roll back to), but never point a pre-nutrition build at this schema.
- Managed PG: enable daily backups (on by default) + PITR; set the maintenance window off-peak IST.
- Alerts: App Platform deploy-failure + CPU/mem alerts; PG connection/disk alerts.
- Logs: `doctl apps logs <app-id> --type run` while smoke-testing; watch for Razorpay `:razorpay_error` normalizations and CORS rejections.

## Open items before this plan runs

1. Razorpay **live** KYC/activation done? (Test mode works without it.)
2. Resend domain verification for `coacheasy.app`.
3. `apps/website` env audit on Vercel (which var carries the API origin for the public landing-funnel calls).
4. The old Fly.io deployment (`just deploy`): retire or keep as staging? If retired, remove its Razorpay webhook so events only hit one environment.
5. Confirm the actual Vercel production domains to fill into `FRONTEND_URL` / `CLIENT_FRONTEND_URL` / `CORS_ALLOWED_ORIGINS`.
