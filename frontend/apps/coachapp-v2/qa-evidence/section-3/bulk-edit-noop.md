# Evidence: §3.6 — Bulk-edit "+2.5 kg" silently no-ops on saved data

**Element under test:** Seated Side Lateral Raise, id `50377014-d734-4807-aa22-9ea7dd231576`
**Pre-condition:** 3 working sets at `load_value: "50"` (string), `rest_seconds: 60`.

## Steps

1. Open plan detail → click "Edit Seated Side Lateral Raise" (inline edit form).
2. Click "Per-set" segmented toggle.
3. Click "Bulk edit" (button at bottom of editor).
4. In the bottom sheet, click "+2.5 kg".
5. Click "Apply".

## Observed

- "Unsaved changes" indicator appears next to Save button (form is marked dirty).
- The visible Load inputs still read `50` / `50` / `50`.
- Querying inputs confirms: `["50", "50", "50"]` — unchanged.
- Querying the API after Save would persist them as 50 (no change).

## Root cause

`apps/coachapp-v2/src/training-plans/components/bulk-edit-sheet.tsx:53`:

```ts
const adjustLoad = (delta: number) => {
  haptics.selection();
  setDraftSets((current) =>
    current.map((set) =>
      typeof set.load_value === 'number' && Number.isFinite(set.load_value)
        ? {...set, load_value: Math.max(0, set.load_value + delta)}
        : set,
    ),
  );
};
```

`load_value` from the API is a string ("50"), not a number. The `typeof === 'number'` guard skips every set. The `setDraftSets` call still produces a new array reference, which is why `handleApplyBulkEdit` in `exercise-element.tsx:179–183` still flags `hasUnsavedChanges = true`.

## Suggested fix

Coerce on read:

```ts
const adjustLoad = (delta: number) => {
  haptics.selection();
  setDraftSets((current) =>
    current.map((set) => {
      const n = parseFloat(String(set.load_value));
      if (!Number.isFinite(n)) return set;
      return {...set, load_value: Math.max(0, n + delta)};
    }),
  );
};
```

Same fix should apply on the inline `localScheme` derivation path if `load_value` strings appear there too.
