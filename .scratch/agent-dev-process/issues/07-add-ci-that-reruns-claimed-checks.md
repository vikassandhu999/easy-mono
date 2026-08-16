# Add CI that reruns claimed checks

Type: task
Status: wontfix
Blocked by: 04 — Glob-run frontend checks.
Parent: [Agent development process](../map.md)

## Question

What is the smallest GitHub Actions workflow that fails when an agent skips the checks this repo already treats as the finish gate?

## What to add

One workflow at `.github/workflows/ci.yml` (or `check.yml`) on pull request and push to `main`.

Jobs, all required:

* **Backend:** `mix deps.get`, `mix compile --warnings-as-errors`, `mix test`. Provide Postgres matching `backend/config/test.exs` (`username: admin`, password and db name from that file, `hostname` = the service host). Do not run `mix precommit` in CI (it formats and unlocks deps). Credo stays local until it is non-advisory.
* **Frontend:** from `frontend/`, `pnpm install`, `pnpm -C apps/coachapp-v2 typecheck`, `pnpm -C apps/coachapp-v2 check`, `pnpm -C apps/clientapp-v2 typecheck`, `pnpm -C apps/clientapp-v2 check`, `pnpm exec biome check .` (no `--write`).
* **Mechanical:** from repo root, `./scripts/check-rm.sh`, `./scripts/check-ui-contract.sh`, `./scripts/check-theme-selectors.sh`, `./scripts/check-color-utilities.sh` — the same set `just lint` already runs besides biome. If a script needs `frontend/` cwd, match `Justfile`.

Pin Node to `frontend/package.json`'s `packageManager` (pnpm 10.27.0) and Elixir/OTP to whatever `mix --version` reports on the machine that lands this ticket; record those versions in the workflow comments or a `.tool-versions` if you add one.

No Playwright, no AXI, no Fly deploy, no `pnpm build` of Vite (typecheck + check is the FE gate; full Vite build is slower and not what agents skip).

If `origin` is not GitHub, stop, write that in `## Answer`, and leave the workflow unmerged. Do not invent a second CI host.

## Edit surface

* `.github/workflows/ci.yml` (new)
* Optionally `.tool-versions` if that is the cleanest way to pin Elixir/OTP/Node
* Root `AGENTS.md` or `Justfile` — one line that CI exists and what it runs, only if it stays short

## Acceptance

- [ ] A workflow file exists and names backend test, both apps' typecheck+check, biome, and the `scripts/check-*.sh` set.
- [ ] Postgres is a service; `mix test` can connect with `backend/config/test.exs` credentials (override hostname via env if needed — do not commit a different password).
- [ ] Frontend `check` is the glob runner from ticket 04, not a restored AND-chain.
- [ ] No UI/browser job.

## Verification

Push the ticket branch (or open a draft PR) and wait for the workflow. Record the run URL in `## Answer`. If the first run fails on env (Elixir version, Postgres, pnpm store), fix the workflow in this ticket until it is green on a known-good SHA, or document the remaining blocker as Fog on the map — do not leave a red workflow as "done".

## Answer

Maintainer: do not add CI in this effort. Ticket is `wontfix`. Finish gates stay local (`mix precommit`, app `check` + typecheck, `just check-rm`).
