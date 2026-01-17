defmodule EasyWeb.Coaches.PlannedWorkoutController do
  use EasyWeb, :controller

  alias Easy.Training
  alias EasyWeb.FallbackController

  plug :authorize_resource when action in [:show, :update, :delete]

  def create(conn, %{"planned_workout" => workout_params}) do
    business_id = conn.assigns.token_claims["business_id"]
    training_plan_id = workout_params["training_plan_id"]

    with {:ok, _} <- verify_training_plan_ownership(business_id, training_plan_id),
         {:ok, workout} <-
           Training.create_planned_workout(business_id, training_plan_id, workout_params) do
      conn
      |> put_status(:created)
      |> render(:show, planned_workout: Training.get_planned_workout!(business_id, workout.id))
    end
  end

  def show(conn, _params) do
    render(conn, :show, planned_workout: conn.assigns.planned_workout)
  end

  def update(conn, %{"planned_workout" => workout_params}) do
    business_id = conn.assigns.token_claims["business_id"]

    with {:ok, workout} <-
           Training.update_planned_workout(conn.assigns.planned_workout, workout_params) do
      render(conn, :show, planned_workout: Training.get_planned_workout!(business_id, workout.id))
    end
  end

  def delete(conn, _params) do
    with {:ok, _} <- Training.delete_planned_workout(conn.assigns.planned_workout) do
      send_resp(conn, :no_content, "")
    end
  end

  defp authorize_resource(conn, _opts) do
    with %{"id" => id} <- conn.params,
         %{"business_id" => business_id} <- conn.assigns.token_claims,
         {:ok, workout} <- Training.fetch_planned_workout(business_id, id) do
      assign(conn, :planned_workout, workout)
    else
      _ -> FallbackController.not_found_response(conn, "Planned workout not found.")
    end
  end

  defp verify_training_plan_ownership(business_id, training_plan_id)
       when is_binary(training_plan_id) do
    Training.fetch_training_plan(business_id, training_plan_id)
  end

  defp verify_training_plan_ownership(_, _), do: {:error, :invalid_training_plan_id}
end
