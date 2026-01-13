defmodule EasyWeb.Client.ProfileJSON do
  alias EasyWeb.ResponseHelpers

  def show(%{client: client}) do
    %{
      data: %{
        id: ResponseHelpers.format_uuid(client.id),
        email: client.email,
        full_name: client.full_name,
        phone: client.phone,
        notes: client.notes,
        image_url: client.image_url,
        status: client.status,
        join_source: client.join_source,
        height_cm: client.height_cm,
        weight_kg: client.weight_kg,
        date_of_birth: format_date(client.date_of_birth),
        sex: client.sex,
        gender_identity: client.gender_identity,
        activity_level: client.activity_level,
        goal: client.goal,
        dietary_notes: client.dietary_notes,
        injury_notes: client.injury_notes,
        medication_notes: client.medication_notes,
        measurement_system: client.measurement_system,
        coaches: format_coaches(client.coaches),
        business: format_business(client.business),
        created_at: ResponseHelpers.format_timestamp(client.inserted_at),
        updated_at: ResponseHelpers.format_timestamp(client.updated_at)
      }
    }
  end

  defp format_business(nil), do: nil

  defp format_business(business) do
    %{
      id: ResponseHelpers.format_uuid(business.id),
      name: business.name,
      handle: business.handle
    }
  end

  defp format_coaches(nil), do: []

  defp format_coaches(coaches) do
    Enum.map(coaches, &ResponseHelpers.format_coach/1)
  end

  defp format_date(nil), do: nil
  defp format_date(%Date{} = date), do: Date.to_iso8601(date)
end
