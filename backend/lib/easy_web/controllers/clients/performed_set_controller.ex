defmodule EasyWeb.Clients.PerformedSetController do
  use EasyWeb, :controller

  import Ecto.Query, only: [where: 3, select: 3]

  alias Easy.Clients.Client
  alias Easy.Repo
  alias Easy.Training.{Exercise, PerformedSet, WorkoutElement, WorkoutSession}

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"workout_session_id" => session_id} = params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, _session} <- get_client_session(business_id, client.id, session_id),
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
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, set} <- get_client_set(business_id, client.id, id),
         true <- Exercise.accessible?(business_id, Map.get(conn.body_params, "exercise_id")),
         {:ok, updated} <- PerformedSet.update(set, conn.body_params) do
      render(conn, :show, set: updated)
    else
      false -> {:error, :not_found}
      error -> error
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, set} <- get_client_set(business_id, client.id, id),
         {:ok, _set} <- PerformedSet.delete(set) do
      send_resp(conn, :no_content, "")
    end
  end

  defp get_client_session(business_id, client_id, session_id) do
    case WorkoutSession
         |> WorkoutSession.for_business(business_id)
         |> WorkoutSession.for_client(client_id)
         |> Repo.get(session_id) do
      nil -> {:error, :not_found}
      session -> {:ok, session}
    end
  end

  defp get_client_set(business_id, client_id, set_id) do
    session_ids =
      WorkoutSession
      |> WorkoutSession.for_business(business_id)
      |> WorkoutSession.for_client(client_id)
      |> select([s], s.id)

    case PerformedSet
         |> PerformedSet.for_business(business_id)
         |> where([p], p.workout_session_id in subquery(session_ids))
         |> PerformedSet.with_exercise()
         |> Repo.get(set_id) do
      nil -> {:error, :not_found}
      set -> {:ok, set}
    end
  end
end
