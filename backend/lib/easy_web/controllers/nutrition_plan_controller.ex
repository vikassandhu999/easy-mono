defmodule EasyWeb.NutritionPlanController do
  use EasyWeb, :controller

  alias Easy.Nutrition
  alias Easy.Nutrition.NutritionPlan
  alias EasyWeb.FallbackController

  plug :authorize_resource when action in [:show, :update, :delete]

  def index(conn, params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"] do
      {nutrition_plans, meta} = Nutrition.list_nutrition_plans(business_id, params)

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
