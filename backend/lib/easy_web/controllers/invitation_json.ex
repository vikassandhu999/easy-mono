defmodule EasyWeb.InvitationJSON do
  alias Easy.Accounts.User
  alias EasyWeb.ResponseHelpers

  def show(%{
        invitation_token: token,
        expires_at: expires_at,
        client: client,
        business: business,
        inviting_coach: coach
      }) do
    %{
      invitation: %{
        token: token,
        status: "valid",
        expires_at: ResponseHelpers.format_timestamp(expires_at)
      },
      client: %{
        email: client.email,
        full_name: client.full_name
      },
      business: %{
        id: ResponseHelpers.format_uuid(business.id),
        name: business.name
      },
      inviting_coach: format_coach(coach)
    }
  end

  defp format_coach(nil), do: nil

  defp format_coach(coach) do
    %{
      full_name: User.full_name(coach.user)
    }
  end
end
