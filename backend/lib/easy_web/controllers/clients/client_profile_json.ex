defmodule EasyWeb.Clients.ClientProfileJSON do
  alias Easy.ClientProfiles.ClientProfile

  @spec show(%{profile: ClientProfile.t()}) :: %{data: map()}
  def show(%{profile: profile}) do
    %{data: data(profile)}
  end

  defp data(%ClientProfile{} = profile) do
    %{
      id: profile.id,
      client_id: profile.client_id,
      general: profile.general,
      nutrition: profile.nutrition,
      training: profile.training,
      lifestyle: profile.lifestyle,
      intake_status: profile.intake_status,
      intake_completed_at: profile.intake_completed_at,
      inserted_at: profile.inserted_at,
      updated_at: profile.updated_at
    }
  end
end
