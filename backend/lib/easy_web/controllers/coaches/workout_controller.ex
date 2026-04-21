defmodule EasyWeb.Coaches.WorkoutController do
  use EasyWeb, :controller

  alias Easy.Repo
  alias Easy.Training.{Workout, TrainingPlan}

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"plan_id" => plan_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    if TrainingPlan.accessible?(business_id, plan_id) do
      with {:ok, workout} <- Workout.create(plan_id, business_id, params) do
        conn
        |> put_status(:created)
        |> render(:show, workout: workout)
      end
    else
      {:error, :not_found}
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Workout
         |> Workout.for_business(business_id)
         |> Workout.with_elements()
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      workout -> render(conn, :show, workout: workout)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Workout |> Workout.for_business(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      workout ->
        with {:ok, updated} <- Workout.update(workout, conn.body_params) do
          render(conn, :show, workout: updated)
        end
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Workout |> Workout.for_business(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      workout ->
        with {:ok, _workout} <- Workout.delete(workout) do
          send_resp(conn, :no_content, "")
        end
    end
  end

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with workout when not is_nil(workout) <-
           Workout |> Workout.for_business(business_id) |> Repo.get(id),
         {:ok, duplicated} <- Workout.duplicate(workout) do
      conn
      |> put_status(:created)
      |> render(:show, workout: duplicated)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"plan_id" => plan_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    if TrainingPlan.accessible?(business_id, plan_id) do
      offset = parse_integer(params, "offset", 0)
      limit = parse_integer(params, "limit", 50)

      base =
        Workout
        |> Workout.for_business(business_id)
        |> Workout.for_plan(plan_id)

      count = Repo.aggregate(base, :count, :id)

      workouts =
        base
        |> Workout.ordered()
        |> Easy.Utils.paginate(offset, limit)
        |> Workout.with_elements()
        |> Repo.all()

      render(conn, :index, workouts: workouts, count: count)
    else
      {:error, :not_found}
    end
  end
end
