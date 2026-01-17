defmodule EasyWeb.Coaches.ExerciseController do
  use EasyWeb, :controller

  require Logger

  alias Easy.Training
  alias EasyWeb.FallbackController

  plug :authorize_resource when action in [:show, :update, :delete, :duplicate]
  plug :verify_ownership when action in [:update, :delete]

  def index(conn, params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, {exercises, meta}} <- Training.list_exercises(business_id, params) do
      conn
      |> put_status(:ok)
      |> render(:index, %{
        exercises: exercises,
        meta: meta
      })
    end
  end

  def create(conn, _params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, exercise} <-
           Training.create_exercise(business_id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:create, %{exercise: exercise})
    end
  end

  def show(conn, _params) do
    conn
    |> put_status(:ok)
    |> render(:show, %{exercise: conn.assigns.exercise})
  end

  def update(conn, _params) do
    with {:ok, updated_exercise} <-
           Training.update_exercise(conn.assigns.exercise, conn.body_params) do
      conn
      |> put_status(:ok)
      |> render(:update, %{exercise: updated_exercise})
    end
  end

  def delete(conn, _params) do
    with {:ok, _deleted_exercise} <- Training.delete_exercise(conn.assigns.exercise) do
      send_resp(conn, :no_content, "")
    end
  end

  def duplicate(conn, _params) do
    exercise = conn.assigns.exercise
    business_id = conn.assigns.token_claims["business_id"]

    with {:ok, duplicated_exercise} <- Training.duplicate_exercise(exercise, business_id) do
      conn
      |> put_status(:created)
      |> render(:create, %{exercise: duplicated_exercise})
    end
  end

  defp authorize_resource(conn, _opts) do
    with %{"id" => id} <- conn.params,
         %{"business_id" => business_id} <- conn.assigns.token_claims,
         {:ok, exercise} <- Training.fetch_exercise(business_id, id) do
      assign(conn, :exercise, exercise)
    else
      _ ->
        FallbackController.not_found_response(conn, "Exercise not found.")
    end
  end

  # Verify that the exercise belongs to the user's business (not a system exercise)
  # This prevents modification of system-level exercises (where business_id is nil)
  defp verify_ownership(conn, _opts) do
    exercise = conn.assigns.exercise
    business_id = conn.assigns.token_claims["business_id"]

    if exercise.business_id == business_id do
      conn
    else
      FallbackController.forbidden_response(
        conn,
        "Cannot modify system exercises. Use duplicate to create your own copy."
      )
    end
  end
end
