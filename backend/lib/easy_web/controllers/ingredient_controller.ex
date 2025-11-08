defmodule EasyWeb.IngredientController do
  @moduledoc """
  Controller for managing ingredients within a business context.

  All endpoints require authentication and validate that the coach
  belongs to the business they're operating on.

  ## Endpoints

  - GET /api/ingredients - List ingredients
  - POST /api/ingredients - Create ingredient
  - GET /api/ingredients/:id - Show ingredient
  - PATCH /api/ingredients/:id - Update ingredient
  - DELETE /api/ingredients/:id - Delete ingredient
  """

  use EasyWeb, :controller

  alias Easy.{Nutrition, ApiError}
  alias EasyWeb.Authorization

  action_fallback EasyWeb.FallbackController

  # ============================================
  # ACTIONS
  # ============================================

  @doc """
  GET /api/ingredients

  Lists all ingredients for a business.

  ## Query Parameters
  - limit: Number of items per page (default: 50, max: 100)
  - offset: Number of items to skip (default: 0)
  - status: Filter by status (default: "active")
  - search: Search by ingredient name (optional)

  ## Response (200)
  ```json
  {
    "ingredients": [
      {
        "id": "uuid",
        "name": "Chicken Breast",
        "description": "Boneless, skinless chicken breast",
        "calories": "165.00",
        "protein": "31.00",
        "carbohydrates": "0.00",
        "fats": "3.60",
        "fiber": "0.00",
        "source": "USDA",
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

      # Handle search if provided
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
        meta: %{
          limit: limit,
          offset: offset,
          total: length(ingredients)
        }
      })
    end
  end

  @doc """
  POST /api/ingredients

  Creates a new ingredient in the business.

  ## Request Body
  ```json
  {
    "name": "Chicken Breast",
    "description": "Boneless, skinless chicken breast",
    "calories": 165,
    "protein": 31,
    "carbohydrates": 0,
    "fats": 3.6,
    "fiber": 0,
    "source": "USDA"
  }
  ```

  ## Response (201)
  ```json
  {
    "ingredient": {
      "id": "uuid",
      "name": "Chicken Breast",
      ...
    }
  }
  ```
  """
  def create(conn, params) do
    scope = conn.assigns.scope

    with {:ok, business_id} <- extract_business_id(scope),
         {:ok, coach_id} <- extract_coach_id(scope) do
      attrs = extract_ingredient_attrs(params)

      case Nutrition.create_ingredient(business_id, coach_id, attrs) do
        {:ok, ingredient} ->
          conn
          |> put_status(:created)
          |> json(%{ingredient: format_ingredient(ingredient)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  @doc """
  GET /api/ingredients/:id

  Shows a single ingredient.

  ## Response (200)
  ```json
  {
    "ingredient": {
      "id": "uuid",
      "name": "Chicken Breast",
      ...
    }
  }
  ```
  """
  def show(conn, %{"id" => id}) do
    current_user = conn.assigns.current_user

    with {:ok, _coach} <- get_coach_for_user(current_user),
         {:ok, ingredient} <- fetch_ingredient(id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, ingredient.business_id) do
      conn
      |> put_status(:ok)
      |> json(%{ingredient: format_ingredient(ingredient)})
    end
  end

  @doc """
  PATCH /api/ingredients/:id

  Updates an ingredient.

  ## Request Body
  ```json
  {
    "name": "Updated Name",
    "calories": 170
  }
  ```

  ## Response (200)
  ```json
  {
    "ingredient": {
      "id": "uuid",
      "name": "Updated Name",
      ...
    }
  }
  ```
  """
  def update(conn, %{"id" => id} = params) do
    current_user = conn.assigns.current_user

    with {:ok, coach} <- get_coach_for_user(current_user),
         {:ok, ingredient} <- fetch_ingredient(id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, ingredient.business_id) do
      attrs = extract_ingredient_attrs(params)

      case Nutrition.update_ingredient(ingredient, coach.id, attrs) do
        {:ok, updated_ingredient} ->
          conn
          |> put_status(:ok)
          |> json(%{ingredient: format_ingredient(updated_ingredient)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  @doc """
  DELETE /api/ingredients/:id

  Deletes an ingredient.

  Prevents deletion if the ingredient is used in any recipes or meals.

  ## Response (200)
  ```json
  {
    "message": "Ingredient deleted successfully"
  }
  ```

  ## Error Response (422)
  ```json
  {
    "error": {
      "message": "Cannot delete ingredient that is used in recipes or meals",
      "code": "INGREDIENT_IN_USE"
    }
  }
  ```
  """
  def delete(conn, %{"id" => id}) do
    current_user = conn.assigns.current_user

    with {:ok, coach} <- get_coach_for_user(current_user),
         {:ok, ingredient} <- fetch_ingredient(id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, ingredient.business_id) do
      case Nutrition.delete_ingredient(ingredient, coach.id) do
        {:ok, _deleted_ingredient} ->
          conn
          |> put_status(:ok)
          |> json(%{message: "Ingredient deleted successfully"})

        {:error, :ingredient_in_use} ->
          error =
            ApiError.unprocessable_entity(
              "Cannot delete ingredient that is used in recipes or meals",
              %{code: "INGREDIENT_IN_USE"}
            )

          {:error, error}

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

  # Fetches an ingredient by ID
  defp fetch_ingredient(id) do
    case Nutrition.get_ingredient(id) do
      nil -> {:error, :not_found}
      ingredient -> {:ok, ingredient}
    end
  end

  # Extracts ingredient attributes from request params
  defp extract_ingredient_attrs(params) do
    %{}
    |> put_if_present(params, "name", :name)
    |> put_if_present(params, "description", :description)
    |> put_decimal_if_present(params, "calories", :calories)
    |> put_decimal_if_present(params, "protein", :protein)
    |> put_decimal_if_present(params, "carbohydrates", :carbohydrates)
    |> put_decimal_if_present(params, "fats", :fats)
    |> put_decimal_if_present(params, "fiber", :fiber)
    |> put_if_present(params, "source", :source)
    |> put_if_present(params, "status", :status)
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

  # Formats an ingredient for JSON response
  defp format_ingredient(ingredient) do
    %{
      id: ingredient.id,
      name: ingredient.name,
      description: ingredient.description,
      calories: ingredient.calories,
      protein: ingredient.protein,
      carbohydrates: ingredient.carbohydrates,
      fats: ingredient.fats,
      fiber: ingredient.fiber,
      source: ingredient.source,
      status: ingredient.status,
      business_id: ingredient.business_id,
      created_by_id: ingredient.created_by_id,
      inserted_at: ingredient.inserted_at,
      updated_at: ingredient.updated_at
    }
  end
end
