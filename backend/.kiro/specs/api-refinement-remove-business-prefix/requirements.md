# Requirements Document

## Introduction

This specification addresses the removal of the `/businesses/:business_id` prefix from nutrition-related API endpoints (ingredients, recipes, and meals). Currently, these endpoints require the business_id to be passed as a URL parameter, but since the business_id is already available in the JWT token claims and extracted into the scope, this creates unnecessary redundancy and a more verbose API surface. By removing this prefix, we simplify the API, reduce potential errors from mismatched business_id values, and create a cleaner, more intuitive developer experience.

## Glossary

- **Nutrition System**: The subsystem managing ingredients, recipes, and meals within the coaching platform
- **Scope**: An authentication context struct containing user_id, business_id, coach_id, and client_id extracted from JWT claims
- **JWT Token**: JSON Web Token containing user authentication and authorization claims
- **Business Context**: The business_id associated with the authenticated user's current session
- **API Endpoint**: A URL path that accepts HTTP requests and returns responses
- **Controller**: A Phoenix module that handles HTTP requests for specific resources
- **Authorization Helper**: Functions in EasyWeb.Authorization that verify user permissions

## Requirements

### Requirement 1: Remove Business ID from Nutrition Endpoint URLs

**User Story:** As an API consumer, I want to access nutrition resources without specifying business_id in the URL, so that I can use a simpler and more intuitive API.

#### Acceptance Criteria

1. WHEN a coach makes a GET request to `/api/ingredients`, THE Nutrition System SHALL return all ingredients for the business_id from the scope
2. WHEN a coach makes a POST request to `/api/ingredients`, THE Nutrition System SHALL create an ingredient in the business_id from the scope
3. WHEN a coach makes a GET request to `/api/recipes`, THE Nutrition System SHALL return all recipes for the business_id from the scope
4. WHEN a coach makes a POST request to `/api/recipes`, THE Nutrition System SHALL create a recipe in the business_id from the scope
5. WHEN a coach makes a GET request to `/api/meals`, THE Nutrition System SHALL return all meals for the business_id from the scope
6. WHEN a coach makes a POST request to `/api/meals`, THE Nutrition System SHALL create a meal in the business_id from the scope

### Requirement 2: Extract Business Context from Scope

**User Story:** As a backend developer, I want controllers to extract business_id from the scope instead of URL parameters, so that authorization is consistent and secure.

#### Acceptance Criteria

1. WHEN an ingredient controller action is invoked, THE Nutrition System SHALL extract business_id from conn.assigns.scope
2. WHEN a recipe controller action is invoked, THE Nutrition System SHALL extract business_id from conn.assigns.scope
3. WHEN a meal controller action is invoked, THE Nutrition System SHALL extract business_id from conn.assigns.scope
4. WHEN business_id is not present in the scope, THE Nutrition System SHALL return a 403 Forbidden error
5. WHEN a coach attempts to access resources, THE Nutrition System SHALL verify the coach belongs to the business_id from the scope

### Requirement 3: Update Router Configuration

**User Story:** As a backend developer, I want the router to reflect the simplified endpoint structure, so that the API routes are clear and maintainable.

#### Acceptance Criteria

1. THE Router SHALL define GET `/api/ingredients` without business_id prefix
2. THE Router SHALL define POST `/api/ingredients` without business_id prefix
3. THE Router SHALL define GET `/api/recipes` without business_id prefix
4. THE Router SHALL define POST `/api/recipes` without business_id prefix
5. THE Router SHALL define GET `/api/meals` without business_id prefix
6. THE Router SHALL define POST `/api/meals` without business_id prefix
7. THE Router SHALL remove the scope `/api/businesses/:business_id` for nutrition endpoints

### Requirement 4: Maintain Authorization Security

**User Story:** As a security-conscious developer, I want authorization checks to remain robust after removing business_id from URLs, so that users can only access resources they own.

#### Acceptance Criteria

1. WHEN a coach accesses an ingredient, THE Authorization Helper SHALL verify the coach belongs to the ingredient's business
2. WHEN a coach accesses a recipe, THE Authorization Helper SHALL verify the coach belongs to the recipe's business
3. WHEN a coach accesses a meal, THE Authorization Helper SHALL verify the coach belongs to the meal's business
4. WHEN a user without a coach profile attempts to access nutrition resources, THE Nutrition System SHALL return a 403 Forbidden error
5. WHEN a coach from business A attempts to access resources from business B, THE Nutrition System SHALL return a 403 Forbidden error

### Requirement 5: Preserve Existing Functionality

**User Story:** As an API consumer, I want all existing nutrition features to work identically after the URL change, so that my application logic remains unchanged except for the endpoint URLs.

#### Acceptance Criteria

1. THE Nutrition System SHALL support all existing query parameters (limit, offset, status, search, meal_type)
2. THE Nutrition System SHALL return identical response formats for all endpoints
3. THE Nutrition System SHALL maintain all existing validation rules
4. THE Nutrition System SHALL preserve all error handling behavior
5. THE Nutrition System SHALL continue to support all sub-resource operations (adding/removing ingredients from recipes, etc.)

### Requirement 6: Update Controller Logic

**User Story:** As a backend developer, I want controllers to handle the absence of business_id URL parameters gracefully, so that the code is clean and maintainable.

#### Acceptance Criteria

1. WHEN IngredientController.index is invoked, THE Controller SHALL extract business_id from scope instead of params
2. WHEN IngredientController.create is invoked, THE Controller SHALL extract business_id from scope instead of params
3. WHEN RecipeController.index is invoked, THE Controller SHALL extract business_id from scope instead of params
4. WHEN RecipeController.create is invoked, THE Controller SHALL extract business_id from scope instead of params
5. WHEN MealController.index is invoked, THE Controller SHALL extract business_id from scope instead of params
6. WHEN MealController.create is invoked, THE Controller SHALL extract business_id from scope instead of params
7. WHEN business_id is missing from scope, THE Controller SHALL return an appropriate error response
