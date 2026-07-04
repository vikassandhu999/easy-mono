# easy-mono task runner

# list recipes
default:
    @just --list

# frontend: coach app dev server
web:
    cd frontend && pnpm dev:coachapp

# frontend: client app dev server
client:
    cd frontend && pnpm dev:clientapp-v2

# frontend: website dev server
site:
    cd frontend && pnpm dev:website

# backend: phoenix server
backend:
    cd backend && mix phx.server

# run coach app + backend together
dev:
    just backend & just web

# install all deps (both stacks)
setup:
    cd frontend && pnpm install
    cd backend && mix deps.get

# lint frontend + recurring-mistakes greps
lint:
    cd frontend && pnpm lint
    ./scripts/check-rm.sh

# mechanical checks from docs/agents/recurring-mistakes.md
check-rm:
    ./scripts/check-rm.sh

# build all frontend apps
build:
    cd frontend && pnpm build

# backend tests
test:
    cd backend && mix test

# deploy backend to fly (context rooted in backend/)
deploy:
    cd backend && fly deploy

# regenerate the OpenAPI spec from the backend and split it per app
openapi:
    cd backend && mix openapi.spec.json --spec EasyWeb.ApiSpec --pretty=true ../frontend/openapi/easy-openapi.json
    node frontend/scripts/split-openapi.mjs

# regenerate the OpenAPI spec + both app clients end-to-end
gen-api: openapi
    cd frontend && pnpm --filter coachapp-v2 gen:api && pnpm --filter clientapp-v2 gen:api
    cd frontend && pnpm exec biome check --write apps/coachapp-v2/src/api/generated.ts apps/clientapp-v2/src/api/generated.ts
