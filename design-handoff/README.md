# CoachEasy redesign — port handoff

Drop this folder into the repo root as `design-handoff/` (or similar). Then two one-line chores:

1. **Link it from `AGENTS.md`**: add "UI ports follow `design-handoff/UI-CONTRACT.md`." — agents won't read what isn't referenced.
2. **Commit the §5 grep gate** (`scripts/check-ui-contract.sh` from UI-CONTRACT §5) and wire it into CI / `just check-rm` now, not before the first PR.

## Contents
- `UI-CONTRACT.md` — the rules: component fence, prototype→HeroUI mapping, DoD, screen index (§8).
- `design/Dashboard Redesign.dc.html` — the spec itself. **Never read it whole**: grep `data-screen-label="XX"` or the `'============'` markers and read that slice. It is inline-styled on purpose; never copy its markup or styles.
- `screens/XX.png` — one reference image per screen (desktop + mobile frames). Eyeball-diff your result against these.
- `COPY.md` — exact strings per screen. Verbatim; sample data excluded.
- `INTERACTIONS.md` — per-screen behavior the markup can't show.
- `GAPS.md` — pre-answered "no §2 mapping" cases + the still-open ones.
- `PORT-TICKET.md` — per-screen ticket template + suggested order.

## Agent workflow per screen
1. Read UI-CONTRACT.md (once per session) + the §8 row for your badge.
2. Look at `screens/XX.png`; read COPY.md § XX and INTERACTIONS.md § XX.
3. Grep the spec for `data-screen-label="XX"` only if the image + docs leave a layout question.
4. Build against the existing module named in §8, using §2 components only.
5. Check GAPS.md before improvising anything; unresolved → stop and ask.
6. Fill the PORT-TICKET checklist in the PR.

Note: `design/support.js` is the prototype's runtime — needed only to open the .dc.html in a browser; irrelevant to the port.
