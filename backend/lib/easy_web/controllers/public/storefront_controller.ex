defmodule EasyWeb.Public.StorefrontController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Repo
  alias Easy.Storefront.{Offer, StoreProfile, Testimonial}

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
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

  @spec create_inquiry(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create_inquiry(conn, %{"slug" => slug} = params) do
    case StoreProfile |> StoreProfile.by_slug(slug) |> StoreProfile.published() |> Repo.one() do
      nil ->
        {:error, :not_found}

      profile ->
        offer = resolve_offer(params, profile.business_id)
        inquiry_params = parse_inquiry_params(params)

        with {:ok, client} <- Client.create_inquiry(profile.business_id, inquiry_params, offer) do
          conn
          |> put_status(:created)
          |> render(:inquiry, client: client)
        end
    end
  end

  defp parse_inquiry_params(%{"name" => name} = params) when is_binary(name) do
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

  defp parse_inquiry_params(params), do: params

  defp resolve_offer(params, business_id) do
    resolve_offer_by_id(params, business_id) ||
      resolve_offer_by_slug(params, business_id)
  end

  defp resolve_offer_by_id(%{"offer_id" => offer_id}, business_id) when is_binary(offer_id) do
    Offer |> Offer.for_business(business_id) |> Repo.get(offer_id)
  end

  defp resolve_offer_by_id(_, _), do: nil

  defp resolve_offer_by_slug(%{"offer_slug" => offer_slug}, business_id)
       when is_binary(offer_slug) do
    Offer |> Offer.for_business(business_id) |> Repo.get_by(slug: offer_slug)
  end

  defp resolve_offer_by_slug(_, _), do: nil
end
