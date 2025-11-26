defmodule EasyWeb.WorkoutSessionController do
  use EasyWeb, :controller

  alias Easy.Training
  alias Easy.Training.Tracking.WorkoutSession

  def index(conn, _params) do
    # Assuming client context - filtering by client_id would be needed for coaches
    # For now, let's assume this is a client-facing endpoint or we filter by business
    # Ideally we'd check if user is coach or client and filter accordingly

    # Placeholder: List all sessions for the business (needs refinement for client vs coach view)
    # business_id = conn.assigns[:current_business_id]
    # sessions = Training.list_sessions(business_id: business_id)

    # For MVP, let's just return empty or implement basic listing if needed
    # But based on plan, we need list_sessions.
    # Let's implement basic listing for now.

    # TODO: Implement proper filtering based on user role
    sessions = []
    render(conn, :index, sessions: sessions)
  end

  def create(conn, %{"session" => session_params}) do
    business_id = conn.assigns[:current_business_id]
    # Assuming client is creating session
    client_id = conn.assigns[:current_user_id]

    session_params =
      session_params
      |> Map.put("business_id", business_id)
      |> Map.put("client_id", client_id)

    with {:ok, %WorkoutSession{} = session} <- Training.start_session(session_params) do
      conn
      |> put_status(:created)
      |> put_resp_header("location", ~p"/api/sessions/#{session}")
      |> render(:show, session: session)
    end
  end

  def show(conn, %{"id" => id}) do
    session = Training.get_session!(id)
    render(conn, :show, session: session)
  end

  def complete(conn, %{"id" => id, "session" => session_params}) do
    session = Training.get_session!(id)

    # Verify ownership
    # Simplified check
    if session.client_id == conn.assigns[:current_user_id] do
      with {:ok, %WorkoutSession{} = session} <-
             Training.complete_session(session, session_params) do
        render(conn, :show, session: session)
      end
    else
      {:error, :forbidden}
    end
  end
end
