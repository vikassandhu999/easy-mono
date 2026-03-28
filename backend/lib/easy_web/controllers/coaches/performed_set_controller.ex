defmodule EasyWeb.Coaches.PerformedSetController do
  use EasyWeb, :controller

  alias Easy.Repo
  alias Easy.Training.{Exercise, PerformedSet, WorkoutElement, WorkoutSession}

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"workout_session_id" => session_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with true <- WorkoutSession.accessible?(business_id, session_id),
         true <- Exercise.accessible?(business_id, Map.get(params, "exercise_id")),
         true <- WorkoutElement.accessible?(business_id, Map.get(params, "workout_element_id")),
         {:ok, set} <- PerformedSet.create(session_id, business_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, set: set)
    else
      false -> {:error, :not_found}
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
         true <- Exercise.accessible?(business_id, Map.get(conn.body_params, "exercise_id")),
         {:ok, updated} <- PerformedSet.update(set, conn.body_params) do
      render(conn, :show, set: updated)
    else
      nil -> {:error, :not_found}
      false -> {:error, :not_found}
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
end
