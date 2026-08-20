# find-state — enumerate & reach every state in a .dc.html

A dc.html is a **state-driven prototype**, not linear pages. Every screen/variant
is an `<sc-if value="{{ flag }}">` block toggled by a logic class at the bottom
of the file. If you only build what the default render shows, you miss states —
this procedure makes the full inventory mechanical.

Never read the whole file. It can be 100k+ chars; grep targeted slices only.

## 1. Enumerate (static, before opening a browser)

Run these against the design file:

```bash
F='design-handoff/design/<Name>.dc.html'
grep -o 'data-ref="[^"]*"' "$F" | sort -u          # named frames — screen × breakpoint inventory
grep -o 'sc-if value="{{ *[A-Za-z_]* *}}"' "$F" | sort -u   # every conditional flag
grep -n 'renderVals\|class .*Logic' "$F"           # logic class location
```

Then read ONLY the logic class (bottom of the file, usually a few hundred
lines). From it extract:

- **Lifecycle/scenario states** — flags derived from status fields (look for a
  scenario/preview switcher: `scen*` handlers, `.dbtn` bar).
- **Navigation states** — which flag shows which screen (`isOverview`,
  `isSession`, …) and which handler sets it (that handler's trigger element is
  your click recipe).
- **Interactive states** — open menus/popovers, selected rows, compare modes,
  hover CSS (`grep -n ':hover' "$F"`).
- **Empty/edge states** — flags like `trainEnded`, `noSchedule`, `fresh`.

Output: a **state checklist** — one row per state × breakpoint, each with the
flag that drives it. Cross-check against the handoff doc's state table (e.g.
CLIENT-DETAIL.md) — any flag you found that the doc doesn't list is a question
for the user, not a thing to skip.

## 2. Reach (live)

Open the file in a browser (`chrome-devtools-axi open file://…`). State is
reached by **interacting with the rendered prototype like a user**:

- Scenario states: click the "Preview state" switcher buttons (prototype-only
  chrome — never port the switcher itself).
- Screen states: click tabs / rows / menu items exactly as the coach would.
- Both breakpoint frames render on the same page (desktop `.vp` frame first,
  mobile after the `MOBILE 375` marker) — no viewport emulation needed on the
  design side.

Record the click sequence for each state — verbatim — as the `design` steps of
that state in the screen's manifest (`design-handoff/manifests/<ID>.json`).
Do the same on the app side (`app` steps: route, tab clicks, seeding).

## 3. Verify coverage

The manifest's `states` array must contain every row of your checklist that the
target screen participates in. A state with no manifest entry is a missed state
— the exact failure this skill exists to prevent. Interactive pseudo-states
(hover, focus) aren't diffable by the script; verify those in the final
screenshot pass and note them on the ticket.
