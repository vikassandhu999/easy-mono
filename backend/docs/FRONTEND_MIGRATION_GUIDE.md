# Frontend Migration Guide - Training Domain Schema Updates

> **Version**: 1.1.0  
> **Last Updated**: December 2, 2025  
> **Backend Branch**: `meal-plans`

---

## 📋 Executive Summary

This guide documents breaking changes to the Training domain API that require frontend updates. The changes redesign `PlannedSet` and `PerformedSet` schemas to support a universal workout model covering strength, cardio, and hybrid exercise types.

### Key Changes at a Glance

| Component | Change Type | Impact |
|-----------|-------------|--------|
| `PlannedSet` | **Breaking** | Complete schema redesign |
| `PerformedSet` | **Breaking** | Complete schema redesign + new endpoints |
| `Exercise` | **Minor** | Removed `slug` field |
| `Muscle` | **Minor** | `muscle_group_id` now optional |

---

## 🔗 API Endpoint Strategy

### Design Principles

The Training API follows a **nested resource pattern** with smart aggregation:

1. **PlannedSets** - Managed through parent `WorkoutElement` (no separate endpoints)
2. **PerformedSets** - Has dedicated endpoints for real-time workout logging
3. **Read operations** - Return full nested structures to minimize API calls
4. **Write operations** - Target specific resources for atomic updates

### Endpoint Summary

| Resource | Endpoints | Strategy |
|----------|-----------|----------|
| TrainingPlan | Full CRUD | Root resource, returns nested workouts/elements/sets |
| PlannedWorkout | Full CRUD | Nested under training plan context |
| WorkoutElement | Full CRUD | Includes `sets` array in request/response |
| PlannedSet | **None** | Managed via `WorkoutElement.sets[]` |
| WorkoutSession | Full CRUD | Root resource for workout tracking |
| PerformedSet | **Create/Update/Delete** | Individual endpoints for real-time logging |

### PlannedSet: Nested in WorkoutElement

**NO separate endpoints for PlannedSets.** All set operations happen through WorkoutElement:

```http
# Create element with sets
POST /api/workout_elements
{
  "workout_element": {
    "planned_workout_id": "uuid",
    "exercise_id": "uuid",
    "position": 0,
    "sets": [
      {"position": 0, "target_reps": "10", "load_value": 100, "load_type": "absolute_kg"},
      {"position": 1, "target_reps": "10", "load_value": 100, "load_type": "absolute_kg"}
    ]
  }
}

# Update element and replace all sets
PUT /api/workout_elements/:id
{
  "workout_element": {
    "notes": "Updated notes",
    "sets": [
      {"position": 0, "target_reps": "8-12", "load_type": "bodyweight"}
    ]
  }
}
```

**Behavior:**
- When `sets` array is provided → **replaces all existing sets**
- When `sets` is omitted → element fields updated, sets unchanged
- Sets are ordered by `position` in responses

### PerformedSet: Dedicated Endpoints

**NEW endpoints for real-time workout logging:**

```http
# Log a set during workout
POST /api/performed_sets
{
  "performed_set": {
    "workout_session_id": "uuid",
    "exercise_id": "uuid",
    "position": 0,
    "actual_reps": "10",
    "load_value": 100,
    "load_unit": "kg",
    "rpe": 8.0
  }
}

# Update logged set
PATCH /api/performed_sets/:id
{
  "performed_set": {
    "actual_reps": "12",
    "rpe": 8.5
  }
}

# Delete set (undo)
DELETE /api/performed_sets/:id
```

### Complete Endpoint Reference

#### Training Plans
```
GET    /api/training_plans              # List plans (with pagination)
POST   /api/training_plans              # Create template
GET    /api/training_plans/:id          # Show with nested workouts/elements/sets
PUT    /api/training_plans/:id          # Update plan metadata
DELETE /api/training_plans/:id          # Delete plan
POST   /api/training_plans/:id/assign   # Assign to client (deep copy)
POST   /api/training_plans/:id/duplicate # Duplicate template
```

#### Planned Workouts
```
POST   /api/planned_workouts            # Create workout day
GET    /api/planned_workouts/:id        # Show with elements/sets
PUT    /api/planned_workouts/:id        # Update workout
DELETE /api/planned_workouts/:id        # Delete workout
```

#### Workout Elements
```
POST   /api/workout_elements            # Create with optional sets[]
GET    /api/workout_elements/:id        # Show with sets
PUT    /api/workout_elements/:id        # Update, optionally replace sets[]
DELETE /api/workout_elements/:id        # Delete element and its sets
```

#### Workout Sessions (Tracking)
```
GET    /api/sessions                    # List sessions (filterable)
POST   /api/sessions                    # Start new session
GET    /api/sessions/:id                # Show with performed sets
PUT    /api/sessions/:id/complete       # Complete session
PUT    /api/sessions/:id/discard        # Discard session
```

#### Performed Sets (Real-time Logging)
```
POST   /api/performed_sets              # Log a set
PATCH  /api/performed_sets/:id          # Update logged set
DELETE /api/performed_sets/:id          # Delete set
```

---

## 🔴 Breaking Changes

### 1. PlannedSet Schema - Complete Redesign

The `PlannedSet` model has been completely redesigned to support all exercise modalities (strength, cardio, bodyweight, time-based).

#### Removed Fields

| Old Field | Replacement | Notes |
|-----------|-------------|-------|
| `reps_min` | `target_reps` | Use string format: `"8-12"` |
| `reps_max` | `target_reps` | Use string format: `"8-12"` |
| `target_min` | `load_value` + `intensity_target` | Split into separate fields |
| `target_max` | `load_value` + `intensity_target` | Split into separate fields |
| `target_text` | `intensity_target` | Renamed |
| `target_unit` | `load_type` | Use enum instead |
| `rpe_target` | `intensity_target` | Use text format: `"RPE 8"` |

#### New Fields

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `target_reps` | `string` | Rep target (see format below) | Conditional* |
| `load_value` | `decimal` | Weight/resistance value | No |
| `load_type` | `enum` | Unit for load value | No |
| `intensity_target` | `string` | RPE, zone, or difficulty | No |
| `tempo` | `string` | Movement tempo (e.g., `"3010"`) | No |
| `rest_seconds` | `integer` | Rest period after set | No |
| `duration_seconds` | `integer` | Time-based target | Conditional* |
| `distance_value` | `decimal` | Distance target | Conditional* |
| `distance_unit` | `enum` | Unit for distance | Required if distance set |
| `set_type` | `enum` | Classification of set | No (default: `working`) |
| `notes` | `string` | Coach instructions | No |

**\* At least ONE of `target_reps`, `duration_seconds`, or `distance_value` is required.**

#### Enum Values

**`load_type`:**
```typescript
type LoadType = 
  | "absolute_kg" 
  | "absolute_lbs" 
  | "bodyweight" 
  | "percent_1rm" 
  | "rpe" 
  | "none";
```

**`distance_unit`:**
```typescript
type DistanceUnit = 
  | "meters" 
  | "km" 
  | "miles" 
  | "yards" 
  | "none";
```

**`set_type`:**
```typescript
type SetType = 
  | "warmup" 
  | "working" 
  | "dropset" 
  | "backoff" 
  | "amrap" 
  | "emom" 
  | "cluster" 
  | "rest_pause";
```

#### `target_reps` Format Specification

The `target_reps` field accepts flexible text formats:

| Example | Description |
|---------|-------------|
| `"10"` | Exact 10 reps |
| `"8-12"` | Range of 8 to 12 reps |
| `"10,8,6"` | Wave/cluster sets |
| `"AMRAP"` | As many reps as possible |
| `"Max"` | Maximum effort |
| `"Failure"` | Train to failure |
| `"30s"` | 30 seconds (time-based reps) |
| `"5km"` | 5 kilometers (distance in reps context) |

**Validation Regex:**
```regex
^(\d+(-\d+)?|\d+(,\d+)+|\d+(\.\d+)?(s|sec|m|min|h|hr|km|mi|yd)?|AMRAP|Max|Failure)$/i
```

---

### 2. PerformedSet Schema - Complete Redesign

The `PerformedSet` model now mirrors `PlannedSet` for tracking actual performance.

#### Removed Fields

| Old Field | Replacement | Notes |
|-----------|-------------|-------|
| `reps` | `actual_reps` | Now string, supports same formats |
| `weight_kg` | `load_value` + `load_unit` | Unit is now explicit |

#### New Fields

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `actual_reps` | `string` | Actual reps performed | Conditional* |
| `load_value` | `decimal` | Actual weight/resistance | No |
| `load_unit` | `enum` | Unit for load value | No |
| `intensity_felt` | `string` | Subjective intensity | No |
| `rpe` | `decimal` | Numeric RPE (1.0-10.0) | No |
| `rir` | `integer` | Reps in reserve (0+) | No |
| `duration_seconds` | `integer` | Actual time taken | Conditional* |
| `distance_value` | `decimal` | Actual distance covered | Conditional* |
| `distance_unit` | `enum` | Unit for distance | Required if distance set |
| `tempo_actual` | `string` | Actual tempo used | No |
| `completed` | `boolean` | Was set completed? | No (default: `true`) |
| `notes` | `string` | User notes | No |

**\* At least ONE of `actual_reps`, `duration_seconds`, or `distance_value` is required.**

#### Enum Values

**`load_unit`:**
```typescript
type LoadUnit = 
  | "kg" 
  | "lbs" 
  | "bodyweight" 
  | "percent_1rm" 
  | "none";
```

---

### 3. Exercise Schema - Updates

#### Removed Fields

| Field | Notes |
|-------|-------|
| `slug` | Removed entirely. Use `id` for lookups. |

#### New Fields

| Field | Type | Description |
|-------|------|-------------|
| `images` | `string[]` | Array of image URLs for the exercise |

#### Updated Fields

| Field | Change |
|-------|--------|
| `mechanics` | Now nullable (was required) |
| `force` | Now nullable (was required) |

---

### 4. Muscle Schema - Minor Change

#### Updated Fields

| Field | Change |
|-------|--------|
| `muscle_group_id` | Now nullable. Muscles can exist without a group. |

---

## 📦 TypeScript Type Definitions

### PlannedSet

```typescript
interface PlannedSet {
  id: string;
  position: number;
  
  // Primary Target (at least one required)
  target_reps: string | null;      // "10", "8-12", "AMRAP"
  duration_seconds: number | null;
  distance_value: number | null;
  distance_unit: DistanceUnit;     // Required if distance_value set
  
  // Load
  load_value: number | null;
  load_type: LoadType;
  
  // Intensity
  intensity_target: string | null; // "RPE 8", "Zone 2"
  
  // Execution
  tempo: string | null;            // "3010"
  rest_seconds: number | null;
  
  // Classification
  set_type: SetType;
  
  // Notes
  notes: string | null;
  
  // Relationships
  workout_element_id: string;
  
  // Timestamps
  inserted_at: string;
  updated_at: string;
}

type LoadType = "absolute_kg" | "absolute_lbs" | "bodyweight" | "percent_1rm" | "rpe" | "none";
type DistanceUnit = "meters" | "km" | "miles" | "yards" | "none";
type SetType = "warmup" | "working" | "dropset" | "backoff" | "amrap" | "emom" | "cluster" | "rest_pause";
```

### PerformedSet

```typescript
interface PerformedSet {
  id: string;
  position: number;
  
  // Actual Performance (at least one required)
  actual_reps: string | null;      // "10", "AMRAP:15"
  duration_seconds: number | null;
  distance_value: number | null;
  distance_unit: DistanceUnit;
  
  // Load
  load_value: number | null;
  load_unit: LoadUnit;
  
  // Intensity
  intensity_felt: string | null;   // "RPE 8.5", "Zone 3"
  rpe: number | null;              // 1.0-10.0
  rir: number | null;              // Reps in reserve
  
  // Execution
  tempo_actual: string | null;
  completed: boolean;
  
  // Notes
  notes: string | null;
  
  // Relationships
  workout_session_id: string;
  exercise_id: string;
  
  // Timestamps
  inserted_at: string;
  updated_at: string;
}

type LoadUnit = "kg" | "lbs" | "bodyweight" | "percent_1rm" | "none";
type DistanceUnit = "meters" | "km" | "miles" | "yards" | "none";
```

### Exercise (Updated)

```typescript
interface Exercise {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  mechanics: "compound" | "isolation" | "isometric" | null;  // Now nullable
  force: "push" | "pull" | "static" | null;                  // Now nullable
  images: string[];                                          // NEW: Array of image URLs
  business_id: string | null;  // null = system exercise
  muscles: Muscle[];
  equipment: Equipment[];
  inserted_at: string;
  updated_at: string;
}
```

---

## 🔄 Migration Examples

### Example 1: Strength Training Set

**Before (Old Schema):**
```json
{
  "position": 0,
  "reps_min": 8,
  "reps_max": 12,
  "target_min": 100,
  "target_max": 100,
  "target_unit": "kg",
  "rpe_target": 8
}
```

**After (New Schema):**
```json
{
  "position": 0,
  "target_reps": "8-12",
  "load_value": 100,
  "load_type": "absolute_kg",
  "intensity_target": "RPE 8",
  "rest_seconds": 90,
  "set_type": "working"
}
```

### Example 2: Cardio Set

**Before (Old Schema):**
```json
{
  "position": 0,
  "target_text": "Run 5km in 30 minutes"
}
```

**After (New Schema):**
```json
{
  "position": 0,
  "duration_seconds": 1800,
  "distance_value": 5,
  "distance_unit": "km",
  "intensity_target": "Zone 2",
  "set_type": "working"
}
```

### Example 3: Bodyweight AMRAP Set

**Before (Old Schema):**
```json
{
  "position": 0,
  "target_text": "AMRAP in 60 seconds"
}
```

**After (New Schema):**
```json
{
  "position": 0,
  "target_reps": "AMRAP",
  "duration_seconds": 60,
  "load_type": "bodyweight",
  "set_type": "amrap"
}
```

### Example 4: Recording Performed Set

**Before (Old Schema):**
```json
{
  "position": 0,
  "reps": 10,
  "weight_kg": 100
}
```

**After (New Schema):**
```json
{
  "position": 0,
  "actual_reps": "10",
  "load_value": 100,
  "load_unit": "kg",
  "rpe": 8.0,
  "rir": 2,
  "completed": true
}
```

---

## 🚨 Validation Rules

### PlannedSet Validations

1. **At least one target required:**
   - Must have `target_reps`, `duration_seconds`, OR `distance_value`

2. **Distance unit required with distance:**
   - If `distance_value` is set, `distance_unit` must not be `"none"`

3. **Position uniqueness:**
   - `(workout_element_id, position)` must be unique

4. **Non-negative values:**
   - `position >= 0`
   - `rest_seconds >= 0`
   - `duration_seconds >= 0`

### PerformedSet Validations

1. **At least one metric required:**
   - Must have `actual_reps`, `duration_seconds`, OR `distance_value`

2. **Distance unit required with distance:**
   - If `distance_value` is set, `distance_unit` must not be `"none"`

3. **RPE range:**
   - `1.0 <= rpe <= 10.0`

4. **RIR range:**
   - `rir >= 0`

5. **Position uniqueness:**
   - `(workout_session_id, position)` must be unique

---

## 🛠️ Frontend Implementation Checklist

### Phase 1: Update Types

- [ ] Update `PlannedSet` TypeScript interface
- [ ] Update `PerformedSet` TypeScript interface
- [ ] Add new enum types (`LoadType`, `DistanceUnit`, `SetType`, `LoadUnit`)
- [ ] Remove `slug` from `Exercise` interface
- [ ] Update `Exercise.mechanics` and `Exercise.force` to allow `null`

### Phase 2: Update API Client

- [ ] Add `POST /api/performed_sets` endpoint
- [ ] Add `PATCH /api/performed_sets/:id` endpoint
- [ ] Add `DELETE /api/performed_sets/:id` endpoint
- [ ] Add `PUT /api/sessions/:id/discard` endpoint
- [ ] Update `WorkoutElement` create/update to use new `sets` structure
- [ ] Remove any `slug` based exercise lookups

### Phase 3: Update Forms

- [ ] Update set creation form for `PlannedSet`
- [ ] Replace `reps_min`/`reps_max` inputs with `target_reps` text input
- [ ] Add `load_type` dropdown selector
- [ ] Add `set_type` dropdown selector
- [ ] Add `intensity_target` text input
- [ ] Add duration/distance inputs for cardio exercises
- [ ] Update workout logging form for `PerformedSet`
- [ ] Add `load_unit` selector
- [ ] Add `rpe` and `rir` inputs

### Phase 4: Update Display Components

- [ ] Update set display cards for new format
- [ ] Parse `target_reps` string for display (show ranges, AMRAP badges, etc.)
- [ ] Display load with appropriate unit
- [ ] Show intensity targets
- [ ] Show cardio metrics (duration, distance)

### Phase 5: Real-time Workout Logging

- [ ] Implement real-time set logging with `POST /api/performed_sets`
- [ ] Handle set updates with `PATCH /api/performed_sets/:id`
- [ ] Implement undo/delete with `DELETE /api/performed_sets/:id`
- [ ] Add session discard flow with `PUT /api/sessions/:id/discard`
- [ ] Handle optimistic updates for better UX

### Phase 6: Testing

- [ ] Test strength set creation/display
- [ ] Test cardio set creation/display
- [ ] Test bodyweight set creation/display
- [ ] Test AMRAP/time-based sets
- [ ] Test real-time set logging during workout
- [ ] Test set update and delete flows
- [ ] Test session complete and discard flows
- [ ] Test validation error handling

---

## 📞 API Endpoint Changes

### New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/performed_sets` | Create a performed set |
| `PATCH` | `/api/performed_sets/:id` | Update a performed set |
| `DELETE` | `/api/performed_sets/:id` | Delete a performed set |
| `PUT` | `/api/sessions/:id/discard` | Discard a workout session |

### Modified Endpoints

| Method | Endpoint | Change |
|--------|----------|--------|
| `POST` | `/api/workout_elements` | `sets` array uses new PlannedSet structure |
| `PUT` | `/api/workout_elements/:id` | `sets` array uses new PlannedSet structure |
| `GET` | `/api/workout_elements/:id` | Response `sets` uses new structure |
| `GET` | `/api/training_plans/:id` | Nested sets use new structure |
| `GET` | `/api/sessions/:id` | Nested sets use new PerformedSet structure |
| `GET` | `/api/exercises/:id` | No more `slug` field |
| `GET` | `/api/exercises` | No more `slug` field |

### Unchanged Endpoints

All other endpoints remain the same - only the payload structures have changed.

---

## ❓ FAQ

### Why was `slug` removed from Exercise?

The `slug` field was unused. All exercise lookups should use `id` (UUID). This simplifies the schema and removes unnecessary index overhead.

### Can I still use `rpe_target` for RPE?

No. Use `intensity_target: "RPE 8"` for planning or `rpe: 8.0` (decimal) for tracking. This allows more flexibility (e.g., "RPE 8-9", "Zone 2", "65% HR").

### How do I handle the `target_reps` string format?

Parsing should be done on the frontend. Common patterns:
- Single number: `"10"` → display as "10 reps"
- Range: `"8-12"` → display as "8-12 reps"
- AMRAP: `"AMRAP"` → display as "AMRAP" badge
- Wave: `"10,8,6"` → display as "10, 8, 6 reps"

### What happens to existing data?

The migration handles data transformation. Old `reps`/`weight_kg` values are converted to the new format. Contact backend team if you see data inconsistencies.

---

## 📚 Related Documentation

- [Training API Guide](/docs/TRAINING_API_GUIDE.md)
- [Error Codes](/docs/ERROR_CODES.md)
- [Authentication](/docs/AUTHENTICATION_API.md)

---

## 📧 Support

For questions or issues during migration:
- Backend Team: Check the `training_datamodels_review.md` file for implementation details
- Create issues in the repository for bugs or unclear documentation
