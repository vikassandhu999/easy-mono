defmodule EasyWeb.Coaches.PlannedWorkoutController do
  use EasyWeb, :controller

  alias Easy.Training

  def create(conn, %{"plan_id" => plan_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, workout} <- Training.create_planned_workout(business_id, plan_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, workout: workout)
    end
  end

  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, workout} <- Training.fetch_planned_workout(business_id, id) do
      render(conn, :show, workout: workout)
    end
  end

  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, workout} <- Training.update_planned_workout(business_id, id, conn.body_params) do
      render(conn, :show, workout: workout)
    end
  end

  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _workout} <- Training.delete_planned_workout(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end

  def index(conn, %{"plan_id" => plan_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, {workouts, pagination}} <-
           Training.list_planned_workouts(business_id, plan_id, params) do
      render(conn, :index, workouts: workouts, count: pagination.count)
    end
  end
end
