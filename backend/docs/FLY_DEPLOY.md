# Fly.io Production Deploy

## Prerequisites

- `flyctl` installed and authenticated
- production domain decided (or use `easy-backend.fly.dev`)
- mail provider credentials ready

## 1) Create Fly app and database

```bash
fly auth login
fly apps create easy-backend
fly postgres create --name easy-backend-db --region bom
fly postgres attach --app easy-backend easy-backend-db
```

`fly postgres attach` sets `DATABASE_URL` on the app.

## 2) Set required secrets

Generate secrets:

```bash
mix phx.gen.secret
mix phx.gen.secret
```

Set required runtime secrets:

```bash
fly secrets set \
  SECRET_KEY_BASE="<paste-secret-key-base>" \
  JWT_SECRET="<paste-jwt-secret>"
```

## 3) Set recommended app config secrets

```bash
fly secrets set \
  RESEND_API_KEY="<resend-api-key>" \
  EMAIL_FROM_NAME="Coach Easy" \
  EMAIL_FROM_ADDRESS="noreply@coacheasy.app" \
  CORS_ALLOWED_ORIGINS="https://app.coacheasy.app,https://client.coacheasy.app" \
  APP_URL="https://easy-backend.fly.dev" \
  FRONTEND_URL="https://app.coacheasy.app" \
  CLIENT_FRONTEND_URL="https://client.coacheasy.app" \
  POOL_SIZE="10"
```

Optional:

```bash
fly secrets set MAILER_ADAPTER="smtp"
fly secrets set DNS_CLUSTER_QUERY="easy-backend.internal"
```

## 4) Deploy

```bash
fly deploy
```

Deploy runs release migrations through `release_command = '/app/bin/migrate'` from `fly.toml`.

## 5) Verify

```bash
fly status
fly checks list -a easy-backend
fly logs -a easy-backend
curl https://easy-backend.fly.dev/api/health
```

## 6) Optional custom domain

```bash
fly certs add api.coacheasy.app
fly certs show api.coacheasy.app
```

Point DNS to Fly, then set `PHX_HOST`:

```bash
fly secrets set PHX_HOST="api.coacheasy.app"
fly deploy
```

## Monorepo note (post-merge)

The backend now lives under `backend/` in `easy-mono`. Always deploy from
inside that directory so the Docker build context is rooted correctly:

```bash
cd backend && fly deploy
# or from repo root:
just deploy
```

No Dockerfile or fly.toml changes are required — `app = 'easy-backend'` is unchanged.

> Note: before the first real deploy from the monorepo, validate the build once with
> `cd backend && fly deploy --build-only --remote-only`.
