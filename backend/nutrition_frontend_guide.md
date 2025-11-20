# Nutrition Builder - Complete Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Data Models](#data-models)
3. [Authentication](#authentication)
4. [Building Blocks](#building-blocks)
5. [Complete User Flows](#complete-user-flows)
6. [API Reference](#api-reference)
7. [Implementation Checklist](#implementation-checklist)

---

## Overview

The Nutrition Builder API follows a hierarchical structure:

```
Ingredients (base items)
    ↓
Recipes (combinations of ingredients)
    ↓
Nutrition Plans (templates or client-specific plans)
    ↓
Meals (breakfast, lunch, dinner, snacks)
    ↓
Meal Items (recipes in meals with servings)
```

**Base URL:** `http://localhost:4000/api` (adjust for production)

**All endpoints require authentication** via Bearer token in the `Authorization` header.

---

## Data Models

### Ingredient
```typescript
interface Ingredient {
  id: string; // UUID
  name: string;
  creator_id: string;
  business_id: string;
  inserted_at: string; // ISO 8601 timestamp
  updated_at: string;
}
```

### MeasurementUnit
```typescript
interface MeasurementUnit {
  id: string;
  name: string; // "gram", "ml", "oz", "cup", etc.
}
```

### RecipeIngredient
```typescript
interface RecipeIngredient {
  id: string;
  ingredient_id: string;
  ingredient: Ingredient;
  unit_id: string;
  unit: MeasurementUnit;
  quantity: number; // Decimal
  quantity_as_text?: string; // "1/2 cup", "to taste"
  order: number;
}
```

### Recipe
```typescript
interface Recipe {
  id: string;
  name: string;
  description?: string;
  instructions: string[]; // Array of steps
  instructions_as_text?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings: number; // Default: 1
  status: 'active' | 'draft' | 'archived';
  
  // Nutritional info (per entire recipe)
  total_calories?: number;
  total_protein?: number;
  total_carbohydrates?: number;
  total_fats?: number;
  total_fiber?: number;
  
  business_id: string;
  creator_id: string;
  creator?: Coach;
  recipe_ingredients: RecipeIngredient[];
  
  inserted_at: string;
  updated_at: string;
}
```

### NutritionPlan
```typescript
interface NutritionPlan {
  id: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  
  is_template: boolean; // true = template, false = client plan
  status: 'draft' | 'active' | 'archived';
  
  duration_weeks?: number;
  start_date?: string; // ISO 8601 date
  tags?: string[];
  
  client_id?: string; // null if template
  original_plan_id?: string; // if duplicated from template
  
  business_id: string;
  creator_id: string;
  
  meals: Meal[]; // Nested when fetching single plan
  
  inserted_at: string;
  updated_at: string;
}
```

### Meal
```typescript
interface Meal {
  id: string;
  daytime: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  day_number: number; // 1-based (day 1, day 2, etc.)
  label: string; // "Breakfast", "Post-Workout Snack"
  time?: string; // HH:MM format "08:00"
  notes?: string;
  sort_order: number; // Within the day
  
  nutrition_plan_id: string;
  meal_items?: MealItem[]; // Nested when included
  
  inserted_at: string;
  updated_at: string;
}
```

### MealItem
```typescript
interface MealItem {
  id: string;
  sort_order: number;
  servings: number; // Decimal - how many servings of the recipe
  
  recipe_id: string;
  meal_id: string;
  recipe?: Recipe; // Nested when included
  
  inserted_at: string;
  updated_at: string;
}
```

### ShoppingListItem
```typescript
interface ShoppingListItem {
  ingredient_id: string;
  ingredient_name: string;
  total_quantity: number;
  unit: string;
}
```

### MacrosSummary
```typescript
interface DailyMacros {
  day: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface TotalMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}
```

---

## Authentication

All API requests require a Bearer token:

```typescript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

---

## Building Blocks

### Step 1: Ingredients Management

#### 1.1 List Ingredients
```http
GET /api/ingredients
```

**Query Parameters:**
- `limit` (number, default: 50, max: 100)
- `offset` (number, default: 0)
- `search` (string) - Search by name

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Chicken Breast",
      "creator_id": "...",
      "business_id": "...",
      "inserted_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "limit": 50,
    "offset": 0,
    "total": 125
  }
}
```

**Frontend Example:**
```typescript
async function fetchIngredients(search?: string, page = 0, pageSize = 50) {
  const params = new URLSearchParams({
    limit: pageSize.toString(),
    offset: (page * pageSize).toString(),
    ...(search && { search })
  });
  
  const response = await fetch(`/api/ingredients?${params}`, { headers });
  const { data, meta } = await response.json();
  return { ingredients: data, pagination: meta };
}
```

---

#### 1.2 Create Ingredient
```http
POST /api/ingredients
```

**Request Body:**
```json
{
  "name": "Organic Quinoa"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "new-uuid",
    "name": "Organic Quinoa",
    "creator_id": "...",
    "business_id": "...",
    "inserted_at": "2024-01-15T10:35:00Z",
    "updated_at": "2024-01-15T10:35:00Z"
  }
}
```

**Frontend Example:**
```typescript
async function createIngredient(name: string) {
  const response = await fetch('/api/ingredients', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name })
  });
  const { data } = await response.json();
  return data;
}
```

---

#### 1.3 Update Ingredient
```http
PATCH /api/ingredients/:id
```

**Request Body:**
```json
{
  "name": "Organic Quinoa (Red)"
}
```

**Response:** `200 OK` with updated ingredient

---

#### 1.4 Delete Ingredient
```http
DELETE /api/ingredients/:id
```

**Response:** `204 No Content`

**⚠️ Warning:** Deleting an ingredient may fail if it's used in recipes.

---

### Step 2: Recipes Management

#### 2.1 List Recipes
```http
GET /api/recipes
```

**Query Parameters:**
- `limit` (number)
- `offset` (number)
- `status` (`active`, `draft`, `archived`)
- `search` (string) - Search by name

**Response:**
```json
{
  "data": [
    {
      "id": "recipe-uuid",
      "name": "Grilled Chicken with Veggies",
      "description": "High-protein meal",
      "instructions": [
        "Marinate chicken for 30 minutes",
        "Grill chicken for 6-8 minutes per side",
        "Steam vegetables until tender"
      ],
      "instructions_as_text": "Marinate...",
      "prep_time_minutes": 30,
      "cook_time_minutes": 20,
      "servings": 4,
      "status": "active",
      "total_calories": 1200,
      "total_protein": 180,
      "total_carbohydrates": 40,
      "total_fats": 30,
      "total_fiber": 10,
      "creator_id": "...",
      "business_id": "...",
      "recipe_ingredients": [
        {
          "id": "ri-uuid",
          "ingredient": {
            "id": "ing-uuid",
            "name": "Chicken Breast"
          },
          "unit": {
            "id": "unit-uuid",
            "name": "gram"
          },
          "quantity": 500,
          "order": 0
        }
      ],
      "inserted_at": "2024-01-15T11:00:00Z",
      "updated_at": "2024-01-15T11:00:00Z"
    }
  ],
  "meta": {
    "limit": 50,
    "offset": 0,
    "total": 45
  }
}
```

---

#### 2.2 Create Recipe
```http
POST /api/recipes
```

**Request Body:**
```json
{
  "name": "Protein Smoothie",
  "description": "Quick post-workout meal",
  "instructions": [
    "Add all ingredients to blender",
    "Blend until smooth",
    "Serve immediately"
  ],
  "prep_time_minutes": 5,
  "cook_time_minutes": 0,
  "servings": 1,
  "status": "active",
  "total_calories": 350,
  "total_protein": 30,
  "total_carbohydrates": 40,
  "total_fats": 8,
  "total_fiber": 5,
  "recipe_ingredients": [
    {
      "ingredient_id": "banana-uuid",
      "unit_id": "piece-uuid",
      "quantity": 1,
      "order": 0
    },
    {
      "ingredient_id": "protein-powder-uuid",
      "unit_id": "scoop-uuid",
      "quantity": 1,
      "order": 1
    },
    {
      "ingredient_id": "almond-milk-uuid",
      "unit_id": "ml-uuid",
      "quantity": 250,
      "order": 2
    }
  ]
}
```

**Response:** `201 Created` with full recipe including nested ingredients

**Frontend Example:**
```typescript
interface CreateRecipeData {
  name: string;
  description?: string;
  instructions: string[];
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings: number;
  status: 'active' | 'draft';
  total_calories?: number;
  total_protein?: number;
  total_carbohydrates?: number;
  total_fats?: number;
  total_fiber?: number;
  recipe_ingredients: {
    ingredient_id: string;
    unit_id?: string;
    quantity?: number;
    quantity_as_text?: string;
  }[];
}

async function createRecipe(data: CreateRecipeData) {
  const response = await fetch('/api/recipes', {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  return response.json();
}
```

---

#### 2.3 Update Recipe
```http
PATCH /api/recipes/:id
```

**Request Body:** Same as create (partial updates supported)

**Important:** When updating `recipe_ingredients`, send the complete array. Missing ingredients will be deleted.

---

#### 2.4 Get Single Recipe
```http
GET /api/recipes/:id
```

**Response:** Full recipe with nested ingredients

---

#### 2.5 Delete Recipe
```http
DELETE /api/recipes/:id
```

**Response:** `204 No Content`

**⚠️ Warning:** Cannot delete if recipe is used in meal items.

---

### Step 3: Nutrition Plans

#### 3.1 List Nutrition Plans
```http
GET /api/nutrition_plans
```

**Query Parameters:**
- `limit` (number)
- `offset` (number)
- `status` (`draft`, `active`, `archived`)
- `is_template` (boolean) - `true` for templates, `false` for client plans
- `search` (string)

**Response:**
```json
{
  "data": [
    {
      "id": "plan-uuid",
      "name": "Muscle Building - 4 Weeks",
      "description": "High protein plan for muscle gain",
      "thumbnail_url": "https://...",
      "is_template": true,
      "status": "active",
      "duration_weeks": 4,
      "start_date": null,
      "tags": ["muscle-gain", "high-protein"],
      "client_id": null,
      "original_plan_id": null,
      "creator_id": "...",
      "business_id": "...",
      "inserted_at": "2024-01-15T12:00:00Z",
      "updated_at": "2024-01-15T12:00:00Z"
    }
  ],
  "meta": {
    "limit": 50,
    "offset": 0,
    "total": 12
  }
}
```

**Frontend Example - Get Templates:**
```typescript
async function getTemplates() {
  const params = new URLSearchParams({
    is_template: 'true',
    status: 'active'
  });
  const response = await fetch(`/api/nutrition_plans?${params}`, { headers });
  return response.json();
}
```

**Frontend Example - Get Client Plans:**
```typescript
async function getClientPlans(clientId?: string) {
  const params = new URLSearchParams({
    is_template: 'false',
    status: 'active'
  });
  const response = await fetch(`/api/nutrition_plans?${params}`, { headers });
  return response.json();
}
```

---

#### 3.2 Create Nutrition Plan
```http
POST /api/nutrition_plans
```

**Request Body (Template):**
```json
{
  "name": "Keto Diet - 8 Weeks",
  "description": "Low carb, high fat meal plan",
  "thumbnail_url": "https://example.com/keto.jpg",
  "is_template": true,
  "status": "draft",
  "duration_weeks": 8,
  "tags": ["keto", "low-carb", "weight-loss"]
}
```

**Request Body (Client Plan):**
```json
{
  "name": "John Doe - Custom Plan",
  "description": "Personalized nutrition plan",
  "is_template": false,
  "status": "active",
  "duration_weeks": 12,
  "start_date": "2024-02-01",
  "client_id": "client-uuid"
}
```

**Response:** `201 Created` with plan (includes empty meals array)

---

#### 3.3 Get Single Plan (with meals)
```http
GET /api/nutrition_plans/:id
```

**Response:**
```json
{
  "data": {
    "id": "plan-uuid",
    "name": "Week 1 Plan",
    "description": "...",
    "is_template": false,
    "status": "active",
    "duration_weeks": 1,
    "start_date": "2024-02-01",
    "client_id": "client-uuid",
    "meals": [
      {
        "id": "meal-1",
        "daytime": "breakfast",
        "day_number": 1,
        "label": "Breakfast",
        "time": "08:00",
        "notes": "Pre-workout",
        "sort_order": 0,
        "meal_items": [
          {
            "id": "item-1",
            "sort_order": 0,
            "servings": 1.5,
            "recipe_id": "recipe-uuid",
            "recipe": {
              "id": "recipe-uuid",
              "name": "Protein Smoothie"
            }
          }
        ]
      }
    ],
    "inserted_at": "2024-01-20T10:00:00Z",
    "updated_at": "2024-01-20T10:00:00Z"
  }
}
```

---

#### 3.4 Update Nutrition Plan
```http
PATCH /api/nutrition_plans/:id
```

**Request Body:** Partial updates supported
```json
{
  "name": "Updated Plan Name",
  "status": "active"
}
```

---

#### 3.5 Delete Nutrition Plan
```http
DELETE /api/nutrition_plans/:id
```

**Response:** `204 No Content`

**Note:** Cascade deletes all meals and meal items.

---

#### 3.6 Duplicate Plan
```http
POST /api/nutrition_plans/:id/duplicate
```

**Use Case:** Clone a template for a specific client

**Request Body:**
```json
{
  "target_client_id": "client-uuid"
}
```

**Response:** `201 Created` with full duplicated plan including all meals and items

**Frontend Example:**
```typescript
async function assignTemplateToClient(templateId: string, clientId: string) {
  const response = await fetch(`/api/nutrition_plans/${templateId}/duplicate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ target_client_id: clientId })
  });
  return response.json();
}
```

---

#### 3.7 Copy Day
```http
POST /api/nutrition_plans/:id/copy-day
```

**Use Case:** Copy all meals from one day to another

**Request Body:**
```json
{
  "source_day": 1,
  "target_day": 2
}
```

**Response:** `200 OK` with updated plan

**Frontend Example:**
```typescript
async function copyDay(planId: string, fromDay: number, toDay: number) {
  const response = await fetch(`/api/nutrition_plans/${planId}/copy-day`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source_day: fromDay,
      target_day: toDay
    })
  });
  return response.json();
}
```

---

#### 3.8 Bulk Create Meals
```http
POST /api/nutrition_plans/:id/bulk-create-meals
```

**Use Case:** Initialize week structure with templates

**Request Body:**
```json
{
  "template": "standard",
  "days": [1, 2, 3, 4, 5, 6, 7]
}
```

**Available Templates:**
- `standard`: 5 meals/day (Breakfast, Morning Snack, Lunch, Afternoon Snack, Dinner)
- `simple`: 3 meals/day (Breakfast, Lunch, Dinner)

**Response:** `201 Created` with plan containing all created meals

**Frontend Example:**
```typescript
async function initializeWeek(planId: string, template: 'standard' | 'simple' = 'standard') {
  const response = await fetch(`/api/nutrition_plans/${planId}/bulk-create-meals`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      template,
      days: [1, 2, 3, 4, 5, 6, 7]
    })
  });
  return response.json();
}
```

---

#### 3.9 Reorder Meals Within Day
```http
POST /api/nutrition_plans/:id/reorder-meals
```

**Use Case:** Drag-and-drop meal reordering

**Request Body:**
```json
{
  "day_number": 1,
  "meal_ids": ["meal-3", "meal-1", "meal-2"]
}
```

**Response:** `204 No Content`

**Frontend Example:**
```typescript
async function reorderMeals(planId: string, dayNumber: number, mealIds: string[]) {
  await fetch(`/api/nutrition_plans/${planId}/reorder-meals`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      day_number: dayNumber,
      meal_ids: mealIds
    })
  });
}

// React DnD example
function onDragEnd(result: DropResult) {
  if (!result.destination) return;
  
  const newMealIds = Array.from(mealIds);
  const [removed] = newMealIds.splice(result.source.index, 1);
  newMealIds.splice(result.destination.index, 0, removed);
  
  reorderMeals(planId, currentDay, newMealIds);
}
```

---

#### 3.10 Get Shopping List
```http
GET /api/nutrition_plans/:id/shopping-list
```

**Use Case:** Generate aggregated shopping list for entire plan

**Response:**
```json
{
  "data": [
    {
      "ingredient_id": "chicken-uuid",
      "ingredient_name": "Chicken Breast",
      "total_quantity": 2500.5,
      "unit": "gram"
    },
    {
      "ingredient_id": "rice-uuid",
      "ingredient_name": "Brown Rice",
      "total_quantity": 1200.0,
      "unit": "gram"
    }
  ]
}
```

**Frontend Example:**
```typescript
async function getShoppingList(planId: string) {
  const response = await fetch(`/api/nutrition_plans/${planId}/shopping-list`, { headers });
  const { data } = await response.json();
  return data;
}

// Display component
function ShoppingList({ items }: { items: ShoppingListItem[] }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.ingredient_id}>
          {item.ingredient_name}: {item.total_quantity.toFixed(1)} {item.unit}
        </li>
      ))}
    </ul>
  );
}
```

---

#### 3.11 Get Macros
```http
GET /api/nutrition_plans/:id/macros
```

**Query Parameters:**
- `day_number` (optional) - Filter to specific day
- `aggregate` (optional) - `daily` (default) or `total`

**Response (Daily):**
```json
{
  "data": [
    {
      "day": 1,
      "calories": 2050.5,
      "protein": 155.3,
      "carbs": 205.7,
      "fat": 68.2,
      "fiber": 28.1
    },
    {
      "day": 2,
      "calories": 1980.0,
      "protein": 148.0,
      "carbs": 198.0,
      "fat": 66.0,
      "fiber": 25.0
    }
  ]
}
```

**Response (Total):**
```json
{
  "data": {
    "calories": 14280.0,
    "protein": 1085.0,
    "carbs": 1428.0,
    "fat": 476.0,
    "fiber": 196.0
  }
}
```

**Frontend Examples:**
```typescript
// Get daily breakdown
async function getDailyMacros(planId: string) {
  const response = await fetch(`/api/nutrition_plans/${planId}/macros`, { headers });
  const { data } = await response.json();
  return data as DailyMacros[];
}

// Get totals
async function getTotalMacros(planId: string) {
  const response = await fetch(
    `/api/nutrition_plans/${planId}/macros?aggregate=total`,
    { headers }
  );
  const { data } = await response.json();
  return data as TotalMacros;
}

// Get specific day
async function getDayMacros(planId: string, day: number) {
  const response = await fetch(
    `/api/nutrition_plans/${planId}/macros?day_number=${day}`,
    { headers }
  );
  const { data } = await response.json();
  return data[0] as DailyMacros;
}

// Chart component example
function MacrosChart({ macros }: { macros: DailyMacros[] }) {
  const chartData = macros.map(day => ({
    day: `Day ${day.day}`,
    calories: day.calories,
    protein: day.protein,
    carbs: day.carbs,
    fat: day.fat
  }));
  
  return <LineChart data={chartData} ... />;
}
```

---

### Step 4: Meals

#### 4.1 Create Meal
```http
POST /api/meals
```

**Request Body:**
```json
{
  "nutrition_plan_id": "plan-uuid",
  "daytime": "breakfast",
  "day_number": 1,
  "label": "Pre-Workout Breakfast",
  "time": "07:00",
  "notes": "High protein, moderate carbs",
  "sort_order": 0
}
```

**Response:** `201 Created` with meal

**Frontend Example:**
```typescript
async function createMeal(planId: string, data: {
  daytime: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  day_number: number;
  label: string;
  time?: string;
  notes?: string;
  sort_order?: number;
}) {
  const response = await fetch('/api/meals', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      nutrition_plan_id: planId,
      ...data
    })
  });
  return response.json();
}
```

---

#### 4.2 Get Meal
```http
GET /api/meals/:id
```

**Response:** Meal with nested items (if loaded)

---

#### 4.3 Update Meal
```http
PATCH /api/meals/:id
```

**Request Body:**
```json
{
  "label": "Updated Meal Name",
  "time": "08:30"
}
```

---

#### 4.4 Delete Meal
```http
DELETE /api/meals/:id
```

**Response:** `204 No Content`

**Note:** Cascade deletes all meal items.

---

### Step 5: Meal Items

#### 5.1 Add Recipe to Meal
```http
POST /api/meals/:meal_id/items
```

**Request Body:**
```json
{
  "recipe_id": "recipe-uuid",
  "servings": 1.5,
  "sort_order": 0
}
```

**Response:** `201 Created` with meal item

**Frontend Example:**
```typescript
async function addRecipeToMeal(
  mealId: string,
  recipeId: string,
  servings: number = 1
) {
  const response = await fetch(`/api/meals/${mealId}/items`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      recipe_id: recipeId,
      servings
    })
  });
  return response.json();
}
```

---

#### 5.2 List Meal Items
```http
GET /api/meals/:meal_id/items
```

**Response:**
```json
{
  "data": [
    {
      "id": "item-uuid",
      "sort_order": 0,
      "servings": 1,
      "recipe_id": "recipe-uuid",
      "meal_id": "meal-uuid",
      "recipe": {
        "id": "recipe-uuid",
        "name": "Protein Smoothie"
      }
    }
  ]
}
```

---

#### 5.3 Update Meal Item
```http
PATCH /api/meal_items/:id
```

**Use Case:** Change servings

**Request Body:**
```json
{
  "servings": 2.0
}
```

**Frontend Example:**
```typescript
async function updateServings(itemId: string, servings: number) {
  const response = await fetch(`/api/meal_items/${itemId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ servings })
  });
  return response.json();
}

// Servings adjuster component
function ServingsControl({ item }: { item: MealItem }) {
  const [servings, setServings] = useState(item.servings);
  
  const handleChange = async (newServings: number) => {
    setServings(newServings);
    await updateServings(item.id, newServings);
  };
  
  return (
    <input
      type="number"
      step="0.5"
      min="0.5"
      value={servings}
      onChange={(e) => handleChange(parseFloat(e.target.value))}
    />
  );
}
```

---

#### 5.4 Delete Meal Item
```http
DELETE /api/meal_items/:id
```

**Response:** `204 No Content`

---

#### 5.5 Reorder Meal Items
```http
POST /api/meals/:meal_id/reorder-items
```

**Request Body:**
```json
{
  "item_ids": ["item-3", "item-1", "item-2"]
}
```

**Response:** `200 OK` with reordered items

---

## Complete User Flows

### Flow 1: Create Template from Scratch

```typescript
// 1. Create a nutrition plan template
const template = await fetch('/api/nutrition_plans', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    name: "Muscle Gain - 4 Weeks",
    description: "High protein template",
    is_template: true,
    status: "draft",
    duration_weeks: 4
  })
}).then(r => r.json());

// 2. Initialize week 1 structure
await fetch(`/api/nutrition_plans/${template.data.id}/bulk-create-meals`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    template: "standard",
    days: [1, 2, 3, 4, 5, 6, 7]
  })
});

// 3. Get updated plan with meals
const planWithMeals = await fetch(`/api/nutrition_plans/${template.data.id}`, { headers })
  .then(r => r.json());

// 4. Add recipes to day 1 breakfast
const breakfastMeal = planWithMeals.data.meals.find(
  m => m.day_number === 1 && m.daytime === 'breakfast'
);

await fetch(`/api/meals/${breakfastMeal.id}/items`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    recipe_id: "protein-smoothie-uuid",
    servings: 1
  })
});

// 5. Copy day 1 to days 2-7 (meal prep!)
for (let day = 2; day <= 7; day++) {
  await fetch(`/api/nutrition_plans/${template.data.id}/copy-day`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source_day: 1,
      target_day: day
    })
  });
}

// 6. Publish template
await fetch(`/api/nutrition_plans/${template.data.id}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({ status: "active" })
});
```

---

### Flow 2: Assign Template to Client

```typescript
// 1. List available templates
const templates = await fetch('/api/nutrition_plans?is_template=true&status=active', { headers })
  .then(r => r.json());

// 2. Duplicate template for client
const clientPlan = await fetch(`/api/nutrition_plans/${selectedTemplateId}/duplicate`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    target_client_id: "client-uuid"
  })
}).then(r => r.json());

// 3. Customize if needed
await fetch(`/api/nutrition_plans/${clientPlan.data.id}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    name: "John Doe - Custom Muscle Gain",
    start_date: "2024-02-01"
  })
});
```

---

### Flow 3: Build Meal from Recipes

```typescript
// 1. Search for recipes
const recipes = await fetch('/api/recipes?search=chicken&status=active', { headers })
  .then(r => r.json());

// 2. Get plan details
const plan = await fetch(`/api/nutrition_plans/${planId}`, { headers })
  .then(r => r.json());

// 3. Find target meal (e.g., Day 3, Dinner)
const dinner = plan.data.meals.find(
  m => m.day_number === 3 && m.daytime === 'dinner'
);

// 4. Add multiple recipes to meal
const recipesToAdd = [
  { id: "grilled-chicken-uuid", servings: 1 },
  { id: "brown-rice-uuid", servings: 1.5 },
  { id: "steamed-broccoli-uuid", servings: 1 }
];

for (const recipe of recipesToAdd) {
  await fetch(`/api/meals/${dinner.id}/items`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      recipe_id: recipe.id,
      servings: recipe.servings
    })
  });
}

// 5. Get macros for this day
const dayMacros = await fetch(
  `/api/nutrition_plans/${planId}/macros?day_number=3`,
  { headers }
).then(r => r.json());

console.log('Day 3 macros:', dayMacros.data[0]);
```

---

### Flow 4: Weekly Meal Prep

```typescript
// 1. Create new plan
const plan = await createNutritionPlan({
  name: "Weekly Meal Prep",
  is_template: false,
  client_id: clientId,
  duration_weeks: 1,
  start_date: "2024-02-05"
});

// 2. Initialize simple structure (3 meals/day)
await fetch(`/api/nutrition_plans/${plan.id}/bulk-create-meals`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    template: "simple",
    days: [1, 2, 3, 4, 5]
  })
});

// 3. Build Monday (Day 1)
const monday = await fetch(`/api/nutrition_plans/${plan.id}`, { headers })
  .then(r => r.json());

const mondayMeals = monday.data.meals.filter(m => m.day_number === 1);

// Add to breakfast
await addRecipeToMeal(
  mondayMeals.find(m => m.daytime === 'breakfast').id,
  "oatmeal-uuid",
  1
);

// Add to lunch
await addRecipeToMeal(
  mondayMeals.find(m => m.daytime === 'lunch').id,
  "chicken-salad-uuid",
  1
);

// Add to dinner
await addRecipeToMeal(
  mondayMeals.find(m => m.daytime === 'dinner').id,
  "salmon-veggies-uuid",
  1
);

// 4. Copy Monday to rest of week
for (let day = 2; day <= 5; day++) {
  await fetch(`/api/nutrition_plans/${plan.id}/copy-day`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source_day: 1,
      target_day: day
    })
  });
}

// 5. Generate shopping list
const shoppingList = await fetch(
  `/api/nutrition_plans/${plan.id}/shopping-list`,
  { headers }
).then(r => r.json());

console.log('Shopping list:', shoppingList.data);
```

---

### Flow 5: Macro Tracking Dashboard

```typescript
// Component for tracking macros
function NutritionDashboard({ planId }: { planId: string }) {
  const [weeklyMacros, setWeeklyMacros] = useState<DailyMacros[]>([]);
  const [totalMacros, setTotalMacros] = useState<TotalMacros | null>(null);
  
  useEffect(() => {
    // Fetch daily breakdown
    fetch(`/api/nutrition_plans/${planId}/macros`, { headers })
      .then(r => r.json())
      .then(({ data }) => setWeeklyMacros(data));
    
    // Fetch totals
    fetch(`/api/nutrition_plans/${planId}/macros?aggregate=total`, { headers })
      .then(r => r.json())
      .then(({ data }) => setTotalMacros(data));
  }, [planId]);
  
  return (
    <div>
      <h2>Weekly Overview</h2>
      <MacroTotals macros={totalMacros} />
      
      <h2>Daily Breakdown</h2>
      <MacroTable data={weeklyMacros} />
      
      <h2>Trends</h2>
      <MacroChart data={weeklyMacros} />
    </div>
  );
}

// Helper components
function MacroTotals({ macros }: { macros: TotalMacros | null }) {
  if (!macros) return <Spinner />;
  
  return (
    <div className="grid grid-cols-5 gap-4">
      <Card>
        <h3>Calories</h3>
        <p className="text-2xl">{macros.calories.toFixed(0)}</p>
      </Card>
      <Card>
        <h3>Protein (g)</h3>
        <p className="text-2xl">{macros.protein.toFixed(1)}</p>
      </Card>
      <Card>
        <h3>Carbs (g)</h3>
        <p className="text-2xl">{macros.carbs.toFixed(1)}</p>
      </Card>
      <Card>
        <h3>Fat (g)</h3>
        <p className="text-2xl">{macros.fat.toFixed(1)}</p>
      </Card>
      <Card>
        <h3>Fiber (g)</h3>
        <p className="text-2xl">{macros.fiber.toFixed(1)}</p>
      </Card>
    </div>
  );
}
```

---

## API Reference

### Quick Reference Table

| Resource | List | Create | Read | Update | Delete | Special Actions |
|----------|------|--------|------|--------|--------|-----------------|
| **Ingredients** | GET `/ingredients` | POST `/ingredients` | GET `/ingredients/:id` | PATCH `/ingredients/:id` | DELETE `/ingredients/:id` | - |
| **Recipes** | GET `/recipes` | POST `/recipes` | GET `/recipes/:id` | PATCH `/recipes/:id` | DELETE `/recipes/:id` | - |
| **Nutrition Plans** | GET `/nutrition_plans` | POST `/nutrition_plans` | GET `/nutrition_plans/:id` | PATCH `/nutrition_plans/:id` | DELETE `/nutrition_plans/:id` | Duplicate, Copy Day, Bulk Create, Reorder, Shopping List, Macros |
| **Meals** | - | POST `/meals` | GET `/meals/:id` | PATCH `/meals/:id` | DELETE `/meals/:id` | - |
| **Meal Items** | GET `/meals/:meal_id/items` | POST `/meals/:meal_id/items` | - | PATCH `/meal_items/:id` | DELETE `/meal_items/:id` | Reorder |

---

### Error Handling

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "errors": {
    "name": ["can't be blank"],
    "servings": ["must be greater than 0"]
  }
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found:**
```json
{
  "error": "Plan not found."
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

**Frontend Error Handling:**
```typescript
async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Handle unauthorized (redirect to login)
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    
    const error = await response.json();
    throw new Error(error.error || error.errors || 'Request failed');
  }
  
  return response.json();
}
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Set up API client with authentication
- [ ] Implement error handling
- [ ] Create TypeScript interfaces for all models
- [ ] Build ingredient management (CRUD)
- [ ] Build recipe management (CRUD)

### Phase 2: Plans & Templates
- [ ] Implement nutrition plan listing
- [ ] Create template browsing UI
- [ ] Build plan creation form
- [ ] Implement template duplication
- [ ] Add plan editing capabilities

### Phase 3: Meal Building
- [ ] Implement bulk meal creation
- [ ] Build meal editor UI
- [ ] Add recipe search/selection
- [ ] Implement drag-and-drop for meals
- [ ] Add servings adjustment controls

### Phase 4: Meal Items
- [ ] Build recipe picker component
- [ ] Implement meal item management
- [ ] Add drag-and-drop for meal items
- [ ] Create servings input controls

### Phase 5: Advanced Features
- [ ] Implement copy day functionality
- [ ] Build shopping list view
- [ ] Create macro tracking dashboard
- [ ] Add day reordering
- [ ] Implement meal reordering within days

### Phase 6: Polish
- [ ] Add loading states
- [ ] Implement optimistic updates
- [ ] Add confirmation dialogs for destructive actions
- [ ] Create empty states
- [ ] Add success/error notifications

---

## Best Practices

### 1. Optimistic Updates
```typescript
function useMealItems(mealId: string) {
  const [items, setItems] = useState<MealItem[]>([]);
  
  async function updateServings(itemId: string, servings: number) {
    // Optimistic update
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, servings } : item
    ));
    
    try {
      await apiRequest(`/api/meal_items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ servings })
      });
    } catch (error) {
      // Revert on error
      fetchItems(); // Re-fetch from server
    }
  }
  
  return { items, updateServings };
}
```

### 2. Caching
```typescript
// Use React Query or SWR
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useNutritionPlan(planId: string) {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['nutrition-plan', planId],
    queryFn: () => apiRequest(`/api/nutrition_plans/${planId}`)
  });
  
  const updatePlan = useMutation({
    mutationFn: (updates: Partial<NutritionPlan>) =>
      apiRequest(`/api/nutrition_plans/${planId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-plan', planId] });
    }
  });
  
  return { plan: data?.data, isLoading, updatePlan };
}
```

### 3. Debouncing
```typescript
import { useDebouncedCallback } from 'use-debounce';

function RecipeSearch() {
  const [results, setResults] = useState([]);
  
  const search = useDebouncedCallback(async (query: string) => {
    const { data } = await apiRequest(
      `/api/recipes?search=${encodeURIComponent(query)}`
    );
    setResults(data);
  }, 300);
  
  return (
    <input
      type="search"
      onChange={(e) => search(e.target.value)}
      placeholder="Search recipes..."
    />
  );
}
```

### 4. Pagination
```typescript
function useInfiniteIngredients() {
  const [page, setPage] = useState(0);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [hasMore, setHasMore] = useState(true);
  
  async function loadMore() {
    const { data, meta } = await apiRequest(
      `/api/ingredients?limit=50&offset=${page * 50}`
    );
    
    setAllIngredients(prev => [...prev, ...data]);
    setHasMore(meta.offset + meta.limit < meta.total);
    setPage(prev => prev + 1);
  }
  
  return { ingredients: allIngredients, loadMore, hasMore };
}
```

---

## Summary

This guide covers **all 30+ endpoints** needed to build a complete nutrition builder:

**Foundation:**
- 5 Ingredient endpoints
- 5 Recipe endpoints

**Core Features:**
- 11 Nutrition Plan endpoints (including special actions)
- 4 Meal endpoints
- 5 Meal Item endpoints

**Advanced:**
- Shopping list generation
- Macro calculations
- Bulk operations
- Drag-and-drop reordering

Use this guide as the single source of truth for your nutrition builder implementation. Every endpoint is documented with examples, and complete user flows show how to connect them together.

