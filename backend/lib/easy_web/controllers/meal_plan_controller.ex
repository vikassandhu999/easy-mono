defmodule EasyWeb.MealPlanController do
  @moduledoc """
  Controller for managing meal plans within a business context.

  All endpoints require authentication and validate that the coach
  belongs to the business they're operating on.
  """

  use EasyWeb, :controller

  alias Easy.{MealPlans, ApiError}
  alias Easy.MealPlans.MealPlanMeal
  alias EasyWeb.Authorization

  action_fallback EasyWeb.FallbackController

  def index(conn, params) do
    scope = conn.assigns.scope

    with {:ok, business_id} <- extract_business_id(scope),
         {:ok, _coach_id} <- extract_coach_id(scope) do
      limit = min(parse_int(params["limit"], 50), 100)
      offset = parse_int(params["offset"], 0)
      status = params["status"] || "draft"

      opts = [limit: limit, offset: offset, status: status]

      opts =
        case params["assigned_to_id"] do
          nil -> opts
          id -> Keyword.put(opts, :assigned_to_id, id)
        end

      opts =
        case params["template_only"] do
          "true" -> Keyword.put(opts, :template_only, true)
          _ -> opts
        end

      plans = MealPlans.list_plans(business_id, opts)

      conn
      |> put_status(:ok)
      |> json(%{
        meal_plans: Enum.map(plans, &format_plan/1),
        meta: %{
          limit: limit,
          offset: offset,
          total: length(plans)
        }
      })
    end
  end

  def create(conn, params) do
    scope = conn.assigns.scope

    with {:ok, business_id} <- extract_business_id(scope),
         {:ok, coach_id} <- extract_coach_id(scope) do
      attrs = extract_plan_attrs(params)

      case MealPlans.create_plan(business_id, coach_id, attrs) do
        {:ok, plan} ->
          conn
          |> put_status(:created)
          |> json(%{meal_plan: format_plan(plan)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  def show(conn, %{"id" => id}) do
    current_user = conn.assigns.current_user

    with {:ok, plan} <- fetch_plan_with_meals(id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, plan.business_id) do
      conn
      |> put_status(:ok)
      |> json(%{meal_plan: format_plan_with_meals(plan)})
    end
  end

  def update(conn, %{"id" => id} = params) do
    current_user = conn.assigns.current_user

    with {:ok, plan} <- fetch_plan(id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, plan.business_id) do
      attrs = extract_plan_attrs(params)

      case MealPlans.update_plan(plan, attrs) do
        {:ok, updated_plan} ->
          conn
          |> put_status(:ok)
          |> json(%{meal_plan: format_plan(updated_plan)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  def delete(conn, %{"id" => id}) do
    current_user = conn.assigns.current_user

    with {:ok, plan} <- fetch_plan(id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, plan.business_id) do
      case MealPlans.delete_plan(plan) do
        {:ok, _deleted_plan} ->
          conn
          |> put_status(:ok)
          |> json(%{message: "Meal plan deleted successfully"})

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  def duplicate(conn, %{"id" => id} = params) do
    current_user = conn.assigns.current_user
    scope = conn.assigns.scope

    with {:ok, coach_id} <- extract_coach_id(scope),
         {:ok, plan} <- fetch_plan(id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, plan.business_id) do
      attrs = extract_duplicate_attrs(params)

      case MealPlans.duplicate_plan(plan, coach_id, attrs) do
        {:ok, new_plan} ->
          conn
          |> put_status(:created)
          |> json(%{meal_plan: format_plan(new_plan)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  def publish(conn, %{"id" => id}) do
    current_user = conn.assigns.current_user

    with {:ok, plan} <- fetch_plan(id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, plan.business_id) do
      case MealPlans.publish_plan(plan) do
        {:ok, published_plan} ->
          conn
          |> put_status(:ok)
          |> json(%{meal_plan: format_plan(published_plan)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  def archive(conn, %{"id" => id}) do
    current_user = conn.assigns.current_user

    with {:ok, plan} <- fetch_plan(id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, plan.business_id) do
      case MealPlans.archive_plan(plan) do
        {:ok, archived_plan} ->
          conn
          |> put_status(:ok)
          |> json(%{meal_plan: format_plan(archived_plan)})

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  def assign_to_client(conn, %{"id" => id} = params) do
    current_user = conn.assigns.current_user

    with {:ok, plan} <- fetch_plan(id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, plan.business_id),
         {:ok, client_id} <- extract_client_id(params),
         {:ok, assignment_attrs} <- extract_assignment_attrs(params) do
      case MealPlans.assign_to_client(plan, client_id, assignment_attrs) do
        {:ok, assigned_plan} ->
          conn
          |> put_status(:ok)
          |> json(%{meal_plan: format_plan(assigned_plan)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  def add_meal(conn, %{"meal_plan_id" => plan_id} = params) do
    current_user = conn.assigns.current_user

    with {:ok, plan} <- fetch_plan(plan_id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, plan.business_id) do
      attrs = extract_day_meal_attrs(params)

      case MealPlans.add_meal_to_plan(plan_id, attrs) do
        {:ok, day_meal} ->
          conn
          |> put_status(:created)
          |> json(%{meal_plan_meal: format_day_meal(day_meal)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  def update_meal(conn, %{"meal_plan_id" => plan_id, "meal_id" => meal_id} = params) do
    current_user = conn.assigns.current_user

    with {:ok, plan} <- fetch_plan(plan_id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, plan.business_id),
         {:ok, day_meal} <- fetch_day_meal(meal_id) do
      attrs = extract_day_meal_attrs(params)

      case MealPlans.update_plan_meal(day_meal, attrs) do
        {:ok, updated_meal} ->
          conn
          |> put_status(:ok)
          |> json(%{meal_plan_meal: format_day_meal(updated_meal)})

        {:error, %Ecto.Changeset{} = changeset} ->
          {:error, changeset}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  def remove_meal(conn, %{"meal_plan_id" => plan_id, "meal_id" => meal_id}) do
    current_user = conn.assigns.current_user

    with {:ok, plan} <- fetch_plan(plan_id),
         :ok <- Authorization.user_is_coach_in_business?(current_user, plan.business_id),
         {:ok, day_meal} <- fetch_day_meal(meal_id) do
      case MealPlans.delete_plan_meal(day_meal) do
        {:ok, _deleted_meal} ->
          conn
          |> put_status(:ok)
          |> json(%{message: "Meal removed from plan successfully"})

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  defp extract_business_id(%Easy.Auth.Scope{business_id: business_id})
       when not is_nil(business_id) do
    {:ok, business_id}
  end

  defp extract_business_id(_) do
    {:error,
     ApiError.forbidden("You must have an active business context to access this resource")}
  end

  defp extract_coach_id(%Easy.Auth.Scope{coach_id: coach_id}) when not is_nil(coach_id) do
    {:ok, coach_id}
  end

  defp extract_coach_id(_) do
    {:error, ApiError.forbidden("You must be a coach to access this resource")}
  end

  defp fetch_plan(id) do
    case MealPlans.get_plan(id) do
      nil -> {:error, :not_found}
      plan -> {:ok, plan}
    end
  end

  defp fetch_plan_with_meals(id) do
    case MealPlans.get_plan_with_meals(id) do
      nil -> {:error, :not_found}
      plan -> {:ok, plan}
    end
  end

  defp fetch_day_meal(id) do
    case MealPlans.get_plan_meal(id) do
      nil -> {:error, :not_found}
      meal -> {:ok, meal}
    end
  end

  defp extract_plan_attrs(params) do
    %{}
    |> put_if_present(params, "name", :name)
    |> put_if_present(params, "description", :description)
    |> put_if_present(params, "status", :status)
    |> put_if_present(params, "cover_image_url", :cover_image_url)
    |> put_date_if_present(params, "start_date", :start_date)
    |> put_date_if_present(params, "end_date", :end_date)
    |> put_if_present(params, "timezone", :timezone)
  end

  defp extract_duplicate_attrs(params) do
    %{}
    |> put_if_present(params, "name", :name)
    |> put_if_present(params, "description", :description)
  end

  defp extract_client_id(params) do
    case Map.get(params, "client_id") do
      nil -> {:error, ApiError.bad_request("client_id is required")}
      id -> {:ok, id}
    end
  end

  defp extract_assignment_attrs(params) do
    attrs =
      %{}
      |> put_date_if_present(params, "start_date", :start_date)
      |> put_date_if_present(params, "end_date", :end_date)
      |> put_if_present(params, "timezone", :timezone)

    {:ok, attrs}
  end

  defp extract_day_meal_attrs(params) do
    %{}
    |> put_if_present(params, "meal_id", :meal_id)
    |> put_int_if_present(params, "day_offset", :day_offset)
    |> put_if_present(params, "label", :label)
    |> put_time_if_present(params, "meal_time_window_start", :meal_time_window_start)
    |> put_time_if_present(params, "meal_time_window_end", :meal_time_window_end)
  end

  defp put_if_present(map, params, key, atom_key) do
    case Map.get(params, key) do
      nil -> map
      value -> Map.put(map, atom_key, value)
    end
  end

  defp put_int_if_present(map, params, key, atom_key) do
    case Map.get(params, key) do
      nil -> map
      value when is_integer(value) -> Map.put(map, atom_key, value)
      value when is_binary(value) -> Map.put(map, atom_key, String.to_integer(value))
      _ -> map
    end
  end

  defp put_date_if_present(map, params, key, atom_key) do
    case Map.get(params, key) do
      nil ->
        map

      value when is_binary(value) ->
        case Date.from_iso8601(value) do
          {:ok, date} -> Map.put(map, atom_key, date)
          {:error, _} -> map
        end

      _ ->
        map
    end
  end

  defp put_time_if_present(map, params, key, atom_key) do
    case Map.get(params, key) do
      nil ->
        map

      value when is_binary(value) ->
        case Time.from_iso8601(value) do
          {:ok, time} -> Map.put(map, atom_key, time)
          {:error, _} -> map
        end

      _ ->
        map
    end
  end

  defp parse_int(nil, default), do: default

  defp parse_int(value, default) when is_binary(value) do
    case Integer.parse(value) do
      {int, _} -> int
      :error -> default
    end
  end

  defp parse_int(value, _default) when is_integer(value), do: value
  defp parse_int(_, default), do: default

  defp format_plan(plan) do
    %{
      id: plan.id,
      name: plan.name,
      description: plan.description,
      status: plan.status,
      cover_image_url: plan.cover_image_url,
      start_date: plan.start_date,
      end_date: plan.end_date,
      timezone: plan.timezone,
      business_id: plan.business_id,
      created_by_id: plan.created_by_id,
      assigned_to_id: plan.assigned_to_id,
      is_template: Easy.MealPlans.Plan.template?(plan),
      inserted_at: plan.inserted_at,
      updated_at: plan.updated_at
    }
  end

  defp format_plan_with_meals(plan) do
    plan
    |> format_plan()
    |> Map.put(:meals, Enum.map(plan.meal_plan_meals || [], &format_day_meal/1))
  end

  defp format_day_meal(day_meal) do
    base = %{
      id: day_meal.id,
      day_offset: day_meal.day_offset,
      day_number: MealPlanMeal.day_number(day_meal),
      label: day_meal.label,
      meal_time_window_start: day_meal.meal_time_window_start,
      meal_time_window_end: day_meal.meal_time_window_end,
      meal_id: day_meal.meal_id,
      inserted_at: day_meal.inserted_at,
      updated_at: day_meal.updated_at
    }

    case Map.get(day_meal, :meal) do
      %Ecto.Association.NotLoaded{} -> base
      nil -> base
      meal -> Map.put(base, :meal, format_meal_basic(meal))
    end
  end

  defp format_meal_basic(meal) do
    %{
      id: meal.id,
      name: meal.name,
      description: meal.description,
      meal_type: meal.meal_type,
      total_calories: meal.total_calories,
      total_protein: meal.total_protein,
      total_carbohydrates: meal.total_carbohydrates,
      total_fats: meal.total_fats,
      total_fiber: meal.total_fiber
    }
  end
end
