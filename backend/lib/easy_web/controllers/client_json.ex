defmodule EasyWeb.ClientJSON do
  alias EasyWeb.ResponseHelpers

  def invite(%{client: client, invitation: invitation}) do
    %{
      client: ResponseHelpers.format_client(client),
      invitation: invitation
    }
  end

  def show_invitation(%{
        invitation: invitation,
        client: client,
        business: business,
        inviting_coach: inviting_coach
      }) do
    %{
      invitation: invitation,
      client: client,
      business: business,
      inviting_coach: inviting_coach
    }
  end

  def accept_invitation(%{user: user, session: session}) do
    %{
      user: user,
      session: session
    }
  end

  def show(%{client: client}) do
    %{client: ResponseHelpers.format_client(client)}
  end

  def update(%{client: client}), do: show(%{client: client})

  def index(%{clients: clients, pagination: pagination}) do
    %{
      clients: Enum.map(clients, &ResponseHelpers.format_client/1),
      pagination: pagination
    }
  end

  def list_coaches(%{coaches: coaches}) do
    %{coaches: Enum.map(coaches, &ResponseHelpers.format_coach/1)}
  end

  def update_status(%{client: client}), do: show(%{client: client})
end
