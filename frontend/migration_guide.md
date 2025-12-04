# Frontend API Migration Guide - December 2024

This document describes the breaking API changes introduced in the December 2024 backend update.

## Summary

| Change | Impact | Action Required |
|--------|--------|-----------------|
| `planned_sets` no longer have `id` or `position` fields | ⚠️ Breaking | Use array index for ordering and identification |

---

## Breaking Change: PlannedSet `id` and `position` Fields Removed

### What Changed

`PlannedSet` has been converted from a separate database table to an **embedded schema** stored as JSONB array within `WorkoutElement`. As a result:
- Sets **no longer have an `id` field**
- Sets **no longer have a `position` field** - array index provides ordering

### API Response Before

```json
{
  "data": {
    "id": "plan-uuid",
    "workouts": [{
      "id": "workout-uuid",
      "elements": [{
        "id": "element-uuid",
        "sets": [{
          "id": "set-uuid",          // ❌ REMOVED
          "position": 0,              // ❌ REMOVED
          "target_reps": "10",
          "load_value": 100,
          "load_type": "absolute_kg"
        }]
      }]
    }]
  }
}
```

### API Response After

```json
{
  "data": {
    "id": "plan-uuid",
    "workouts": [{
      "id": "workout-uuid",
      "elements": [{
        "id": "element-uuid",
        "sets": [
          {                          // ✅ Array index 0 = first set
            "target_reps": "10",
            "load_value": 100,
            "load_type": "absolute_kg"
          },
          {                          // ✅ Array index 1 = second set
            "target_reps": "8",
            "load_value": 110,
            "load_type": "absolute_kg"
          }
        ]
      }]
    }]
  }
}
```

### Frontend Migration Steps

#### 1. Update TypeScript Types

```typescript
// BEFORE
interface PlannedSet {
  id: string;           // ❌ Remove
  position: number;     // ❌ Remove
  target_reps?: string;
  load_value?: number;
  load_type?: LoadType;
  // ...
}

// AFTER
interface PlannedSet {
  target_reps?: string;
  load_value?: number;
  load_type?: LoadType;
  intensity_target?: string;
  tempo?: string;
  rest_seconds?: number;
  duration_seconds?: number;
  distance_value?: number;
  distance_unit?: DistanceUnit;
  set_type?: SetType;
  notes?: string;
}
```

#### 2. Update Set Identification Logic

**Before:** Sets were identified by `set.id` or `set.position`
**After:** Use `element.id + array index`

```typescript
// BEFORE
const setKey = set.id;
// or
const setKey = `${element.id}-${set.position}`;

// AFTER
element.sets.map((set, index) => {
  const setKey = `${element.id}-${index}`;
});
```

#### 3. Update React Keys

```tsx
// BEFORE
{element.sets.map(set => (
  <SetRow key={set.id} set={set} />
))}

// AFTER
{element.sets.map((set, index) => (
  <SetRow key={`${element.id}-${index}`} set={set} index={index} />
))}
```

#### 4. Update Create/Update Payloads

When creating or updating workout elements with sets, just send the array - ordering is determined by array position:

```typescript
// Creating/updating a workout element with sets
const payload = {
  workout_element: {
    position: 0,
    exercise_id: "exercise-uuid",
    planned_sets: [
      // First set (index 0)
      { target_reps: "10", load_value: 100, load_type: "absolute_kg" },
      // Second set (index 1)  
      { target_reps: "8", load_value: 110, load_type: "absolute_kg" },
      // Third set (index 2)
      { target_reps: "6", load_value: 120, load_type: "absolute_kg" }
    ]
  }
};
```

#### 5. Reordering Sets

To reorder sets, simply change the array order in your state and send the updated array:

```typescript
// Move set from index 2 to index 0
const reorderedSets = [...sets];
const [movedSet] = reorderedSets.splice(2, 1);
reorderedSets.unshift(movedSet);

// Send update with new array order
updateWorkoutElement(elementId, { planned_sets: reorderedSets });
```

---

## Non-Breaking Changes (No Frontend Action Required)

The following changes are **internal only** and don't affect the API contract:

### 1. Tenant Isolation Enhancements
- `business_id` added to `planned_workouts`, `workout_elements`, and `performed_sets` tables
- This is handled entirely on the backend - no frontend changes needed

### 2. Security Hardening
- Foreign key fields removed from user-controllable input
- `String.to_existing_atom` replaced with safe parsing
- These are internal security improvements - no API changes

### 3. Additional Validations
- `started_at` now required on `WorkoutSession`
- If you were already sending `started_at`, no change needed
- If not, ensure workout session creation includes `started_at`

```typescript
// Ensure this is included when creating sessions
const sessionPayload = {
  session: {
    started_at: new Date().toISOString(),  // Required now
    planned_workout_id: "optional-uuid"
  }
};
```

---

## Testing Checklist

After making the above changes, verify:

- [ ] Training plan list/detail views render correctly
- [ ] Workout element sets display without errors
- [ ] Creating new sets works (no `id` in payload)
- [ ] Updating existing sets works (identify by position)
- [ ] Reordering sets works correctly
- [ ] Workout session creation includes `started_at`

---

## Questions?

If you encounter issues with this migration, check:

1. Network tab for API response structure
2. Console for any `undefined` errors related to `set.id`
3. React DevTools for key-related warnings
