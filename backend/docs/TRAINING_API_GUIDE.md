# Frontend Implementation Guide: Training Domain

Complete reference for implementing the Training domain in your frontend application.

---

## Table of Contents
1. [Domain Overview](#domain-overview)
2. [TypeScript Types](#typescript-types)
3. [API Reference](#api-reference)
4. [Complete Workflows](#complete-workflows)
5. [Calendar & Schedule Logic](#calendar--schedule-logic)
6. [Error Handling](#error-handling)
7. [Implementation Checklist](#implementation-checklist)

---

## Domain Overview

The Training domain uses a **tripartite architecture**:

| Domain | Purpose | Key Entities |
|--------|---------|--------------|
| **Library** | Exercise definitions | Exercises, Muscles, Equipment |
| **Programming** | Prescription & planning | TrainingPlan, Phase, PlannedWorkout |
| **Tracking** | Execution & logging | WorkoutSession, PerformedSet |

### Key Concepts

- **Hybrid Exercise Scope**: System exercises (shared) + Business-custom exercises
- **Weekly Phase Templates**: Phases are 7-day templates that can be repeated via `PhaseAssignment`
- **Copy-on-Assignment**: Assigning a template to a client creates a full deep copy
- **Weight Normalization**: All weights stored in **kg** (convert to/from lbs in frontend)

---

## TypeScript Types

```typescript
// ===== LIBRARY =====

interface MuscleGroup {
  id: string;
  name: string; // "Chest", "Back", etc.
  description?: string;
}

interface Muscle {
  id: string;
  name: string; // "Pectoralis Major"
  group?: string; // Parent group name
  muscle_group_id?: string;
}

interface Equipment {
  id: string;
  name: string; // "Barbell", "Dumbbell"
  description?: string;
}

interface Exercise {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  slug: string;
  mechanics: 'compound' | 'isolation' | 'isometric';
  force: 'push' | 'pull' | 'static';
  business_id?: string | null; // null = system exercise
  muscles: Muscle[];
  equipment: Equipment[];
}

// ===== PROGRAMMING =====

type LoadType = 'absolute_kg' | 'percent_1rm' | 'rpe';

interface PlannedSet {
  id: string;
  position: number; // 0-indexed
  reps_min?: number;
  reps_max?: number;
  load_value?: number;
  load_type?: LoadType;
  rest_seconds?: number;
}

interface WorkoutElement {
  id: string;
  position: number; // Order in workout
  exercise_id: string;
  superset_group_id?: string; // Same ID = superset
  notes?: string;
  sets: PlannedSet[];
}

interface PlannedWorkout {
  id: string;
  name: string; // "Push Day"
  day_of_week: number; // 1-7 (Mon-Sun)
  notes?: string;
  elements: WorkoutElement[];
}

interface Phase {
  id: string;
  name: string; // "Hypertrophy Block"
  description?: string;
  goal?: string; // "Build muscle"
  position: number; // Order in plan
  workouts: PlannedWorkout[];
}

interface PhaseAssignment {
  id: string;
  phase_id: string;
  start_week: number; // 1-indexed
  end_week: number;   // Inclusive
}

interface TrainingPlan {
  id: string;
  name: string;
  description?: string;
  is_template: boolean;
  duration_weeks: number;
  business_id: string;
  author_id: string;
  client_id?: string; // Only if assigned
  original_template_id?: string;
  phases: Phase[];
  assignments: PhaseAssignment[];
}

// ===== TRACKING =====

interface PerformedSet {
  id: string;
  position: number;
  reps: number;
  weight_kg: number; // Always in kg
  rpe?: number; // 1-10
  rir?: number; // Reps in reserve
  completed: boolean;
  notes?: string;
  exercise_id: string;
}

type SessionState = 'active' | 'completed' | 'discarded';

interface WorkoutSession {
  id: string;
  started_at: string; // ISO 8601
  ended_at?: string;
  state: SessionState;
  soreness_rating?: number; // 1-5
  notes?: string;
  client_id: string;
  business_id: string;
  planned_workout_id?: string;
  sets: PerformedSet[];
}
```

---

## API Reference

All endpoints require authentication. Include `Authorization: Bearer <token>` header.

### Library Domain

#### List Exercises
```http
GET /api/exercises
```
**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Barbell Bench Press",
      "slug": "barbell-bench-press",
      "mechanics": "compound",
      "force": "push",
      "business_id": null,
      "muscles": [
        { "id": "uuid", "name": "Pectoralis Major", "group": "Chest" }
      ],
      "equipment": [
        { "id": "uuid", "name": "Barbell" }
      ]
    }
  ]
}
```

#### Get Exercise
```http
GET /api/exercises/:id
```

#### Create Custom Exercise
```http
POST /api/exercises
Content-Type: application/json

{
  "exercise": {
    "name": "Modified Floor Press",
    "mechanics": "compound",
    "force": "push",
    "description": "Floor press variation"
  }
}
```

#### Update Exercise (Custom Only)
```http
PUT /api/exercises/:id
Content-Type: application/json

{
  "exercise": {
    "name": "Updated Name"
  }
}
```

---

### Programming Domain

#### List Training Plans
```http
GET /api/training_plans?is_template=true
```
**Query Params:**
- `is_template` (optional): `true` for templates, `false` for assigned plans

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "12-Week Strength Builder",
      "is_template": true,
      "duration_weeks": 12,
      "phases": [...],
      "assignments": [...]
    }
  ]
}
```

#### Get Training Plan (Full Details)
```http
GET /api/training_plans/:id
```
**Response:** Full nested structure (phases → workouts → elements → sets)

#### Create Training Plan Template
```http
POST /api/training_plans
Content-Type: application/json

{
  "training_plan": {
    "name": "Hypertrophy Focus",
    "description": "8-week muscle building",
    "is_template": true,
    "duration_weeks": 8
  }
}
```

#### Assign Plan to Client
```http
POST /api/training_plans/:template_id/assign
Content-Type: application/json

{
  "client_id": "uuid-of-client"
}
```
**Returns:** The **new assigned plan** (NOT the template)

**Important:** This creates a deep copy. The returned plan has `is_template: false` and `client_id` set.

---

### Tracking Domain

#### List Sessions (History)
```http
GET /api/sessions
```

#### Get Session Details
```http
GET /api/sessions/:id
```
**Response:**
```json
{
  "data": {
    "id": "uuid",
    "started_at": "2025-11-26T10:00:00Z",
    "ended_at": "2025-11-26T11:00:00Z",
    "state": "completed",
    "soreness_rating": 3,
    "sets": [
      {
        "id": "uuid",
        "position": 0,
        "reps": 10,
        "weight_kg": 100,
        "rpe": 7,
        "completed": true,
        "exercise_id": "uuid"
      }
    ]
  }
}
```

#### Start Workout Session
```http
POST /api/sessions
Content-Type: application/json

// Option 1: From planned workout
{
  "session": {
    "planned_workout_id": "uuid"
  }
}

// Option 2: Ad-hoc (no plan)
{
  "session": {
    "notes": "Quick workout"
  }
}
```

#### Complete Session
```http
PUT /api/sessions/:id/complete
Content-Type: application/json

{
  "session": {
    "soreness_rating": 4,
    "notes": "Felt strong"
  }
}
```

---

## Complete Workflows

### Workflow 1: Coach Creates Program Template

**Goal:** Create a 12-week program with 3 phases.

**Steps:**

1. **Create the plan shell:**
```typescript
const response = await fetch('/api/training_plans', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    training_plan: {
      name: '12-Week Powerlifting',
      duration_weeks: 12,
      is_template: true
    }
  })
});
const { data: plan } = await response.json();
```

2. **Add phases** (Note: Phase creation endpoints would be added, or use nested params if backend supports)
   - *Current Implementation Note:* You may need to build the full nested structure or create phases via additional endpoints.
   - *Recommendation:* For MVP, construct plans server-side or use a bulk create endpoint.

3. **Add workouts to each phase** (7 workouts max per phase)

4. **Add exercises and sets to workouts**

**Alternative Approach:** Build the entire structure client-side and send one large payload if backend supports nested creation.

---

### Workflow 2: Assign Template to Client

**Goal:** Give a client a personalized copy of a template.

```typescript
async function assignPlanToClient(templateId: string, clientId: string) {
  const response = await fetch(`/api/training_plans/${templateId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId })
  });
  
  const { data: assignedPlan } = await response.json();
  
  // assignedPlan.is_template === false
  // assignedPlan.client_id === clientId
  // assignedPlan.id !== templateId (it's a new plan)
  
  return assignedPlan;
}
```

---

### Workflow 3: Client Logs a Workout

**Goal:** Client completes today's workout and logs sets.

```typescript
async function logWorkout(plannedWorkoutId: string) {
  // 1. Start session
  const startRes = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session: { planned_workout_id: plannedWorkoutId }
    })
  });
  const { data: session } = await startRes.json();
  
  // 2. Log sets as user completes them
  // (Endpoint for adding sets not explicitly shown in controller)
  // You may need: POST /api/sessions/:id/sets or embedded in complete
  
  // 3. Complete the session
  const completeRes = await fetch(`/api/sessions/${session.id}/complete`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session: {
        soreness_rating: 3,
        notes: 'Good workout'
      }
    })
  });
  
  return await completeRes.json();
}
```

---

## Calendar & Schedule Logic

### Deriving "Today's Workout"

Given a client's assigned `TrainingPlan`, calculate which workout they should do today.

**Algorithm:**

```typescript
function getTodayWorkout(
  plan: TrainingPlan,
  startDate: Date // When plan started
): PlannedWorkout | null {
  const today = new Date();
  const daysSinceStart = Math.floor(
    (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const currentWeek = Math.floor(daysSinceStart / 7) + 1; // 1-indexed
  const dayOfWeek = (daysSinceStart % 7) + 1; // 1-7 (Mon-Sun)
  
  // Find active phase for current week
  const activeAssignment = plan.assignments.find(
    a => currentWeek >= a.start_week && currentWeek <= a.end_week
  );
  
  if (!activeAssignment) return null;
  
  const phase = plan.phases.find(p => p.id === activeAssignment.phase_id);
  if (!phase) return null;
  
  // Find workout for current day of week
  const workout = phase.workouts.find(w => w.day_of_week === dayOfWeek);
  
  return workout || null;
}
```

**Example:**
- Plan starts Jan 1 (Monday)
- Today is Jan 10 (Wednesday, day 10)
- `daysSinceStart = 9`, `currentWeek = 2`, `dayOfWeek = 3`
- Find assignment covering week 2
- Get phase's workout for day 3

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200/201 | Success | Process response |
| 400 | Bad request | Show validation errors |
| 401 | Unauthorized | Redirect to login |
| 403 | Forbidden | User lacks permission |
| 404 | Not found | Show "not found" UI |
| 500 | Server error | Show error toast, retry |

### Example Error Response
```json
{
  "errors": {
    "name": ["can't be blank"]
  }
}
```

---

## Implementation Checklist

### Phase 1: Exercise Library
- [ ] Fetch and display system exercises
- [ ] Search/filter exercises (client-side for MVP)
- [ ] Create custom exercises
- [ ] Display exercise details (muscles, equipment)

### Phase 2: Program Builder (Coach)
- [ ] List templates
- [ ] Create new template
- [ ] Add phases to template
- [ ] Add workouts to phase (builder UI)
- [ ] Add exercises and sets to workout
- [ ] Preview template structure

### Phase 3: Client Assignment
- [ ] List available templates
- [ ] Assign template to client
- [ ] View client's assigned plan
- [ ] Display client's calendar

### Phase 4: Workout Tracking (Client)
- [ ] Calculate "today's workout"
- [ ] Display planned workout details
- [ ] Start session
- [ ] Log sets (weight, reps, RPE)
- [ ] Complete session
- [ ] View workout history

### Phase 5: Analytics (Optional)
- [ ] Progress graphs (volume, strength)
- [ ] Compliance tracking
- [ ] 1RM estimation

---

## Additional Notes

### Weight Conversion
All weights are stored in **kg**. Convert for display:
```typescript
const lbsToKg = (lbs: number) => lbs * 0.453592;
const kgToLbs = (kg: number) => kg * 2.20462;
```

### Supersets
Exercises with the same `superset_group_id` are performed back-to-back without rest.

### Missing Endpoints
You may need to request these endpoints for granular editing:
- `POST /api/training_plans/:id/phases`
- `POST /api/phases/:id/workouts`
- `POST /api/workouts/:id/elements`
- `POST /api/sessions/:id/sets`

---

**Questions?** Reach out to backend team with specific endpoint needs.
