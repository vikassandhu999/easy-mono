# Reviews implementation plan

**Goal:** Complete the Review loop across Phoenix, the typed API, coachapp, and clientapp.

**Spec:** `.scratch/check-ins/spec.md`; exact delivery scope in `s4-check-ins.md`.

**Architecture:** A Review stores a coach decision and a snapshot watermark. `Repo.snapshot` reads the watermark and existing domain projections together. Record changes, due dates, and open requests are calculated from their existing facts. Replies remain chat messages, with one Review reference.

## Constraints

- Stay in this working tree on `codex/core-domains`. No commits or pushes.
- Preserve slices 1–3 and all prior edits. Do not change clientapp-v2.
- Prefix shell commands with `rtk`. Use Ctx-first context functions and typed routes.
- Reuse journal, history, summary, Tracker, chat, and term code.
- Counts and unknown values remain explicit. No scores or submitted state.

## Work

- [x] Backend and contract: add client/business settings, immutable Review facts, snapshot reads, grouped journal changes, due roster with server sort/filter/cursors, summary composition, history and replies. Add rule, access, HTTP, and separate-connection tests. Generate API types.
- [x] Coach app: extend the client roster and client workbench with Reviews, linked changes and summaries, save/edit, history, Focus/requests, and client/business settings. Keep list work on the server.
- [x] Client app: pin Focus on Today, add reply history from chat references, handle Review links and edited/deleted messages. Keep private Review data outside the client contract.
- [x] Integration: run precommit, API generation, both builds, lint, existing Training/Nutrition/Tracker browser flows, and the new Review browser flow at the required widths. Save screenshots and write s4-report.md.

## Review focus

- A journal write after the snapshot must appear on the next Review.
- A returning client's prior Review must not delay their first Review this term.
- Chat edits/deletes must update an already open client conversation.
- Corrections and tombstones must retain useful old/new values and source links.
- No client read, reply reference, or socket payload may expose assessment or private notes.

## Choices

The agreed spec and requested implementation authorize this plan. No new product decisions require a separate approval. API details and minor choices will be recorded in the final report.
