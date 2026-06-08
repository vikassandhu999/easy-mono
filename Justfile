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

# lint frontend
lint:
    cd frontend && pnpm lint

# build all frontend apps
build:
    cd frontend && pnpm build

# backend tests
test:
    cd backend && mix test

# deploy backend to fly (context rooted in backend/)
deploy:
    cd backend && fly deploy
