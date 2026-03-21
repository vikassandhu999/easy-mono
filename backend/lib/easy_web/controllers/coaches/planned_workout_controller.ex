defmodule EasyWeb.Coaches.PlannedWorkoutController do
  use EasyWeb, :controller

  alias Easy.Repo
  alias Easy.Training.{PlannedWorkout, TrainingPlan}

  def create(conn, %{"plan_id" => plan_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    if training_plan_accessible?(business_id, plan_id) do
      with {:ok, workout} <- PlannedWorkout.create(plan_id, business_id, params) do
        conn
        |> put_status(:created)
        |> render(:show, workout: workout)
      end
    else
      {:error, :not_found}
    end
  end

  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case PlannedWorkout
         |> PlannedWorkout.for_business(business_id)
         |> PlannedWorkout.with_elements()
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      workout -> render(conn, :show, workout: workout)
    end
  end

  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case PlannedWorkout |> PlannedWorkout.for_business(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      workout ->
        with {:ok, updated} <- PlannedWorkout.update(workout, conn.body_params) do
          render(conn, :show, workout: updated)
        end
    end
  end

  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case PlannedWorkout |> PlannedWorkout.for_business(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      workout ->
        with {:ok, _workout} <- PlannedWorkout.delete(workout) do
          send_resp(conn, :no_content, "")
        end
    end
  end

  def index(conn, %{"plan_id" => plan_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    if training_plan_accessible?(business_id, plan_id) do
      offset = parse_integer(params, "offset", 0)
      limit = parse_integer(params, "limit", 50)

      base =
        PlannedWorkout
        |> PlannedWorkout.for_business(business_id)
        |> PlannedWorkout.for_plan(plan_id)

      count = Repo.aggregate(base, :count, :id)

      workouts =
        base
        |> PlannedWorkout.ordered()
        |> Easy.Utils.paginate(offset, limit)
        |> PlannedWorkout.with_elements()
        |> Repo.all()

      render(conn, :index, workouts: workouts, count: count)
    else
      {:error, :not_found}
    end
  end

  defp training_plan_accessible?(business_id, plan_id) do
    TrainingPlan
    |> TrainingPlan.for_business(business_id)
    |> Repo.get(plan_id)
    |> is_struct(TrainingPlan)
  end
end
