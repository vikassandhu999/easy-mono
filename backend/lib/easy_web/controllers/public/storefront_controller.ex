defmodule EasyWeb.Public.StorefrontController do
  use EasyWeb, :controller

  alias Easy.Repo
  alias Easy.Storefront.{Lead, Offer, StoreProfile, Testimonial}

  def show(conn, %{"slug" => slug}) do
    case StoreProfile |> StoreProfile.by_slug(slug) |> StoreProfile.published() |> Repo.one() do
      nil ->
        {:error, :not_found}

      profile ->
        offers =
          Offer
          |> Offer.for_business(profile.business_id)
          |> Offer.active()
          |> Offer.ordered()
          |> Repo.all()

        testimonials =
          Testimonial
          |> Testimonial.for_business(profile.business_id)
          |> Testimonial.active()
          |> Testimonial.ordered()
          |> Repo.all()

        render(conn, :show, profile: profile, offers: offers, testimonials: testimonials)
    end
  end

  def create_lead(conn, %{"slug" => slug} = params) do
    case StoreProfile |> StoreProfile.by_slug(slug) |> StoreProfile.published() |> Repo.one() do
      nil ->
        {:error, :not_found}

      profile ->
        offer_id = resolve_offer_id(params, profile.business_id)
        lead_params = Map.put(params, "source", "storefront")

        with {:ok, lead} <- Lead.create(lead_params, profile.business_id, offer_id) do
          conn
          |> put_status(:created)
          |> render(:lead, lead: lead)
        end
    end
  end

  defp resolve_offer_id(%{"offer_id" => offer_id}, business_id) when is_binary(offer_id) do
    case Offer |> Offer.for_business(business_id) |> Repo.get(offer_id) do
      nil -> nil
      offer -> offer.id
    end
  end

  defp resolve_offer_id(%{"offer_slug" => offer_slug}, business_id)
       when is_binary(offer_slug) do
    case Offer
         |> Offer.for_business(business_id)
         |> Repo.get_by(slug: offer_slug) do
      nil -> nil
      offer -> offer.id
    end
  end

  defp resolve_offer_id(_, _), do: nil
end
