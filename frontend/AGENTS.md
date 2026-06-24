# Easy Apps Agent Instructions

This is the repository-level contract. Keep it broad. Subtree `AGENTS.md` files carry local rules and must be read before editing inside that subtree.

## Instruction Scope

- Root rules apply everywhere in this repository.
- A nearer `AGENTS.md` may add stricter rules for its subtree. Follow both.
- If a local rule conflicts with this file, prefer the local rule for local implementation details and keep this file's worktree and verification rules.
- Do not copy app-specific rules into this file. Put routing, forms, API, and UI contracts in the app that owns them.

## Repository Map

- Package manager: `pnpm@10.27.0`.
- Apps:
  - `apps/coachapp-v2`: primary coach app, React 19 + Vite, port 2021.
  - `apps/clientapp-v2`: client PWA and Capacitor shell, React 19 + Vite, port 1314.
  - `apps/website`: marketing site, Next.js 16, port 3000.
- Shared packages:
  - `packages/ui`, `packages/hooks`, `packages/utils`, `packages/chat`, `packages/websocket`.
  - `packages/error-parser`, `packages/typings`.

## Commands

- All apps dev: `pnpm dev`.
- App dev/build:
  - Coach: `pnpm dev:coachapp`, `pnpm build:coachapp`.
  - Client: `pnpm dev:clientapp-v2`, `pnpm build:clientapp-v2`.
  - Website: `pnpm dev:website`, `pnpm build:website`.
- Whole repo build: `pnpm build`.
- Whole repo lint/format: `pnpm lint`, `pnpm format`.
- Path-local commands are valid: `pnpm -C <path> <script>`.
- Prefer the narrowest command that proves the change. Use repo-wide commands for repo-wide changes.
- `lint` runs Biome with `--write`; review any files it changes.
- There is no general test suite configured. Use build, lint, and manual/browser checks appropriate to the touched surface.

## Worktree Discipline

- Read the owning files before changing behavior. Do not infer current contracts from old docs.
- Keep diffs small and local. Every edited line should support the request.
- Preserve existing dirty work. Do not revert, reformat, or "clean up" unrelated files.
- Delete code only when your change made it obsolete or the user asked for deletion.
- Prefer direct code over speculative abstraction. Add shared helpers only after real reuse appears.
- Match the local style before introducing a new pattern.
- Comments should explain non-obvious reasons, not restate code.

## Boundary Rules

- App code may depend on shared packages; shared packages must not depend on app internals.
- Shared package exports are public contracts. Treat package changes as higher risk than app-local changes.
- Do not add app-specific routing, copy, environment assumptions, or design-system details to shared packages.
- Reuse existing types and utilities instead of re-declaring shapes.
- Check package manifests before changing dependency or peer dependency assumptions.

## UI And Product Work

- Build the actual product surface, not a demo or marketing shell, unless the task explicitly asks for one.
- Follow the app's own component system, layout rules, and design tokens.
- Meaningful UI changes need browser verification at mobile and desktop widths.
- Accessibility is part of the feature: keyboard access, focus states, labels, and practical touch targets.

## Verification

- Docs-only changes: proofread the final Markdown and run a whitespace/diff check on touched docs.
- App code changes: run that app's build command.
- Shared package changes: run the package build and at least one relevant consuming app build.
- Repo-wide refactors: run `pnpm build`; run `pnpm lint` only when formatting/lint writes are intended.
- UI or routing changes: verify the touched flow in a browser after the build succeeds.
- Never claim a command passes unless it ran in this checkout and exited successfully.

## Final Response Checklist

- Name the files changed.
- State the verification run and its result.
- State any important verification not run.
- Mention unrelated dirty files only when they affect the handoff.
