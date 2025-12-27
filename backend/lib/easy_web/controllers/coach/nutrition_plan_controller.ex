defmodule EasyWeb.Coach.NutritionPlanController do
  use EasyWeb, :controller

  alias Easy.Nutrition
  alias Easy.Utils
  alias EasyWeb.FallbackController

  @allowed_aggregates [:daily, :weekly, :total]

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
         {:ok, {plans, meta}} <- Nutrition.list_nutrition_plans(claims["business_id"], params) do
      render(conn, :index, nutrition_plans: plans, meta: meta)
    end
  end

  def create(conn, _params) do
    with claims <- conn.assigns.token_claims,
         {:ok, plan} <-
           Nutrition.create_nutrition_plan(
             claims["business_id"],
             claims["coach_id"],
             conn.body_params
           ) do
      conn
      |> put_status(:created)
      |> render(:create, nutrition_plan: plan)
    end
  end

  def show(conn, _params) do
    render(conn, :show, nutrition_plan: conn.assigns.nutrition_plan)
  end

  def update(conn, _params) do
    with {:ok, plan} <-
           Nutrition.update_nutrition_plan(conn.assigns.nutrition_plan, conn.body_params) do
      render(conn, :update, nutrition_plan: plan)
    end
  end

  def delete(conn, _params) do
    with {:ok, _} <- Nutrition.delete_nutrition_plan(conn.assigns.nutrition_plan) do
      send_resp(conn, :no_content, "")
    end
  end

  def assign(conn, %{"client_id" => client_id} = params) do
    plan = conn.assigns.nutrition_plan
    business_id = conn.assigns.token_claims["business_id"]

    with {:ok, plan} <-
           Nutrition.assign_nutrition_plan_to_client(
             business_id,
             plan.id,
             client_id,
             Map.take(params, ["start_date"])
           ) do
      conn
      |> put_status(:created)
      |> render(:show, nutrition_plan: plan)
    end
  end

  def duplicate(conn, %{"target_client_id" => target_client_id}) do
    plan = conn.assigns.nutrition_plan
    business_id = conn.assigns.token_claims["business_id"]

    with {:ok, plan} <- Nutrition.duplicate_nutrition_plan(business_id, plan.id, target_client_id) do
      conn
      |> put_status(:created)
      |> render(:show, nutrition_plan: plan)
    end
  end

  def duplicate(conn, _params) do
    plan = conn.assigns.nutrition_plan
    claims = conn.assigns.token_claims

    with {:ok, plan} <-
           Nutrition.duplicate_nutrition_plan_as_template(
             claims["business_id"],
             claims["coach_id"],
             plan
           ) do
      conn
      |> put_status(:created)
      |> render(:show, nutrition_plan: plan)
    end
  end

  def copy_day(conn, %{"source_day" => source_day, "target_day" => target_day}) do
    plan = conn.assigns.nutrition_plan
    business_id = conn.assigns.token_claims["business_id"]

    with {:ok, _} <- Nutrition.copy_day(plan.id, source_day, target_day),
         {:ok, plan} <- Nutrition.fetch_nutrition_plan(business_id, plan.id) do
      render(conn, :show, nutrition_plan: plan)
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
    with {:ok, :ok} <-
           Nutrition.reorder_meals(conn.assigns.nutrition_plan.id, day_number, meal_ids) do
      send_resp(conn, :no_content, "")
    end
  end

  def bulk_create_meals(conn, params) do
    plan = conn.assigns.nutrition_plan
    business_id = conn.assigns.token_claims["business_id"]

    with {:ok, _} <- Nutrition.bulk_create_meals(plan, params),
         {:ok, plan} <- Nutrition.fetch_nutrition_plan(business_id, plan.id) do
      conn
      |> put_status(:created)
      |> render(:show, nutrition_plan: plan)
    end
  end

  def macros(conn, params) do
    plan = conn.assigns.nutrition_plan
    opts = macros_opts(params)

    with {:ok, macros} <- Nutrition.calculate_plan_macros(plan.id, opts) do
      json(conn, %{data: macros})
    end
  end

  defp macros_opts(params) do
    %{
      day_number: parse_integer(params["day_number"]),
      aggregate: Utils.safe_to_atom(params["aggregate"], @allowed_aggregates)
    }
  end

  defp parse_integer(nil), do: nil
  defp parse_integer(value) when is_binary(value), do: String.to_integer(value)

  defp authorize_resource(conn, _opts) do
    with %{"id" => id} <- conn.params,
         %{"business_id" => business_id} <- conn.assigns.token_claims,
         {:ok, plan} <- Nutrition.fetch_nutrition_plan(business_id, id) do
      assign(conn, :nutrition_plan, plan)
    else
      _ -> FallbackController.not_found_response(conn, "Plan not found.")
    end
  end
end
