defmodule EasyWeb.Clients.ProfileJSON do
  alias Easy.Clients.Client
  alias Easy.Orgs.Coach

  @spec show(map()) :: map()
  def show(%{profile: %{client: client, coach: coach}} = assigns) do
    workout_streak = Map.get(assigns, :workout_streak, %{current: 0, includes_today: false})
    %{data: data(client, coach, workout_streak)}
  end

  defp data(%Client{} = client, coach, workout_streak) do
    %{
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone,
      status: client.status,
      coach: coach_data(coach),
      workout_streak: workout_streak
    }
  end

  defp coach_data(nil), do: nil

  defp coach_data(%Coach{} = coach) do
    %{
      first_name: coach.first_name,
      last_name: coach.last_name,
      phone: coach.phone,
      photo_url: coach.photo_url,
      business_name: coach.business.name
    }
  end
end
