defmodule EasyWeb.Coaches.OfferController do
  use EasyWeb, :controller

  alias Easy.Repo
  alias Easy.Storefront.Offer

  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)

    base = Offer |> Offer.for_business(business_id)
    count = Repo.aggregate(base, :count, :id)

    offers =
      base
      |> Offer.ordered()
      |> Easy.Utils.paginate(offset, limit)
      |> Repo.all()

    render(conn, :index, offers: offers, count: count)
  end

  def create(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, offer} <- Offer.create(params, business_id) do
      conn
      |> put_status(:created)
      |> render(:show, offer: offer)
    end
  end

  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Offer |> Offer.for_business(business_id) |> Repo.get(id) do
      nil -> {:error, :not_found}
      offer -> render(conn, :show, offer: offer)
    end
  end

  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Offer |> Offer.for_business(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      offer ->
        with {:ok, updated} <- Offer.update(offer, conn.body_params) do
          render(conn, :show, offer: updated)
        end
    end
  end

  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Offer |> Offer.for_business(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      offer ->
        with {:ok, _deleted} <- Offer.delete(offer) do
          send_resp(conn, :no_content, "")
        end
    end
  end
end
