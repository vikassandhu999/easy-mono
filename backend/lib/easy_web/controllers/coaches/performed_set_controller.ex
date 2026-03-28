defmodule EasyWeb.Coaches.PerformedSetController do
  use EasyWeb, :controller

  alias Easy.Repo
  alias Easy.Training.{Exercise, PerformedSet, WorkoutElement, WorkoutSession}

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"workout_session_id" => session_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with true <- session_accessible?(business_id, session_id),
         :ok <- validate_exercise_access(business_id, params),
         :ok <- validate_element_access(business_id, params),
         {:ok, set} <- PerformedSet.create(session_id, business_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, set: set)
    else
      false -> {:error, :not_found}
      {:error, :not_found} -> {:error, :not_found}
      error -> error
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with set when not is_nil(set) <-
           PerformedSet
           |> PerformedSet.for_business(business_id)
           |> PerformedSet.with_exercise()
           |> Repo.get(id),
         :ok <- validate_exercise_access(business_id, conn.body_params),
         {:ok, updated} <- PerformedSet.update(set, conn.body_params) do
      render(conn, :show, set: updated)
    else
      nil -> {:error, :not_found}
      {:error, :not_found} -> {:error, :not_found}
      error -> error
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case PerformedSet |> PerformedSet.for_business(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      set ->
        with {:ok, _set} <- PerformedSet.delete(set) do
          send_resp(conn, :no_content, "")
        end
    end
  end

  defp session_accessible?(business_id, session_id) do
    WorkoutSession
    |> WorkoutSession.for_business(business_id)
    |> Repo.get(session_id)
    |> is_struct(WorkoutSession)
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

  defp validate_element_access(business_id, attrs) do
    case Map.get(attrs, "workout_element_id") || Map.get(attrs, :workout_element_id) do
      nil ->
        :ok

      element_id ->
        element =
          WorkoutElement
          |> WorkoutElement.for_business(business_id)
          |> Repo.get(element_id)

        if is_struct(element, WorkoutElement), do: :ok, else: {:error, :not_found}
    end
  end
end
