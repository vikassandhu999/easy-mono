defmodule EasyWeb.WorkoutSessionController do
  use EasyWeb, :controller

  alias Easy.Training
  alias EasyWeb.FallbackController

  plug :authorize_resource when action in [:show, :complete, :discard]

  def index(conn, params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, sessions} <- Training.list_sessions(business_id, filter_opts(params)) do
      render(conn, :index, sessions: sessions)
    end
  end

  def create(conn, %{"session" => session_params}) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         client_id <- claims["client_id"],
         {:ok, session} <- Training.start_session(business_id, client_id, session_params) do
      conn
      |> put_status(:created)
      |> render(:show, session: session)
    end
  end

  def show(conn, _params) do
    render(conn, :show, session: conn.assigns.session)
  end

  def complete(conn, %{"session" => session_params}) do
    with {:ok, session} <- Training.complete_session(conn.assigns.session, session_params) do
      render(conn, :show, session: session)
    end
  end

  def discard(conn, _params) do
    with {:ok, session} <- Training.discard_session(conn.assigns.session) do
      render(conn, :show, session: session)
    end
  end

  defp filter_opts(params) do
    opts = []

    opts =
      if params["client_id"], do: Keyword.put(opts, :client_id, params["client_id"]), else: opts

    opts =
      if params["state"],
        do: Keyword.put(opts, :state, String.to_existing_atom(params["state"])),
        else: opts

    opts
  end

  defp authorize_resource(conn, _opts) do
    with %{"id" => id} <- conn.params,
         %{"business_id" => business_id} <- conn.assigns.token_claims,
         {:ok, session} <- Training.fetch_session(business_id, id) do
      assign(conn, :session, session)
    else
      _ ->
        FallbackController.not_found_response(conn, "Workout session not found.")
    end
  end
end
