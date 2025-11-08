# Implementation Plan

- [x] 1. Update router configuration to remove business_id prefix

  - Remove the nested scope `/api/businesses/:business_id` for nutrition endpoints
  - Create separate scopes for `/api/ingredients`, `/api/recipes`, and `/api/meals`
  - Move the index and create routes to their respective resource scopes
  - Ensure all routes use the `:api_authenticated` pipeline
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 2. Add scope extraction helper functions to controllers

  - [x] 2.1 Add extract_business_id/1 helper to IngredientController

    - Accept a Scope struct as parameter
    - Return `{:ok, business_id}` when business_id is present
    - Return `{:error, ApiError}` with forbidden status when business_id is nil
    - Use appropriate error message: "You must have an active business context to access this resource"
    - _Requirements: 2.1, 2.4_

  - [x] 2.2 Add extract_coach_id/1 helper to IngredientController

    - Accept a Scope struct as parameter
    - Return `{:ok, coach_id}` when coach_id is present
    - Return `{:error, ApiError}` with forbidden status when coach_id is nil
    - Use appropriate error message: "You must be a coach to access this resource"
    - _Requirements: 2.5_

  - [x] 2.3 Add extract_business_id/1 helper to RecipeController

    - Implement same logic as IngredientController
    - _Requirements: 2.2, 2.4_

  - [x] 2.4 Add extract_coach_id/1 helper to RecipeController

    - Implement same logic as IngredientController
    - _Requirements: 2.5_

  - [x] 2.5 Add extract_business_id/1 helper to MealController

    - Implement same logic as IngredientController
    - _Requirements: 2.3, 2.4_

  - [x] 2.6 Add extract_coach_id/1 helper to MealController
    - Implement same logic as IngredientController
    - _Requirements: 2.5_

- [x] 3. Update IngredientController to use scope-based authorization

  - [x] 3.1 Modify index/2 action

    - Change function signature from `def index(conn, %{"business_id" => business_id} = params)` to `def index(conn, params)`
    - Extract scope from `conn.assigns.scope`
    - Use `with` clause to extract business_id and coach_id from scope
    - Remove calls to `get_coach_for_user/1` and `Authorization.user_is_coach_in_business?/2`
    - Pass extracted business_id to `Nutrition.list_ingredients/2` and `Nutrition.search_ingredients/2`
    - Maintain all existing query parameter handling (limit, offset, status, search)
    - _Requirements: 2.1, 2.4, 2.5, 6.1_

  - [x] 3.2 Modify create/2 action
    - Change function signature from `def create(conn, %{"business_id" => business_id} = params)` to `def create(conn, params)`
    - Extract scope from `conn.assigns.scope`
    - Use `with` clause to extract business_id and coach_id from scope
    - Remove calls to `get_coach_for_user/1` and `Authorization.user_is_coach_in_business?/2`
    - Pass extracted business_id and coach_id to `Nutrition.create_ingredient/3`
    - Maintain all existing validation and error handling
    - _Requirements: 2.1, 2.4, 2.5, 6.1_

- [x] 4. Update RecipeController to use scope-based authorization

  - [x] 4.1 Modify index/2 action

    - Apply same changes as IngredientController.index/2
    - Pass extracted business_id to `Nutrition.list_recipes/2` and `Nutrition.search_recipes/2`
    - Maintain all existing query parameter handling
    - _Requirements: 2.2, 2.4, 2.5, 6.3_

  - [x] 4.2 Modify create/2 action
    - Apply same changes as IngredientController.create/2
    - Pass extracted business_id and coach_id to `Nutrition.create_recipe/3`
    - Maintain all existing validation and error handling
    - _Requirements: 2.2, 2.4, 2.5, 6.3_

- [x] 5. Update MealController to use scope-based authorization

  - [x] 5.1 Modify index/2 action

    - Apply same changes as IngredientController.index/2
    - Pass extracted business_id to `Nutrition.list_meals/2`
    - Maintain all existing query parameter handling (including meal_type filter)
    - _Requirements: 2.3, 2.4, 2.5, 6.5_

  - [x] 5.2 Modify create/2 action
    - Apply same changes as IngredientController.create/2
    - Pass extracted business_id and coach_id to `Nutrition.create_meal/3`
    - Maintain all existing validation and error handling
    - _Requirements: 2.3, 2.4, 2.5, 6.5_

- [x] 6. Update controller module documentation

  - [x] 6.1 Update IngredientController @moduledoc

    - Change endpoint documentation from `/api/businesses/:business_id/ingredients` to `/api/ingredients`
    - Update all endpoint examples in action documentation
    - _Requirements: 1.1, 1.2_

  - [x] 6.2 Update RecipeController @moduledoc

    - Change endpoint documentation from `/api/businesses/:business_id/recipes` to `/api/recipes`
    - Update all endpoint examples in action documentation
    - _Requirements: 1.3, 1.4_

  - [x] 6.3 Update MealController @moduledoc
    - Change endpoint documentation from `/api/businesses/:business_id/meals` to `/api/meals`
    - Update all endpoint examples in action documentation
    - _Requirements: 1.5, 1.6_

- [x] 7. Update integration tests

  - [x] 7.1 Update ingredient endpoint tests

    - Change test requests from `/api/businesses/:business_id/ingredients` to `/api/ingredients`
    - Verify all existing test cases still pass
    - Add test case for missing business context (403 Forbidden)
    - Add test case for missing coach context (403 Forbidden)
    - _Requirements: 1.1, 1.2, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 7.2 Update recipe endpoint tests

    - Change test requests from `/api/businesses/:business_id/recipes` to `/api/recipes`
    - Verify all existing test cases still pass
    - Add test case for missing business context (403 Forbidden)
    - Add test case for missing coach context (403 Forbidden)
    - _Requirements: 1.3, 1.4, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 7.3 Update meal endpoint tests
    - Change test requests from `/api/businesses/:business_id/meals` to `/api/meals`
    - Verify all existing test cases still pass
    - Add test case for missing business context (403 Forbidden)
    - Add test case for missing coach context (403 Forbidden)
    - _Requirements: 1.5, 1.6, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Verify and validate implementation

  - [x] 8.1 Run all tests

    - Execute `mix test` to ensure all tests pass
    - Fix any failing tests
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 8.2 Check for compilation warnings

    - Run `mix compile --warnings-as-errors`
    - Fix any warnings or errors
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 8.3 Run code quality checks
    - Execute `mix precommit` to run all quality checks
    - Fix any issues reported
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
