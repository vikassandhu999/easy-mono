defmodule EasyWeb.InvitationController do
  @moduledoc """
  Handles public invitation endpoints for client onboarding.

  These endpoints do NOT require authentication as they are accessed
  by clients before they have an account.

  ## Endpoints
  - GET /api/invitations/:token_id - View invitation details
  - POST /api/invitations/:token_id/accept - Accept invitation with OTP code
  """

  use EasyWeb, :controller

  alias Easy.Clients
  alias Easy.Organizations.Coach
  alias Easy.Repo

  @doc """
  GET /api/invitations/:token_id

  Returns invitation details including client info, business info,
  and inviting coach info for display to the client.
  """
  def show(conn, %{"token_id" => token_id}) do
    case Clients.get_invitation(token_id) do
      {:ok, %{token: token, client: client}} ->
        # Get inviting coach from metadata
        coach_id = token.metadata["coach_id"]

        coach =
          Repo.get(Coach, coach_id)
          |> Repo.preload([:user])

        render(conn, :show,
          invitation: %{
            token_id: token_id,
            status: "valid",
            expires_at: token.expires_at
          },
          client: client,
          business: client.business,
          inviting_coach: coach
        )

      {:error, :invalid_token} ->
        {:error, Easy.Error.not_found("Invitation not found or invalid")}

      {:error, :token_expired} ->
        {:error, Easy.Error.new(:invitation_expired, "This invitation has expired", %{}, :gone)}

      {:error, :token_used} ->
        {:error,
         Easy.Error.new(:invitation_used, "This invitation has already been used", %{}, :gone)}

      {:error, :client_not_found} ->
        {:error, Easy.Error.not_found("Client not found")}

      {:error, _reason} ->
        {:error,
         Easy.Error.new(
           :internal_error,
           "An internal error occurred",
           %{},
           :internal_server_error
         )}
    end
  end

  @doc """
  POST /api/invitations/:token_id/accept

  Accepts an invitation using the OTP code sent to the client.
  Creates user account, links to client, and returns session tokens.
  """
  def accept(conn, %{"token_id" => token_id, "code" => code}) do
    case Clients.accept_invitation(token_id, code) do
      {:ok, %{user: user, client: client, session: session_data}} ->
        # Client already has coaches preloaded from accept_invitation
        conn
        |> put_status(:ok)
        |> render(:accept,
          user: user,
          client: Repo.preload(client, :business),
          session: session_data,
          assigned_coaches: client.coaches
        )

      {:error, :invalid_token} ->
        {:error, Easy.Error.not_found("Invitation not found or invalid")}

      {:error, :token_expired} ->
        {:error, Easy.Error.new(:invitation_expired, "This invitation has expired", %{}, :gone)}

      {:error, :invalid_otp} ->
        {:error, Easy.Error.new(:invalid_otp, "Invalid OTP code", %{}, :bad_request)}

      {:error, :max_attempts} ->
        {:error,
         Easy.Error.new(
           :max_attempts,
           "Maximum verification attempts exceeded",
           %{},
           :too_many_requests
         )}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:error, changeset}

      {:error, _reason} ->
        {:error,
         Easy.Error.new(
           :internal_error,
           "An internal error occurred",
           %{},
           :internal_server_error
         )}
    end
  end

  def accept(_conn, %{"token_id" => _token_id}) do
    {:error, Easy.Error.unprocessable("OTP code is required")}
  end
end
