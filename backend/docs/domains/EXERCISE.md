# Exercise Domain

> **Last Updated:** 2025-01-27
> **Status:** Approved
> **Frontend:** Implemented

---

## 1. Definition

An **Exercise** is a fundamental building block in the Training domain that represents a specific physical movement or activity that can be performed during a workout. Exercises define the "what" of training - the movements that clients will execute, along with their biomechanical properties, target muscles, and required equipment.

### Key Concepts

- **Hybrid Scope:** Exercises exist in two forms - system-level (shared across all businesses) and business-level (custom exercises created by a specific business)
- **System Exercises:** Pre-populated exercises with `business_id = NULL` that all businesses can view and use, but cannot modify
- **Business Exercises:** Custom exercises created by a business with their `business_id` set, fully owned and editable by that business
- **Duplication:** The mechanism for businesses to customize system exercises by creating their own copy

---

## 2. Schema

### Entity: `exercises`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `binary_id` | Yes | Auto-generated | Primary key (UUID) |
| `name` | `string` | Yes | - | Display name of the exercise (e.g., "Barbell Bench Press") |
| `description` | `string` | No | `nil` | Brief description of the exercise |
| `instructions` | `string` | No | `nil` | Detailed instructions on how to perform the exercise |
| `slug` | `string` | No | Auto-generated | URL-friendly identifier derived from name |
| `mechanics` | `enum` | No | - | Movement pattern: `compound`, `isolation`, or `isometric` |
| `force` | `enum` | No | - | Force direction: `push`, `pull`, or `static` |
| `business_id` | `binary_id` | No | `nil` | Foreign key to businesses. `NULL` = system exercise |
| `inserted_at` | `utc_datetime_usec` | Yes | Auto | Creation timestamp |
| `updated_at` | `utc_datetime_usec` | Yes | Auto | Last update timestamp |

### Enum Values

#### `mechanics`
| Value | Description |
|-------|-------------|
| `compound` | Multi-joint movement involving multiple muscle groups |
| `isolation` | Single-joint movement targeting one muscle group |
| `isometric` | Static contraction without joint movement |

#### `force`
| Value | Description |
|-------|-------------|
| `push` | Force applied away from the body |
| `pull` | Force applied toward the body |
| `static` | No movement, force applied to hold position |

### Associations

| Association | Type | Related Entity | Description |
|-------------|------|----------------|-------------|
| `business` | belongs_to | `Business` | The owning business (NULL for system exercises) |
| `exercise_muscles` | has_many | `ExerciseMuscle` | Join table for muscle associations |
| `muscles` | has_many through | `Muscle` | Target muscles for this exercise |
| `exercise_equipment` | has_many | `ExerciseEquipment` | Join table for equipment associations |
| `equipment` | has_many through | `Equipment` | Required equipment for this exercise |

### Join Table: `exercise_muscles`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `binary_id` | Yes | Primary key |
| `exercise_id` | `binary_id` | Yes | Foreign key to exercises |
| `muscle_id` | `binary_id` | Yes | Foreign key to muscles |
| `role` | `string` | No | Muscle role: "primary" (default), "secondary", "stabilizer" |

### Join Table: `exercise_equipment`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `binary_id` | Yes | Primary key |
| `exercise_id` | `binary_id` | Yes | Foreign key to exercises |
| `equipment_id` | `binary_id` | Yes | Foreign key to equipment |

### Indexes

| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| Primary | `id` | Unique | Primary key lookup |
| `exercises_name_business_id_index` | `name`, `business_id` | Unique | Prevent duplicate names within same scope |
| `exercises_business_id_index` | `business_id` | Non-unique | Filter by business |
| `exercises_slug_index` | `slug` | Non-unique | URL-based lookups |
| `exercises_mechanics_index` | `mechanics` | Non-unique | Filter by mechanics type |
| `exercises_force_index` | `force` | Non-unique | Filter by force type |

### Constraints

- **Unique:** `(name, business_id)` - Same name can exist for different businesses or once at system level
- **Foreign Key:** `business_id` references `businesses(id)` with `ON DELETE CASCADE`

---

## 3. Types/Categories

### Type 1: System Exercise

- **Identifier:** `business_id = NULL`
- **Description:** Pre-populated exercises available to all businesses. These form the base library of standard exercises.
- **Created By:** System administrators via mix task (`mix import_exercises`)
- **Permissions:**
  - **Read:** ✅ All authenticated users
  - **Create:** System administrators only (via mix task)
  - **Update:** ❌ Not allowed (protected by `verify_ownership` plug)
  - **Delete:** ❌ Not allowed (protected by `verify_ownership` plug)
  - **Duplicate:** ✅ Any business can duplicate to create their own copy
- **Special Rules:**
  - Appears in exercise lists for all businesses
  - Cannot be modified by any business
  - Serves as source for business customizations via duplication

### Type 2: Business Exercise

- **Identifier:** `business_id = <uuid>`
- **Description:** Custom exercises created by a specific business, either from scratch or duplicated from system exercises.
- **Created By:** Business users via API
- **Permissions:**
  - **Read:** ✅ Only the owning business
  - **Create:** ✅ Business users
  - **Update:** ✅ Only the owning business
  - **Delete:** ✅ Only the owning business
  - **Duplicate:** ✅ Only the owning business (creates another business exercise)
- **Special Rules:**
  - Only visible to the owning business
  - Full CRUD operations allowed
  - Name must be unique within the business scope

---

## 4. API Endpoints

| Method | Path | Action | Description |
|--------|------|--------|-------------|
| GET | `/api/exercises` | index | List all exercises (business + system) |
| GET | `/api/exercises/:id` | show | Get single exercise details |
| POST | `/api/exercises` | create | Create new business exercise |
| PUT | `/api/exercises/:id` | update | Update an exercise (business-owned only) |
| DELETE | `/api/exercises/:id` | delete | Delete an exercise (business-owned only) |
| POST | `/api/exercises/:id/duplicate` | duplicate | Create a copy of an exercise |

### Query Parameters (Index)

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Max results per page (default: 50, max: 100) |
| `offset` | integer | Starting position for pagination |
| `search` | string | Filter by name (case-insensitive partial match) |

---

## 5. Flows

### Flow 1: List Exercises

#### Description
Retrieves a paginated list of all exercises visible to the current business, including both system-level and business-owned exercises.

#### Preconditions
- [x] User is authenticated
- [x] User has valid `business_id` in token claims

#### Actor(s)
- Any authenticated user within a business

#### Steps
1. Extract `business_id` from token claims
2. Query exercises where `business_id = <user's business>` OR `business_id IS NULL`
3. Apply search filter if provided
4. Apply pagination (limit/offset)
5. Preload associations (muscles, equipment)
6. Return paginated results with metadata

#### Validation Rules
- `limit` must be between 1 and 100
- `offset` must be >= 0

#### Success Response
- HTTP Status: 200 OK
- Returns: `{ data: Exercise[], meta: { limit, offset, total } }`

#### Error Responses
| Scenario | HTTP Status | Error |
|----------|-------------|-------|
| Unauthenticated | 401 | Unauthorized |

#### Code Path
```
ExerciseController.index -> Training.list_exercises -> Library.list_exercises -> Repo.all
```

---

### Flow 2: Show Exercise

#### Description
Retrieves detailed information about a single exercise, including associated muscles and equipment.

#### Preconditions
- [x] User is authenticated
- [x] Exercise exists
- [x] Exercise is either system-level OR belongs to user's business

#### Actor(s)
- Any authenticated user within a business

#### Steps
1. Extract `business_id` from token claims
2. Fetch exercise by ID where `business_id = <user's business>` OR `business_id IS NULL`
3. Preload associations
4. Return exercise details

#### Success Response
- HTTP Status: 200 OK
- Returns: `{ data: Exercise }`

#### Error Responses
| Scenario | HTTP Status | Error |
|----------|-------------|-------|
| Not found | 404 | "Exercise not found." |
| Unauthenticated | 401 | Unauthorized |

#### Code Path
```
ExerciseController.show -> authorize_resource plug -> Training.fetch_exercise -> Repo.one
```

---

### Flow 3: Create Exercise

#### Description
Creates a new business-level exercise. The exercise is automatically associated with the user's business.

#### Preconditions
- [x] User is authenticated
- [x] User has valid `business_id` in token claims

#### Actor(s)
- Any authenticated user within a business

#### Steps
1. Extract `business_id` from token claims
2. Merge `business_id` into request params (prevents client from setting arbitrary business)
3. Build changeset with provided attributes
4. Generate slug from name
5. Process `muscle_ids` array (if provided) into `exercise_muscles` associations
6. Process `equipment_ids` array (if provided) into `exercise_equipment` associations
7. Insert into database
8. Preload associations
9. Return created exercise

#### Validation Rules
- `name` is required
- `name` must be unique within the business scope
- `mechanics` must be one of: `compound`, `isolation`, `isometric`
- `force` must be one of: `push`, `pull`, `static`
- `muscle_ids` must reference valid muscle UUIDs
- `equipment_ids` must reference valid equipment UUIDs

#### Request Body
```json
{
  "name": "Custom Exercise",
  "description": "Optional description",
  "instructions": "Optional instructions",
  "mechanics": "compound",
  "force": "push",
  "muscle_ids": ["uuid1", "uuid2"],
  "equipment_ids": ["uuid3"]
}
```

#### Success Response
- HTTP Status: 201 Created
- Returns: `{ data: Exercise }`

#### Error Responses
| Scenario | HTTP Status | Error |
|----------|-------------|-------|
| Missing name | 422 | `{ errors: { name: ["can't be blank"] } }` |
| Duplicate name | 422 | `{ errors: { name: ["has already been taken"] } }` |
| Invalid mechanics | 422 | `{ errors: { mechanics: ["is invalid"] } }` |

#### Code Path
```
ExerciseController.create -> Training.create_exercise -> Library.create_exercise -> Exercise.changeset -> Repo.insert
```

---

### Flow 4: Update Exercise

#### Description
Updates an existing exercise's attributes and/or associations. Only business-owned exercises can be updated.

#### Preconditions
- [x] User is authenticated
- [x] Exercise exists
- [x] Exercise belongs to user's business (NOT system-level) - **enforced by `verify_ownership` plug**

#### Actor(s)
- Business users (only for their own exercises)

#### Steps
1. Authorize resource (fetch exercise via `authorize_resource` plug)
2. Verify ownership (via `verify_ownership` plug - checks `exercise.business_id == user's business_id`)
3. Apply changeset with provided attributes
4. Update associations if `muscle_ids` or `equipment_ids` provided
5. Save to database
6. Preload associations (force refresh)
7. Return updated exercise

#### Validation Rules
- Same as Create flow
- Cannot change `business_id`

#### Success Response
- HTTP Status: 200 OK
- Returns: `{ data: Exercise }`

#### Error Responses
| Scenario | HTTP Status | Error |
|----------|-------------|-------|
| Not found | 404 | "Exercise not found." |
| System exercise | 403 | "Cannot modify system exercises. Use duplicate to create your own copy." |
| Validation error | 422 | `{ errors: { field: [messages] } }` |

#### Code Path
```
ExerciseController.update -> authorize_resource plug -> verify_ownership plug -> Training.update_exercise -> Exercise.changeset -> Repo.update
```

---

### Flow 5: Delete Exercise

#### Description
Permanently removes an exercise from the database. Only business-owned exercises can be deleted.

#### Preconditions
- [x] User is authenticated
- [x] Exercise exists
- [x] Exercise belongs to user's business (NOT system-level) - **enforced by `verify_ownership` plug**

#### Actor(s)
- Business users (only for their own exercises)

#### Steps
1. Authorize resource (fetch exercise via `authorize_resource` plug)
2. Verify ownership (via `verify_ownership` plug - checks `exercise.business_id == user's business_id`)
3. Delete from database
4. Return success (no content)

#### Success Response
- HTTP Status: 204 No Content
- Returns: Empty body

#### Error Responses
| Scenario | HTTP Status | Error |
|----------|-------------|-------|
| Not found | 404 | "Exercise not found." |
| System exercise | 403 | "Cannot modify system exercises. Use duplicate to create your own copy." |

#### Code Path
```
ExerciseController.delete -> authorize_resource plug -> verify_ownership plug -> Training.delete_exercise -> Repo.delete
```

---

### Flow 6: Duplicate Exercise

#### Description
Creates a copy of an exercise (system or business) as a new business-owned exercise. This is the primary mechanism for businesses to customize system exercises.

#### Preconditions
- [x] User is authenticated
- [x] Source exercise exists
- [x] Source exercise is accessible (system-level OR belongs to user's business)

#### Actor(s)
- Any authenticated user within a business

#### Steps
1. Authorize resource (fetch source exercise)
2. Extract `business_id` from token claims
3. Preload source exercise's associations
4. Extract `muscle_ids` from `exercise_muscles`
5. Extract `equipment_ids` from `exercise_equipment`
6. Generate unique copy name using `generate_unique_copy_name/2`:
   - First copy: `"<original name> (Copy)"`
   - Subsequent copies: `"<original name> (Copy 2)"`, `"<original name> (Copy 3)"`, etc.
7. Build new exercise attributes with unique name
8. Create new exercise using standard create flow
9. Return duplicated exercise

#### Validation Rules
- Same as Create flow
- Name uniqueness is automatically handled by incrementing copy number

#### Success Response
- HTTP Status: 201 Created
- Returns: `{ data: Exercise }` (the new copy)

#### Error Responses
| Scenario | HTTP Status | Error |
|----------|-------------|-------|
| Source not found | 404 | "Exercise not found." |

#### Code Path
```
ExerciseController.duplicate -> authorize_resource plug -> Training.duplicate_exercise -> Library.duplicate_exercise -> generate_unique_copy_name -> create_exercise
```

#### Notes
- The duplicated exercise is always business-level (never system-level)
- The `generate_unique_copy_name/2` function automatically handles name conflicts by checking existing copies and incrementing the copy number
- Duplicating a duplicate (e.g., "Bench Press (Copy)") will still use the base name for the new copy

---

## 6. Authorization Matrix

| Action | System Admin | Business User | Note |
|--------|--------------|---------------|------|
| List | ✅ All | ✅ Own + System | Sees system exercises + own business exercises |
| Show | ✅ All | ✅ Own + System | Can view any accessible exercise |
| Create | ✅ | ✅ (business-level only) | Always creates business-level |
| Update | ✅ System-level | ✅ Own only | Protected by `verify_ownership` plug |
| Delete | ✅ System-level | ✅ Own only | Protected by `verify_ownership` plug |
| Duplicate | ✅ | ✅ Any accessible | Can duplicate system or own exercises |

Legend:
- ✅ = Allowed
- Own = Business-owned exercises only
- System = System-level exercises only

---

## 7. Tenant Isolation

### Data Scoping Rules

- **Query Pattern (List):** `WHERE business_id = ? OR business_id IS NULL`
- **Query Pattern (Single):** `WHERE id = ? AND (business_id = ? OR business_id IS NULL)`
- **Creation Rule:** `business_id` is set programmatically from token claims, never from user input
- **Cross-tenant Access:** System-level exercises (`business_id = NULL`) are accessible by all tenants as read-only

### Implementation Checklist

- [x] All queries include `business_id` filter
- [x] `business_id` is set programmatically in create action
- [x] `business_id` is not in changeset `cast/3` allowed fields
- [x] System-level exercises are protected from modification (via `verify_ownership` plug)
- [x] System-level exercises are readable by all tenants

---

## 8. Resolved Issues

The following issues were identified during the initial review and have been fixed:

### Issue #1: System Exercise Protection (FIXED)

**Problem:** System exercises could be updated/deleted by any business user.

**Solution:** Added `verify_ownership` plug to `ExerciseController` that runs for `update` and `delete` actions. This plug checks that `exercise.business_id == user's business_id` and returns a 403 Forbidden response if the exercise is system-level.

**Implementation:**
```elixir
plug :verify_ownership when action in [:update, :delete]

defp verify_ownership(conn, _opts) do
  exercise = conn.assigns.exercise
  business_id = conn.assigns.token_claims["business_id"]

  if exercise.business_id == business_id do
    conn
  else
    FallbackController.forbidden_response(
      conn,
      "Cannot modify system exercises. Use duplicate to create your own copy."
    )
  end
end
```

### Issue #2: Duplicate Name Conflicts (FIXED)

**Problem:** Duplicating an exercise when a "(Copy)" already exists would fail with a unique constraint error.

**Solution:** Added `generate_unique_copy_name/2` function in `Library` context that:
1. Strips any existing "(Copy)" or "(Copy N)" suffix to get base name
2. Queries for existing copies in the business
3. Returns incremented name: "(Copy)", "(Copy 2)", "(Copy 3)", etc.

**Implementation:**
```elixir
defp generate_unique_copy_name(original_name, business_id) do
  base_name = String.replace(original_name, ~r/\s*\(Copy(?:\s+\d+)?\)$/, "")
  
  existing_names = from(e in Exercise, ...) |> Repo.all()
  
  if Enum.empty?(existing_names) do
    "#{base_name} (Copy)"
  else
    highest_number = ... # Find max copy number
    "#{base_name} (Copy #{highest_number + 1})"
  end
end
```

---

## 9. Future Enhancements

| Enhancement | Description | Priority | Notes |
|-------------|-------------|----------|-------|
| Bulk Import API | Import multiple exercises via API (not just mix task) | Low | Currently only via mix task |
| Search by Muscle | Filter exercises by target muscle in list endpoint | Medium | Useful for workout building |
| Search by Equipment | Filter exercises by required equipment | Medium | Useful for equipment-limited scenarios |
| Exercise Media | Attach images/videos to exercises | Low | Future enhancement |

---

## 10. Testing Checklist

### Unit Tests
- [ ] Schema changeset validates required `name`
- [ ] Schema changeset rejects invalid `mechanics` values
- [ ] Schema changeset rejects invalid `force` values
- [ ] Schema generates slug from name correctly
- [ ] Context `list_exercises` returns both system and business exercises
- [ ] Context `list_exercises` does not return other business's exercises
- [ ] Context `fetch_exercise` returns system exercises
- [ ] Context `fetch_exercise` returns own business exercises
- [ ] Context `fetch_exercise` does not return other business's exercises
- [ ] Context `duplicate_exercise` copies all fields correctly
- [ ] Context `duplicate_exercise` sets correct `business_id`
- [ ] Context `generate_unique_copy_name` returns "(Copy)" for first copy
- [ ] Context `generate_unique_copy_name` increments for subsequent copies

### Integration Tests
- [ ] GET `/api/exercises` returns paginated list
- [ ] GET `/api/exercises` respects `search` parameter
- [ ] GET `/api/exercises/:id` returns exercise with associations
- [ ] POST `/api/exercises` creates business exercise
- [ ] POST `/api/exercises` ignores `business_id` in request body
- [ ] PUT `/api/exercises/:id` updates own exercise
- [ ] PUT `/api/exercises/:id` returns 403 for system exercise
- [ ] DELETE `/api/exercises/:id` deletes own exercise
- [ ] DELETE `/api/exercises/:id` returns 403 for system exercise
- [ ] POST `/api/exercises/:id/duplicate` duplicates system exercise
- [ ] POST `/api/exercises/:id/duplicate` duplicates own exercise
- [ ] POST `/api/exercises/:id/duplicate` handles name conflicts with incrementing

### Security Tests
- [ ] Cannot access other tenant's business exercises
- [ ] Cannot modify system exercises (returns 403)
- [ ] `business_id` injection is ignored on create
- [ ] Invalid UUIDs in `muscle_ids`/`equipment_ids` handled gracefully

---

## 11. Frontend Implementation

### Key Files

| File | Purpose |
|------|---------|
| `services/exercises/exercises_definition.ts` | Type definitions, `isSystemExercise()` helper |
| `services/exercises/exercises.ts` | API hooks including `useDuplicateExercise` |
| `shared/drawers/ExerciseViewDrawer.tsx` | View exercise with conditional actions |
| `shared/drawers/ExerciseEditDrawer.tsx` | Edit form with system exercise protection |
| `shared/drawers/ExerciseCreateDrawer.tsx` | Create new business exercise |
| `shared/ExerciseList/ExerciseList.tsx` | List with "System" badge indicator |

### System Exercise Handling

The frontend uses `isSystemExercise(exercise)` helper to determine UI behavior:

```typescript
// services/exercises/exercises_definition.ts
export const isSystemExercise = (exercise: Exercise): boolean => {
    return exercise.business_id === null;
};
```

### UI Behavior Matrix

| Component | System Exercise | Business Exercise |
|-----------|-----------------|-------------------|
| **ExerciseViewDrawer** | Shows "Duplicate to My Exercises" button | Shows "Edit" + "Delete" buttons |
| **ExerciseEditDrawer** | Shows "Cannot Edit" message with redirect | Shows edit form |
| **ExerciseList** | Shows "System" badge next to name | No badge |

### Duplicate API

```typescript
// Usage
const [duplicateExercise, { isLoading }] = useDuplicateExercise();

const handleDuplicate = async () => {
    const duplicated = await duplicateExercise({ id: exerciseId }).unwrap();
    // duplicated.business_id is now the user's business
};
```

---

## 12. Related Documentation

- [Training API Guide](../TRAINING_API_GUIDE.md) - Complete frontend implementation guide
- [Domain Documentation Template](../DOMAIN_DOC_TEMPLATE.md) - Template used for this document
- [Error Handling](../ERROR_HANDLING.md) - Standard error response formats

---

## Appendix A: JSON Response Format

### Exercise Object

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Barbell Bench Press",
  "description": "Classic chest exercise",
  "instructions": "Lie on bench, grip bar...",
  "slug": "barbell-bench-press",
  "mechanics": "compound",
  "force": "push",
  "business_id": null,
  "muscles": [
    {
      "id": "muscle-uuid",
      "name": "Pectoralis Major",
      "group": "Chest"
    }
  ],
  "equipment": [
    {
      "id": "equipment-uuid",
      "name": "Barbell"
    }
  ]
}
```

---

## Appendix B: Frontend Component Examples

### ExerciseViewDrawer Actions

```tsx
// System exercise: Only duplicate button
{isSystem && (
    <Button
        leftSection={<IconCopy size={16} />}
        onClick={handleDuplicate}
    >
        Duplicate to My Exercises
    </Button>
)}

// Business exercise: Edit + Delete buttons
{!isSystem && (
    <Group>
        <Button leftSection={<IconEdit size={16} />} onClick={handleEdit}>
            Edit
        </Button>
        <ActionIcon color="red" onClick={handleDelete}>
            <IconTrash size={18} />
        </ActionIcon>
    </Group>
)}
```

### ExerciseList Item with System Badge

```tsx
<Group gap="xs">
    <Text fw={500}>{exercise.name}</Text>
    {isSystemExercise(exercise) && (
        <Badge color="gray" size="xs" variant="light">
            System
        </Badge>
    )}
</Group>
```

### List Response

```json
{
  "data": [/* Exercise objects */],
  "meta": {
    "limit": 50,
    "offset": 0,
    "total": 150
  }
}
```

### Error Response (403 Forbidden)

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Cannot modify system exercises. Use duplicate to create your own copy.",
    "detail": {},
    "status": "forbidden"
  }
}
```
