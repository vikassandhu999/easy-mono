defmodule EasyWeb.MealController do
  use EasyWeb, :controller

  alias Easy.Nutrition

  def create(conn, %{"nutrition_plan_id" => plan_id} = params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, plan} <- Nutrition.fetch_nutrition_plan(business_id, plan_id),
         {:ok, meal} <- Nutrition.create_meal(plan, params) do
      conn
      |> put_status(:created)
      |> render(:show, %{meal: meal})
    end
  end

  def show(conn, %{"id" => id}) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, meal} <- Nutrition.fetch_meal(business_id, id) do
      render(conn, :show, %{meal: meal})
    end
  end

  def update(conn, %{"id" => id} = params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, meal} <- Nutrition.fetch_meal(business_id, id),
         {:ok, updated_meal} <- Nutrition.update_meal(meal, params) do
      render(conn, :show, %{meal: updated_meal})
    end
  end

  def delete(conn, %{"id" => id}) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, meal} <- Nutrition.fetch_meal(business_id, id),
         {:ok, _} <- Nutrition.delete_meal(meal) do
      send_resp(conn, :no_content, "")
    end
  end

  def copy_to_day(conn, %{"id" => meal_id, "target_day" => target_day}) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, meal} <- Nutrition.fetch_meal(business_id, meal_id),
         {:ok, new_meal} <- Nutrition.copy_meal_to_day(meal, target_day) do
      conn
      |> put_status(:created)
      |> render(:show, %{meal: new_meal})
    end
  end
end
