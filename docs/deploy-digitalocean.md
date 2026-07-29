# Production on DigitalOcean — what runs where, why, and how it got there

As-built record of the first production deployment, executed 2026-07-29/30. This replaces the
2026-07-07 plan that used to live in this file; the main differences from that plan are called out
in "Decisions and why". Use this document to understand the production topology, to operate it,
and to redo any step from scratch.

## Topology

| Component | Where | Name / address |
|---|---|---|
| API (Phoenix release) | DO App Platform, region `blr` | app `lionfish-app`, `https://api.coacheasy.app` (ingress `lionfish-app-gz5ma.ondigitalocean.app`) |
| Database | DO Managed Postgres 18, `blr1` | cluster `db-pgsql-blr1-55598`, database `easy-backend-prod`, app user `easy-app-admin` |
| Private uploads | DO Spaces, `sgp1` | bucket `coacheasy-private` (presigned PUT/GET only) |
| Public library media | DO Spaces + CDN, `sgp1` | bucket `coacheasy-public`, served at `https://coacheasy-public.sgp1.cdn.digitaloceanspaces.com` |
| Coach app | Vercel | `https://admin.coacheasy.app` |
| Client app | Vercel | `https://client.coacheasy.app` |
| DNS | DO zone `coacheasy.app` | registrar (Namecheap) points nameservers at `ns1-3.digitalocean.com` |
| Email (login OTPs, invites) | Resend, domain `coacheasy.app` verified | DKIM/SPF/MX records in the DO zone |
| Billing | disabled | no Razorpay keys in prod; every business gets 10 free seats |

Monthly cost: roughly $32 (app $12, Postgres $15, Spaces $5). Vercel and DNS are free tiers.

## Decisions and why

* One provider for API + database + storage (DigitalOcean), chosen by the owner. The backend never
  cared: it speaks `DATABASE_URL` and the S3 API, so the move from the old Fly.io/Tigris setup was
  env vars plus two small code changes (ACL signing and DB TLS, below).
* Frontends stayed on Vercel. Push-to-main CI already existed there; duplicating the SPAs on App
  Platform added nothing. Two DO static-site apps were created during the day and deleted the same
  day when this became clear.
* Billing is off for the first cohort. Instead of configuring Razorpay (plan, webhook, KYC), prod
  runs without Razorpay keys: `Billing.checkout` returns `:billing_disabled` (a 422 with a clear
  message) and the `free_seats` default is 10. The first coaches get 10 client seats and cannot
  buy more. Re-enabling is a config change, not a rewrite; see "Re-enabling Razorpay".
* The coach app lives at `admin.coacheasy.app`, not `app.` — that is what the pre-existing Vercel
  domain setup used, so backend CORS, invite links, and email links follow it.
* Postgres 18 in prod vs 15 in local Docker: kept. Skew in this direction is safe (everything that
  works on 15 works on 18). Local can move to `postgres:18-alpine` whenever convenient.
* Spaces lives in `sgp1` because `blr1` has no Spaces region. Public media is CDN-cached, so the
  extra distance is invisible.

## Code changes that made prod possible

All on `main`, 2026-07-29:

* Secret scrub. A live Resend API key sat in `backend/config/dev.exs` and in a tracked
  `backend/.env` (tracked since before the ignore rule existed). GitHub push protection blocked the
  first push. Fix: `dev.exs` reads `RESEND_API_KEY` from the environment, `git filter-repo`
  rewrote the key out of the unpushed range, `backend/.env` is untracked, and the key itself was
  rotated in the Resend dashboard. Rule: a leaked credential gets rotated, not just deleted from
  the tip.
* Billing-disabled mode (`feat(billing): run without Razorpay`). Razorpay env vars are optional in
  prod; absence turns checkout off cleanly. `BusinessBilling.free_seats` default went 2 → 10 (drop
  it back when billing goes live). Seat-limit tests pin their own 2-seat billing rows so they do
  not depend on the global default.
* Public-bucket ACL signing (`feat(storage)`). Tigris made whole buckets public; Spaces keeps
  objects private unless each PUT carries `x-amz-acl=public-read`. `Easy.Storage` signs that param
  into presigned PUTs for the `:public` store. Without it, every library-media URL 403s.
* DB TLS (`feat(prod): DATABASE_SSL`). Managed Postgres requires TLS; `DATABASE_SSL=true` enables
  it with `verify: :verify_none` (encrypted hop, no peer verification — acceptable inside the
  provider network; switch to the DO CA cert if the DB ever sits outside it).

## The backend app

App Platform app `lionfish-app` (id `41f68af9-19c2-44bc-bc01-4fa8d4eaa1f5`), one service plus one
job, both built from `backend/Dockerfile` (context `backend/`), auto-deploy on push to `main`:

* Service `easy-mono-backend`: port 8080, `apps-s-1vcpu-1gb`, health check `GET /api/health`.
* Job `migrate`: `PRE_DEPLOY`, runs `/app/bin/migrate` with the same env, so migrations gate every
  deploy. It needs the full env set (the release loads all of `runtime.exs`, storage vars
  included), which is why env vars live at the app level, not per-component.

The full spec (with secret values) is applied with
`doctl apps update 41f68af9-... --spec <file>`; a sanitized copy of the env list:

| Var | Value |
|---|---|
| `DATABASE_URL` | `ecto://easy-app-admin:...@db-pgsql-blr1-55598-...:25060/easy-backend-prod` (secret) |
| `DATABASE_SSL` | `true` |
| `SECRET_KEY_BASE`, `JWT_SECRET` | generated with `mix phx.gen.secret` (secret; rotating `JWT_SECRET` logs everyone out) |
| `PHX_HOST` / `PORT` / `APP_URL` | `api.coacheasy.app` / `8080` / `https://api.coacheasy.app` |
| `FRONTEND_URL` | `https://admin.coacheasy.app` |
| `CLIENT_FRONTEND_URL` | `https://client.coacheasy.app` (invite links) |
| `CORS_ALLOWED_ORIGINS` | `https://admin.coacheasy.app,https://client.coacheasy.app` |
| `MAILER_ADAPTER` / `RESEND_API_KEY` | `resend` / rotated key (secret) |
| `EMAIL_FROM_NAME` / `EMAIL_FROM_ADDRESS` | `Coach Easy` / `noreply@coacheasy.app` |
| `AWS_ENDPOINT_URL_S3` / `AWS_REGION` | `https://sgp1.digitaloceanspaces.com` / `sgp1` |
| `BUCKET_NAME` / `PUBLIC_BUCKET_NAME` | `coacheasy-private` / `coacheasy-public` |
| `PUBLIC_STORAGE_URL` | `https://coacheasy-public.sgp1.cdn.digitaloceanspaces.com` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Spaces key `coacheasy-backend` (secret) |

No `RAZORPAY_*` vars — their absence is what disables billing.

## Database

Cluster `db-pgsql-blr1-55598` (PG 18, `blr1`, 1 GB). The app connects as `easy-app-admin` to
`easy-backend-prod`. Trusted sources: only the App Platform app.

Gotcha that broke the first deploy: on PG 15+ the `public` schema is writable only by the database
owner, and the database had been created by `doadmin`. Migrations failed with
`ERROR 42501 (insufficient_privilege) permission denied for schema public`. Fix (as `doadmin`):

```sql
ALTER DATABASE "easy-backend-prod" OWNER TO "easy-app-admin";
```

To run ad-hoc SQL from a laptop: temporarily add your IP to trusted sources
(`doctl databases firewalls append <cluster-id> --rule ip_addr:<ip>`), connect with `psql`,
then remove the rule. Do not leave personal IPs in the firewall.

Not used yet, deliberately: the PgBouncer connection pool. Pool size 5 direct connections is fine
at first-user scale; add the pool when connection counts say so.

## Storage

Two Spaces buckets in `sgp1`, created via the S3 API with the `coacheasy-backend` Spaces key
(`doctl spaces keys create` — note the key API only lists secrets at creation time). Both carry a
CORS policy allowing `GET`/`PUT`/`HEAD` from the two app origins (browser uploads go straight to
presigned URLs). The public bucket has a CDN endpoint enabled
(`doctl compute cdn create coacheasy-public.sgp1.digitaloceanspaces.com`).

## DNS and email

The zone for `coacheasy.app` lives in DO (`doctl compute domain ...`); Namecheap only holds the
registration and the nameserver delegation. Records:

| Type | Host | Value |
|---|---|---|
| CNAME | `api` | `lionfish-app-gz5ma.ondigitalocean.app.` |
| CNAME | `admin` | `7da8ea8e7b8b0e12.vercel-dns-017.com.` |
| CNAME | `client` | `e8fb5dec8e1c4b47.vercel-dns-017.com.` |
| TXT | `resend._domainkey` | DKIM public key |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| MX | `send` | `feedback-smtp.ap-northeast-1.amazonses.com` (priority 10) |
| TXT | `_dmarc` | `v=DMARC1; p=none;` |

The cutover copied every record out of Namecheap into the DO zone before switching nameservers, so
the Vercel apps and Resend verification never went dark. The old `api` A/AAAA records pointed at
the retired Fly.io deploy and were dropped, not copied.

Two App Platform domain gotchas:

* Do not set `zone:` on the app's domain spec when the DO zone already exists with records — the
  managed-zone step wedges on `DomainZoneInvalid`. A plain `PRIMARY` domain plus a manual CNAME
  works.
* After a nameserver switch, App Platform's `verify-cname` step can sit on a stale resolver cache
  and report `DomainCNAMEMismatch` even when every public resolver returns the right answer. It
  retries on its own; the fix is patience, not more DNS edits.

## Day-to-day deploys

Push to `main`. Vercel rebuilds the frontends; App Platform rebuilds the image, runs the migrate
job, then swaps the service. Vercel usually finishes first, so for API-contract changes the
frontends can briefly hit the older API. The delete-then-use convention keeps that window
harmless; for a destructive API change, push backend-first, wait for DO to go green, then push the
frontend change.

Vercel needs `VITE_API_BASE_URL=https://api.coacheasy.app` in both SPA projects (production env).
Vite bakes it at build time; changing it requires a redeploy.

## Ops runbook

* Logs: `doctl apps logs 41f68af9-... <component> --type run` (components: `easy-mono-backend`,
  `migrate`). Deployment forensics: `doctl apps list-deployments` + `doctl apps get-deployment`.
* Rollback: App Platform keeps prior deployments (one click). Migrations are the constraint — the
  drop-schedule-entries migration (`20260706140000`) raises on down; never point a pre-nutrition
  build at this schema.
* Grant more seats to a business: attach a console to the service
  (`doctl apps console 41f68af9-... easy-mono-backend`), then in IEx:
  `Easy.Billing.grant_free_seats(Easy.Ctx.new("<business-id>", "<owner-user-id>"), 20)`.
* Backups: managed PG daily backups are on by default; set the maintenance window off-peak IST.
* Alerts configured on the app: deployment failed, domain failed.

## Re-enabling Razorpay (when billing turns on)

1. Razorpay dashboard: create the monthly plan (amount must match `BILLING_SEAT_PRICE_INR`,
   default 499 → `49900` paise) and register the webhook at
   `https://api.coacheasy.app/v1/webhooks/razorpay` (events: `subscription.activated`, `.charged`,
   `.updated`, `.halted`, `.cancelled`, `payment.failed`) with a strong secret.
2. Set all four `RAZORPAY_*` vars (plus `BILLING_SEAT_PRICE_INR` if not 499) on the app and
   redeploy. Their presence re-enables checkout; nothing else changes.
3. Drop the `free_seats` default in `BusinessBilling` back from 10 to 2 (existing businesses keep
   whatever their row says; adjust per business with `grant_free_seats`).
4. Verify webhook hardening: bad-signature POST → 401, replayed event id → 200 no-op.
5. Run one test-mode purchase end-to-end before swapping to live keys — the checkout modal and
   cancel path were never exercised against live keys.

## Smoke checklist (run after any big change)

* Sign up a coach at `admin.coacheasy.app` → OTP email arrives (proves Resend + DNS), login works.
* Invite a client → invite email link points at `client.coacheasy.app`, accept works.
* Billing page shows 10 free seats; "add seats" fails with the "not available yet" message.
* Upload an exercise image (public media) → renders via the CDN URL. Upload a client photo
  (private) → renders via presigned GET.
* Client logs a workout and a meal; coach sees both.

## State as of 2026-07-30

* Deployed and healthy on the direct ingress URL; `api.coacheasy.app` TLS certificate was still
  issuing (the `verify-cname` stale-cache wait above).
* Full smoke checklist not yet run — it gates sending links to the first coaches.
* Old Fly.io deployment still up; retire it after cutover is proven (and remove its Razorpay
  webhook if one exists, so events only ever hit one environment).
* Local dev Postgres is 15; bump to 18 when convenient.
