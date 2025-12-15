defmodule EasyWeb.Coach.BusinessSettingsJSON do
  @moduledoc """
  JSON rendering for business settings.
  """

  alias Easy.Organizations.BusinessSettings

  @doc """
  Renders a single settings object.
  """
  def show(%{settings: settings}) do
    %{data: data(settings)}
  end

  @doc """
  Renders settings data.
  """
  def data(%BusinessSettings{} = settings) do
    %{
      id: settings.id,
      business_id: settings.business_id,

      # Public Join Settings
      public_join_enabled: settings.public_join_enabled,
      public_join_approval_required: settings.public_join_approval_required,
      public_join_code: settings.public_join_code,
      public_join_client_limit: settings.public_join_client_limit,
      public_join_url: build_join_url(settings.public_join_code),

      # Branding
      tagline: settings.tagline,
      cover_image_url: settings.cover_image_url,
      accent_color: settings.accent_color,

      # Timestamps
      inserted_at: settings.inserted_at,
      updated_at: settings.updated_at
    }
  end

  defp build_join_url(nil), do: nil

  defp build_join_url(code) do
    frontend_url = Application.get_env(:easy, :client_frontend_url, "http://localhost:1313")
    "#{frontend_url}/join/#{code}"
  end
end
