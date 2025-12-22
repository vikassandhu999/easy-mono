defmodule EasyWeb.PublicJoinJSON do
  alias Easy.Organizations.BusinessSettings

  def show(%{settings: settings}) do
    %{data: data(settings)}
  end

  def data(%BusinessSettings{} = settings) do
    %{
      business: business_data(settings.business),
      tagline: settings.tagline,
      cover_image_url: settings.cover_image_url,
      accent_color: settings.accent_color,
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
