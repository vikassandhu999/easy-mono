defmodule EasyWeb.MealController do
  @moduledoc """
  Controller for managing meals within a business context.

  All endpoints require authentication and validate that the coach
  belongs to the business they're operating on.

  ## Endpoints

  - GET /api/meals - List meals
  - POST /api/meals - Create meal
  - GET /api/meals/:id - Show meal
  - PATCH /api/meals/:id - Update meal
  - DELETE /api/meals/:id - Delete meal
  - POST /api/meals/:id/duplicate - Duplicate meal
  - POST /api/meals/:id/recipes - Add recipe to meal
  - PATCH /api/meals/:id/recipes/:recipe_id - Update meal recipe
  - DELETE /api/meals/:id/recipes/:recipe_id - Remove recipe from meal
  """

  use EasyWeb, :controller

  alias Easy.{Nutrition, ApiError}
  alias EasyWeb.Authorization

  action_fallback EasyWeb.FallbackController

  # ============================================
  # ACTIONS
  # ============================================

  @doc """
  GET /api/meals

  Lists all meals for a business.

  ## Query Parameters
  - limit: Number of items per page (default: 50, max: 100)
  - offset: Number of items to skip (default: 0)
  - status: Filter by status (default: "active")
  - meal_type: Filter by meal type (optional: breakfast, lunch, dinner, snack)

  ## Response (200)
  ```json
  {
    "meals": [
      {
        "id": "uuid",
        "name": "Breakfast Bowl",
        "description": "Healthy breakfast with oats and fruits",
        "meal_type": "breakfast",
        "notes": "Great for meal prep",
        "total_calories": "450.00",
        "total_protein": "15.00",
        "total_carbohydrates": "65.00",
        "total_fats": "12.00",
        "total_fiber": "8.00",
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
  def index(conn, params) do
    scope = conn.assigns.scope

    with {:ok, business_id} <- extract_business_id(scope),
         {:ok, _coach_id} <- extract_coach_id(scope) do
      # Parse query parameters
      limit = min(parse_int(params["limit"], 50), 100)
      offset = parse_int(params["offset"], 0)
      status = params["status"] || "active"

      opts = [limit: limit, offset: offset, status: status]

      # Add meal_type filter if provided
      opts =
        case params["meal_type"] do
          nil -> opts
          meal_type when is_binary(meal_type) -> Keyword.put(opts, :meal_type, meal_type)
          _ -> opts
        end

      meals = Nutrition.list_meals(business_id, opts)

      conn
      |> put_status(:ok)
      |> json(%{
        meals: Enum.map(meals, &format_meal/1),
        meta: %{
          limit: limit,
          offset: offset,
          total: length(meals)
        }
      })
    end
  end

  @doc """
  POST /api/meals

  Creates a new meal in the business.

  ## Request Body
  ```json
  {
    "name": "Breakfast Bowl",
    "description": "Healthy breakfast with oats and fruits",
    "meal_type": "breakfast",
    "notes": "Great for meal prep"
  }
  ```

  ## Response (201)
  ```json
  {
    "meal": {
      "id": "uuid",
      "name": "Breakfast Bowl",
      ...
    }
  }
  ```
  """
  def create(conn, params) do
    scope = conn.assigns.scope

    with {:ok, business_id} <- extract_business_id(scope),
         {:ok, coach_id} <- extract_coach_id(scope) do
      attrs = extract_meal_attrs(params)

      case Nutrition.create_meal(business_id, coach_id, attrs) do
        {:ok, meal} ->
          conn
          |> put_status(:created)
          |> json(%{meal: format_meal(meal)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  @doc """
  GET /api/meals/:id

  Shows a single meal with preloaded recipes.

  ## Response (200)
  ```json
  {
    "meal": {
      "id": "uuid",
      "name": "Breakfast Bowl",
      "meal_recipes": [
        {
          "id": "uuid",
          "servings": "1.00",
          "notes": "Standard serving",
          "recipe": {
            "id": "uuid",
            "name": "Oatmeal Base",
            "ingredients": ["Oats", "Water", "Salt"],
            "total_calories": "300.00",
            "total_protein": "10.00",
            "total_carbohydrates": "50.00",
            "total_fats": "5.00",
            "total_fiber": "6.00"
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
         {:ok, meal} <- fetch_meal(id, meal_recipes: [recipe: []]),
         :ok <- Authorization.user_is_coach_in_business?(current_user, meal.business_id) do
      conn
      |> put_status(:ok)
      |> json(%{meal: format_meal_with_components(meal)})
    end
  end

  @doc """
  PATCH /api/meals/:id

  Updates a meal.

  ## Request Body
  ```json
  {
    "name": "Updated Meal Name",
    "meal_type": "lunch"
  }
  ```

  ## Response (200)
  ```json
  {
    "meal": {
      "id": "uuid",
      "name": "Updated Meal Name",
      ...
    }
  }
  ```
  """
  def update(conn, %{"id" => id} = params) do
    current_user = conn.assigns.current_user

    with {:ok, coach} <- get_coach_for_user(current_user),
         {:ok, meal} <- fetch_meal(id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, meal.business_id) do
      attrs = extract_meal_attrs(params)

      case Nutrition.update_meal(meal, coach.id, attrs) do
        {:ok, updated_meal} ->
          conn
          |> put_status(:ok)
          |> json(%{meal: format_meal(updated_meal)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  @doc """
  DELETE /api/meals/:id

  Deletes a meal.

  ## Response (200)
  ```json
  {
    "message": "Meal deleted successfully"
  }
  ```
  """
  def delete(conn, %{"id" => id}) do
    current_user = conn.assigns.current_user

    with {:ok, coach} <- get_coach_for_user(current_user),
         {:ok, meal} <- fetch_meal(id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, meal.business_id) do
      case Nutrition.delete_meal(meal, coach.id) do
        {:ok, _deleted_meal} ->
          conn
          |> put_status(:ok)
          |> json(%{message: "Meal deleted successfully"})

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  @doc """
  POST /api/meals/:id/duplicate

  Duplicates an existing meal with all its recipes and ingredients.

  ## Response (201)
  ```json
  {
    "meal": {
      "id": "uuid",
      "name": "Original Meal (Copy)",
      ...
    }
  }
  ```
  """
  def duplicate(conn, %{"id" => id}) do
    current_user = conn.assigns.current_user

    with {:ok, coach} <- get_coach_for_user(current_user),
         {:ok, meal} <- fetch_meal(id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, meal.business_id) do
      case Nutrition.duplicate_meal(id, coach.id) do
        {:ok, duplicated_meal} ->
          conn
          |> put_status(:created)
          |> json(%{meal: format_meal(duplicated_meal)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  @doc """
  POST /api/meals/:id/recipes

  Adds a recipe to a meal with a serving multiplier.

  ## Request Body
  ```json
  {
    "recipe_id": "uuid",
    "servings": 1.5,
    "notes": "Double portion"
  }
  ```

  ## Response (201)
  ```json
  {
    "meal_recipe": {
      "id": "uuid",
      "meal_id": "uuid",
      "recipe_id": "uuid",
      "servings": "1.50",
      "notes": "Double portion",
      "inserted_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-01T12:00:00Z"
    }
  }
  ```
  """
  def add_recipe(conn, %{"id" => meal_id} = params) do
    current_user = conn.assigns.current_u

    with {:ok, coach} <- get_coach_for_user(current_user),
         {:ok, meal} <- fetch_meal(meal_id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, meal.business_id),
         {:ok, recipe_id} <- extract_recipe_id(params),
         {:ok, servings} <- extract_servings(params) do
      notes = params["notes"]

      case Nutrition.add_recipe_to_meal(meal_id, recipe_id, servings, coach.id) do
        {:ok, meal_recipe} ->
          # Add notes if provided
          meal_recipe =
            if notes do
              case Nutrition.update_meal_recipe(meal_id, recipe_id, %{notes: notes}, coach.id) do
                {:ok, updated} -> updated
                _ -> meal_recipe
              end
            else
              meal_recipe
            end

          conn
          |> put_status(:created)
          |> json(%{meal_recipe: format_meal_recipe(meal_recipe)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  @doc """
  PATCH /api/meals/:id/recipes/:recipe_id

  Updates a meal recipe's servings or notes.

  ## Request Body
  ```json
  {
    "servings": 2.0,
    "notes": "Triple portion"
  }
  ```

  ## Response (200)
  ```json
  {
    "meal_recipe": {
      "id": "uuid",
      "servings": "2.00",
      "notes": "Triple portion",
      ...
    }
  }
  ```
  """
  def update_recipe(conn, %{"id" => meal_id, "recipe_id" => recipe_id} = params) do
    current_user = conn.assigns.current_user

    with {:ok, coach} <- get_coach_for_user(current_user),
         {:ok, meal} <- fetch_meal(meal_id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, meal.business_id) do
      attrs = extract_meal_recipe_attrs(params)

      case Nutrition.update_meal_recipe(meal_id, recipe_id, attrs, coach.id) do
        {:ok, meal_recipe} ->
          conn
          |> put_status(:ok)
          |> json(%{meal_recipe: format_meal_recipe(meal_recipe)})

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
  DELETE /api/meals/:id/recipes/:recipe_id

  Removes a recipe from a meal.

  ## Response (200)
  ```json
  {
    "message": "Recipe removed from meal successfully"
  }
  ```
  """
  def remove_recipe(conn, %{"id" => meal_id, "recipe_id" => recipe_id}) do
    current_user = conn.assigns.current_user

    with {:ok, coach} <- get_coach_for_user(current_user),
         {:ok, meal} <- fetch_meal(meal_id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, meal.business_id) do
      case Nutrition.remove_recipe_from_meal(meal_id, recipe_id, coach.id) do
        {:ok, _meal_recipe} ->
          conn
          |> put_status(:ok)
          |> json(%{message: "Recipe removed from meal successfully"})

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

  # Extracts business_id from scope
  defp extract_business_id(%Easy.Auth.Scope{business_id: business_id})
       when not is_nil(business_id) do
    {:ok, business_id}
  end

  defp extract_business_id(_) do
    {:error,
     ApiError.forbidden("You must have an active business context to access this resource")}
  end

  # Extracts coach_id from scope
  defp extract_coach_id(%Easy.Auth.Scope{coach_id: coach_id}) when not is_nil(coach_id) do
    {:ok, coach_id}
  end

  defp extract_coach_id(_) do
    {:error, ApiError.forbidden("You must be a coach to access this resource")}
  end

  # Gets the coach profile for the current user
  defp get_coach_for_user(user) do
    case user.coach do
      nil -> {:error, :forbidden}
      coach -> {:ok, coach}
    end
  end

  # Fetches a meal by ID with optional preloading
  defp fetch_meal(id, preload \\ []) do
    case Nutrition.get_meal(id, preload) do
      nil -> {:error, :not_found}
      meal -> {:ok, meal}
    end
  end

  # Extracts meal attributes from request params
  defp extract_meal_attrs(params) do
    %{}
    |> put_if_present(params, "name", :name)
    |> put_if_present(params, "description", :description)
    |> put_if_present(params, "meal_type", :meal_type)
    |> put_if_present(params, "notes", :notes)
    |> put_decimal_if_present(params, "total_calories", :total_calories)
    |> put_decimal_if_present(params, "total_protein", :total_protein)
    |> put_decimal_if_present(params, "total_carbohydrates", :total_carbohydrates)
    |> put_decimal_if_present(params, "total_fats", :total_fats)
    |> put_decimal_if_present(params, "total_fiber", :total_fiber)
    |> put_if_present(params, "status", :status)
  end

  # Extracts meal recipe attributes from request params
  defp extract_meal_recipe_attrs(params) do
    %{}
    |> put_decimal_if_present(params, "servings", :servings)
    |> put_if_present(params, "notes", :notes)
  end

  # Extracts recipe_id from params
  defp extract_recipe_id(params) do
    case Map.get(params, "recipe_id") do
      nil -> {:error, ApiError.bad_request("recipe_id is required")}
      id -> {:ok, id}
    end
  end

  # Extracts servings from params
  defp extract_servings(params) do
    case Map.get(params, "servings") do
      nil ->
        {:ok, Decimal.new("1.0")}

      value when is_number(value) ->
        {:ok, Decimal.new(to_string(value))}

      value when is_binary(value) ->
        case Decimal.parse(value) do
          {decimal, _} -> {:ok, decimal}
          :error -> {:error, ApiError.bad_request("servings must be a valid number")}
        end

      _ ->
        {:error, ApiError.bad_request("servings must be a valid number")}
    end
  end

  # Puts a value in the map if it's present in params
  defp put_if_present(map, params, key, atom_key) do
    case Map.get(params, key) do
      nil -> map
      value -> Map.put(map, atom_key, value)
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

  # Formats a meal for JSON response
  defp format_meal(meal) do
    %{
      id: meal.id,
      name: meal.name,
      description: meal.description,
      meal_type: meal.meal_type,
      notes: meal.notes,
      total_calories: meal.total_calories,
      total_protein: meal.total_protein,
      total_carbohydrates: meal.total_carbohydrates,
      total_fats: meal.total_fats,
      total_fiber: meal.total_fiber,
      status: meal.status,
      business_id: meal.business_id,
      created_by_id: meal.created_by_id,
      inserted_at: meal.inserted_at,
      updated_at: meal.updated_at
    }
  end

  # Formats a meal with components for JSON response
  defp format_meal_with_components(meal) do
    base = format_meal(meal)

    meal_recipes =
      Enum.map(meal.meal_recipes, fn mr ->
        %{
          id: mr.id,
          servings: mr.servings,
          notes: mr.notes,
          recipe: %{
            id: mr.recipe.id,
            name: mr.recipe.name,
            ingredients: mr.recipe.ingredients || [],
            total_calories: mr.recipe.total_calories,
            total_protein: mr.recipe.total_protein,
            total_carbohydrates: mr.recipe.total_carbohydrates,
            total_fats: mr.recipe.total_fats,
            total_fiber: mr.recipe.total_fiber
          },
          inserted_at: mr.inserted_at,
          updated_at: mr.updated_at
        }
      end)

    Map.put(base, :meal_recipes, meal_recipes)
  end

  # Formats a meal recipe for JSON response
  defp format_meal_recipe(meal_recipe) do
    %{
      id: meal_recipe.id,
      meal_id: meal_recipe.meal_id,
      recipe_id: meal_recipe.recipe_id,
      servings: meal_recipe.servings,
      notes: meal_recipe.notes,
      inserted_at: meal_recipe.inserted_at,
      updated_at: meal_recipe.updated_at
    }
  end
end
