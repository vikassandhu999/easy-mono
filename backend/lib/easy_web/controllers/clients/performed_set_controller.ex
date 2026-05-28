defmodule EasyWeb.Clients.PerformedSetController do
  use EasyWeb, :controller

  alias Easy.Training.Sessions

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"workout_session_id" => session_id} = params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, set} <-
           Sessions.create_client_performed_set_for_user(business_id, user_id, session_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, set: set)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, updated} <-
           Sessions.update_client_performed_set_for_user(
             business_id,
             user_id,
             id,
             conn.body_params
           ) do
      render(conn, :show, set: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, _set} <- Sessions.delete_client_performed_set_for_user(business_id, user_id, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
