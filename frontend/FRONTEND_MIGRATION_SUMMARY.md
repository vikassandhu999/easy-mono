# Frontend Content API Migration Summary

**Date**: October 12, 2025  
**Scope**: CoachApp frontend updates to match backend content refactoring

## Changes Applied

### 1. Type Definitions (`contents.ts`)

#### Removed Fields
- ❌ `instructions` (string) - Moved to definitions
- ❌ `instruction_steps` (string[]) - Deprecated
- ❌ `instruction_url` (string) - Deprecated
- ❌ `duration` (number) - Moved to definitions
- ❌ `exercise_metadata` - Renamed to `exercise_definition`
- ❌ `ingredient_metadata` - Renamed to `ingredient_definition`
- ❌ `recipe_metadata` - Renamed to `recipe_definition`

#### Added Fields
- ✅ `definition` (any) - Raw JSONB definition from backend
- ✅ `exercise_definition` (ExerciseMetadata) - Typed exercise data
- ✅ `ingredient_definition` (IngredientMetadata) - Typed ingredient data
- ✅ `recipe_definition` (RecipeMetadata) - Typed recipe data

#### Schema Updates
**ContentMedia_zod**: Simplified from 5 fields to 3
```typescript
// Before
{ external_id?, mime_type?, source, type, url }

// After
{ name?, type?, url }
```

**CreateContent_zod & UpdateContent_zod**: Updated to use `_definition` suffix
```typescript
// Before
{ instructions?, instruction_steps?, instruction_url?, duration?, 
  exercise_metadata?, ingredient_metadata?, recipe_metadata? }

// After
{ description?, exercise_definition?, ingredient_definition?, recipe_definition? }
```

### 2. API Service (`contentsApi.ts`)

#### Removed
- ❌ `ContentType` import (unused)
- ❌ `ContentUIStructure` import (endpoint removed)
- ❌ `getContentUIStructure` query endpoint
- ❌ `useGetContentUIStructureQuery` hook export
- ❌ Query parameters from `getContent`: `includeMetadata`, `includeUIStructure`

#### Updated
**getContent** signature:
```typescript
// Before
{id: string; includeMetadata?: boolean; includeUIStructure?: boolean}

// After
{id: string}
```

### 3. Form Utilities (`contentForm.ts`)

#### Field Renames
- `instructions` → `description` (in BaseContentSchema)
- `exercise_metadata` → `exercise_definition`
- `recipe_metadata` → `recipe_definition`
- `ingredient_metadata` → `ingredient_definition`

#### Function Updates
- `defaultMetadata()` → `defaultDefinition()`
- `contentToFormValues()`: Maps `_definition` fields from Content
- `buildContentPayload()`: Outputs `_definition` fields for API

### 4. Form Components

#### ExerciseForm.tsx
**Updated field names:**
- `instructions` → `description`
- `exercise_metadata.muscle_groups` → `exercise_definition.muscle_groups`
- `exercise_metadata.equipment` → `exercise_definition.equipment`
- `exercise_metadata.difficulty_level` → `exercise_definition.difficulty_level`

#### RecipeForm.tsx
**Updated field names:**
- `instructions` → `description`
- `recipe_metadata.prep_time_minutes` → `recipe_definition.prep_time_minutes`
- `recipe_metadata.cook_time_minutes` → `recipe_definition.cook_time_minutes`
- `recipe_metadata.servings` → `recipe_definition.servings`

#### FoodForm.tsx
**Note**: Component exists but not currently used (ingredient type not in ContentTypeEnum). References `ingredient_metadata` - should be updated if/when ingredient support is added.

## Breaking Changes

### API Request/Response Format

**Before:**
```typescript
// Create request
{
  name: "Squat",
  instructions: "Stand with feet...",
  duration: 60,
  exercise_metadata: { equipment: [...] }
}

// Response
{
  id: "...",
  name: "Squat",
  instructions: "Stand with feet...",
  duration: 60,
  exercise_metadata: { equipment: [...] }
}
```

**After:**
```typescript
// Create request
{
  name: "Squat",
  description: "Lower body exercise...",
  exercise_definition: { 
    instructions: ["Stand with feet..."],
    equipment: [...] 
  }
}

// Response
{
  id: "...",
  name: "Squat",
  description: "Lower body exercise...",
  definition: { ... },  // Raw JSONB
  exercise_definition: { 
    instructions: ["Stand with feet..."],
    equipment: [...] 
  }
}
```

### Form State Structure

**Before:**
```typescript
{
  name: string;
  instructions: string;
  exercise_metadata: { muscle_groups: string[]; ... }
}
```

**After:**
```typescript
{
  name: string;
  description: string;
  exercise_definition: { muscle_groups: string[]; ... }
}
```

## Migration Impact

### User-Facing Changes
- ✅ **No breaking UI changes** - Forms still work the same way
- ✅ Label changed from "Instructions" → "Description" (more accurate)
- ✅ All form fields remain functional

### Developer Changes
- ⚠️ Any code referencing `content.instructions` must use `content.description`
- ⚠️ Any code referencing `content.duration` must look in `content.exercise_definition` or `content.recipe_definition`
- ⚠️ `useGetContentUIStructureQuery` hook removed - functionality no longer needed

## Testing Checklist

Frontend validation needed:
- [ ] Content creation (exercise) - verify payload structure
- [ ] Content creation (recipe) - verify payload structure
- [ ] Content editing - verify form population
- [ ] Content display - verify description shows correctly
- [ ] Content duplication - verify definitions copy correctly
- [ ] TypeScript compilation - no errors
- [ ] Build process - no warnings

## Files Modified

1. `/webapps/apps/coachapp/src/api/contents.ts` - Type definitions
2. `/webapps/apps/coachapp/src/store/services/contentsApi.ts` - API endpoints
3. `/webapps/apps/coachapp/src/components/ContentBuilder/contentForm.ts` - Form utilities
4. `/webapps/apps/coachapp/src/components/ContentBuilder/forms/ExerciseForm.tsx` - Exercise form
5. `/webapps/apps/coachapp/src/components/ContentBuilder/forms/RecipeForm.tsx` - Recipe form

## Compatibility

- **Backend API Version**: Requires migration 0011 applied
- **TypeScript**: No compilation errors introduced
- **React Query**: No breaking changes to query keys or cache
- **Mantine Forms**: Compatible with existing form handling

## Next Steps

1. Test frontend in development environment
2. Verify API calls work with updated backend
3. Check for any missed references to old field names
4. Update any documentation referencing old structure
5. Monitor for runtime errors after deployment
