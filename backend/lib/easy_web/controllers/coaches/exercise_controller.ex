defmodule EasyWeb.Coaches.ExerciseController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias Easy.Training.Library
  alias EasyWeb.Types.Training.Exercise

  typed(:index, query: Exercise.list_query(), ok: {200, page(Exercise.t())})
  typed(:show, ok: {200, data(Exercise.t())})
  typed(:create, body: Exercise.create(), ok: {201, data(Exercise.t())})
  typed(:update, body: Exercise.update(), ok: {200, data(Exercise.t())})
  typed(:delete, ok: {204, nil})
  typed(:copy, body: Exercise.copy(), ok: {201, data(Exercise.t())})

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, exercise} <- Library.create_exercise(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: exercise})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, exercise} <- Library.get_exercise(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: exercise})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, exercise} <-
           Library.update_exercise(conn.assigns.ctx, conn.path_params["id"], conn.body_params) do
      ok(conn, %{data: exercise})
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    with {:ok, _exercise} <- Library.delete_exercise(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn)
    end
  end

  @spec copy(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def copy(conn, _params) do
    with {:ok, exercise} <-
           Library.duplicate_exercise(conn.assigns.ctx, conn.path_params["id"], conn.body_params) do
      ok(conn, %{data: exercise})
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params

    opts = [
      offset: Map.get(params, "offset", 0),
      limit: Map.get(params, "limit", 20),
      search: Map.get(params, "search", ""),
      muscle_ids: Map.get(params, "muscle_ids"),
      equipment_ids: Map.get(params, "equipment_ids")
    ]

    with {:ok, %{exercises: exercises, count: count}} <-
           Library.list_exercises(conn.assigns.ctx, opts) do
      ok(conn, %{data: exercises, count: count})
    end
  end
end
