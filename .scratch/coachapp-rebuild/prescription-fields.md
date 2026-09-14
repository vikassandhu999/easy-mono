# Training prescription fields

Coaches should be able to prescribe repeated timed or distance intervals without opening each set. Keep the compact exercise worksheet and its visual hierarchy. Shared targets stay in the local plan draft until Save plan.

## Scope

Uniform working sets expose Duration, distance & effort beside their variation action. Its dialog edits duration, distance and unit, RPE and notes for every set in that exercise. Reps, load and rest remain directly editable on the worksheet. Cancel leaves the parent draft untouched. Adding a batch accepts the extra targets too.

Individual sets retain their type, reps, load and unit, rest, duration, distance and unit, RPE and notes. Edit matching sets changes only its stated reps/load/rest targets and preserves individual extra instructions. Existing workout/exercise ordering, independent variations, movement replacement, weekly schedule and metadata continue through the same prescription mapper.

No endpoint or generated contract changed. Fields derive from the generated prescription input. Numeric blanks become explicit nulls; zero remains zero. No persisted totals or business selections are calculated in the browser.

## Verification

The real API shared-targets browser scenario covers 375px and 1280px: cancel and focus return, invalid duration/distance/RPE, shared targets on three sets, no server write until Save, retained drafts after a failed prescription write, save/reopen, zero values, explicit clearing and two-set batch additions. Screenshots are written under the ignored training artifacts directory.

The compact-set regression covers matching updates with individual exceptions, preserved extra instructions, repetition, warm-up sets and saved order at both widths. The complete training-template regression covers all individual set fields, exercise pagination, creation/editing, revision recovery and assignment. On 2026-09-14, build, scoped Biome and repository rules passed. Full backend precommit passed all four gates with 1,778 tests and zero failures.

The remaining product audit includes complete navigation and role/session journeys and physical-device interaction. Nutrition menu fields are the next builder audit.
