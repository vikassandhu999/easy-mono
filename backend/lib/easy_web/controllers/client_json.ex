defmodule EasyWeb.ClientJSON do
  alias EasyWeb.ResponseHelpers

  def index(%{clients: clients, total: total, opts: opts}) do
    %{
      clients: Enum.map(clients, &format_client/1),
      pagination: %{
        total: total,
        limit: opts[:limit] || 50,
        offset: opts[:offset] || 0
      }
    }
  end

  def show(%{client: client}) do
    %{
      client: format_client(client)
    }
  end

  def invite(%{
        client: client,
        invitation_token: token,
        invitation_url: url,
        expires_at: expires_at
      }) do
    %{
      client: format_client(client),
      invitation: %{
        token: token,
        invitation_url: url,
        expires_at: ResponseHelpers.format_timestamp(expires_at)
      }
    }
  end

  defp format_client(client) do
    %{
      id: ResponseHelpers.format_uuid(client.id),
      email: client.email,
      full_name: client.full_name,
      phone: client.phone,
      notes: client.notes,
      status: client.status,
      join_source: client.join_source,
      business_id: ResponseHelpers.format_uuid(client.business_id),
      user_id: ResponseHelpers.format_uuid(client.user_id),
      created_at: ResponseHelpers.format_timestamp(client.inserted_at),
      updated_at: ResponseHelpers.format_timestamp(client.updated_at)
    }
  end
end
