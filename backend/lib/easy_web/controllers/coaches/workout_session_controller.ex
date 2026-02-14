defmodule EasyWeb.Coaches.WorkoutSessionController do
  use EasyWeb, :controller

  alias Easy.Training

  def create(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, session} <- Training.create_workout_session(business_id, client_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, session: session)
    end
  end

  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, session} <- Training.fetch_workout_session(business_id, id) do
      render(conn, :show, session: session)
    end
  end

  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, {sessions, pagination}} <- Training.list_workout_sessions(business_id, params) do
      render(conn, :index, sessions: sessions, count: pagination.count)
    end
  end

  def complete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, session} <- Training.complete_workout_session(business_id, id, conn.body_params) do
      render(conn, :show, session: session)
    end
  end

  def discard(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, session} <- Training.discard_workout_session(business_id, id) do
      render(conn, :show, session: session)
    end
  end

  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _session} <- Training.delete_workout_session(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
