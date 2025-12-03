# Nutrition Schema Migration Guide

This document outlines breaking API changes made to standardize the Nutrition domain schemas with the Training domain.

## Overview

The Nutrition domain schemas have been updated for consistency with the Training domain. This includes field renames, standardized naming conventions, and improved type safety.

---

## Breaking Changes

### 1. Field Renames

#### `creator_id` → `author_id`

Applies to: **NutritionPlan**, **Recipe**, **Ingredient**

```diff
// NutritionPlan response
{
  "id": "...",
  "name": "Weekly Meal Plan",
- "creator_id": "coach-uuid",
+ "author_id": "coach-uuid",
  ...
}

// Recipe response
{
  "id": "...",
  "name": "Grilled Chicken",
- "creator_id": "coach-uuid",
+ "author_id": "coach-uuid",
  ...
}

// Ingredient response
{
  "id": "...",
  "name": "Chicken Breast",
- "creator_id": "coach-uuid",
+ "author_id": "coach-uuid",
  ...
}
```

#### `original_plan_id` → `original_template_id`

Applies to: **NutritionPlan**

```diff
// NutritionPlan response
{
  "id": "...",
  "name": "Client's Meal Plan",
  "is_template": false,
- "original_plan_id": "template-uuid",
+ "original_template_id": "template-uuid",
  ...
}
```

#### `sort_order` → `position`

Applies to: **Meal**, **MealItem**

```diff
// Meal response
{
  "id": "...",
  "day_number": 1,
  "daytime": "breakfast",
- "sort_order": 0,
+ "position": 0,
  ...
}

// MealItem response
{
  "id": "...",
  "recipe_id": "...",
  "servings": "1.5",
- "sort_order": 0,
+ "position": 0,
  ...
}
```

#### `order` → `position`

Applies to: **RecipeIngredient** (nested in Recipe response)

```diff
// Recipe response with ingredients
{
  "id": "...",
  "name": "Grilled Chicken",
  "recipe_ingredients": [
    {
      "id": "...",
-     "order": 0,
+     "position": 0,
      "quantity": "200",
      "ingredient_id": "...",
      ...
    }
  ]
}
```

---

## Request Payload Changes

When creating or updating resources, use the new field names:

### Creating a Meal

```diff
POST /api/nutrition-plans/:plan_id/meals
{
  "daytime": "breakfast",
  "day_number": 1,
  "label": "Breakfast",
- "sort_order": 0
+ "position": 0
}
```

### Creating a MealItem

```diff
POST /api/meals/:meal_id/items
{
  "recipe_id": "recipe-uuid",
  "servings": "1.5",
- "sort_order": 0
+ "position": 0
}
```

### Creating a Recipe with Ingredients

```diff
POST /api/recipes
{
  "name": "Grilled Chicken",
  "servings": 2,
  "recipe_ingredients": [
    {
      "ingredient_id": "ingredient-uuid",
      "quantity": "200",
      "unit_id": "unit-uuid",
-     "order": 0
+     "position": 0
    }
  ]
}
```

---

## Migration Checklist

### Frontend Updates Required

- [ ] Update all references to `creator_id` → `author_id` in:
  - Nutrition plan displays and forms
  - Recipe displays and forms  
  - Ingredient displays and forms

- [ ] Update all references to `original_plan_id` → `original_template_id` in:
  - Nutrition plan detail views
  - Plan duplication/assignment logic

- [ ] Update all references to `sort_order` → `position` in:
  - Meal list ordering
  - Meal item list ordering
  - Drag-and-drop reordering logic

- [ ] Update all references to `order` → `position` in:
  - Recipe ingredient ordering
  - Recipe creation/edit forms

### TypeScript Interface Updates

```typescript
// Before
interface NutritionPlan {
  id: string;
  name: string;
  creator_id: string;
  original_plan_id: string | null;
  // ...
}

interface Meal {
  id: string;
  day_number: number;
  sort_order: number;
  // ...
}

interface MealItem {
  id: string;
  sort_order: number;
  // ...
}

interface RecipeIngredient {
  id: string;
  order: number;
  // ...
}

// After
interface NutritionPlan {
  id: string;
  name: string;
  author_id: string;
  original_template_id: string | null;
  // ...
}

interface Meal {
  id: string;
  day_number: number;
  position: number;
  // ...
}

interface MealItem {
  id: string;
  position: number;
  // ...
}

interface RecipeIngredient {
  id: string;
  position: number;
  // ...
}
```

---

## Consistency with Training Domain

These changes align the Nutrition domain with existing Training domain conventions:

| Concept | Training Domain | Nutrition Domain (New) |
|---------|-----------------|------------------------|
| Creator reference | `author_id` | `author_id` |
| Template reference | `original_template_id` | `original_template_id` |
| Ordering field | `position` | `position` |
| Lifecycle status | `status` | `status` |

---

## Questions?

If you have questions about these changes, please reach out to the backend team.
