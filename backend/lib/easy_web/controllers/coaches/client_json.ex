defmodule EasyWeb.Coaches.ClientJSON do
  alias Easy.Clients.Client
  alias Easy.Storefront.Offer

  @spec show(map()) :: map()
  def show(%{client: client}) do
    %{data: data(client)}
  end

  @spec index(map()) :: map()
  def index(%{clients: clients, count: count, summary: summary}) do
    %{data: Enum.map(clients, &data/1), count: count, summary: summary}
  end

  defp data(%Client{} = client) do
    %{
      id: client.id,
      email: client.email,
      first_name: client.first_name,
      last_name: client.last_name,
      phone: client.phone,
      notes: client.notes,
      instagram_handle: client.instagram_handle,
      status: Client.compute_status(client),
      status_override: client.status_override,
      program_name: client.program_name,
      program_start: client.program_start,
      program_end: client.program_end,
      payment_status: client.payment_status,
      payment_amount: client.payment_amount,
      payment_currency: client.payment_currency,
      payment_notes: client.payment_notes,
      intake_answers: client.intake_answers,
      offer: offer_data(client.offer),
      source: client.source,
      invite_url: Client.build_invite_url(client),
      inserted_at: client.inserted_at,
      updated_at: client.updated_at
    }
  end

  defp offer_data(%Offer{} = offer) do
    %{
      id: offer.id,
      name: offer.name,
      price_display: offer.price_display
    }
  end

  defp offer_data(_), do: nil
end
