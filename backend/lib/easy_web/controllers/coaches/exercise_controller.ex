defmodule EasyWeb.Coaches.ExerciseController do
  use EasyWeb, :controller

  alias Easy.Training

  def create(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, exercise} <- Training.create_exercise(business_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, exercise: exercise)
    end
  end

  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, exercise} <- Training.fetch_exercise(business_id, id) do
      render(conn, :show, exercise: exercise)
    end
  end

  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, updated_exercise} <- Training.update_exercise(business_id, id, conn.body_params) do
      render(conn, :show, exercise: updated_exercise)
    end
  end

  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _deleted} <- Training.delete_exercise(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end

  def duplicate(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, duplicated_exercise} <- Training.duplicate_exercise(business_id, id) do
      conn
      |> put_status(:created)
      |> render(:show, exercise: duplicated_exercise)
    end
  end

  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, {exercises, pagination}} <- Training.list_exercises(business_id, params) do
      render(conn, :index, exercises: exercises, count: pagination.count)
    end
  end
end
