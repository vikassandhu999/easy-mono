defmodule EasyWeb.MealController do
  use EasyWeb, :controller

  alias Easy.Nutrition
  alias Easy.Nutrition.Meal

  def create(conn, %{"nutrition_plan_id" => nutrition_plan_id, "meal" => meal_params}) do
    with {:ok, nutrition_plan} <-
           Nutrition.fetch_nutrition_plan(conn.assigns.current_business.id, nutrition_plan_id),
         {:ok, %Meal{} = meal} <- Nutrition.create_meal(nutrition_plan, meal_params) do
      conn
      |> put_status(:created)
      |> render("show.json", meal: meal)
    else
      {:error, :not_found} ->
        {:error, :not_found}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  def update(conn, %{"id" => id, "meal" => meal_params}) do
    with {:ok, %Meal{} = meal} <- Nutrition.get_meal(id),
         {:ok, %Meal{} = updated_meal} <- Nutrition.update_meal(meal, meal_params) do
      render(conn, "show.json", meal: updated_meal)
    else
      {:error, :not_found} ->
        {:error, :not_found}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  def delete(conn, %{"id" => id}) do
    with {:ok, %Meal{} = meal} <- Nutrition.get_meal(id),
         {:ok, _} <- Nutrition.delete_meal(meal) do
      send_resp(conn, :no_content, "")
    end
  end
end
