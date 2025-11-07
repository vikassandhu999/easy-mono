# Requirements Document

## Introduction

This document defines the requirements for the foundational nutrition management system for the Easy coaching platform. The system enables coaches to create and manage ingredients, recipes, and meals within their business context. This phase focuses on building the core reusable components that will later be integrated into nutrition plans.

The nutrition system integrates with the existing Organizations and Coaches modules, ensuring proper business context is maintained. Nutrition Plans will be designed in a future phase alongside Workout Plans to ensure consistent plan architecture across both domains.

## Glossary

- **Nutrition System**: The module for managing ingredients, recipes, and meals
- **Ingredient**: A basic food item with nutritional information (calories, protein, carbs, fats, fiber) that is reusable across recipes and meals
- **Recipe**: A reusable collection of ingredients with quantities and preparation instructions that can be added to meals
- **Meal**: A reusable eating occasion that contains recipes and/or direct ingredients, scoped to a business
- **Coach**: A user with a coach profile within a business who creates nutrition resources
- **Business**: An organization context within which coaches operate and share nutrition resources
- **Nutritional Values**: Calculated totals for calories, macronutrients (protein, carbs, fats), and fiber

## Requirements

### Requirement 1: Ingredient Management

**User Story:** As a coach, I want to manage a library of ingredients with nutritional information, so that I can build accurate recipes and meals for my clients.

#### Acceptance Criteria

1. WHEN a coach creates an ingredient, THE Nutrition System SHALL store the ingredient name, nutritional values per 100g (calories, protein, carbs, fats, fiber), and associate it with the coach's business
2. WHEN a coach views their ingredient library, THE Nutrition System SHALL display all ingredients created within their business context
3. WHEN a coach updates an ingredient, THE Nutrition System SHALL validate that the coach belongs to the same business as the ingredient
4. WHEN a coach deletes an ingredient, THE Nutrition System SHALL prevent deletion if the ingredient is used in any active recipes or meal templates
5. THE Nutrition System SHALL support ingredient search by name within a business context

### Requirement 2: Recipe Management

**User Story:** As a coach, I want to create reusable recipes with multiple ingredients and instructions, so that I can efficiently build meal templates without recreating common dishes.

#### Acceptance Criteria

1. WHEN a coach creates a recipe, THE Nutrition System SHALL require a name, optional description, preparation instructions, and at least one ingredient with quantity
2. WHEN a coach adds an ingredient to a recipe, THE Nutrition System SHALL store the ingredient reference, quantity, and unit of measurement
3. WHEN a recipe is saved, THE Nutrition System SHALL calculate and store total nutritional values based on all ingredient quantities
4. WHEN a coach views a recipe, THE Nutrition System SHALL display the complete ingredient list with quantities and total nutritional breakdown
5. WHEN a coach updates a recipe, THE Nutrition System SHALL recalculate nutritional values and associate the recipe with the coach's business
6. THE Nutrition System SHALL support recipe search by name within a business context

### Requirement 3: Meal Management

**User Story:** As a coach, I want to create reusable meals that can contain recipes or individual ingredients, so that I can build a library of meal options for future nutrition plans.

#### Acceptance Criteria

1. WHEN a coach creates a meal, THE Nutrition System SHALL require a name, meal type (breakfast, lunch, dinner, snack), and at least one recipe or ingredient
2. WHEN a coach adds a recipe to a meal, THE Nutrition System SHALL store the recipe reference and serving size multiplier
3. WHEN a coach adds an ingredient directly to a meal, THE Nutrition System SHALL store the ingredient reference, quantity, and unit
4. WHEN a meal is saved, THE Nutrition System SHALL calculate total nutritional values from all recipes and ingredients
5. WHEN a coach views a meal, THE Nutrition System SHALL display all components (recipes and ingredients) with their nutritional contributions
6. THE Nutrition System SHALL associate each meal with the coach's business for reusability across future nutrition plans

### Requirement 4: Meal Duplication

**User Story:** As a coach, I want to duplicate existing meals, so that I can quickly create variations without starting from scratch.

#### Acceptance Criteria

1. WHEN a coach duplicates a meal, THE Nutrition System SHALL create a new meal with all recipes and ingredients copied from the original
2. WHEN a meal is duplicated, THE Nutrition System SHALL append a suffix to the name to distinguish it from the original
3. WHEN a duplicated meal is created, THE Nutrition System SHALL recalculate nutritional values for the new meal
4. THE Nutrition System SHALL allow coaches to modify the duplicated meal without affecting the original
5. THE Nutrition System SHALL associate the duplicated meal with the same business as the original

### Requirement 5: Nutritional Calculations

**User Story:** As a coach, I want the system to automatically calculate nutritional values at all levels (recipe, meal), so that I can ensure accurate dietary information.

#### Acceptance Criteria

1. WHEN an ingredient is added to a recipe with a quantity, THE Nutrition System SHALL calculate proportional nutritional values based on the ingredient's per-100g values
2. WHEN a recipe is added to a meal, THE Nutrition System SHALL multiply the recipe's nutritional values by the serving size multiplier
3. WHEN a meal is viewed, THE Nutrition System SHALL display total nutritional values aggregated from all recipes and ingredients
4. WHEN an ingredient or recipe is updated, THE Nutrition System SHALL recalculate nutritional values for all dependent recipes and meals
5. THE Nutrition System SHALL support unit conversions (g, kg, ml, l, cup, tbsp) for accurate calculations

### Requirement 6: Business Context and Permissions

**User Story:** As a business owner, I want nutrition data to be scoped to my business, so that coaches can share resources within the organization while maintaining data privacy across businesses.

#### Acceptance Criteria

1. WHEN a coach creates any nutrition resource (ingredient, recipe, meal), THE Nutrition System SHALL associate it with the coach's business
2. WHEN a coach searches for ingredients, recipes, or meals, THE Nutrition System SHALL return only resources within their business context
3. WHEN a coach creates a meal, THE Nutrition System SHALL validate that all referenced recipes and ingredients belong to the same business
4. THE Nutrition System SHALL prevent coaches from accessing or modifying nutrition resources from other businesses
5. WHEN a coach is removed from a business, THE Nutrition System SHALL maintain their created resources within the business for other coaches to use

### Requirement 7: Resource Reusability

**User Story:** As a coach, I want to reuse recipes and ingredients across multiple meals, so that I can efficiently create consistent meal options.

#### Acceptance Criteria

1. WHEN a coach creates a recipe or ingredient, THE Nutrition System SHALL mark it as reusable within the business
2. WHEN a coach creates a meal, THE Nutrition System SHALL allow selection from all recipes and ingredients in their business
3. WHEN a recipe or ingredient is updated, THE Nutrition System SHALL recalculate nutritional values for all dependent meals
4. WHEN a recipe or ingredient is deleted, THE Nutrition System SHALL prevent deletion if it is referenced by any active meals
5. THE Nutrition System SHALL allow coaches to duplicate recipes and meals for customization without affecting the original

### Requirement 8: Data Validation and Integrity

**User Story:** As a system administrator, I want comprehensive data validation throughout the nutrition system, so that data integrity is maintained and coaches receive clear error messages.

#### Acceptance Criteria

1. WHEN nutritional values are entered, THE Nutrition System SHALL validate that all values are non-negative numbers
2. WHEN quantities are specified, THE Nutrition System SHALL validate that they are positive numbers with appropriate units
3. WHEN foreign key relationships are created, THE Nutrition System SHALL validate that all referenced entities exist and belong to the correct business
4. THE Nutrition System SHALL provide clear, actionable error messages for all validation failures
5. THE Nutrition System SHALL enforce unique constraints to prevent duplicate recipe-ingredient and meal-recipe associations
