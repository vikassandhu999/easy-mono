defmodule EasyWeb.NutritionPlanController do
  use EasyWeb, :controller

  alias Easy.Nutrition
  alias Easy.Nutrition.NutritionPlan
  alias EasyWeb.FallbackController

  plug :authorize_resource
       when action in [
              :show,
              :update,
              :delete,
              :assign,
              :duplicate,
              :copy_day,
              :shopping_list,
              :reorder_meals,
              :bulk_create_meals,
              :macros
            ]

  def index(conn, params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, {nutrition_plans, meta}} <- Nutrition.list_nutrition_plans(business_id, params) do
      conn
      |> put_status(:ok)
      |> render(:index, %{
        nutrition_plans: nutrition_plans,
        meta: meta
      })
    end
  end

  def create(conn, _params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         coach_id <- claims["coach_id"],
         {:ok, nutrition_plan} <-
           Nutrition.create_nutrition_plan(business_id, coach_id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:create, %{nutrition_plan: nutrition_plan})
    end
  end

  def show(conn, _params) do
    conn
    |> put_status(:ok)
    |> render(:show, %{nutrition_plan: conn.assigns.nutrition_plan})
  end

  def update(conn, _params) do
    with {:ok, nutrition_plan} <-
           Nutrition.update_nutrition_plan(conn.assigns.nutrition_plan, conn.body_params) do
      conn
      |> put_status(:ok)
      |> render(:update, %{nutrition_plan: nutrition_plan})
    end
  end

  def delete(conn, _params) do
    with {:ok, _deleted_plan} <- Nutrition.delete_nutrition_plan(conn.assigns.nutrition_plan) do
      send_resp(conn, :no_content, "")
    end
  end

  def assign(conn, %{"client_id" => client_id} = params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         opts = Map.take(params, ["start_date"]),
         {:ok, new_plan} <-
           Nutrition.assign_nutrition_plan_to_client(
             business_id,
             conn.assigns.nutrition_plan.id,
             client_id,
             opts
           ) do
      conn
      |> put_status(:created)
      |> render(:show, %{nutrition_plan: new_plan})
    end
  end

  # Duplicate to a specific client
  def duplicate(conn, %{"target_client_id" => target_client_id}) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, new_plan} <-
           Nutrition.duplicate_nutrition_plan(
             business_id,
             conn.assigns.nutrition_plan.id,
             target_client_id
           ) do
      conn
      |> put_status(:created)
      |> render(:show, %{nutrition_plan: new_plan})
    end
  end

  # Duplicate as a new template (no client)
  def duplicate(conn, _params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         coach_id <- claims["coach_id"],
         {:ok, new_plan} <-
           Nutrition.duplicate_nutrition_plan_as_template(
             business_id,
             coach_id,
             conn.assigns.nutrition_plan
           ) do
      conn
      |> put_status(:created)
      |> render(:show, %{nutrition_plan: new_plan})
    end
  end

  def copy_day(conn, %{"source_day" => source_day, "target_day" => target_day}) do
    with {:ok, _} <-
           Nutrition.copy_day(conn.assigns.nutrition_plan.id, source_day, target_day),
         {:ok, updated_plan} <-
           Nutrition.fetch_nutrition_plan(
             conn.assigns.token_claims["business_id"],
             conn.assigns.nutrition_plan.id
           ) do
      conn
      |> put_status(:ok)
      |> render(:show, %{nutrition_plan: updated_plan})
    end
  end

  def shopping_list(conn, _params) do
    plan = conn.assigns.nutrition_plan
    business_id = conn.assigns.token_claims["business_id"]

    with {:ok, items} <- Nutrition.generate_shopping_list(business_id, plan.id) do
      json(conn, %{data: items})
    end
  end

  def reorder_meals(conn, %{"day_number" => day_number, "meal_ids" => meal_ids}) do
    plan = conn.assigns.nutrition_plan

    with {:ok, :ok} <- Nutrition.reorder_meals(plan.id, day_number, meal_ids) do
      send_resp(conn, :no_content, "")
    end
  end

  def bulk_create_meals(conn, params) do
    plan = conn.assigns.nutrition_plan

    with {:ok, _result} <- Nutrition.bulk_create_meals(plan, params),
         {:ok, updated_plan} <-
           Nutrition.fetch_nutrition_plan(
             conn.assigns.token_claims["business_id"],
             plan.id
           ) do
      conn
      |> put_status(:created)
      |> render(:show, %{nutrition_plan: updated_plan})
    end
  end

  @allowed_aggregates [:daily, :weekly, :total]

  def macros(conn, params) do
    plan = conn.assigns.nutrition_plan

    opts = %{
      day_number: params["day_number"] && String.to_integer(params["day_number"]),
      aggregate: params["aggregate"] && parse_aggregate(params["aggregate"])
    }

    with {:ok, macros} <- Nutrition.calculate_plan_macros(plan.id, opts) do
      json(conn, %{data: macros})
    end
  end

  defp parse_aggregate(value) when is_binary(value) do
    case Easy.Utils.safe_to_atom(value, @allowed_aggregates) do
      nil -> nil
      atom -> atom
    end
  end

  defp parse_aggregate(_), do: nil

  defp authorize_resource(conn, _opts) do
    with %{"id" => id} <- conn.params,
         %{"business_id" => business_id} <- conn.assigns.token_claims,
         {:ok, %NutritionPlan{} = nutrition_plan} <-
           Nutrition.fetch_nutrition_plan(business_id, id) do
      assign(conn, :nutrition_plan, nutrition_plan)
    else
      _ ->
        FallbackController.not_found_response(conn, "Plan not found.")
    end
  end
end
