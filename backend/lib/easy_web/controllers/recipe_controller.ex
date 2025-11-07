defmodule EasyWeb.RecipeController do
  @moduledoc """
  Controller for managing recipes within a business context.

  All endpoints require authentication and validate that the coach
  belongs to the business they're operating on.

  ## Endpoints

  - GET /api/businesses/:business_id/recipes - List recipes
  - POST /api/businesses/:business_id/recipes - Create recipe
  - GET /api/recipes/:id - Show recipe
  - PATCH /api/recipes/:id - Update recipe
  - DELETE /api/recipes/:id - Delete recipe
  - POST /api/recipes/:id/ingredients - Add ingredient to recipe
  - PATCH /api/recipes/:id/ingredients/:ingredient_id - Update recipe ingredient
  - DELETE /api/recipes/:id/ingredients/:ingredient_id - Remove ingredient from recipe
  """

  use EasyWeb, :controller

  alias Easy.{Nutrition, ApiError}
  alias EasyWeb.Authorization

  action_fallback EasyWeb.FallbackController

  # ============================================
  # ACTIONS
  # ============================================

  @doc """
  GET /api/businesses/:business_id/recipes

  Lists all recipes for a business.

  ## Query Parameters
  - limit: Number of items per page (default: 50, max: 100)
  - offset: Number of items to skip (default: 0)
  - status: Filter by status (default: "active")
  - search: Search by recipe name (optional)

  ## Response (200)
  ```json
  {
    "recipes": [
      {
        "id": "uuid",
        "name": "Grilled Chicken",
        "description": "Healthy grilled chicken breast",
        "instructions": "Season and grill for 6-8 minutes per side",
        "prep_time_minutes": 30,
        "servings": 4,
        "total_calories": "660.00",
        "total_protein": "124.00",
        "total_carbohydrates": "0.00",
        "total_fats": "14.40",
        "total_fiber": "0.00",
        "status": "active",
        "business_id": "uuid",
        "created_by_id": "uuid",
        "inserted_at": "2024-01-01T12:00:00Z",
        "updated_at": "2024-01-01T12:00:00Z"
      }
    ],
    "meta": {
      "limit": 50,
      "offset": 0,
      "total": 1
    }
  }
  ```
  """
  def index(conn, %{"business_id" => business_id} = params) do
    current_user = conn.assigns.current_user

    with {:ok, _coach} <- get_coach_for_user(current_user),
         :ok <- Authorization.user_is_coach_in_business?(current_user, business_id) do
      # Parse query parameters
      limit = min(parse_int(params["limit"], 50), 100)
      offset = parse_int(params["offset"], 0)
      status = params["status"] || "active"

      # Handle search if provided
      recipes =
        case params["search"] do
          nil ->
            Nutrition.list_recipes(business_id, limit: limit, offset: offset, status: status)

          search_query when is_binary(search_query) and search_query != "" ->
            Nutrition.search_recipes(business_id, search_query)

          _ ->
            Nutrition.list_recipes(business_id, limit: limit, offset: offset, status: status)
        end

      conn
      |> put_status(:ok)
      |> json(%{
        recipes: Enum.map(recipes, &format_recipe/1),
        meta: %{
          limit: limit,
          offset: offset,
          total: length(recipes)
        }
      })
    end
  end

  @doc """
  POST /api/businesses/:business_id/recipes

  Creates a new recipe in the business.

  ## Request Body
  ```json
  {
    "name": "Grilled Chicken",
    "description": "Healthy grilled chicken breast",
    "instructions": "Season and grill for 6-8 minutes per side",
    "prep_time_minutes": 30,
    "servings": 4
  }
  ```

  ## Response (201)
  ```json
  {
    "recipe": {
      "id": "uuid",
      "name": "Grilled Chicken",
      ...
    }
  }
  ```
  """
  def create(conn, %{"business_id" => business_id} = params) do
    current_user = conn.assigns.current_user

    with {:ok, coach} <- get_coach_for_user(current_user),
         :ok <- Authorization.user_is_coach_in_business?(current_user, business_id) do
      attrs = extract_recipe_attrs(params)

      case Nutrition.create_recipe(business_id, coach.id, attrs) do
        {:ok, recipe} ->
          conn
          |> put_status(:created)
          |> json(%{recipe: format_recipe(recipe)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  @doc """
  GET /api/recipes/:id

  Shows a single recipe with preloaded ingredients.

  ## Response (200)
  ```json
  {
    "recipe": {
      "id": "uuid",
      "name": "Grilled Chicken",
      "recipe_ingredients": [
        {
          "id": "uuid",
          "quantity": "400.00",
          "unit": "g",
          "notes": "boneless, skinless",
          "ingredient": {
            "id": "uuid",
            "name": "Chicken Breast",
            "calories": "165.00",
            "protein": "31.00",
            "carbohydrates": "0.00",
            "fats": "3.60",
            "fiber": "0.00"
          }
        }
      ],
      ...
    }
  }
  ```
  """
  def show(conn, %{"id" => id}) do
    current_user = conn.assigns.current_user

    with {:ok, _coach} <- get_coach_for_user(current_user),
         {:ok, recipe} <- fetch_recipe(id, [:recipe_ingredients, ingredients: []]),
         :ok <- Authorization.user_is_coach_in_business?(current_user, recipe.business_id) do
      conn
      |> put_status(:ok)
      |> json(%{recipe: format_recipe_with_ingredients(recipe)})
    end
  end

  @doc """
  PATCH /api/recipes/:id

  Updates a recipe.

  ## Request Body
  ```json
  {
    "name": "Updated Recipe Name",
    "servings": 6
  }
  ```

  ## Response (200)
  ```json
  {
    "recipe": {
      "id": "uuid",
      "name": "Updated Recipe Name",
      ...
    }
  }
  ```
  """
  def update(conn, %{"id" => id} = params) do
    current_user = conn.assigns.current_user

    with {:ok, coach} <- get_coach_for_user(current_user),
         {:ok, recipe} <- fetch_recipe(id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, recipe.business_id) do
      attrs = extract_recipe_attrs(params)

      case Nutrition.update_recipe(recipe, coach.id, attrs) do
        {:ok, updated_recipe} ->
          conn
          |> put_status(:ok)
          |> json(%{recipe: format_recipe(updated_recipe)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  @doc """
  DELETE /api/recipes/:id

  Deletes a recipe.

  Prevents deletion if the recipe is used in any meals.

  ## Response (200)
  ```json
  {
    "message": "Recipe deleted successfully"
  }
  ```

  ## Error Response (422)
  ```json
  {
    "error": {
      "message": "Cannot delete recipe that is used in meals",
      "code": "RECIPE_IN_USE"
    }
  }
  ```
  """
  def delete(conn, %{"id" => id}) do
    current_user = conn.assigns.current_user

    with {:ok, coach} <- get_coach_for_user(current_user),
         {:ok, recipe} <- fetch_recipe(id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, recipe.business_id) do
      case Nutrition.delete_recipe(recipe, coach.id) do
        {:ok, _deleted_recipe} ->
          conn
          |> put_status(:ok)
          |> json(%{message: "Recipe deleted successfully"})

        {:error, :recipe_in_use} ->
          error =
            ApiError.unprocessable_entity(
              "Cannot delete recipe that is used in meals",
              %{code: "RECIPE_IN_USE"}
            )

          {:error, error}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  @doc """
  POST /api/recipes/:id/ingredients

  Adds an ingredient to a recipe with quantity and unit.

  ## Request Body
  ```json
  {
    "ingredient_id": "uuid",
    "quantity": 400,
    "unit": "g",
    "notes": "boneless, skinless"
  }
  ```

  ## Response (201)
  ```json
  {
    "recipe_ingredient": {
      "id": "uuid",
      "recipe_id": "uuid",
      "ingredient_id": "uuid",
      "quantity": "400.00",
      "unit": "g",
      "notes": "boneless, skinless",
      "inserted_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-01T12:00:00Z"
    }
  }
  ```
  """
  def add_ingredient(conn, %{"id" => recipe_id} = params) do
    current_user = conn.assigns.current_user

    with {:ok, coach} <- get_coach_for_user(current_user),
         {:ok, recipe} <- fetch_recipe(recipe_id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, recipe.business_id),
         {:ok, ingredient_id} <- extract_ingredient_id(params),
         {:ok, quantity} <- extract_quantity(params),
         {:ok, unit} <- extract_unit(params) do
      notes = params["notes"]

      case Nutrition.add_ingredient_to_recipe(recipe_id, ingredient_id, quantity, unit, coach.id) do
        {:ok, recipe_ingredient} ->
          # Add notes if provided
          recipe_ingredient =
            if notes do
              case Nutrition.update_recipe_ingredient(
                     recipe_id,
                     ingredient_id,
                     %{notes: notes},
                     coach.id
                   ) do
                {:ok, updated} -> updated
                _ -> recipe_ingredient
              end
            else
              recipe_ingredient
            end

          conn
          |> put_status(:created)
          |> json(%{recipe_ingredient: format_recipe_ingredient(recipe_ingredient)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  @doc """
  PATCH /api/recipes/:id/ingredients/:ingredient_id

  Updates a recipe ingredient's quantity, unit, or notes.

  ## Request Body
  ```json
  {
    "quantity": 500,
    "unit": "g",
    "notes": "diced"
  }
  ```

  ## Response (200)
  ```json
  {
    "recipe_ingredient": {
      "id": "uuid",
      "quantity": "500.00",
      "unit": "g",
      "notes": "diced",
      ...
    }
  }
  ```
  """
  def update_ingredient(conn, %{"id" => recipe_id, "ingredient_id" => ingredient_id} = params) do
    current_user = conn.assigns.current_user

    with {:ok, coach} <- get_coach_for_user(current_user),
         {:ok, recipe} <- fetch_recipe(recipe_id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, recipe.business_id) do
      attrs = extract_recipe_ingredient_attrs(params)

      case Nutrition.update_recipe_ingredient(recipe_id, ingredient_id, attrs, coach.id) do
        {:ok, recipe_ingredient} ->
          conn
          |> put_status(:ok)
          |> json(%{recipe_ingredient: format_recipe_ingredient(recipe_ingredient)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, :not_found} ->
          {:error, :not_found}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  @doc """
  DELETE /api/recipes/:id/ingredients/:ingredient_id

  Removes an ingredient from a recipe.

  ## Response (200)
  ```json
  {
    "message": "Ingredient removed from recipe successfully"
  }
  ```
  """
  def remove_ingredient(conn, %{"id" => recipe_id, "ingredient_id" => ingredient_id}) do
    current_user = conn.assigns.current_user

    with {:ok, coach} <- get_coach_for_user(current_user),
         {:ok, recipe} <- fetch_recipe(recipe_id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, recipe.business_id) do
      case Nutrition.remove_ingredient_from_recipe(recipe_id, ingredient_id, coach.id) do
        {:ok, _recipe_ingredient} ->
          conn
          |> put_status(:ok)
          |> json(%{message: "Ingredient removed from recipe successfully"})

        {:error, :not_found} ->
          {:error, :not_found}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Gets the coach profile for the current user
  defp get_coach_for_user(user) do
    case user.coach do
      nil -> {:error, :forbidden}
      coach -> {:ok, coach}
    end
  end

  # Fetches a recipe by ID with optional preloading
  defp fetch_recipe(id, preload \\ []) do
    case Nutrition.get_recipe(id, preload) do
      nil -> {:error, :not_found}
      recipe -> {:ok, recipe}
    end
  end

  # Extracts recipe attributes from request params
  defp extract_recipe_attrs(params) do
    %{}
    |> put_if_present(params, "name", :name)
    |> put_if_present(params, "description", :description)
    |> put_if_present(params, "instructions", :instructions)
    |> put_int_if_present(params, "prep_time_minutes", :prep_time_minutes)
    |> put_int_if_present(params, "servings", :servings)
    |> put_decimal_if_present(params, "total_calories", :total_calories)
    |> put_decimal_if_present(params, "total_protein", :total_protein)
    |> put_decimal_if_present(params, "total_carbohydrates", :total_carbohydrates)
    |> put_decimal_if_present(params, "total_fats", :total_fats)
    |> put_decimal_if_present(params, "total_fiber", :total_fiber)
    |> put_if_present(params, "status", :status)
  end

  # Extracts recipe ingredient attributes from request params
  defp extract_recipe_ingredient_attrs(params) do
    %{}
    |> put_decimal_if_present(params, "quantity", :quantity)
    |> put_if_present(params, "unit", :unit)
    |> put_if_present(params, "notes", :notes)
  end

  # Extracts ingredient_id from params
  defp extract_ingredient_id(params) do
    case Map.get(params, "ingredient_id") do
      nil -> {:error, ApiError.bad_request("ingredient_id is required")}
      id -> {:ok, id}
    end
  end

  # Extracts quantity from params
  defp extract_quantity(params) do
    case Map.get(params, "quantity") do
      nil ->
        {:error, ApiError.bad_request("quantity is required")}

      value when is_number(value) ->
        {:ok, Decimal.new(to_string(value))}

      value when is_binary(value) ->
        case Decimal.parse(value) do
          {decimal, _} -> {:ok, decimal}
          :error -> {:error, ApiError.bad_request("quantity must be a valid number")}
        end

      _ ->
        {:error, ApiError.bad_request("quantity must be a valid number")}
    end
  end

  # Extracts unit from params
  defp extract_unit(params) do
    case Map.get(params, "unit") do
      nil -> {:error, ApiError.bad_request("unit is required")}
      unit when is_binary(unit) -> {:ok, unit}
      _ -> {:error, ApiError.bad_request("unit must be a string")}
    end
  end

  # Puts a value in the map if it's present in params
  defp put_if_present(map, params, key, atom_key) do
    case Map.get(params, key) do
      nil -> map
      value -> Map.put(map, atom_key, value)
    end
  end

  # Puts an integer value in the map if it's present in params
  defp put_int_if_present(map, params, key, atom_key) do
    case Map.get(params, key) do
      nil ->
        map

      value when is_integer(value) ->
        Map.put(map, atom_key, value)

      value when is_binary(value) ->
        case Integer.parse(value) do
          {int, _} -> Map.put(map, atom_key, int)
          :error -> map
        end

      _ ->
        map
    end
  end

  # Puts a decimal value in the map if it's present in params
  defp put_decimal_if_present(map, params, key, atom_key) do
    case Map.get(params, key) do
      nil ->
        map

      value when is_number(value) ->
        Map.put(map, atom_key, Decimal.new(to_string(value)))

      value when is_binary(value) ->
        case Decimal.parse(value) do
          {decimal, _} -> Map.put(map, atom_key, decimal)
          :error -> map
        end

      _ ->
        map
    end
  end

  # Parses an integer from a string or returns default
  defp parse_int(nil, default), do: default
  defp parse_int(value, _default) when is_integer(value), do: value

  defp parse_int(value, default) when is_binary(value) do
    case Integer.parse(value) do
      {int, _} -> int
      :error -> default
    end
  end

  defp parse_int(_, default), do: default

  # Formats a recipe for JSON response
  defp format_recipe(recipe) do
    %{
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      instructions: recipe.instructions,
      prep_time_minutes: recipe.prep_time_minutes,
      servings: recipe.servings,
      total_calories: recipe.total_calories,
      total_protein: recipe.total_protein,
      total_carbohydrates: recipe.total_carbohydrates,
      total_fats: recipe.total_fats,
      total_fiber: recipe.total_fiber,
      status: recipe.status,
      business_id: recipe.business_id,
      created_by_id: recipe.created_by_id,
      inserted_at: recipe.inserted_at,
      updated_at: recipe.updated_at
    }
  end

  # Formats a recipe with ingredients for JSON response
  defp format_recipe_with_ingredients(recipe) do
    base = format_recipe(recipe)

    recipe_ingredients =
      Enum.map(recipe.recipe_ingredients, fn ri ->
        %{
          id: ri.id,
          quantity: ri.quantity,
          unit: ri.unit,
          notes: ri.notes,
          ingredient: %{
            id: ri.ingredient.id,
            name: ri.ingredient.name,
            calories: ri.ingredient.calories,
            protein: ri.ingredient.protein,
            carbohydrates: ri.ingredient.carbohydrates,
            fats: ri.ingredient.fats,
            fiber: ri.ingredient.fiber
          },
          inserted_at: ri.inserted_at,
          updated_at: ri.updated_at
        }
      end)

    Map.put(base, :recipe_ingredients, recipe_ingredients)
  end

  # Formats a recipe ingredient for JSON response
  defp format_recipe_ingredient(recipe_ingredient) do
    %{
      id: recipe_ingredient.id,
      recipe_id: recipe_ingredient.recipe_id,
      ingredient_id: recipe_ingredient.ingredient_id,
      quantity: recipe_ingredient.quantity,
      unit: recipe_ingredient.unit,
      notes: recipe_ingredient.notes,
      inserted_at: recipe_ingredient.inserted_at,
      updated_at: recipe_ingredient.updated_at
    }
  end
end
