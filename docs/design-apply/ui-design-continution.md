# Handoff: UI design application — continuation

**Written:** 2026-07-10 · **Branch:** `main` @ `c7d43b01` (clean tree) · **Previous session:** shipped the client-lifecycle feature to main, then established the mockup-first UI workflow and applied it end-to-end to the clients list.

## Mission for the next session

Apply the design mockups to the remaining coachapp surfaces, using the workflow that finally worked for the clients list (below). Candidate next surfaces, in the design project: prospects (`Coachez-Prospects.dc.html`), nutrition builder (`Nutrition Builder.dc.html`), and whatever the user points at. The sidebar/app-shell also diverges from the mock (nav count badges, Analytics & Reports, Payments & Revenue entries, ⌘K search) — do NOT build those without asking; some imply whole features.

## The workflow (this is the load-bearing knowledge)

1. **Mockups are the design authority — never infer design from existing app code.** A whole day was lost inferring "the design" from dashboard code before learning real mockups existed.
2. Mockups live in the user's Claude Design project `90aaee19-0381-486d-a0d3-b6cf07965fdc`, fetched with the **DesignSync tool (main conversation ONLY** — subagents/codex cannot call it). Large files arrive as persisted-output → extract with `jq -r '.content' <tool-result-file> > docs/design/mockups/<name>.html` so content never re-enters context. Synced copies live in `docs/design/mockups/` (currently: `coachez-dashboard-and-client.dc.html` — contains dashboard + clients + prospects sections; note `CoachEZ Dashboard.html` in the project is a useless JS bundle).
3. **Codex (gpt-5.6-sol) does the implementation** per repo CLAUDE.md; give it: the local mockup path, the exact section line-range/search anchor, the frozen constraints, and the insider workflow. Command shape + rules: `.claude/skills/codex-implementation/SKILL.md` (read its "UI and Style Work" section — insider not screenshots, `-c sandbox_workspace_write.network_access=true`, `-o` must point at a separate final-message file or codex clobbers its own report, run with `- < prompt.md` stdin and `</dev/null` never applies to that form).
4. **insider is the verification instrument** (skill: `.claude/skills/insider/SKILL.md`): every style change = read rendered value → edit → re-read after HMR → record before/after vs the mock's numbers. Gotchas: only the foreground tab answers reliably; snapshots cap at 20 (rm old ones); viewport is fixed at page load; the user's default browser is **Brave** (not Chrome — AppleScript the right app). For mobile: open a dedicated 390px Brave window (`osascript` make new window, bounds `{40,40,430,884}`, set URL) — codex then picks the page with `viewport.w < 500`.
5. **Token mapping rule:** mock hex → closest semantic token from `frontend/apps/coachapp-v2/src/index.css` (`--radius` is a UNIT: 2xl=12px, 3xl≈18px). Never hardcode hex. Known gap: mock `#52525B` subdued text has no close token (nearest `muted` ≈ `#727272`) — adding `foreground-secondary` to the theme is an approved-in-principle follow-up.
6. Verify both breakpoints + desktop regression check, then `pnpm -C apps/coachapp-v2 build` + targeted biome.

## Frozen constraints (apply to every surface)

- Lifecycle vocabulary and logic are FROZEN (shipped feature): statuses pending|active|inactive, "Invited" label, stage chips via `stageChip()`/`INACTIVE_REASON_LABEL`/`STATUS_DISPLAY` in `src/clients/lib/client.ts`; `RowChips` export contract (client-detail imports it).
- Don't invent UI for features that don't exist (mock shows favorites/pin, check-in "Reviewed" chips, Archived tab, missed-check-ins metric — all skipped deliberately; ask the user before building them as features).
- 44px touch targets beat the mock's smaller hit boxes (visual size may match mock).
- HeroUI gotchas: `.list-box` 4px padding / `.list-box-item` 4px margin-top need `p-0`/`mt-0`; RM-126 (setError + native validation deadlock → `validationBehavior="aria"` + clearErrors); coachapp rules in `frontend/apps/coachapp-v2/AGENTS.md`; ledger in `docs/agents/recurring-mistakes.md`.

## Reference artifacts (don't re-derive)

- Evidence tables from the clients-list work: `.superpowers/clients-list-calibration-report.md` (desktop, mock value→token→before/after) and `.superpowers/clients-list-mobile-report.md` (390px + desktop regression).
- Commits: `5c040a92` (clients list), `c7d43b01` (mockups + skill), `156b351e` (dashboard setup cell), `5912f692` (dashboard bento/client-detail redesign), `be487ac2`.. (client-lifecycle feature, see `.superpowers/sdd/progress.md` ledger).
- Memories already capture the durable rules: `design-mockups-claude-design`, `codex-ui-verification-via-insider`.
- Getting-started/setup-cell design rationale: `.superpowers/getting-started-recommendation.md`.

## Environment state

- Dev servers likely running: backend :4000, coachapp :2021, clientapp :1314 (restart backend after OpenAPI changes — dev spec caches). A 390px Brave window may still be open.
- Dev-DB smoke residue: "Lifecycle Smoke" client (active/coaching), qatest business at 4/4 seats (blocks invite testing — free a seat first).
- User WIP is always possible in the tree — commit ONLY explicit pathspecs (`git commit -- <paths>`), never bare `git commit` after `git add` (an index sweep mislabeled 59 files once; recovered via soft reset).

## Suggested skills

- `codex-implementation` — every substantive UI change (gpt-5.6-sol; read its UI section first).
- `insider` — rendered-truth verification; also for your own quick diagnostics.
- `codex-review` — independent gpt-5.6-sol review before committing bigger arcs.
- `superpowers:verification-before-completion` — evidence before claiming done.
- `elixir-conventions` — only if a surface needs backend/OpenAPI changes (then `just gen-api` + backend restart).
