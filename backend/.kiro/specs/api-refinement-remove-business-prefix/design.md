# Design Document

## Overview

This design document outlines the approach for removing the `/businesses/:business_id` prefix from nutrition-related API endpoints (ingredients, recipes, and meals). The change simplifies the API by leveraging the business_id already present in the JWT token scope, eliminating redundancy and reducing the potential for errors caused by mismatched business_id values.

The refactoring involves three main components:

1. **Router updates** - Remove the business_id parameter from nutrition endpoint paths
2. **Controller modifications** - Extract business_id from scope instead of URL parameters
3. **Authorization verification** - Ensure security is maintained using scope-based checks

This is a low-risk refactoring that maintains all existing functionality while improving the developer experience.

## Architecture

### Current Architecture

```
Client Request
    ↓
Router: /api/businesses/:business_id/ingredients
    ↓
AuthenticateToken Plug → Extracts JWT → Creates Scope (with business_id)
    ↓
IngredientController.index(conn, %{"business_id" => business_id})
    ↓
Extract business_id from params
    ↓
Authorization check: user_is_coach_in_business?(user, business_id)
    ↓
Nutrition.list_ingredients(business_id, opts)
```

### New Architecture

```
Client Request
    ↓
Router: /api/ingredients
    ↓
AuthenticateToken Plug → Extracts JWT → Creates Scope (with business_id)
    ↓
IngredientController.index(conn, params)
    ↓
Extract business_id from conn.assigns.scope
    ↓
Authorization check: scope has business_id and coach_id
    ↓
Nutrition.list_ingredients(business_id, opts)
```

### Key Differences

1. **URL Simplification**: Business ID is no longer in the URL path
2. **Single Source of Truth**: Business context comes exclusively from the JWT scope
3. **Consistent Pattern**: Aligns with other controllers (ClientController, CoachController, BusinessController) that already use scope
4. **Reduced Complexity**: No need to validate that URL business_id matches scope business_id

## Components and Interfaces

### 1. Router Changes

**File**: `lib/easy_web/router.ex`

**Current Routes**:

```elixir
scope "/api/businesses/:business_id", EasyWeb do
  pipe_through :api_authenticated

  # Ingredient endpoints
  get "/ingredients", IngredientController, :index
  post "/ingredients", IngredientController, :create

  # Recipe endpoints
  get "/recipes", RecipeController, :index
  post "/recipes", RecipeController, :create

  # Meal endpoints
  get "/meals", MealController, :index
  post "/meals", MealController, :create
end
```

**New Routes**:

```elixir
scope "/api/ingredients", EasyWeb do
  pipe_through :api_authenticated

  get "/", IngredientController, :index
  post "/", IngredientController, :create
end

scope "/api/recipes", EasyWeb do
  pipe_through :api_authenticated

  get "/", RecipeController, :index
  post "/", RecipeController, :create
end

scope "/api/meals", EasyWeb do
  pipe_through :api_authenticated

  get "/", MealController, :index
  post "/", MealController, :create
end
```

**Rationale**:

- Consolidates nutrition endpoints into their respective resource scopes
- Removes the nested business_id parameter
- Maintains consistency with existing individual resource routes (e.g., `/api/ingredients/:id`)

### 2. Controller Modifications

#### IngredientController

**File**: `lib/easy_web/controllers/ingredient_controller.ex`

**Changes Required**:

1. **index/2 action**:

   - Remove: `def index(conn, %{"business_id" => business_id} = params)`
   - Add: `def index(conn, params)`
   - Extract business_id from scope: `scope = conn.assigns.scope`
   - Add validation: Ensure scope has business_id and coach_id

2. **create/2 action**:
   - Remove: `def create(conn, %{"business_id" => business_id} = params)`
   - Add: `def create(conn, params)`
   - Extract business_id from scope
   - Add validation: Ensure scope has business_id and coach_id

**Pattern**:

```elixir
def index(conn, params) do
  scope = conn.assigns.scope

  with {:ok, business_id} <- extract_business_id(scope),
       {:ok, _coach_id} <- extract_coach_id(scope) do
    # Parse query parameters
    limit = min(parse_int(params["limit"], 50), 100)
    offset = parse_int(params["offset"], 0)
    status = params["status"] || "active"

    # Fetch ingredients using business_id from scope
    ingredients =
      case params["search"] do
        nil ->
          Nutrition.list_ingredients(business_id, limit: limit, offset: offset, status: status)
        search_query when is_binary(search_query) and search_query != "" ->
          Nutrition.search_ingredients(business_id, search_query)
        _ ->
          Nutrition.list_ingredients(business_id, limit: limit, offset: offset, status: status)
      end

    conn
    |> put_status(:ok)
    |> json(%{
      ingredients: Enum.map(ingredients, &format_ingredient/1),
      meta: %{limit: limit, offset: offset, total: length(ingredients)}
    })
  end
end
```

#### RecipeController

**File**: `lib/easy_web/controllers/recipe_controller.ex`

**Changes Required**:

1. **index/2 action**: Same pattern as IngredientController
2. **create/2 action**: Same pattern as IngredientController

#### MealController

**File**: `lib/easy_web/controllers/meal_controller.ex`

**Changes Required**:

1. **index/2 action**: Same pattern as IngredientController
2. **create/2 action**: Same pattern as IngredientController

### 3. Helper Functions

Each controller will need two new private helper functions:

```elixir
# Extracts business_id from scope
defp extract_business_id(%Scope{business_id: business_id}) when not is_nil(business_id) do
  {:ok, business_id}
end

defp extract_business_id(_) do
  {:error, ApiError.forbidden("You must have an active business context to access this resource")}
end

# Extracts coach_id from scope
defp extract_coach_id(%Scope{coach_id: coach_id}) when not is_nil(coach_id) do
  {:ok, coach_id}
end

defp extract_coach_id(_) do
  {:error, ApiError.forbidden("You must be a coach to access this resource")}
end
```

**Rationale**:

- Provides clear error messages when business or coach context is missing
- Follows the with-clause pattern used throughout the codebase
- Returns appropriate 403 Forbidden errors for authorization failures

### 4. Authorization Updates

**Current Authorization Pattern**:

```elixir
with {:ok, _coach} <- get_coach_for_user(current_user),
     :ok <- Authorization.user_is_coach_in_business?(current_user, business_id) do
  # ... action logic
end
```

**New Authorization Pattern**:

```elixir
with {:ok, business_id} <- extract_business_id(scope),
     {:ok, coach_id} <- extract_coach_id(scope) do
  # ... action logic
end
```

**Key Changes**:

- No longer need to call `get_coach_for_user(current_user)` since coach_id is in scope
- No longer need to call `Authorization.user_is_coach_in_business?` since scope already validates this
- Simpler, more direct authorization checks
- Scope-based authorization is already validated by the AuthenticateToken plug

**Security Considerations**:

- The AuthenticateToken plug verifies JWT signature and expiration
- The Scope.from_claims/1 function validates claim structure
- Business and coach IDs in scope are cryptographically signed in the JWT
- No additional database queries needed for basic authorization
- Individual resource access (show, update, delete) still validates ownership via business_id comparison

## Data Models

No changes to data models are required. The following schemas remain unchanged:

- `Easy.Nutrition.Ingredient`
- `Easy.Nutrition.Recipe`
- `Easy.Nutrition.Meal`
- `Easy.Nutrition.RecipeIngredient`
- `Easy.Nutrition.MealRecipe`
- `Easy.Nutrition.MealIngredient`

## Error Handling

### New Error Scenarios

1. **Missing Business Context**

   - **Condition**: Scope does not have business_id
   - **Response**: 403 Forbidden
   - **Message**: "You must have an active business context to access this resource"
   - **Code**: "forbidden"

2. **Missing Coach Context**
   - **Condition**: Scope does not have coach_id
   - **Response**: 403 Forbidden
   - **Message**: "You must be a coach to access this resource"
   - **Code**: "forbidden"

### Existing Error Scenarios (Unchanged)

1. **Resource Not Found**: 404 Not Found
2. **Validation Errors**: 422 Unprocessable Entity
3. **Unauthorized Access**: 403 Forbidden (when accessing resources from different business)
4. **Resource In Use**: 422 Unprocessable Entity (when deleting ingredients/recipes in use)

### Error Response Format

All errors follow the existing ApiError format:

```json
{
  "error": {
    "message": "You must be a coach to access this resource",
    "code": "forbidden"
  }
}
```

## Testing Strategy

### Unit Tests

No new unit tests are required as the business logic remains unchanged. Existing tests for:

- `Easy.Nutrition` context functions
- Authorization helpers
- Scope construction

### Integration Tests

Update existing integration tests to use new endpoint URLs:

1. **Ingredient Endpoints**

   - Update: `POST /api/businesses/:business_id/ingredients` → `POST /api/ingredients`
   - Update: `GET /api/businesses/:business_id/ingredients` → `GET /api/ingredients`

2. **Recipe Endpoints**

   - Update: `POST /api/businesses/:business_id/recipes` → `POST /api/recipes`
   - Update: `GET /api/businesses/:business_id/recipes` → `GET /api/recipes`

3. **Meal Endpoints**
   - Update: `POST /api/businesses/:business_id/meals` → `POST /api/meals`
   - Update: `GET /api/businesses/:business_id/meals` → `GET /api/meals`

### New Test Cases

Add test cases for new error scenarios:

1. **Test: Request without business context**

   - Create JWT token without business_id claim
   - Attempt to access `/api/ingredients`
   - Expect: 403 Forbidden with appropriate message

2. **Test: Request without coach context**

   - Create JWT token without coach_id claim
   - Attempt to access `/api/ingredients`
   - Expect: 403 Forbidden with appropriate message

3. **Test: Successful access with valid scope**
   - Create JWT token with business_id and coach_id
   - Access `/api/ingredients`
   - Expect: 200 OK with ingredients from the business

### Test File Locations

- Integration tests: `test/easy_web/nutrition_endpoints_test.exs` (new file or update existing)
- Authorization tests: Update existing authorization tests if they reference old URLs

## Migration Considerations

### Breaking Changes

This is a **breaking change** for API consumers. The endpoint URLs are changing:

**Before**:

- `GET /api/businesses/:business_id/ingredients`
- `POST /api/businesses/:business_id/ingredients`
- `GET /api/businesses/:business_id/recipes`
- `POST /api/businesses/:business_id/recipes`
- `GET /api/businesses/:business_id/meals`
- `POST /api/businesses/:business_id/meals`

**After**:

- `GET /api/ingredients`
- `POST /api/ingredients`
- `GET /api/recipes`
- `POST /api/recipes`
- `GET /api/meals`
- `POST /api/meals`

### Deployment Strategy

1. **Version the API** (if needed): Consider adding API versioning if backward compatibility is required
2. **Update Documentation**: Update all API documentation to reflect new endpoints
3. **Client Updates**: Ensure all API clients are updated before or immediately after deployment
4. **Monitoring**: Monitor for 404 errors on old endpoints after deployment

### Rollback Plan

If issues arise:

1. Revert router changes to restore old endpoints
2. Revert controller changes to accept business_id from params
3. No database changes are involved, so rollback is straightforward

## Implementation Order

1. **Phase 1: Router Updates**

   - Update router.ex to define new routes
   - Keep old routes temporarily for testing (optional)

2. **Phase 2: Controller Updates**

   - Add helper functions (extract_business_id, extract_coach_id)
   - Update IngredientController.index and create
   - Update RecipeController.index and create
   - Update MealController.index and create

3. **Phase 3: Testing**

   - Update integration tests
   - Add new test cases for error scenarios
   - Manual testing with Postman/curl

4. **Phase 4: Cleanup**
   - Remove old routes if they were kept for testing
   - Update API documentation
   - Remove unused helper functions (get_coach_for_user if no longer needed)

## Performance Considerations

### Performance Improvements

1. **Reduced Authorization Queries**: No longer need to query the database to verify coach membership in business (already validated in JWT)
2. **Simpler Request Processing**: Fewer parameters to extract and validate

### No Performance Degradation

- Same number of database queries for fetching resources
- Same response payload structure
- Same pagination and filtering logic

## Security Considerations

### Security Maintained

1. **JWT Signature Verification**: AuthenticateToken plug verifies JWT signature
2. **Scope Validation**: Scope.from_claims validates claim structure
3. **Business Isolation**: Resources are still filtered by business_id
4. **Coach Authorization**: Coach context is still required for all operations

### Security Improvements

1. **Single Source of Truth**: Business context comes only from JWT, eliminating potential for URL parameter manipulation
2. **Consistent Authorization**: All nutrition endpoints use the same scope-based pattern
3. **Reduced Attack Surface**: Fewer parameters to validate and sanitize

### Potential Risks

1. **JWT Compromise**: If JWT is compromised, attacker has access to business resources (same risk as before)
2. **Scope Tampering**: Mitigated by JWT signature verification
3. **Missing Context**: New error handling ensures requests without proper context are rejected

## Documentation Updates

### API Documentation

Update the following documentation files:

- `docs/API_STRUCTURE.md` - Update nutrition endpoint URLs
- Any OpenAPI/Swagger specifications
- Postman collections
- Client SDK documentation

### Code Documentation

Update module documentation in:

- `lib/easy_web/controllers/ingredient_controller.ex`
- `lib/easy_web/controllers/recipe_controller.ex`
- `lib/easy_web/controllers/meal_controller.ex`

Update endpoint documentation strings to reflect new URLs.

## Alternative Approaches Considered

### Alternative 1: Keep Business ID in URL

**Pros**:

- No breaking changes
- Explicit business context in URL

**Cons**:

- Redundant with JWT scope
- More verbose API
- Potential for mismatch between URL and JWT business_id

**Decision**: Rejected in favor of simpler API

### Alternative 2: Support Both Old and New Endpoints

**Pros**:

- Backward compatible
- Gradual migration

**Cons**:

- Increased maintenance burden
- Confusing for developers
- Delays cleanup

**Decision**: Rejected - clean break is better for long-term maintainability

### Alternative 3: Use Query Parameter for Business ID

**Pros**:

- Keeps business_id explicit
- Easier to change than path parameter

**Cons**:

- Still redundant with JWT
- Inconsistent with REST conventions
- More complex than scope-based approach

**Decision**: Rejected - scope-based approach is cleaner
