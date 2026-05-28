defmodule EasyWeb.Coaches.WorkoutElementController do
  use EasyWeb, :controller

  alias Easy.Workouts

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"workout_id" => workout_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, element} <- Workouts.create_workout_element(workout_id, business_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, element: element)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, element} <- Workouts.get_workout_element_with_exercise(business_id, id) do
      render(conn, :show, element: element)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, updated} <- Workouts.update_workout_element(business_id, id, conn.body_params) do
      render(conn, :show, element: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _element} <- Workouts.delete_workout_element(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
