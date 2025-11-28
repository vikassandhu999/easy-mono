defmodule EasyWeb.PlannedWorkoutController do
  use EasyWeb, :controller

  alias Easy.Training
  alias EasyWeb.FallbackController

  plug :authorize_resource when action in [:show, :update, :delete]

  def create(conn, %{"planned_workout" => workout_params}) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         # Verify the training plan belongs to this business
         {:ok, _training_plan} <-
           verify_training_plan_ownership(business_id, workout_params["training_plan_id"]),
         {:ok, workout} <- Training.create_planned_workout(workout_params) do
      full_workout = Training.get_planned_workout!(workout.id)

      conn
      |> put_status(:created)
      |> render(:show, %{planned_workout: full_workout})
    end
  end

  def show(conn, _params) do
    conn
    |> put_status(:ok)
    |> render(:show, %{planned_workout: conn.assigns.planned_workout})
  end

  def update(conn, %{"planned_workout" => workout_params}) do
    with {:ok, updated_workout} <-
           Training.update_planned_workout(conn.assigns.planned_workout, workout_params) do
      full_workout = Training.get_planned_workout!(updated_workout.id)

      conn
      |> put_status(:ok)
      |> render(:show, %{planned_workout: full_workout})
    end
  end

  def delete(conn, _params) do
    with {:ok, _deleted_workout} <- Training.delete_planned_workout(conn.assigns.planned_workout) do
      send_resp(conn, :no_content, "")
    end
  end

  defp authorize_resource(conn, _opts) do
    with %{"id" => id} <- conn.params,
         %{"business_id" => business_id} <- conn.assigns.token_claims,
         {:ok, workout} <- Training.fetch_planned_workout(business_id, id) do
      assign(conn, :planned_workout, workout)
    else
      _ ->
        FallbackController.not_found_response(conn, "Planned workout not found.")
    end
  end

  defp verify_training_plan_ownership(business_id, training_plan_id)
       when is_binary(training_plan_id) do
    Training.fetch_training_plan(business_id, training_plan_id)
  end

  defp verify_training_plan_ownership(_business_id, _training_plan_id),
    do: {:error, :invalid_training_plan_id}
end
