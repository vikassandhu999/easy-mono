defmodule EasyWeb.Coaches.WorkoutElementController do
  use EasyWeb, :controller

  alias Easy.Repo
  alias Easy.Training.{Exercise, PlannedWorkout, WorkoutElement}

  def create(conn, %{"planned_workout_id" => planned_workout_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with true <- planned_workout_accessible?(business_id, planned_workout_id),
         :ok <- validate_exercise_access(business_id, params),
         {:ok, element} <- WorkoutElement.create(planned_workout_id, business_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, element: element)
    else
      false -> {:error, :not_found}
      {:error, :not_found} -> {:error, :not_found}
      error -> error
    end
  end

  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case WorkoutElement
         |> WorkoutElement.for_business(business_id)
         |> WorkoutElement.with_exercise()
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      element -> render(conn, :show, element: element)
    end
  end

  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with element when not is_nil(element) <-
           WorkoutElement
           |> WorkoutElement.for_business(business_id)
           |> WorkoutElement.with_exercise()
           |> Repo.get(id),
         :ok <- validate_exercise_access(business_id, conn.body_params),
         {:ok, updated} <- WorkoutElement.update(element, conn.body_params) do
      render(conn, :show, element: updated)
    else
      nil -> {:error, :not_found}
      {:error, :not_found} -> {:error, :not_found}
      error -> error
    end
  end

  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case WorkoutElement |> WorkoutElement.for_business(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      element ->
        with {:ok, _element} <- WorkoutElement.delete(element) do
          send_resp(conn, :no_content, "")
        end
    end
  end

  defp planned_workout_accessible?(business_id, planned_workout_id) do
    PlannedWorkout
    |> PlannedWorkout.for_business(business_id)
    |> Repo.get(planned_workout_id)
    |> is_struct(PlannedWorkout)
  end

  defp validate_exercise_access(business_id, attrs) do
    case Map.get(attrs, "exercise_id") || Map.get(attrs, :exercise_id) do
      nil ->
        :ok

      exercise_id ->
        exercise =
          Exercise
          |> Exercise.for_business(business_id)
          |> Repo.get(exercise_id)

        if is_struct(exercise, Exercise), do: :ok, else: {:error, :not_found}
    end
  end
end
