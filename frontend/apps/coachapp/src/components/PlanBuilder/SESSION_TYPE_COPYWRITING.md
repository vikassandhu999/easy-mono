# Session Type Copywriting Improvements

## Overview
Enhanced all session-related copywriting to properly reflect the session type (Workout/Meal) throughout the PlanBuilder interface. Users now see context-specific labels that clearly indicate what type of session they're working with.

## ✅ Key Improvements

### 1. **Dynamic Modal Titles Based on Session Type**

**Before:**
- Add: "Add Session" (generic)
- Create: "Create workout" or "Create Session" (inconsistent)
- Edit: "Edit Session Details" (generic)

**After:**
- Add Workout: "Add Workout"
- Add Meal: "Add Meal"
- Create Workout: "Create Workout"
- Create Meal: "Create Meal"
- Edit Workout: "Edit Workout"
- Edit Meal: "Edit Meal"

**Implementation:**
```typescript
// Helper function using SESSION_TYPE_CONFIG
const getSessionTypeLabel = (sessionType?: 'meal' | 'workout' | null): string => {
    if (!sessionType) return 'Session';
    return SESSION_TYPE_CONFIG[sessionType]?.label ?? 'Session';
};

// Usage in titles
title={`Add ${getSessionTypeLabel(sessionTypeFilter)}`}
title={`Create ${getSessionTypeLabel(sessionTypeFilter)}`}
title={`Edit ${getSessionTypeLabel(editingPlanSession?.session?.session_type)}`}
```

### 2. **Context-Aware Modal Descriptions**

#### Add Session Modal
**Before:** No description

**After:**
```
Workout Plan: "Choose an existing workout or create a new one"
Meal Plan:    "Choose an existing meal or create a new one"
```

**Benefits:**
- ✅ Clarifies available actions
- ✅ Uses session type terminology
- ✅ Helps users understand what they can do

#### Create Session Modal
**Before:** No description

**After:**
```
Workout: "Build a new workout from scratch and add it to your plan"
Meal:    "Build a new meal from scratch and add it to your plan"
```

**Benefits:**
- ✅ Explains the action clearly
- ✅ Uses appropriate terminology (build a workout, build a meal)
- ✅ Clarifies outcome (added to plan)

#### Edit Session Modal
**Before:**
```
"Make changes to [Session Name]. Your updates will be reflected 
 across all plans using this session."
```

**After:**
```
"Make changes to [Session Name]. Updates will be reflected 
 across all plans using this workout/meal."
```

**Improvements:**
- ✅ Session name appears in **bold** (visual emphasis)
- ✅ Ends with specific session type ("this workout" vs "this session")
- ✅ More concise ("Updates" vs "Your updates")
- ✅ Context-aware terminology

### 3. **Type-Specific Success Notifications**

#### Creating New Session
**Before:**
```
Title: "Success"
Message: "Session created and added to plan"
```

**After:**
```
Workout: 
  Title: "Success"
  Message: "Workout created and added to your plan"

Meal:
  Title: "Success"
  Message: "Meal created and added to your plan"
```

**Improvements:**
- ✅ Uses specific terminology (Workout/Meal)
- ✅ More personal ("your plan")
- ✅ Clear and actionable

#### Selecting Existing Session
**Before:**
```
No notification (just closed modal)
```

**After:**
```
Workout:
  Title: "Success"  
  Message: "Workout added to your plan"

Meal:
  Title: "Success"
  Message: "Meal added to your plan"
```

**Benefits:**
- ✅ Provides positive feedback
- ✅ Confirms action completed
- ✅ Uses correct terminology

#### Updating Session
**Before:**
```
Title: "Session updated"
Message: "Your changes have been saved successfully"
```

**After:**
```
Workout:
  Title: "Workout updated"
  Message: "Your changes have been saved successfully"

Meal:
  Title: "Meal updated"
  Message: "Your changes have been saved successfully"
```

**Improvements:**
- ✅ Title reflects session type
- ✅ Maintains professional tone
- ✅ Clear confirmation

### 4. **Consistent Capitalization**

**Pattern Applied:**
- Session types in titles: **Capitalized** ("Workout", "Meal")
- Session types in descriptions: **lowercase** ("workout", "meal")
- Session types in notifications: **Capitalized** ("Workout", "Meal")

**Examples:**
```tsx
// Title (Capitalized)
title={`Create ${getSessionTypeLabel(sessionTypeFilter)}`}
// → "Create Workout"

// Description (lowercase for natural reading)
"Choose an existing {sessionTypeFilter} or create a new one"
// → "Choose an existing workout or create a new one"

// Notification (Capitalized)
message: `${getSessionTypeLabel(sessionTypeFilter)} created`
// → "Workout created"
```

### 5. **Helper Function Pattern**

**Created centralized helper:**
```typescript
const getSessionTypeLabel = (sessionType?: 'meal' | 'workout' | null): string => {
    if (!sessionType) return 'Session';
    return SESSION_TYPE_CONFIG[sessionType]?.label ?? 'Session';
};
```

**Benefits:**
- ✅ Single source of truth for labels
- ✅ Leverages existing SESSION_TYPE_CONFIG
- ✅ Type-safe
- ✅ Graceful fallback to "Session"
- ✅ Easy to extend for future session types

## 📊 Copywriting Matrix

| Context | Before | After (Workout) | After (Meal) |
|---------|--------|----------------|--------------|
| **Add Modal Title** | "Add Session" | "Add Workout" | "Add Meal" |
| **Add Modal Description** | None | "Choose an existing workout or create a new one" | "Choose an existing meal or create a new one" |
| **Create Modal Title** | "Create Session" | "Create Workout" | "Create Meal" |
| **Create Modal Description** | None | "Build a new workout from scratch and add it to your plan" | "Build a new meal from scratch and add it to your plan" |
| **Edit Modal Title** | "Edit Session Details" | "Edit Workout" | "Edit Meal" |
| **Edit Modal Description** | "...this session" | "...this workout" | "...this meal" |
| **Create Success** | "Session created and added to plan" | "Workout created and added to your plan" | "Meal created and added to your plan" |
| **Select Success** | No notification | "Workout added to your plan" | "Meal added to your plan" |
| **Update Success Title** | "Session updated" | "Workout updated" | "Meal updated" |

## 🎯 UX Principles Applied

### 1. **Clarity Through Specificity**
- **Before**: Generic "session" everywhere
- **After**: Specific "workout" or "meal" based on context
- **Impact**: Users immediately know what type of content they're working with

### 2. **Consistent Mental Models**
- Workout plans → Work with workouts
- Meal plans → Work with meals
- No confusion about what type of content to expect

### 3. **Reduced Cognitive Load**
- Session type visible in every modal
- No need to remember plan type
- Context always clear

### 4. **Professional Tone**
- Capitalized in titles (formal, professional)
- Lowercase in body text (natural reading)
- Consistent with app's voice

### 5. **Positive Reinforcement**
- All success notifications mention session type
- Confirms exactly what was accomplished
- Builds user confidence

## 🔧 Technical Implementation

### Data Flow:
```
Plan.discipline → sessionTypeFilter → getSessionTypeLabel() → UI
     ↓
"workout" → "workout" → "Workout" → "Add Workout"
"nutrition" → "meal" → "Meal" → "Add Meal"
```

### Session Type Resolution:
```typescript
// For new sessions (from plan discipline)
const sessionTypeFilter = useMemo(() => {
    if (!plan) return undefined;
    if (plan.discipline === 'nutrition') return 'meal';
    if (plan.discipline === 'workout') return 'workout';
    return undefined;
}, [plan]);

// For editing (from existing session)
const sessionType = editingPlanSession?.session?.session_type;
```

### Dependency Management:
```typescript
// Added sessionTypeFilter to dependency arrays
useCallback(
  async (session: {id: string}) => {
    // ... uses sessionTypeFilter in notification
  },
  [...otherDeps, sessionTypeFilter], // ✅ Included
);
```

## 📝 Copywriting Best Practices Applied

### 1. **Active Voice**
- ✅ "Build a new workout" (not "A new workout will be built")
- ✅ "Choose an existing meal" (not "An existing meal can be chosen")

### 2. **User-Focused Language**
- ✅ "your plan" (not "the plan")
- ✅ "Your changes" (not "The changes")

### 3. **Action-Oriented**
- ✅ "Create Workout" (clear action)
- ✅ "Edit Meal" (clear action)
- ✅ "Add" not "Select" (shows outcome)

### 4. **Scannable Text**
- ✅ Bold session names in descriptions
- ✅ Short, punchy notifications
- ✅ One idea per sentence

### 5. **Contextual Help**
- ✅ Descriptions explain what modal does
- ✅ Scope clarified (affects all plans)
- ✅ Next actions obvious

## ✨ Result

A cohesive, professional interface where:
- **Session type is always clear** from titles and descriptions
- **Terminology is consistent** across all touchpoints
- **Users feel confident** about what they're creating/editing
- **Success feedback is specific** and reassuring
- **Navigation is intuitive** with clear labeling

The copywriting now **guides users naturally** through their workflow, using the **right terminology at the right time**! 🎯

## 🚀 Future Extensibility

The pattern supports easy addition of new session types:

```typescript
// In sessionTypes.ts
export const SESSION_TYPE_CONFIG = {
  // ... existing types
  'habit': {
    label: 'Habit',
    // ... other config
  }
};

// Automatically works in all modals!
// "Add Habit"
// "Create Habit"  
// "Edit Habit"
// "Habit created and added to your plan"
```

No code changes needed in PlanBuilder - just add to config! ✅
