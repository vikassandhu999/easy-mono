defmodule EasyWeb.Coaches.ExerciseController do
  use EasyWeb, :controller

  alias Easy.Repo
  alias Easy.Training.Exercise

  def create(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, exercise} <- Exercise.create(business_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, exercise: exercise)
    end
  end

  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Exercise
         |> Exercise.for_business(business_id)
         |> Exercise.with_preloads()
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      exercise -> render(conn, :show, exercise: exercise)
    end
  end

  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Exercise |> Exercise.for_business_only(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      exercise ->
        with {:ok, updated} <- Exercise.update(exercise, conn.body_params) do
          render(conn, :show, exercise: updated)
        end
    end
  end

  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Exercise |> Exercise.for_business_only(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      exercise ->
        with {:ok, _deleted} <- Exercise.delete(exercise) do
          send_resp(conn, :no_content, "")
        end
    end
  end

  def duplicate(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Exercise
         |> Exercise.for_business(business_id)
         |> Exercise.with_preloads()
         |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      exercise ->
        with {:ok, duplicated} <- Exercise.duplicate(exercise, business_id) do
          conn
          |> put_status(:created)
          |> render(:show, exercise: duplicated)
        end
    end
  end

  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    search = Map.get(params, "search", "")
    muscle_ids = parse_list(params, "muscle_ids")

    base =
      Exercise
      |> Exercise.for_business(business_id)
      |> Exercise.search(search)
      |> Exercise.with_muscle_ids(muscle_ids)

    count = Repo.aggregate(base, :count, :id)

    exercises =
      base
      |> Exercise.newest()
      |> Easy.Utils.paginate(offset, limit)
      |> Exercise.with_preloads()
      |> Repo.all()

    render(conn, :index, exercises: exercises, count: count)
  end
end
