defmodule EasyWeb.PublicJoinJSON do
  @moduledoc """
  JSON rendering for public join pages.

  Renders business information for clients viewing the public join page.
  Only exposes public-safe information.
  """

  alias Easy.Organizations.BusinessSettings

  @doc """
  Renders public join page data.
  """
  def show(%{settings: settings}) do
    %{data: data(settings)}
  end

  @doc """
  Renders public-safe settings and business data.
  """
  def data(%BusinessSettings{} = settings) do
    %{
      # Business Info (from preloaded business)
      business: business_data(settings.business),

      # Public Page Branding
      tagline: settings.tagline,
      cover_image_url: settings.cover_image_url,
      accent_color: settings.accent_color,

      # Join Settings
      approval_required: settings.public_join_approval_required
    }
  end

  defp business_data(nil), do: nil

  defp business_data(business) do
    %{
      id: business.id,
      name: business.name,
      handle: business.handle,
      description: business.description,
      logo_url: business.logo_url,
      email: business.email,
      phone: business.phone,
      website: business.website
    }
  end
end
