# Meals & Meal Items API Implementation Guide

## Overview

This guide documents the newly created Meals and Meal Items API services for the Nutrition Plan Builder. The implementation follows the existing patterns used in `recipes` and `nutrition_plans` services.

## Architecture

### Service Structure

```
src/services/
├── meals/
│   ├── meals_definition.ts      # Type definitions and Zod schemas
│   ├── meals.ts                 # RTK Query endpoints and hooks
│   └── index.ts                 # Exports
├── meal_items/
│   ├── meal_items_definition.ts # Type definitions and Zod schemas
│   ├── meal_items.ts            # RTK Query endpoints and hooks
│   └── index.ts                 # Exports
```

## Meals Service

### Type Definitions (`meals_definition.ts`)

```typescript
type MealDaytime = 'early_morning' | 'breakfast' | 'lunch' | 'dinner' | 'preworkout' | 'postworkout' | 'snack';

type Meal = {
    id: string;
    daytime: MealDaytime;
    day_number: number;
    label: null | string;
    time: null | string;
    notes: null | string;
    sort_order: number;
    nutrition_plan_id: string;
    meal_items: MealItem[];
    inserted_at: string;
    updated_at: string;
};

type CreateMeal = {
    nutrition_plan_id: string;
    daytime: MealDaytime;
    day_number: number;
    label?: string;
    time?: string;
    notes?: string;
    sort_order?: number;
};

type UpdateMeal = Partial<Omit<CreateMeal, 'day_number'>> & {id: string};
```

### API Endpoints

#### Create Meal
```typescript
const {mutate: createMeal} = useCreateMeal();

createMeal({
    nutrition_plan_id: "plan-123",
    daytime: "breakfast",
    day_number: 1,
    label: "Early Breakfast",
    time: "07:00:00",
    notes: "High protein option",
});
```

**Request:**
```
POST /api/nutrition_plans/{nutrition_plan_id}/meals
Content-Type: application/json

{
    "daytime": "breakfast",
    "day_number": 1,
    "label": "Early Breakfast",
    "time": "07:00:00",
    "notes": "High protein option",
    "sort_order": 0
}
```

**Response:**
```json
{
    "data": {
        "id": "meal-123",
        "daytime": "breakfast",
        "day_number": 1,
        "label": "Early Breakfast",
        "time": "07:00:00",
        "notes": "High protein option",
        "sort_order": 0,
        "nutrition_plan_id": "plan-123",
        "meal_items": [],
        "inserted_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-15T10:00:00Z"
    }
}
```

#### Get Meal
```typescript
const {data: meal} = useGetMeal("meal-123");
```

**Request:**
```
GET /api/meals/{id}
```

**Response:** Same as Create Meal response

#### Update Meal
```typescript
const {mutate: updateMeal} = useUpdateMeal();

updateMeal({
    id: "meal-123",
    label: "Updated Breakfast",
    time: "08:00:00",
});
```

**Request:**
```
PATCH /api/meals/{id}
Content-Type: application/json

{
    "label": "Updated Breakfast",
    "time": "08:00:00"
}
```

#### Delete Meal
```typescript
const {mutate: deleteMeal} = useDeleteMeal();

deleteMeal({
    id: "meal-123",
    nutrition_plan_id: "plan-123"
});
```

**Request:**
```
DELETE /api/meals/{id}
```

#### List Meals
```typescript
const {data, fetchNextPage, hasNextPage} = useListMeals({
    nutrition_plan_id: "plan-123",
    day_number: 1,
});
```

**Request:**
```
GET /api/meals?nutrition_plan_id=plan-123&day_number=1&limit=50&offset=0
```

**Response:**
```json
{
    "data": [
        {
            "id": "meal-123",
            "daytime": "breakfast",
            "day_number": 1,
            "label": "Breakfast",
            ...
        }
    ],
    "meta": {
        "offset": 0,
        "limit": 50,
        "total": 7
    }
}
```

#### Copy Meal to Day
```typescript
const {mutate: copyMeal} = useCopyMealToDay();

copyMeal({
    id: "meal-123",
    target_day: 3
});
```

**Request:**
```
POST /api/meals/{id}/copy_to_day
Content-Type: application/json

{
    "target_day": 3
}
```

**Response:** New meal with same items but on target day

## Meal Items Service

### Type Definitions (`meal_items_definition.ts`)

```typescript
type MealItem = {
    id: string;
    sort_order: number;
    servings: number | string;
    recipe_id: string;
    meal_id: string;
    recipe?: Recipe;
    inserted_at: string;
    updated_at: string;
};

type CreateMealItem = {
    meal_id: string;
    recipe_id: string;
    servings: number | string;
    sort_order?: number;
};

type UpdateMealItem = {
    id: string;
    servings?: number | string;
    sort_order?: number;
};
```

### API Endpoints

#### Add Recipe to Meal
```typescript
const {mutate: addRecipe} = useCreateMealItem();

addRecipe({
    meal_id: "meal-123",
    recipe_id: "recipe-456",
    servings: 2,
    sort_order: 0,
});
```

**Request:**
```
POST /api/meals/{meal_id}/meal_items
Content-Type: application/json

{
    "recipe_id": "recipe-456",
    "servings": 2,
    "sort_order": 0
}
```

**Response:**
```json
{
    "data": {
        "id": "meal-item-789",
        "sort_order": 0,
        "servings": 2,
        "recipe_id": "recipe-456",
        "meal_id": "meal-123",
        "recipe": {
            "id": "recipe-456",
            "name": "Scrambled Eggs",
            ...
        },
        "inserted_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-15T10:00:00Z"
    }
}
```

#### Update Meal Item (Servings)
```typescript
const {mutate: updateItem} = useUpdateMealItem();

updateItem({
    id: "meal-item-789",
    servings: 3,
});
```

**Request:**
```
PATCH /api/meal_items/{id}
Content-Type: application/json

{
    "servings": 3
}
```

#### Delete Meal Item
```typescript
const {mutate: deleteItem} = useDeleteMealItem();

deleteItem({
    id: "meal-item-789",
    meal_id: "meal-123"
});
```

**Request:**
```
DELETE /api/meal_items/{id}
```

#### List Meal Items
```typescript
const {data, fetchNextPage, hasNextPage} = useListMealItems({
    meal_id: "meal-123",
});
```

**Request:**
```
GET /api/meal_items?meal_id=meal-123&limit=50&offset=0
```

#### Reorder Meal Items
```typescript
const {mutate: reorder} = useReorderMealItems();

reorder({
    meal_id: "meal-123",
    item_ids: ["item-1", "item-3", "item-2"],
});
```

**Request:**
```
POST /api/meals/{meal_id}/meal_items/reorder
Content-Type: application/json

{
    "item_ids": ["item-1", "item-3", "item-2"]
}
```

## Usage Examples

### Complete Workflow: Add Recipes to Breakfast

```typescript
import {useCreateMeal, useCopyMealToDay} from '@/services/meals';
import {useCreateMealItem} from '@/services/meal_items';

function MealBuilder({planId, dayNumber}) {
    const {mutate: createMeal} = useCreateMeal();
    const {mutate: addRecipe} = useCreateMealItem();

    const handleAddBreakfast = async () => {
        // 1. Create breakfast meal
        const mealResult = await createMeal({
            nutrition_plan_id: planId,
            daytime: 'breakfast',
            day_number: dayNumber,
            label: 'Morning Breakfast',
        });

        // 2. Add recipes
        const recipes = [
            {id: 'recipe-1', servings: 2},
            {id: 'recipe-2', servings: 1},
        ];

        recipes.forEach((recipe, idx) => {
            addRecipe({
                meal_id: mealResult.id,
                recipe_id: recipe.id,
                servings: recipe.servings,
                sort_order: idx,
            });
        });
    };

    return <button onClick={handleAddBreakfast}>Create Breakfast</button>;
}
```

### Integration with PlanSingleDay

```typescript
import {useCreateMealItem} from '@/services/meal_items';
import {RecipeSelectWithDrawer} from '@/shared/RecipeSelect';

function PlanSingleDay() {
    const {mutate: addRecipe} = useCreateMealItem();
    const [selectedMeal, setSelectedMeal] = useState(null);

    const handleRecipeComplete = (selectedIds, selectedRecipes) => {
        selectedIds.forEach((recipeId, idx) => {
            addRecipe({
                meal_id: selectedMeal.id,
                recipe_id: recipeId,
                servings: 1,
                sort_order: idx,
            });
        });
    };

    return (
        <>
            {/* ... meal cards ... */}
            <RecipeSelectWithDrawer
                onComplete={handleRecipeComplete}
                onClose={() => setSelectedMeal(null)}
            />
        </>
    );
}
```

## Caching & Invalidation

### Tag Hierarchy

The service uses RTK Query tags for automatic cache invalidation:

- **Meals**: Invalidated when meals are created, updated, or deleted
- **MealItems**: Invalidated when meal items are created, updated, or deleted
- **NutritionPlans**: Invalidated when meals change (to refresh plan view)

### Example: Creating a meal item automatically refreshes the meal

```typescript
// Creating a meal item with meal_id: "meal-123"
useCreateMealItem({
    meal_id: "meal-123",
    recipe_id: "recipe-456",
    servings: 2,
})

// Automatically invalidates:
// - {type: 'Meals', id: 'meal-123'}
// - Refreshes useGetMeal("meal-123") query
```

## Error Handling

All mutations follow the standard error format:

```typescript
const {mutate, isLoading, error} = useCreateMeal();

mutate(mealData, {
    onSuccess: (data) => {
        console.log('Meal created:', data);
    },
    onError: (error) => {
        console.error('Failed:', error.data);
        // {error: {status: 400, message: '...', data: {...}}}
    }
});
```

## Frontend Integration Checklist

- [ ] Update `NutritionPlanBuilder` to use `useCreateMeal` and `useCreateMealItem`
- [ ] Implement recipe selection and addition in `PlanSingleDay`
- [ ] Add meal display with recipe cards
- [ ] Implement drag-and-drop reordering via `useReorderMealItems`
- [ ] Add servings editor for meal items
- [ ] Display daily macros calculation
- [ ] Add copy day functionality with `useCopyMealToDay`
- [ ] Implement optimistic updates for better UX
- [ ] Add loading and error states

## Backend Integration Points

### Controller Actions
- `POST /api/nutrition_plans/{plan_id}/meals` - Create meal
- `GET /api/meals/{id}` - Get meal
- `PATCH /api/meals/{id}` - Update meal
- `DELETE /api/meals/{id}` - Delete meal
- `POST /api/meals/{id}/copy_to_day` - Copy to another day
- `POST /api/meals/{meal_id}/meal_items` - Add recipe to meal
- `PATCH /api/meal_items/{id}` - Update meal item
- `DELETE /api/meal_items/{id}` - Delete meal item
- `POST /api/meals/{meal_id}/meal_items/reorder` - Reorder items

### Response Format
All endpoints follow the standard format:

```json
{
    "data": {
        // Single item or array
    },
    "meta": {
        "offset": 0,
        "limit": 50,
        "total": 100
    }
}
```

## Related Services

- **Recipes**: `useListRecipes`, `useGetRecipe`
- **Nutrition Plans**: `useGetNutritionPlan`
- **Recipe Select**: `RecipeSelectWithDrawer`

## Performance Considerations

1. **Infinite Queries**: Meals and meal items use infinite scroll for large lists
2. **Pagination**: Default 50 items per page, configurable
3. **Caching**: Automatic cache invalidation on mutations
4. **Selective Preloading**: Only preload meal_items when needed

## Known Limitations

- Meals require a valid `nutrition_plan_id`
- Meal items require a valid `recipe_id`
- Servings must be > 0
- `day_number` is immutable after creation (use copy_to_day for different days)
- Unique constraint on `(meal_id, recipe_id)` prevents duplicate recipes in same meal
