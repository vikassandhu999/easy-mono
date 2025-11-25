defmodule EasyWeb.ProfileJSON do
  @moduledoc """
  JSON views for client profile self-service endpoints.
  """

  alias EasyWeb.ResponseHelpers

  @doc """
  Renders the client's own profile with business info.
  """
  def show(%{client: client}) do
    %{
      data: %{
        id: ResponseHelpers.format_uuid(client.id),
        email: client.email,
        full_name: client.full_name,
        phone: client.phone,
        status: client.status,
        business: format_business(client.business),
        created_at: ResponseHelpers.format_timestamp(client.inserted_at),
        updated_at: ResponseHelpers.format_timestamp(client.updated_at)
      }
    }
  end

  # ===========================================================================
  # Private Helpers
  # ===========================================================================

  defp format_business(nil), do: nil

  defp format_business(business) do
    %{
      id: ResponseHelpers.format_uuid(business.id),
      name: business.name,
      handle: business.handle
    }
  end
end
