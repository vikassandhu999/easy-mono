defmodule EasyWeb.InvitationController do
  use EasyWeb, :controller

  require Logger

  alias Easy.Clients

  def show(conn, %{"token" => invitation_token}) do
    case Clients.get_invitation_with_coach(invitation_token) do
      {:ok, %{client: client, inviting_coach: coach}} ->
        Logger.info("Invitation Token: #{invitation_token}")

        render(conn, :show,
          invitation_token: invitation_token,
          expires_at: client.invitation_expires_at,
          client: client,
          business: client.business,
          inviting_coach: coach
        )

      {:error, :invalid_token} ->
        {:error, Easy.Error.not_found("Invitation not found or invalid")}

      {:error, :token_expired} ->
        {:error, Easy.Error.new(:invitation_expired, "This invitation has expired", %{}, :gone)}

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
end
