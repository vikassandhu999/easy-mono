defmodule EasyWeb.Coaches.ExerciseController do
  use EasyWeb, :controller

  alias Easy.Training.Exercises

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, exercise} <- Exercises.create_exercise(business_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, exercise: exercise)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, exercise} <- Exercises.fetch_exercise(business_id, id) do
      render(conn, :show, exercise: exercise)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, updated} <- Exercises.update_exercise(business_id, id, conn.body_params) do
      render(conn, :show, exercise: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _deleted} <- Exercises.delete_exercise(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, duplicated} <- Exercises.duplicate_exercise(business_id, id) do
      conn
      |> put_status(:created)
      |> render(:show, exercise: duplicated)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    search = Map.get(params, "search", "")
    muscle_ids = parse_list(params, "muscle_ids")

    with {:ok, %{exercises: exercises, count: count}} <-
           Exercises.list_exercises(business_id, search, muscle_ids, offset, limit) do
      render(conn, :index, exercises: exercises, count: count)
    end
  end
end
