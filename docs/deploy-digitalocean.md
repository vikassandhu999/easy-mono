# Fresh Deployment — DigitalOcean App Platform + Managed Postgres

Plan for a from-scratch production deployment including the two features merged this week: **business billing/seats (Razorpay)** and the **nutrition day-types + meal-options builder**. Written 2026-07-07 against main `2d603f48`.

## Topology

| Component | Source | DO resource |
|---|---|---|
| API (Phoenix release) | `backend/` (has `Dockerfile`, listens on **8080**, health check `GET /api/health`) | App Platform **service** (Dockerfile build) |
| Coach app | `frontend/apps/coachapp-v2` (Vite SPA) | App Platform **static site** |
| Client app | `frontend/apps/clientapp-v2` (Vite SPA/PWA) | App Platform **static site** |
| Marketing site | `frontend/apps/website` (Next.js 16) | App Platform **service** (Node) |
| Database | — | **Managed Postgres** cluster |

One App Platform app containing all four components keeps env wiring and deploys in one place. (Alternative: a single Droplet + docker compose is cheaper but you own patching, TLS, and restarts — not worth it at this stage.)

Suggested domains: `api.coacheasy.app`, `coach.coacheasy.app`, `app.coacheasy.app` (client), `coacheasy.app` (website). Adjust to taste; they appear in env vars below.

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
| `FRONTEND_URL` | `https://coach.coacheasy.app` |
| `CLIENT_FRONTEND_URL` | `https://app.coacheasy.app` |
| `CORS_ALLOWED_ORIGINS` | `https://coach.coacheasy.app,https://app.coacheasy.app,https://coacheasy.app` |
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

## 4. Frontends

Both SPAs read the API origin **at build time**:

- Coach app static site: source dir `frontend`, build `pnpm install --frozen-lockfile && pnpm -C apps/coachapp-v2 build`, output `frontend/apps/coachapp-v2/dist`, env `VITE_API_BASE_URL=https://api.coacheasy.app` (build-scope). **Catch-all routing**: error document → `index.html` (SPA deep links: `/settings/billing`, `/nutrition-plans/:id`).
- Client app static site: same shape for `apps/clientapp-v2`, output `…/clientapp-v2/dist`, same `VITE_API_BASE_URL`. Also SPA catch-all.
- Website: Node service, source `frontend`, build `pnpm install --frozen-lockfile && pnpm -C apps/website build`, run `pnpm -C apps/website start`. Set whatever `NEXT_PUBLIC_*`/port vars it needs (check `apps/website` before wiring; the landing-funnel pages call the public API — they need the API origin too).

Note: `frontend/packages/typings` currently fails `pnpm build` repo-wide (missing `src/coach/index.ts`, pre-existing debt) — that's why builds above are **per-app** (`pnpm -C apps/…`), which do not depend on it. Don't use `just build` in CI.

## 5. DNS + TLS

App Platform provisions Let's Encrypt automatically once you add each domain to its component and point CNAMEs at the app. Add all four domains before smoke-testing (CORS + Razorpay webhook depend on final hostnames).

## 6. Deploy order

1. Postgres cluster + db/user → note both connection strings.
2. Backend service + migrate pre-deploy job with full env (test-mode Razorpay values) → deploy → `GET /api/health` 200, logs clean.
3. Razorpay dashboard plan + webhook (step 3) → redeploy if you had placeholder secrets.
4. Static sites + website with `VITE_API_BASE_URL` → deploy.
5. DNS/domains, update `CORS_ALLOWED_ORIGINS`/`FRONTEND_URL`s if hostnames changed → final backend deploy.

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

- App Platform keeps prior deployments — rollback is one click per component; DB migrations are the constraint. The nutrition drop-schedule-entries migration (`20260706140000`) **raises on down** — on a fresh environment this never matters (no old code exists to roll back to), but never point a pre-nutrition build at this schema.
- Managed PG: enable daily backups (on by default) + PITR; set the maintenance window off-peak IST.
- Alerts: App Platform deploy-failure + CPU/mem alerts; PG connection/disk alerts.
- Logs: `doctl apps logs <app-id> --type run` while smoke-testing; watch for Razorpay `:razorpay_error` normalizations and CORS rejections.

## Open items before this plan runs

1. Razorpay **live** KYC/activation done? (Test mode works without it.)
2. Resend domain verification for `coacheasy.app`.
3. `apps/website` env audit (it wasn't part of the last two features; confirm its required vars before wiring the service).
4. Decide whether the old Fly.io deployment (`just deploy`) is being retired or kept as staging — if retired, remove the Fly webhook from Razorpay so events only hit one environment.
