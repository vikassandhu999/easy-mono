defmodule EasyWeb.Coach.WorkoutElementController do
  use EasyWeb, :controller

  alias Easy.Training
  alias EasyWeb.FallbackController

  plug :authorize_resource when action in [:show, :update, :delete]

  def create(conn, %{"workout_element" => element_params}) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         planned_workout_id <- element_params["planned_workout_id"],
         # Verify the workout belongs to a training plan owned by this business
         {:ok, _workout} <- verify_workout_ownership(business_id, planned_workout_id),
         sets_attrs <- Map.get(element_params, "sets", []),
         element_attrs <- Map.delete(element_params, "sets"),
         {:ok, element} <-
           create_element_with_sets(business_id, planned_workout_id, element_attrs, sets_attrs) do
      conn
      |> put_status(:created)
      |> render(:show, %{workout_element: element})
    end
  end

  def show(conn, _params) do
    conn
    |> put_status(:ok)
    |> render(:show, %{workout_element: conn.assigns.workout_element})
  end

  def update(conn, %{"workout_element" => element_params}) do
    element = conn.assigns.workout_element
    sets_attrs = Map.get(element_params, "sets")
    element_attrs = Map.delete(element_params, "sets")

    result =
      if sets_attrs do
        Training.update_workout_element_with_sets(element, element_attrs, sets_attrs)
      else
        Training.update_workout_element(element, element_attrs)
      end

    case result do
      {:ok, updated_element} ->
        business_id = conn.assigns.token_claims["business_id"]
        full_element = Training.get_workout_element!(business_id, updated_element.id)

        conn
        |> put_status(:ok)
        |> render(:show, %{workout_element: full_element})

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  def delete(conn, _params) do
    with {:ok, _deleted_element} <- Training.delete_workout_element(conn.assigns.workout_element) do
      send_resp(conn, :no_content, "")
    end
  end

  defp authorize_resource(conn, _opts) do
    with %{"id" => id} <- conn.params,
         %{"business_id" => business_id} <- conn.assigns.token_claims,
         {:ok, element} <- Training.fetch_workout_element(business_id, id) do
      assign(conn, :workout_element, element)
    else
      _ ->
        FallbackController.not_found_response(conn, "Workout element not found.")
    end
  end

  defp verify_workout_ownership(business_id, workout_id) when is_binary(workout_id) do
    Training.fetch_planned_workout(business_id, workout_id)
  end

  defp verify_workout_ownership(_business_id, _workout_id), do: {:error, :invalid_workout_id}

  defp create_element_with_sets(business_id, planned_workout_id, element_attrs, []) do
    Training.create_workout_element(business_id, planned_workout_id, element_attrs)
    |> case do
      {:ok, element} -> {:ok, Training.get_workout_element!(business_id, element.id)}
      error -> error
    end
  end

  defp create_element_with_sets(business_id, planned_workout_id, element_attrs, sets_attrs) do
    Training.create_workout_element_with_sets(
      business_id,
      planned_workout_id,
      element_attrs,
      sets_attrs
    )
  end
end
