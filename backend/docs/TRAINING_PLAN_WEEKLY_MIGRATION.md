# Training Plan Weekly Schedule - Frontend Migration Guide

## Overview

Training plans have been updated to use a **weekly schedule model**. Plans are now designed for a single week (7 days) and repeat based on the day of the week when assigned to a client.

## Breaking Changes

### 1. `duration_weeks` Field Removed

**Before:**
```json
{
  "id": "uuid",
  "name": "PPL Program",
  "duration_weeks": 8,
  ...
}
```

**After:**
```json
{
  "id": "uuid",
  "name": "PPL Program",
  "start_date": "2024-01-01",
  "end_date": "2024-03-31",
  ...
}
```

| Old Field | New Fields | Notes |
|-----------|------------|-------|
| `duration_weeks` | `start_date`, `end_date` | Only present on assigned plans (non-templates) |

### 2. Assign Endpoint Now Requires Dates

**Endpoint:** `POST /api/training_plans/:id/assign`

**Before:**
```json
{
  "client_id": "client-uuid",
  "start_date": "2024-01-01"  // Optional
}
```

**After:**
```json
{
  "client_id": "client-uuid",
  "start_date": "2024-01-01",  // Required (ISO 8601)
  "end_date": "2024-03-31"     // Required (ISO 8601)
}
```

**Validation Errors:**
```json
{
  "errors": {
    "start_date": ["is required"],
    "end_date": ["is required"]
  }
}
```

### 3. Workout `day_number` Now Represents Day of Week

**Before:** `day_number` was a sequential day (1, 2, 3, ... up to any number)

**After:** `day_number` is constrained to 1-7 representing days of the week

| day_number | Day |
|------------|-----|
| 1 | Monday |
| 2 | Tuesday |
| 3 | Wednesday |
| 4 | Thursday |
| 5 | Friday |
| 6 | Saturday |
| 7 | Sunday |

### 4. New `day_name` Field in Workout Response

Workouts now include a human-readable `day_name` field:

```json
{
  "id": "workout-uuid",
  "name": "Push Day",
  "day_number": 1,
  "day_name": "Monday",
  "notes": "...",
  "elements": [...]
}
```

## Updated Response Schemas

### Training Plan (Template)

```json
{
  "data": {
    "id": "uuid",
    "name": "Push Pull Legs",
    "description": "3-day split program",
    "is_template": true,
    "start_date": null,
    "end_date": null,
    "business_id": "uuid",
    "author_id": "uuid",
    "client_id": null,
    "original_template_id": null,
    "workouts": [...]
  }
}
```

### Training Plan (Assigned to Client)

```json
{
  "data": {
    "id": "uuid",
    "name": "Push Pull Legs",
    "description": "3-day split program",
    "is_template": false,
    "start_date": "2024-01-01",
    "end_date": "2024-03-31",
    "business_id": "uuid",
    "author_id": "uuid",
    "client_id": "client-uuid",
    "original_template_id": "template-uuid",
    "workouts": [...]
  }
}
```

### Planned Workout

```json
{
  "id": "uuid",
  "name": "Push Day",
  "notes": "Focus on chest and triceps",
  "day_number": 1,
  "day_name": "Monday",
  "elements": [...]
}
```

## Frontend Implementation Guide

### 1. Update TypeScript Interfaces

```typescript
// Before
interface TrainingPlan {
  id: string;
  name: string;
  description?: string;
  is_template: boolean;
  duration_weeks?: number;
  // ...
}

// After
interface TrainingPlan {
  id: string;
  name: string;
  description?: string;
  is_template: boolean;
  start_date: string | null;  // ISO 8601 date (YYYY-MM-DD)
  end_date: string | null;    // ISO 8601 date (YYYY-MM-DD)
  business_id: string;
  author_id: string;
  client_id: string | null;
  original_template_id: string | null;
  workouts: PlannedWorkout[];
}

interface PlannedWorkout {
  id: string;
  name: string;
  notes?: string;
  day_number: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  day_name: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  elements: WorkoutElement[];
}
```

### 2. Update Assign Form

Add date range picker for assigning training plans:

```tsx
// Example React component
function AssignTrainingPlanForm({ planId, clientId, onSuccess }) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      // Show validation error
      return;
    }

    await api.post(`/training_plans/${planId}/assign`, {
      client_id: clientId,
      start_date: formatISO(startDate, { representation: 'date' }),
      end_date: formatISO(endDate, { representation: 'date' }),
    });

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <DatePicker
        label="Start Date"
        value={startDate}
        onChange={setStartDate}
        required
      />
      <DatePicker
        label="End Date"
        value={endDate}
        onChange={setEndDate}
        minDate={startDate}
        required
      />
      <Button type="submit">Assign Plan</Button>
    </form>
  );
}
```

### 3. Update Workout Day Selection

When creating/editing workouts, use a weekday selector instead of a numeric input:

```tsx
const WEEKDAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

function WorkoutDaySelect({ value, onChange }) {
  return (
    <Select
      label="Day of Week"
      value={value}
      onChange={onChange}
      options={WEEKDAYS}
    />
  );
}
```

### 4. Display Training Plan Duration

Instead of showing weeks, calculate and display the duration from dates:

```typescript
function formatPlanDuration(plan: TrainingPlan): string {
  if (plan.is_template || !plan.start_date || !plan.end_date) {
    return 'Template (Weekly)';
  }
  
  const start = parseISO(plan.start_date);
  const end = parseISO(plan.end_date);
  const weeks = differenceInWeeks(end, start);
  
  if (weeks < 1) {
    const days = differenceInDays(end, start) + 1;
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  
  return `${weeks} week${weeks !== 1 ? 's' : ''}`;
}
```

### 5. Calendar View for Assigned Plans

For displaying assigned plans, generate repeating workout dates:

```typescript
function getWorkoutDates(
  plan: TrainingPlan,
  workout: PlannedWorkout
): Date[] {
  if (!plan.start_date || !plan.end_date) return [];
  
  const dates: Date[] = [];
  const start = parseISO(plan.start_date);
  const end = parseISO(plan.end_date);
  
  // day_number: 1 = Monday (ISO weekday)
  let current = start;
  
  // Find first occurrence of this weekday
  while (getISODay(current) !== workout.day_number && current <= end) {
    current = addDays(current, 1);
  }
  
  // Add all occurrences
  while (current <= end) {
    dates.push(current);
    current = addWeeks(current, 1);
  }
  
  return dates;
}
```

## Removed Fields

| Field | Status | Migration |
|-------|--------|-----------|
| `duration_weeks` | **Removed** | Use `start_date` and `end_date` to calculate duration |

## New Fields

| Field | Location | Type | Notes |
|-------|----------|------|-------|
| `start_date` | TrainingPlan | `string \| null` | ISO 8601 date, null for templates |
| `end_date` | TrainingPlan | `string \| null` | ISO 8601 date, null for templates |
| `day_name` | PlannedWorkout | `string` | Human-readable day name |

## Validation Rules

1. **Workouts:** `day_number` must be between 1 and 7
2. **Assigned Plans:** Both `start_date` and `end_date` are required
3. **Date Range:** `end_date` must be greater than or equal to `start_date`
4. **Templates:** `start_date` and `end_date` should be `null`

## Questions?

Contact the backend team if you have any questions about these changes.
