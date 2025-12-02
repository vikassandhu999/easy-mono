defmodule EasyWeb.PerformedSetController do
  @moduledoc """
  Controller for managing performed sets during workout tracking.

  Sets are created/updated in real-time as the client logs their workout.
  All operations are scoped to the workout session's business.
  """
  use EasyWeb, :controller

  alias Easy.Training
  alias EasyWeb.FallbackController

  plug :authorize_session when action in [:create]
  plug :authorize_set when action in [:update, :delete]

  @doc """
  Creates a new performed set for a workout session.

  ## Request Body
      {
        "performed_set": {
          "workout_session_id": "uuid",
          "exercise_id": "uuid",
          "position": 0,
          "actual_reps": "10",
          "load_value": 100,
          "load_unit": "kg"
        }
      }
  """
  def create(conn, %{"performed_set" => set_params}) do
    session = conn.assigns.workout_session

    # Ensure the set is for this session
    set_params = Map.put(set_params, "workout_session_id", session.id)

    with {:ok, set} <- Training.create_performed_set(set_params) do
      conn
      |> put_status(:created)
      |> render(:show, %{performed_set: set})
    end
  end

  @doc """
  Updates an existing performed set.
  """
  def update(conn, %{"performed_set" => set_params}) do
    set = conn.assigns.performed_set

    with {:ok, updated_set} <- Training.update_performed_set(set, set_params) do
      conn
      |> put_status(:ok)
      |> render(:show, %{performed_set: updated_set})
    end
  end

  @doc """
  Deletes a performed set.
  """
  def delete(conn, _params) do
    with {:ok, _deleted} <- Training.delete_performed_set(conn.assigns.performed_set) do
      send_resp(conn, :no_content, "")
    end
  end

  # Authorize that the session belongs to this business and allow set creation
  defp authorize_session(conn, _opts) do
    with %{"workout_session_id" => session_id} <-
           conn.params["performed_set"] || %{},
         %{"business_id" => business_id} <- conn.assigns.token_claims,
         {:ok, session} <- Training.fetch_session(business_id, session_id) do
      assign(conn, :workout_session, session)
    else
      _ ->
        FallbackController.not_found_response(conn, "Workout session not found.")
    end
  end

  # Authorize that the set belongs to a session owned by this business
  defp authorize_set(conn, _opts) do
    with %{"id" => id} <- conn.params,
         %{"business_id" => business_id} <- conn.assigns.token_claims,
         {:ok, set} <- Training.fetch_performed_set(business_id, id) do
      assign(conn, :performed_set, set)
    else
      _ ->
        FallbackController.not_found_response(conn, "Performed set not found.")
    end
  end
end
