defmodule EasyWeb.Clients.ProfileJSON do
  alias Easy.Clients.Client
  alias Easy.Orgs.Coach

  @spec show(%{
          profile: %{
            client: Client.t(),
            coach: Coach.t() | nil,
            default_weight_unit: :kg | :lbs
          }
        }) :: map()
  def show(%{profile: %{client: client, coach: coach, default_weight_unit: default_weight_unit}}) do
    %{data: data(client, coach, default_weight_unit)}
  end

  defp data(%Client{} = client, coach, default_weight_unit) do
    %{
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone,
      goal_weight_value: client.goal_weight_value,
      goal_weight_unit: client.goal_weight_unit,
      default_weight_unit: default_weight_unit,
      status: client.status,
      coach: coach_data(coach)
    }
  end

  defp coach_data(nil), do: nil

  defp coach_data(%Coach{} = coach) do
    %{
      first_name: coach.first_name,
      last_name: coach.last_name,
      phone: coach.phone,
      business_name: coach.business.name
    }
  end
end
