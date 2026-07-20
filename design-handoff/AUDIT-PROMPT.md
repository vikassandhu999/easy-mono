# Design audit prompt

Written for Codex (shell + browser tools). Paste everything below the line.

**Before you start it:** the dev server must be reachable at `http://localhost:2021`
and dependencies must already be installed. Start `just web` yourself, or run Codex
with network access — it should not be installing packages mid-audit. It needs
write access to the repo to land fixes and the report.

The prompt assumes Codex's own browser tools for navigation, screenshots, and
in-page JS. This repo also has `chrome-devtools-axi` on PATH if the shell route
is easier: `chrome-devtools-axi open <url>`,
`chrome-devtools-axi emulate --viewport "1240x900x2"`,
`chrome-devtools-axi screenshot <path>`, `chrome-devtools-axi eval "<js>"`.
Either is fine; don't mix them in one run.

---

# Task: audit the CoachEasy coach app against its design references, report, then fix

You are auditing an app that has **already been built**. You are not porting or
implementing screens. You are finding where the shipped UI has drifted from its
reference images or from itself, writing that up, and fixing it.

## Setup

- Repo root: this working directory. App: `frontend/apps/coachapp-v2`.
- The dev server should already be running at `http://localhost:2021`. If it
  isn't, start it with `just web` and wait for it — do not install dependencies,
  and do not audit against a production build. Dev OTP for any login is `123456`.
- Reuse the existing signed-in browser session and its open tabs. Do not clear
  cookies, storage, or browser profile data; do not log in if a session exists.
- This is a large audit. Do it module by module (all of foods, then all of
  recipes, and so on) rather than sampling a few screens and generalising. If you
  run short on budget, cover fewer modules completely and say which ones you
  skipped — never report partial coverage as if it were full.
- Reference images: `design-handoff/refs/{badge}-desktop.png` and
  `{badge}-mobile.png`, one pair per screen badge.
- Work on a branch off the current tip. Check `git status` first and note any
  pre-existing dirty files — you must not commit them.

## Read these first

1. `design-handoff/UI-CONTRACT.md`, sections 1 through 6 — the component fence,
   token map, and definition of done.
2. `frontend/apps/coachapp-v2/AGENTS.md` — Canonical Components, Page Anatomy,
   UI Rules. **Where this and the contract disagree, AGENTS.md wins.**
3. `design-handoff/RECIPES.md` — the golden snippets for rows, chips, pills.
4. `design-handoff/GAPS.md` — pre-resolved decisions. A screen that deviates
   from its ref *because GAPS resolved it that way* is correct, not a finding.

Do **not** read `design-handoff/design/Dashboard Redesign.dc.html` in full — it
is huge. If you need to know what the design intended for one screen, grep for
`data-screen-label="{badge}"` and read only that slice. It is a spec, not source:
never copy its markup, classes, or CSS variables.

## Scope

Screen badges, with routes:

```
DB /dashboard            CL /clients               IN /clients/invite
EX /library/exercises    EP /library/exercises/:id  ED /library/exercises/:id/edit
FO /library/foods        FD /library/foods/:id      FE /library/foods/:id/edit
RC /library/recipes      RD /library/recipes/:id    RE /library/recipes/:id/edit
NP /library/nutrition-plans   NE /library/nutrition-plans/:id/edit   NB /library/nutrition-plans/:id
TR /library/training-plans    TE /library/training-plans/:id/edit    TB /library/training-plans/:id
FM /library/check-ins    FB /library/check-ins/:id/edit   ST /settings
```

For `:id` routes, take a real id from that module's list screen.
`frontend/apps/coachapp-v2/src/@config/routes.ts` is the authority if a route 404s.

This is a **presentation-only** audit. Never change routing, `src/api/*`, or data
hooks. Never re-architect a screen.

## The compare criteria

Run both passes. They catch different things.

### Pass A — per-screen fidelity (screenshot vs reference)

For each badge, capture both widths and compare each against its reference image:

- Desktop: viewport `1240x900`, device scale 2
- Mobile: viewport `390x844`, mobile + touch emulation

Chrome windows can't physically resize below ~500px, so use **viewport
emulation** for mobile, not window resizing. Reset the viewport when done.

Open your screenshot and the reference image **in the same step** and compare
them directly. Do not describe a screenshot from memory or infer what a screen
looks like from its source code — read both images. Name every concrete
mismatch: layout structure, spacing rhythm, alignment, visual hierarchy,
surface/background layering, chip and pill treatment, typography (face, weight,
size), iconography, and which states are shown.

**These are NOT mismatches. Do not report them:**

- Sample data differing from the prototype's rows — names, numbers, counts. The
  layout around the data must hold; the data itself is irrelevant.
- Font antialiasing and subpixel rendering.
- Scrollbar presence.
- A real empty state where the reference showed populated rows.

### Pass B — cross-screen consistency (app vs itself)

References are per-screen, so they cannot reveal drift *between* screens. This
pass is measurement, not judgment. For each family below, measure the same
property on every member and report any value that is not unanimous.

**Content width and left edge.** Walk list → detail → edit for every module
(foods, recipes, exercises, nutrition plans, training plans, check-ins, clients,
prospects). All must report the same left offset and width. Run this in the page
and record the result per route:

```js
JSON.stringify([...document.querySelectorAll('.easy_page div,.easy_page form')]
  .filter(e => e.offsetWidth > 400 && getComputedStyle(e).maxWidth !== 'none')
  .slice(0, 2)
  .map(e => { const r = e.getBoundingClientRect();
    return 'L' + Math.round(r.left) + ' W' + Math.round(r.width) + ' R' + Math.round(innerWidth - r.right); }))
```

There is exactly one content width — `size="content"` on `Page.Header` /
`Page.Toolbar` / `Page.Frame` — plus `size="wide"` for the two plan builders and
the dashboard. A third distinct value is a bug.

**Header anatomy.** Back arrow, title, and actions in the same order and spacing
on every detail and edit screen, and sharing the same column as the body beneath
them.

**Row, chip, and pill treatment.** Every browse list uses `BrowseRow`; every
filter pill uses `FILTER_PILL_CLASS`; every outline chip uses
`OUTLINE_CHIP_CLASS` (all in `src/@components/browse-list-box.tsx`). A screen
that hand-rolls a lookalike is a finding **even if it renders identically today**
— it will drift the moment the shared one changes.

**Section headings.** Two registers exist on purpose: a small muted uppercase
eyebrow (`SectionHeading`) for builder and summary chrome, and a dark `h6`
(`DetailSectionHeading`) for read surfaces. Each should be used consistently for
its job and not mixed within one screen.

**The three states.** Every screen: loading is a layout-approximating skeleton
(`ListSkeleton` or `PageSkeleton`) and never a centered spinner; error copy reads
"Couldn't load X" and never "Failed to load X"; empty is a designed state. Check
all three — point at a bad id to force the error state.

**Mobile overflow.** At 390px, `document.documentElement.scrollWidth` must equal
390 on every screen. Any horizontal overflow is a finding.

**Tap targets.** Interactive elements at least 44px tall on mobile.

## Step 1 — write the report before you write any code

This is a checkpoint inside the run, not the end of it. Finish the report, then
continue to Step 2 in the same session without waiting for approval. The point is
that the findings are written down before any fix is attempted, so you can see
which ones share a cause.

Write `docs/design-audit-<today's date>.md`. One row per finding:

| badge | width | what's wrong | pass (A-fidelity / B-consistency) | severity | proposed fix |

Severity: **high** = wrong at first glance, or broken at one width. **medium** =
visible side by side with the reference. **low** = only visible when measured.

Sort by severity. Then, **before writing any code**, add a section called
**Systemic** listing any finding that appears on three or more screens. Those are
one shared-component fix, not N screen fixes, and that distinction determines how
you fix them. Getting this wrong is the single most common failure on this
codebase — eight separate agents each patched their own call site instead of the
component they all shared, and the result was ~400 lines of duplicated overrides.

## Step 2 — fix

Work high severity down.

- **Fix at the lowest layer that owns the problem.** If three screens drift the
  same way, the shared component in `src/@components/` is wrong. Fix it there and
  delete the call-site patches. Never add a per-screen override to compensate for
  a bad shared default — a fix that duplicates a special case across screens is
  the wrong fix even when it looks right on screen.
- **Keep working features the references never depicted.** These screens have
  real functionality the static mockups don't show: bulk actions, row shortcuts,
  unread badges, extra filters. If a reference appears to omit one, **keep it and
  flag it in the report.** Never delete a working feature to match a picture.
- **Check GAPS.md before "fixing" anything that looks unusual.** It may be a
  deliberate resolution.
- **Delete what your fix makes redundant.** A leftover `max-w-*` or `mx-auto`
  that no longer does anything is the next agent's bug.
- **If a need isn't covered by UI-CONTRACT section 2 and isn't in GAPS.md, stop
  and ask.** Do not improvise a component or hand-style a div.

## Step 3 — gates, all must pass

```sh
rm -f frontend/apps/coachapp-v2/*.tsbuildinfo   # stale cache has hidden real errors here before
pnpm -C frontend/apps/coachapp-v2 build          # must be 0 TypeScript errors
pnpm -C frontend/apps/coachapp-v2 lint           # Biome; it writes files, review its changes
./scripts/check-ui-contract.sh                   # UI-CONTRACT section 5 grep gate
./scripts/check-rm.sh                            # recurring-mistakes ledger
```

That first line matters: the TypeScript build cache was once committed to git and
reported a clean build over genuinely broken code. Always clear it before you
trust a build result.

Then re-capture every screen you touched, at both widths, and confirm the finding
is actually gone. **A fix you did not re-screenshot is not verified — mark it as
unverified in the report rather than implying you checked it.**

## Step 4 — finish

- Update the report: mark every row fixed / skipped / not-a-finding, each with a
  one-line reason. Report honestly — if a fix didn't work or you skipped
  something, say so plainly.
- Commit with `git add <explicit paths>`. **Never `git add -A`** — the working
  tree carries unrelated dirty files (for example `frontend/openapi/easy-openapi.json`)
  that must not end up in your commit.
- **If you found a systemic issue, fix the document that allowed it.** A rule in
  `frontend/apps/coachapp-v2/AGENTS.md` that contradicts the references will be
  followed by the next agent and will silently undo your work. That edit matters
  more than the pixels do.
- If you hit a genuinely new recurring mistake, add a prevention rule to
  `docs/agents/recurring-mistakes.md`, plus a grep check in `scripts/check-rm.sh`
  if it is mechanically detectable.
