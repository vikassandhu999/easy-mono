# Requirements Document

## Introduction

This specification defines the refactoring of the nutrition system to embed ingredients directly within recipes as a list, eliminating ingredients as a separate database entity. This architectural change simplifies the data model by removing the ingredient table and related join tables (recipe_ingredients, meal_ingredients), while maintaining all nutritional calculation capabilities.

## Glossary

- **Nutrition System**: The module responsible for managing recipes, meals, and nutritional information within the application
- **Recipe**: A reusable collection of ingredient names with preparation instructions and nutritional information
- **Meal**: A reusable eating occasion that contains one or more recipes
- **Ingredient**: A simple text name of a food item (currently a separate entity, will become a simple text list)
- **Embedded Ingredient**: An ingredient name stored as a string within a recipe's ingredients array field (new approach)
- **Business Context**: The organizational scope that owns recipes and meals for data isolation
- **Coach**: A user who creates and manages recipes and meals within a business context
- **Nutritional Values**: Calories, protein, carbohydrates, fats, and fiber measurements stored directly on recipes and meals
- **Recipe Ingredient Join Table**: The current recipe_ingredients table that associates recipes with ingredients (to be removed)
- **Meal Ingredient Join Table**: The current meal_ingredients table that associates meals with ingredients (to be removed)

## Requirements

### Requirement 1

**User Story:** As a coach, I want ingredients to be embedded directly in recipes as simple text names, so that I can manage recipe ingredients without maintaining a separate ingredient database

#### Acceptance Criteria

1. WHEN a coach creates a recipe, THE Nutrition System SHALL accept a list of ingredient names as strings
2. WHEN a coach updates a recipe, THE Nutrition System SHALL allow modification of the embedded ingredients list
3. WHEN a coach views a recipe, THE Nutrition System SHALL display all ingredient names
4. THE Nutrition System SHALL store ingredients as a JSONB array of strings within the recipes table
5. THE Nutrition System SHALL validate that each ingredient is a non-empty string

### Requirement 2

**User Story:** As a coach, I want meals to only contain recipes, so that meal management is simplified without direct ingredient associations

#### Acceptance Criteria

1. THE Nutrition System SHALL remove the ability to add ingredients directly to meals
2. WHEN a coach creates a meal, THE Nutrition System SHALL only accept recipes as meal components
3. WHEN a coach views a meal, THE Nutrition System SHALL display recipes and their embedded ingredients
4. THE Nutrition System SHALL remove the meal_ingredients table and all related code
5. THE Nutrition System SHALL maintain the meal_recipes association for adding recipes to meals

### Requirement 3

**User Story:** As a coach, I want to manually enter nutritional values for recipes and meals, so that I can track nutrition without automatic calculations

#### Acceptance Criteria

1. WHEN a coach creates or updates a recipe, THE Nutrition System SHALL accept manually entered nutritional values (calories, protein, carbohydrates, fats, fiber)
2. WHEN a coach creates or updates a meal, THE Nutrition System SHALL accept manually entered nutritional values (calories, protein, carbohydrates, fats, fiber)
3. THE Nutrition System SHALL NOT automatically calculate nutritional values from ingredients
4. THE Nutrition System SHALL store nutritional values in recipe fields (total_calories, total_protein, etc.)
5. THE Nutrition System SHALL store nutritional values in meal fields (total_calories, total_protein, etc.)

### Requirement 4

**User Story:** As a system administrator, I want to migrate existing ingredient data to embedded format, so that ingredient names are preserved during the refactoring

#### Acceptance Criteria

1. THE Nutrition System SHALL provide a database migration that converts existing recipe_ingredients to embedded ingredient name lists
2. WHEN the migration runs, THE Nutrition System SHALL copy ingredient names from the ingredients table into recipe JSONB fields
3. THE Nutrition System SHALL remove the ingredients table after data migration is complete
4. THE Nutrition System SHALL remove the recipe_ingredients table after data migration is complete
5. THE Nutrition System SHALL remove the meal_ingredients table after data migration is complete

### Requirement 5

**User Story:** As a coach, I want a simple way to add ingredient names to recipes, so that I can quickly build recipe ingredient lists

#### Acceptance Criteria

1. WHEN a coach creates a recipe, THE Nutrition System SHALL accept an array of ingredient name strings
2. WHEN a coach updates a recipe, THE Nutrition System SHALL allow adding, removing, or modifying ingredient names in the list
3. THE Nutrition System SHALL allow coaches to enter any custom ingredient names
4. THE Nutrition System SHALL store ingredient names as a simple array of strings
5. THE Nutrition System SHALL validate that ingredient names are non-empty strings

### Requirement 6

**User Story:** As a developer, I want the API to remain backward compatible where possible, so that existing integrations continue to work

#### Acceptance Criteria

1. THE Nutrition System SHALL maintain existing recipe CRUD API endpoints with updated request/response formats
2. THE Nutrition System SHALL maintain existing meal CRUD API endpoints with updated request/response formats
3. THE Nutrition System SHALL remove ingredient CRUD API endpoints (create_ingredient, update_ingredient, delete_ingredient, list_ingredients)
4. THE Nutrition System SHALL remove recipe-ingredient association endpoints (add_ingredient_to_recipe, remove_ingredient_from_recipe, update_recipe_ingredient)
5. THE Nutrition System SHALL remove meal-ingredient association endpoints (add_ingredient_to_meal, remove_ingredient_from_meal, update_meal_ingredient)

### Requirement 7

**User Story:** As a coach, I want ingredient validation to ensure data quality, so that recipes contain valid ingredient names

#### Acceptance Criteria

1. WHEN a coach adds an ingredient to a recipe, THE Nutrition System SHALL validate that the ingredient name is a non-empty string
2. WHEN a coach adds an ingredient to a recipe, THE Nutrition System SHALL validate that the ingredient name has a maximum length of 255 characters
3. THE Nutrition System SHALL allow duplicate ingredient names in the same recipe
4. THE Nutrition System SHALL trim whitespace from ingredient names before storing
5. THE Nutrition System SHALL return validation errors if any ingredient in the list fails validation
