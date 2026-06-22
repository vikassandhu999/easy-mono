# Spec Update: Exercise Set Planning

> **⚠️ Status (2026-06-20): the exercise set-planning edit flow described here has been removed from coachapp-v2.** The interactive plan builder — including `exercise-element.tsx` and the inline exercise form, along with the per-set bulk-edit and rest-picker surfaces — was deleted; the training-plan detail view is now read-only (create / list / assign / delete only, no in-app workout/exercise editing). Still in git history. This document is retained as the design of record.

**Date:** 2026-04-23
**Based on QA report:** [qa-report-set-planning.md](./qa-report-set-planning.md)
**Targets:** [ux-spec-exercise-set-planning-2026-04-22.md](./ux-spec-exercise-set-planning-2026-04-22.md)

---

## Summary of Proposed Changes

1. **Specify the bulk-edit input contract:** `load_value` arrives as a Decimal-string from the backend; the spec must say so and the bulk-edit's `+/- kg` adjust must accept both strings and numbers.
2. **Surface bulk-edit in the Add-exercise per-set view, not only on edit.** Today the most useful "edit all sets together" affordance is missing from creation.
3. **Tighten the tap-target floor language** to make it unambiguous that *the input itself* (not the row it sits in) must measure 44 px tall.
4. **Adopt the "Quick scheme" preset chips** (3×10 / 4×8-12 / 5×5 / 3×15) into the spec — the implementation invented them and they're a real win.
5. **Add backend validation parity** for `load_value > 0` and `planned_sets` non-empty, mirroring the spec's invariants on the server so non-React clients can't violate them.
6. **Document the deliberate "rest custom value lives in the inline input, not the sheet" decision** so future contributors don't try to add a Custom… row that breaks the no-keyboard-in-drawer rule.

---

## Change 1 — Bulk-edit `load_value` type contract

**Section affected:** §"Bulk Set Edit (TX-7)" (lines 257–289) and a new §"Backend serialization notes".

**Current spec says:**
> Tapping "+2.5 kg" applies the delta to every set's load.

**QA found:**
The implementation's `bulk-edit-sheet.tsx:53` filters with `typeof set.load_value === 'number'`. After loading from the backend, every set's `load_value` is a JSON string (`"50"`), so the filter excludes them all. Apply runs, marks the form dirty, but nothing changes.

**Proposed update — append to the section:**

> **Note on data shape.** Backend serializes `load_value` as a Decimal-string. Bulk-adjust handlers MUST coerce before arithmetic:
>
> ```ts
> const current = parseFloat(String(set.load_value));
> if (!Number.isFinite(current)) return set; // genuinely missing → skip
> return {...set, load_value: Math.max(0, current + delta)};
> ```
>
> Test invariant: applying `+2.5 kg` to a freshly-loaded element with three sets of `"50"` MUST result in three sets of `52.5` after one tap of "Apply".

**Rationale:** Spec was silent on the wire format; this hides a footgun every future bulk-style operation will rediscover.

---

## Change 2 — Bulk-edit available in Add-exercise per-set view

**Section affected:** §"Builder UX — The Add Exercise Flow" (lines 33–104) and §"Bulk Set Edit (TX-7)".

**Current spec says:**
> Bulk Set Edit appears on a saved exercise that's been switched into per-set mode (lines 261–289).

**QA found:**
`set-detail-editor.tsx` (used by both the create-flow `QuickSetForm` and the edit-flow `exercise-element`) never renders the Bulk-edit affordance. Bulk-edit is only wired into `exercise-element.tsx`. The first-time creator who lays out 4 different sets and realizes "actually they should all be 80 kg, not 70 / 75 / 80 / 85" cannot use the +5 kg / Apply path until after they've saved.

**Proposed update:**

> Bulk-edit MUST be available wherever per-set mode is, including the Add-exercise screen. Implementation note: render the "Bulk edit" trigger inside `SetDetailEditor`, not in the parent screen, so the create flow and the edit flow inherit it together.

**Rationale:** "Coach plans, then realizes the load should be uniform" is the same task whether it's the first save or the fifth. Splitting it across two surfaces is friction.

---

## Change 3 — Tap-target floor: per-element, not per-row

**Section affected:** §"Input target sizes" (lines 376–385).

**Current spec says:**
> - **Text inputs:** 44px tall.
> - **Cancel / Save buttons:** 48px tall.

**QA found:**
Implementation reads as if it complies — `min-h-11` is set on the unit pills and the rest-picker icon, which sit in flex rows next to the inputs. The flex row stretches to 44 px, and the inputs *visually appear* tall enough. But the inputs themselves measure 36 px (HeroUI default), and the lonely `Sets` and `Reps` inputs (no sibling tall button) fail the rule outright. Mode toggles, Add-warmup, in-form Save/Cancel are all 32–36 px.

**Proposed update — replace the bullet list:**

> - **Text inputs:** apply `min-h-11` (44 px) to every `Input` in the Add-exercise / per-set forms. Stretching a row via a sibling button is not enough — the *input element itself* must be tappable to that height for users who tap the input to focus.
> - **Cancel / Save (sticky footer + in-form alike):** `min-h-12` (48 px). Add `min-h-12` to the in-form `<Button isPending>{submitLabel}</Button>` and to its `Cancel` sibling.
> - **Mode segmented toggle:** `min-h-11` per button.
> - **Ghost helpers ("Add warmup set", "Add set"):** `min-h-11`.
> - **Per-set table inputs (desktop) and SetRow inputs (mobile):** `min-h-11`. Width can shrink, height cannot.

**Rationale:** Several mis-tap risks today on real devices, all from the same root cause — the spec was readable as "the row is 44 px" rather than "the tap target is 44 px."

---

## Change 4 — Adopt "Quick scheme" preset chips

**Section affected:** New subsection under §"Smart Defaults" (around line 109).

**Current spec says:**
> Pre-fill rep range based on compound vs isolation; don't pre-fill load.

**QA found:**
`exercise-element.tsx` (the inline edit form on the plan detail page) renders a row of four chips: **3×10 · 4×8-12 · 5×5 · 3×15**. One tap fills both Sets and Reps. Not in the spec; clearly a UX win.

**Proposed update — add a new subsection:**

> **Quick scheme chips.** In addition to inferred defaults, show 4 one-tap preset chips above the Sets/Reps inputs: `3×10`, `4×8-12`, `5×5`, `3×15`. Each chip writes both Sets and Reps in one action, leaving Load and Rest untouched. Surface the chips in both the Add-exercise screen and the inline edit form (today they're only in the inline edit form).

**Rationale:** Coaches think in scheme shorthand. The chips collapse two field-fills into one tap and match the way they actually talk.

---

## Change 5 — Backend validation parity

**Section affected:** §"Validation and Guardrails" (lines 303–320).

**Current spec says:**
> The PlannedSet changeset already validates: at least one target, load requires a unit, distance requires a unit, reps format. Soft warnings on the UX side for typos.

**QA found:**
- `POST` with `load_value: -50` returned 201. The `validate_number(:load_value, greater_than: 0)` referenced in spec is not enforced server-side.
- `POST` with `planned_sets: []` returned 201. No min-length validation.

**Proposed update — append to the section:**

> Backend MUST also enforce:
> - `load_value` is `>= 0` (or `> 0` if zero-load is meaningless for the unit).
> - `planned_sets` length `>= 1`.
> - Soft-warning thresholds belong on the frontend; the backend stays silent on them.
>
> Frontend input constraints are a convenience, not a security boundary. Anything the spec forbids must be rejected by the API — otherwise mobile apps, scripted retries, and direct API users can persist invalid records.

**Rationale:** Currently any non-React client can persist garbage. The spec already implies these rules exist; making it explicit closes the loop.

---

## Change 6 — Rest "Custom" value: in-line, not in-sheet

**Section affected:** §"Rest quick-picks" (lines 134–149) and §"Unit pickers — bottom sheets, not dropdowns" (lines 397–441).

**Current spec says:**
> Rest is a dropdown with common values plus "Custom"; tap "Custom…" → in-place numeric input appears.

**QA found:**
Implementation deliberately does NOT have a "Custom…" row in the rest picker — `rest-picker-sheet.tsx:38–39` documents: *"Custom values stay in the inline input field on the page so the virtual keyboard never opens inside a drawer."* This conflicts with the AGENTS.md container rule that virtual-keyboard fields must NOT live inside a drawer/dialog. The bottom sheet shows preset chips only and points to the inline rest input.

**Proposed update — replace the rest picker description:**

> The rest sheet shows preset chips (30 s · 60 s · 90 s · 2 min · 3 min · 5 min) plus a "Clear rest" action. **Custom values are entered directly in the inline rest input on the page**, not from a "Custom…" sheet row. This honors the AGENTS.md rule that text inputs requiring the virtual keyboard must not live inside a drawer. The sheet shows a footer hint: "Need a different value? Type it directly in the rest field above."

**Rationale:** The implementation made a correct call against the spec; the spec should follow.

---

## Changes NOT proposed

- **Same-bottom-sheet on desktop** — spec already permits either. Implementation chose consistency. No change needed.
- **Warmup badge as "Warmup 1" instead of "W"** — minor textual deviation but redundant with the row tint. Not worth churn. (However, see Change 3 — the badge text is **10 px** which IS too small; raise to 11–12 px when re-styling for tap targets.)
- **"Type" column visual on desktop per-set table** — the empty-looking trigger is a HeroUI styling quirk; no spec language is needed, but the implementation should add a `<Select.Value />` so the trigger shows the current type even when collapsed.

---

## Open questions for product owner

1. **Should bulk-edit support absolute-value inputs (Set load to X kg, Set rest to X s, Set reps to "8-10") as the spec originally drew, or is the quick-adjust + rest-preset combo enough?** The implementation skipped the text-input variant. If yes to bringing it back, the AGENTS keyboard-in-drawer rule says it can't go in the bottom sheet — needs to be a new screen or expand the sheet to a full-page modal.
2. **Negative load — reject server-side, or clamp to 0 silently?** Spec implies reject (greater_than: 0). Bodyweight-only sets persist as `load_value: nil`, so 0 itself shouldn't be a valid working load either — current backend allows both.
3. **Per-set notes on desktop:** spec assumes per-set notes are useful enough to support; mobile has them via the 3-dot menu, desktop has nothing. Is this a deliberate trade-off (desktop coaches use exercise-level notes) or a gap?
4. **Long-press to drag-reorder + swipe-to-delete (spec lines 580–584):** mobile dnd-kit drag is wired, but I did not exercise swipe-to-delete in this QA run. Is it actually implemented or did the implementation default to the current toast-undo-after-X-tap pattern? If the latter, decide whether to drop the swipe gesture from the spec.
