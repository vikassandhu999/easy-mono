defmodule EasyWeb.ExerciseController do
  use EasyWeb, :controller

  alias Easy.Training
  alias Easy.Training.Library.Exercise

  def index(conn, _params) do
    # Get business_id from the authenticated user's scope if available
    business_id = conn.assigns[:current_business_id]

    exercises = Training.list_exercises(business_id: business_id)
    render(conn, :index, exercises: exercises)
  end

  def create(conn, %{"exercise" => exercise_params}) do
    business_id = conn.assigns[:current_business_id]

    # Force business_id for custom exercises
    exercise_params = Map.put(exercise_params, "business_id", business_id)

    with {:ok, %Exercise{} = exercise} <- Training.create_exercise(exercise_params) do
      conn
      |> put_status(:created)
      |> put_resp_header("location", ~p"/api/exercises/#{exercise}")
      |> render(:show, exercise: exercise)
    end
  end

  def show(conn, %{"id" => id}) do
    exercise = Training.get_exercise!(id)
    render(conn, :show, exercise: exercise)
  end

  def update(conn, %{"id" => id, "exercise" => exercise_params}) do
    exercise = Training.get_exercise!(id)

    # Ensure user owns the exercise (business check)
    if exercise.business_id == conn.assigns[:current_business_id] do
      with {:ok, %Exercise{} = exercise} <- Training.update_exercise(exercise, exercise_params) do
        render(conn, :show, exercise: exercise)
      end
    else
      {:error, :forbidden}
    end
  end

  def delete(conn, %{"id" => id}) do
    exercise = Training.get_exercise!(id)

    # Ensure user owns the exercise
    if exercise.business_id == conn.assigns[:current_business_id] do
      with {:ok, %Exercise{}} <- Training.delete_exercise(exercise) do
        send_resp(conn, :no_content, "")
      end
    else
      {:error, :forbidden}
    end
  end
end
