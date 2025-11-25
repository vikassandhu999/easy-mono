defmodule EasyWeb.InvitationJSON do
  @moduledoc """
  JSON views for invitation endpoints.
  """

  alias Easy.Accounts.User
  alias EasyWeb.ResponseHelpers

  @doc """
  Renders invitation details for viewing.
  """
  def show(%{invitation: invitation, client: client, business: business, inviting_coach: coach}) do
    %{
      invitation: %{
        token_id: invitation.token_id,
        status: invitation.status,
        expires_at: ResponseHelpers.format_timestamp(invitation.expires_at)
      },
      client: %{
        email: client.email,
        full_name: client.full_name
      },
      business: %{
        id: ResponseHelpers.format_uuid(business.id),
        name: business.name
      },
      inviting_coach: %{
        full_name: User.full_name(coach.user)
      }
    }
  end

  @doc """
  Renders successful invitation acceptance response.
  """
  def accept(%{user: user, client: client, session: session, assigned_coaches: coaches}) do
    %{
      user: format_user_with_client(user, client, coaches),
      session: format_session(session)
    }
  end

  # ===========================================================================
  # Private Helpers
  # ===========================================================================

  defp format_user_with_client(user, client, coaches) do
    %{
      id: ResponseHelpers.format_uuid(user.id),
      email: user.email,
      full_name: User.full_name(user),
      email_verified: user.email_verified,
      roles: ["client"],
      client_profile: %{
        id: ResponseHelpers.format_uuid(client.id),
        business_id: ResponseHelpers.format_uuid(client.business_id),
        business_name: client.business.name,
        status: client.status,
        full_name: client.full_name,
        phone: client.phone,
        assigned_coaches: format_coaches(coaches)
      }
    }
  end

  defp format_coaches(coaches) do
    Enum.map(coaches, fn coach ->
      %{
        id: ResponseHelpers.format_uuid(coach.id),
        user: %{
          full_name: User.full_name(coach.user)
        }
      }
    end)
  end

  defp format_session(session) do
    %{
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: ResponseHelpers.format_timestamp(session.expires_at),
      expires_in: session.expires_in
    }
  end
end
