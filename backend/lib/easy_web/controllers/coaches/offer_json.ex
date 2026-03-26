defmodule EasyWeb.Coaches.OfferJSON do
  alias Easy.Storefront.Offer

  def show(%{offer: offer}) do
    %{data: data(offer)}
  end

  def index(%{offers: offers, count: count}) do
    %{data: Enum.map(offers, &data/1), count: count}
  end

  defp data(%Offer{} = offer) do
    %{
      id: offer.id,
      name: offer.name,
      slug: offer.slug,
      description: offer.description,
      type: offer.type,
      duration_text: offer.duration_text,
      price: offer.price,
      currency: offer.currency,
      price_display: offer.price_display,
      features: offer.features,
      is_featured: offer.is_featured,
      status: offer.status,
      position: offer.position,
      cta_text: offer.cta_text,
      inserted_at: offer.inserted_at,
      updated_at: offer.updated_at
    }
  end
end
