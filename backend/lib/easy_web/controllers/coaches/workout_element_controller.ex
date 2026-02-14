defmodule EasyWeb.Coaches.WorkoutElementController do
  use EasyWeb, :controller

  alias Easy.Training

  def create(conn, %{"planned_workout_id" => planned_workout_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, element} <-
           Training.create_workout_element(business_id, planned_workout_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, element: element)
    end
  end

  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, element} <- Training.fetch_workout_element(business_id, id) do
      render(conn, :show, element: element)
    end
  end

  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, element} <- Training.update_workout_element(business_id, id, conn.body_params) do
      render(conn, :show, element: element)
    end
  end

  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _element} <- Training.delete_workout_element(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
