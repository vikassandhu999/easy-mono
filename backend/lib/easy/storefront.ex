defmodule Easy.Storefront do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Repo
  alias Easy.Storefront.{Offer, StoreProfile, Testimonial}

  @spec get_public_profile(String.t()) ::
          {:ok,
           %{profile: StoreProfile.t(), offers: [Offer.t()], testimonials: [Testimonial.t()]}}
          | {:error, :not_found}
  def get_public_profile(slug) do
    with {:ok, profile} <- get_published_profile(slug) do
      {:ok,
       %{
         profile: profile,
         offers: active_offers(profile.business_id),
         testimonials: active_testimonials(profile.business_id)
       }}
    end
  end

  @spec create_inquiry(String.t(), map()) ::
          {:ok, Client.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_inquiry(slug, params) do
    with {:ok, profile} <- get_published_profile(slug) do
      Clients.create_inquiry(profile.business_id, inquiry_params(params))
    end
  end

  defp get_published_profile(slug) do
    case StoreProfile |> StoreProfile.by_slug(slug) |> StoreProfile.published() |> Repo.one() do
      nil -> {:error, :not_found}
      profile -> {:ok, profile}
    end
  end

  defp active_offers(business_id) do
    Offer
    |> Offer.for_business(business_id)
    |> Offer.active()
    |> Offer.ordered()
    |> Repo.all()
  end

  defp active_testimonials(business_id) do
    Testimonial
    |> Testimonial.for_business(business_id)
    |> Testimonial.active()
    |> Testimonial.ordered()
    |> Repo.all()
  end

  defp inquiry_params(%{"name" => name} = params) when is_binary(name) do
    {first_name, last_name} =
      case String.split(name, " ", parts: 2) do
        [first, last] -> {first, last}
        [first] -> {first, nil}
      end

    params
    |> Map.put_new("first_name", first_name)
    |> Map.put_new("last_name", last_name)
    |> Map.delete("name")
  end

  defp inquiry_params(params), do: params
end
