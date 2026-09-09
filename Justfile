# easy-mono task runner

# list recipes
default:
    @just --list

# frontend: live coach app (v2) dev server
web:
    cd frontend && pnpm dev:coachapp

# frontend: new coach app dev server
coach:
    cd frontend && pnpm dev:coachapp-next

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
    ./scripts/check-ui-contract.sh
    ./scripts/check-theme-selectors.sh
    ./scripts/check-color-utilities.sh

# mechanical checks from docs/agents/recurring-mistakes.md
check-rm:
    ./scripts/check-rm.sh

# build all frontend apps
build:
    cd frontend && pnpm build

# backend tests
test:
    cd backend && mix test

# Real nutrition journeys: isolated Phoenix database + both production app builds
test-e2e *args:
    rtk proxy pnpm -C frontend test:e2e {{args}}

# deploy backend to fly (context rooted in backend/)
deploy:
    cd backend && fly deploy

# regenerate the OpenAPI spec from the backend and split it per app
openapi:
    cd backend && mix openapi.spec.json --start-app=false --spec EasyWeb.ApiSpec --pretty=true ../frontend/openapi/easy-openapi.json
    node frontend/scripts/split-openapi.mjs

# browse the coach API in Scalar (http://localhost:4444) — edit index.html's data-url for client.openapi.json
api-docs: openapi
    cd frontend/openapi && python3 -m http.server 4444

# regenerate the OpenAPI spec + both app clients end-to-end
# Both apps: openapi-typescript type schema (React Query hooks are hand-written).
gen-api: openapi
    cd frontend && pnpm --filter @easy/coachapp gen:api && pnpm --filter coachapp-v2 gen:api && pnpm --filter clientapp-v2 gen:api
    cd backend && mix typed_routes.gen
    cd frontend && pnpm exec biome check --write apps/coachapp/src/api/schema.ts apps/coachapp-v2/src/api/schema.ts apps/clientapp-v2/src/api/schema.ts
