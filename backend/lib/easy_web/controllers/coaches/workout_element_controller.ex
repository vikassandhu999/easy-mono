defmodule EasyWeb.Coaches.WorkoutElementController do
  use EasyWeb, :controller

  alias Easy.Training
  alias EasyWeb.FallbackController

  plug :authorize_resource when action in [:show, :update, :delete]

  def create(conn, %{"workout_element" => element_params}) do
    business_id = conn.assigns.token_claims["business_id"]
    workout_id = element_params["planned_workout_id"]
    sets_attrs = Map.get(element_params, "sets", [])
    element_attrs = Map.delete(element_params, "sets")

    with {:ok, _} <- verify_workout_ownership(business_id, workout_id),
         {:ok, element} <-
           create_element_with_sets(business_id, workout_id, element_attrs, sets_attrs) do
      conn
      |> put_status(:created)
      |> render(:show, workout_element: element)
    end
  end

  def show(conn, _params) do
    render(conn, :show, workout_element: conn.assigns.workout_element)
  end

  def update(conn, %{"workout_element" => element_params}) do
    element = conn.assigns.workout_element
    business_id = conn.assigns.token_claims["business_id"]
    sets_attrs = Map.get(element_params, "sets")
    element_attrs = Map.delete(element_params, "sets")

    with {:ok, updated} <- do_update(element, element_attrs, sets_attrs) do
      render(conn, :show, workout_element: Training.get_workout_element!(business_id, updated.id))
    end
  end

  def delete(conn, _params) do
    with {:ok, _} <- Training.delete_workout_element(conn.assigns.workout_element) do
      send_resp(conn, :no_content, "")
    end
  end

  defp do_update(element, attrs, nil), do: Training.update_workout_element(element, attrs)

  defp do_update(element, attrs, sets),
    do: Training.update_workout_element_with_sets(element, attrs, sets)

  defp authorize_resource(conn, _opts) do
    with %{"id" => id} <- conn.params,
         %{"business_id" => business_id} <- conn.assigns.token_claims,
         {:ok, element} <- Training.fetch_workout_element(business_id, id) do
      assign(conn, :workout_element, element)
    else
      _ -> FallbackController.not_found_response(conn, "Workout element not found.")
    end
  end

  defp verify_workout_ownership(business_id, workout_id) when is_binary(workout_id) do
    Training.fetch_planned_workout(business_id, workout_id)
  end

  defp verify_workout_ownership(_, _), do: {:error, :invalid_workout_id}

  defp create_element_with_sets(business_id, workout_id, attrs, []) do
    with {:ok, element} <- Training.create_workout_element(business_id, workout_id, attrs) do
      {:ok, Training.get_workout_element!(business_id, element.id)}
    end
  end

  defp create_element_with_sets(business_id, workout_id, attrs, sets) do
    Training.create_workout_element_with_sets(business_id, workout_id, attrs, sets)
  end
end
