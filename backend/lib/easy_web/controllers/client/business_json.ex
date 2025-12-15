defmodule EasyWeb.Client.BusinessJSON do
  @moduledoc """
  JSON views for client business endpoints.

  This is intended for UI branding (e.g. navbar logo/name).
  """

  alias EasyWeb.ResponseHelpers

  @doc """
  Renders branding info for the authenticated client's business.

  Response shape:
      %{
        data: %{
          id: "...",
          name: "...",
          handle: "...",
          logo_url: "..." | nil
        }
      }
  """
  def show(%{business: business}) do
    %{
      data: %{
        id: ResponseHelpers.format_uuid(business.id),
        name: business.name,
        handle: business.handle,
        logo_url: business.logo_url
      }
    }
  end
end
