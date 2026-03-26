defmodule EasyWeb.Coaches.LeadJSON do
  alias Easy.Storefront.{Lead, Offer}
  alias Easy.Clients.Client

  def show(%{lead: lead}) do
    %{data: data(lead)}
  end

  def index(%{leads: leads, count: count}) do
    %{data: Enum.map(leads, &data/1), count: count}
  end

  defp data(%Lead{} = lead) do
    %{
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      instagram_handle: lead.instagram_handle,
      intake_answers: lead.intake_answers,
      status: lead.status,
      notes: lead.notes,
      source: lead.source,
      offer: offer_data(lead.offer),
      client: client_data(lead.client),
      inserted_at: lead.inserted_at,
      updated_at: lead.updated_at
    }
  end

  defp offer_data(%Offer{} = offer) do
    %{
      id: offer.id,
      name: offer.name,
      price_display: offer.price_display,
      duration_text: offer.duration_text
    }
  end

  defp offer_data(_), do: nil

  defp client_data(%Client{} = client) do
    %{
      id: client.id,
      email: client.email,
      first_name: client.first_name,
      last_name: client.last_name
    }
  end

  defp client_data(_), do: nil
end
