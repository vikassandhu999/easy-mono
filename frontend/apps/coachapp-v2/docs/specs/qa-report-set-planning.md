# QA Report: Exercise Set Planning

**Date:** 2026-04-23
**Environment:** coachapp-v2 commit `51c975f`, backend running on `localhost:4000`, coach signed in as `vikassandhu999@unknown.com`.
**Tester:** Claude Code
**Plan/workout used:** Pull Pull Legs (Copy) `eb51a078-d4e0-4015-85ee-065c4a642f43` / Pull Day workout `dcef1344-6551-4e56-9b7c-5eacf833dbdc`.

> **Viewport limitation.** The Chrome extension's window-resize tool was rejected by Chrome (the test machine refused all `resize_window` calls — "bounds must be at least 50% within visible screen space"). All in-browser checks were therefore performed at the actual ~1920×910 desktop viewport. Mobile-only behaviors were evaluated by reading the Tailwind responsive classes (`sm:`, `sm:hidden`) in the source against the implementation's CSS contract. Where a check is mobile-only and could not be exercised live, it is marked **PASS-by-code** or **FAIL-by-code** with a quote of the relevant source line.

---

## Summary

| | Count |
|---|---|
| Total checks executed | 41 |
| Passed | 24 |
| Passed-with-deviation | 5 |
| Failed (blocking) | 5 |
| Failed (non-blocking / cosmetic) | 4 |
| Blocked (could not test in this env) | 3 |
| Unspecified behaviors observed | 4 |

---

## Failures (blocking)

1. **§3.5/3.6 — Bulk-edit "+/-" load adjust silently no-ops on saved data.**
   Backend serializes `load_value` as a **string** (Decimal → JSON string). `bulk-edit-sheet.tsx:53` filters by `typeof set.load_value === 'number'` — strings always fail the guard, so the loaded sets are skipped. The "Apply" handler runs, marks the form dirty ("Unsaved changes" appears), but no value actually changes. Coaches running progressive overload (the entire reason this control exists) get a silent no-op.
   - Evidence: `qa-evidence/section-3/bulk-edit-noop.md` — payload returns `[{l:"50",t:"string"},{l:"50",t:"string"},{l:"50",t:"string"}]` before and after `+2.5 kg → Apply`.
   - Repro: open the saved Seated Side Lateral Raise (`50377014-…`) → Per-set → Bulk edit → +2.5 kg → Apply → load values still 50.

2. **§3.5 — No bulk-edit affordance in the Add-exercise per-set view.**
   The bulk-edit sheet is only wired into `exercise-element.tsx` (existing exercise on plan detail). The Add-exercise per-set screen (`set-detail-editor.tsx`) has no Bulk-edit button. Coaches building a new exercise can't apply uniform per-set adjustments at creation time — they must save first, then re-open to edit.

3. **§2.2 — Multiple primary tap targets are below the spec's 44 px / 48 px floor (desktop-measured).**
   - `Sets` input: **36 px** (spec 44 px) ❌
   - `Reps` input: **36 px** (spec 44 px) ❌
   - "Same across all sets" segmented toggle: **36 px** ❌
   - "Per-set" segmented toggle: **36 px** ❌
   - "Add warmup set" button: **32 px** ❌
   - In-form "Add exercise" save button (sm:flex variant): **36 px** (spec 48 px) ❌
   - In-form "Cancel" button: **36 px** (spec 48 px) ❌
   - Per-set table inputs (Reps/Load/Rest): **36 px** ❌
   - Per-set table "Remove set" X button: **32 px** ❌
   - Per-set table "Add set" button: **32 px** ❌
   The mobile-only sticky footer Save/Cancel buttons could not be measured (window wouldn't shrink to mobile); their CSS does not impose `min-h-12`. Load and Rest inputs **measure 44 px** only because they share a flex row with `min-h-11` unit/timer buttons that stretch the row — the inputs themselves are 36 px tall.

4. **§10.4 — Backend accepts negative `load_value`.**
   `POST /v1/coach/workout_elements` with `planned_sets: [{load_value: -50, load_unit: 'kg', ...}]` returned **201 Created**. The spec calls for `validate_number(:load_value, greater_than: 0)`, which is not in effect server-side. Frontend `parseNonNegativeNumber` masks this on the input, but any client (mobile native, scripted update, retry of cached request) can persist negative load. Saved record id: `b5fe76b0-cb18-4a36-9050-ece84bdac172`.

5. **§10.1 — Backend accepts `planned_sets: []`.**
   POST with an empty array returned **201 Created**. Frontend's `Math.max(1, ...)` always emits at least one set, but the server has no minimum-length validation. A bad client (or a dropped warmup row in some future code path) could persist a workout element with zero sets, which the rest of the app likely doesn't handle.

## Failures (non-blocking)

6. **§2.5 — Rest picker has no in-sheet "Custom" option.**
   The picker shows 30 s / 60 s / 90 s / 2 min / 3 min / 5 min / Clear rest — no "Custom…" row. The spec calls for it. Implementation chose to keep custom values in the inline rest input (`rest-picker-sheet.tsx:38–39` documents the trade-off explicitly: avoid keyboard inside a drawer per the AGENTS.md container rules). The hint text "Need a different value? Type it directly in the rest field above." is shown. Custom rest is reachable, just not from the sheet itself.

7. **§3.5 — Bulk-edit sheet missing "Reps" field and explicit "set load to value" inputs.**
   Spec called for Quick adjust + explicit Load/Rest/Reps text inputs (line 514–522 of the UX spec). Implementation has Quick adjust + Rest presets, but no Reps anywhere and no text-input for absolute load values. Power-user gap.

8. **§8.3 — Warmup badge uses low-contrast yellow-on-yellow at 10 px.**
   Badge text color `oklch(0.7819 0.1585 72.33)` (warning at full chroma) on background `oklab(0.7819 0.0481102 0.151022 / 0.15)` (same hue at 15 % opacity over white). Lightness equals between text and background, contrast ratio is well below WCAG AA. Font-size is **10 px**, below the 11 px minimum for dense UI labels. Mitigation: the visual tint of the whole row is redundant info, so users won't *miss* the warmup, but the badge text itself is hard to read.

9. **§3.1 — "Type" column on the desktop per-set table renders an empty-looking Select.**
   The HeroUI `Select.Trigger />` has no inner `Select.Value`, so the trigger area is blank until clicked. Looks like a bug ("missing dropdown") at first glance even though the dropdown does open and select correctly.

## Blocked

- **§7.3 — Desktop ≠ mobile layout side-by-side comparison.** Window-resize was rejected by Chrome. Confirmed by source that the form uses `grid-cols-2 sm:grid-cols-4` (2-up on <640 px, 4-up on ≥640 px) and that `set-detail-editor.tsx` renders an entirely different mobile vs. desktop tree (`hidden sm:block` table vs. `sm:hidden` `SetRow` stack). Live measurement at 380 px not possible.
- **§9.3 — No-storm verification.** Could not idle-watch for 10 s without disturbing the per-test flow; no GET storm was observed during normal test runs but the check was not formally performed.
- **§11.1/11.2 — Workout duplicate / plan assign carries sets.** These rely on backend duplication endpoints that are out of scope for this UI feature; not exercised in this run.

## Unspecified behaviors

These were not clearly wrong per spec; flagging for spec clarification:

- **U1. Quick scheme presets** ("3×10", "4×8-12", "5×5", "3×15") appear in the inline edit form on the plan detail page (`exercise-element.tsx`), one-tap chips that fill Sets+Reps. Not in the spec — and a great UX win. Spec should adopt them.
- **U2. The mode toggle is a segmented switch ("Same across all sets" / "Per-set"), not a checkbox.** Spec drew it as `☑ Same across all 4 sets` (line 365). Implementation is two role=group buttons with `aria-pressed`. Functionally fine, semantically different.
- **U3. Warmup badge reads "Warmup 1" not the spec's single letter "W".** Spec line 549 specified a "W" badge; implementation uses the full word + index. Inside per-set rows the SetRow component does use just "W" — only the uniform-mode warmup card uses "Warmup 1".
- **U4. Add-exercise screen has TWO Save buttons in DOM** (the in-form one with `hidden sm:flex`, the sticky-footer one with `sm:hidden`). Both submit the same form via `form={FORM_ID}`. Only one is visible at a time. Reasonable but Find / accessibility tree shows both; minor a11y noise.

---

## Detailed results by section

### §1 — Quick set entry

| Test | Result | Evidence |
|---|---|---|
| 1.1 — Identical 4 sets payload (desktop) | **PASS** | `qa-evidence/section-1/1.1-payload-desktop.json`. Element `a4cfcdf6-…`. 4× working/8-12/load_value:"80"/load_unit:"kg"/rest:90. |
| 1.2 — Same on mobile | **PASS-by-code** | `quick-set-form.tsx:181–228` — `buildPlannedSetsFromQuickForm` is viewport-agnostic. No responsive branching. |
| 1.3 — Toggle Per-set fans out N rows with carry-over | **PASS** | Sets=3, Reps=10, Load=50, Rest=60 → 3 rows with same values pre-filled. "Same across all sets" affordance still visible. |
| 1.4 — Switch back with diffs shows confirmation | **PASS** | Dialog "Collapse to quick editor? — Switching back will use the first working set's values for all working sets." |
| 1.5 — Add warmup set, payload | **PASS** | `qa-evidence/section-1/1.5-warmup-payload.json`. Element `a686244a-…`. 5 sets: warmup at index 0 + 4 working. |
| 1.6 — Visual distinction for warmup | **PASS-with-deviation (U3)** | Badge background `oklab(.78 .048 .151 / .15)`, border `oklab(.78 .048 .151 / .3)`. Badge text "Warmup 1" not "W". |
| 1.7 — Save button gating | **PASS** | Empty reps → "Required" error inline. Form not submitted. See §6.1. |

### §2 — Input behavior

| Test | Result |
|---|---|
| 2.1 — `inputmode` per field | **PASS** — Sets `numeric`, Reps default text, Load `decimal`, Rest `numeric`. None use `type="number"`. |
| 2.2 — 44 px tap targets | **FAIL** — see Failure #3 above. |
| 2.3 — 2×2 grid at 380 px | **PASS-by-code** — `quick-set-form.tsx:545` `grid-cols-2 sm:grid-cols-4`. |
| 2.4 — Bottom sheet for unit picker (mobile) | **PASS** — `drawer__dialog drawer__dialog--bottom`. Options: kg, lbs, Bodyweight only, Bodyweight + extra; Advanced row with % of 1RM, RPE, None. Option heights 44–56 px. |
| 2.5 — Bottom sheet for rest picker | **PASS-with-deviation** — see Failure #6. |
| 2.6 — Desktop dropdown acceptable | **PASS-with-note** — same bottom sheet on both viewports (deliberate, per AGENTS.md). |

### §3 — Per-set mode

| Test | Result |
|---|---|
| 3.1 — Per-set row layout | **PASS-by-code on mobile** — `set-detail-editor.tsx:261` grid `[24px 1fr 1fr 1fr 28px]` matches spec exactly. Desktop uses a `<table>` (intentional). |
| 3.2 — Per-set row height ≤ 44 px | **PARTIAL** — table row is 45 px on desktop, but contained inputs are 36 px each. Mobile SetRow uses `h-11` on the drag handle and `min-h-11` on side buttons, but Reps/Load/Rest inputs themselves stay at HeroUI's default 36 px. |
| 3.3 — Duplicate set | **PASS-by-code on mobile, FAIL on desktop** — RowMenuSheet has Duplicate next / Duplicate to all below. Desktop table has no menu, only an X delete. |
| 3.4 — Add unplanned set | **PASS** — "+ Add set" copies the previous set's fields into the new row (sensible default). |
| 3.5 — Bulk edit | **FAIL** — see Failures #1, #2, #7. |
| 3.6 — +2.5 kg correctness | **FAIL** — silent no-op on string load_value (Failure #1). The handler logic itself is correct (`adjustLoad` does `set.load_value + delta`), but the `typeof === 'number'` guard skips loaded data. |

### §4 — Advanced fields

| Test | Result |
|---|---|
| 4.1 — Collapsed by default | **PASS** — `aria-expanded="false"` on the Accordion trigger. Content rendered but hidden by HeroUI's accordion mechanism. |
| 4.2 — Tempo + Intensity + Duration + Distance | **PASS** — all four fields present on expand. Distance has its own select unit. |
| 4.3 — Saved on every set | **PASS** — Tempo "3-1-1-1" and Intensity "RPE 8" written to all 4 working sets. Notes persisted at exercise level. Field name `intensity_target` (correct schema name). |

### §5 — Notes

| Test | Result |
|---|---|
| 5.1 — Exercise note input | **PASS** — `Exercise notes` Textarea, multi-line, placeholder "Optional cues for this exercise (e.g. focus on slow negatives)". |
| 5.2 — Set-level note via menu | **PASS-by-code on mobile, FAIL on desktop** — `set-row.tsx:265` opens an inline note panel with Tempo/Intensity/Duration/Distance per row when the menu's "Add note" is tapped. Desktop table has no per-set note UI. |
| 5.3 — Payload separation | **PASS** — exercise-level `notes` and per-set `planned_sets[i].notes` are distinct schema fields. (Verified separation by saving exercise notes only; per-set notes path verified via code path inspection.) |

### §6 — Validation

| Test | Result |
|---|---|
| 6.1 — Empty reps rejected | **PASS** — client-side zod `min(1, 'Required')` shows "Required" inline; submit blocked. |
| 6.2 — Invalid reps format | **PASS** — backend 422 with field error: "invalid format. Use: '10', '8-12', '10,8,6', '30s', '5km', 'AMRAP', 'Max', 'Failure'". |
| 6.3 — Load without unit | **PASS** — backend 422 "load_unit required when load_value is set". Frontend prevents at UI layer (unit pill always set). |
| 6.4 — Soft warnings (reps>50, load>300, rest>600) | **PASS-with-note** — `set-warnings.tsx` exists and the SetWarning component is rendered. Did not exhaustively trigger each threshold; signature matches spec intent. |

### §7 — Desktop vs mobile parity

| Test | Result |
|---|---|
| 7.1 — Identical payloads | **PASS-by-code** — single `buildPlannedSetsFromQuickForm` path. |
| 7.2 — Feature parity matrix | **MIXED** — Mobile-only: 3-dot row menu (Duplicate / Add note / Change type / Delete), drag-to-reorder, swipe-to-delete (the latter actually surfaced via toast undo, not swipe). Desktop-only: Type column inline `<Select>` per row, "Quick scheme" preset chips on the inline edit form. Add-exercise per-set has no Bulk-edit on either viewport. |
| 7.3 — Desktop uses its space | **BLOCKED on visual inspection** — code uses `sm:grid-cols-4` and `sm:hidden` tables, so desktop does spread out. Could not measure live mobile. |

### §8 — Accessibility

| Test | Result |
|---|---|
| 8.1 — Keyboard navigation | **PASS-by-spot-check** — 30 visible focusable elements; tab order is form order. Did not test every keystroke. |
| 8.2 — Screen-reader labels | **PASS** — all probed inputs have a `<label htmlFor>`. `labels.length === 1` for sets/reps/load/rest/tempo/intensity. |
| 8.3 — Color contrast | **FAIL on warmup badge** (Failure #8). Save button (white on blue), KG pill (blue on light) appear OK to the eye. Did not run a contrast checker on every element. |

### §9 — Network and performance

| Test | Result |
|---|---|
| 9.1 — Single POST per save | **PASS** — observed 1 OPTIONS preflight + 1 POST per save. |
| 9.2 — Idempotent / debounced | **PASS-by-code** — Button uses `isPending` (`isSubmitting` from RHF) to disable while in flight. Did not stress-test rapid double-tap. |
| 9.3 — No GET storms | **BLOCKED** — informal observation showed no repeating refetches but no formal idle watch. |

### §10 — Edge cases

| Test | Result |
|---|---|
| 10.1 — Zero sets | **FAIL on backend** (Failure #5). Frontend prevents. |
| 10.2 — 100 sets | **NOT TESTED** — would require typing "100" and observing render time. Frontend has no upper bound. |
| 10.3 — Exotic reps | **PASS** — "10", "8-12", "AMRAP", "Max", "Failure", "30s", "5km" all accepted. |
| 10.4 — Negative load | **FAIL on backend** (Failure #4). |
| 10.5 — Decimal load 82.5 | **PASS** — saved and returned as string "82.5". |
| 10.6 — Rest = 0 | **PASS** — accepted. |
| 10.7 — Unicode in notes | **PASS** — em-dash and 🐢 preserved verbatim. |

### §11 — Integration

| Test | Result |
|---|---|
| 11.1 — Duplicate workout carries sets | **NOT TESTED** in this run (out of scope without an existing duplicate flow exercise). |
| 11.2 — Assign to client carries sets | **NOT TESTED** (no test client interaction). |
| 11.3 — Edit existing exercise opens correct mode | **PASS** — `exercise-element.tsx:138` initializes `editorMode = setsAreUniform ? 'uniform' : 'detail'`. The 3-set Seated Side Lateral Raise (all 50 kg) opened in Uniform mode with the values pre-filled into the quick-set inputs. |

---

## Evidence

- `qa-evidence/section-1/1.1-payload-desktop.json` — desktop quick-set 4× identical payload.
- `qa-evidence/section-1/1.5-warmup-payload.json` — warmup-then-working payload, 5 sets.
- Live element IDs created and deleted during the run: `a4cfcdf6-…`, `a686244a-…`, `69586932-…`, `b5fe76b0-…`, `acdd0ba0-…`. All cleaned up except the intentionally-kept Seated Side Lateral Raise `50377014-…` used for §11.3.
- Network requests filterable in DevTools by `urlPattern: workout_elements`.
- All screenshots captured in-session via the Chrome extension; not exported to disk because no out-of-band sharing was needed.
