defmodule EasyWeb.Clients.PerformedSetController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Training.PerformedSet
  alias Easy.Training.Reads

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"workout_session_id" => session_id} = params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, _session} <- Reads.fetch_client_session(business_id, client.id, session_id),
         {:ok, :valid} <- Reads.ensure_exercise(business_id, Map.get(params, "exercise_id")),
         {:ok, :valid} <-
           Reads.ensure_workout_element(business_id, Map.get(params, "workout_element_id")),
         {:ok, set} <- PerformedSet.create(session_id, business_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, set: set)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, set} <- Reads.fetch_client_performed_set(business_id, client.id, id),
         {:ok, :valid} <-
           Reads.ensure_exercise(business_id, Map.get(conn.body_params, "exercise_id")),
         {:ok, updated} <- PerformedSet.update(set, conn.body_params) do
      render(conn, :show, set: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, set} <- Reads.fetch_client_performed_set(business_id, client.id, id),
         {:ok, _set} <- PerformedSet.delete(set) do
      send_resp(conn, :no_content, "")
    end
  end
end
