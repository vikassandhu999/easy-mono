defmodule EasyWeb.Coaches.PerformedSetController do
  use EasyWeb, :controller

  alias Easy.Training.PerformedSet
  alias Easy.Training.SessionReads

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"workout_session_id" => session_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _session} <- SessionReads.fetch_session_with_sets(business_id, session_id),
         {:ok, set} <- PerformedSet.create(session_id, business_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, set: set)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, set} <- SessionReads.fetch_performed_set_with_exercise(business_id, id),
         {:ok, updated} <- PerformedSet.update(set, conn.body_params) do
      render(conn, :show, set: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, set} <- SessionReads.fetch_performed_set(business_id, id),
         {:ok, _set} <- PerformedSet.delete(set) do
      send_resp(conn, :no_content, "")
    end
  end
end
