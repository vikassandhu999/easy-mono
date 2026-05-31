defmodule EasyWeb.Coaches.OfferController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Repo
  alias Easy.Storefront.Offer
  alias OpenApiSpex.Operation
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, OfferListResponse, OfferRequest, OfferResponse}

  tags ["coach offers"]

  operation :index,
    summary: "List offers",
    operation_id: "listOffers",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of offers to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum offers to return", required: false)
    ],
    responses: [ok: {"Offers", "application/json", OfferListResponse}, unauthorized: {"Unauthorized", "application/json", ErrorResponse}]

  operation :create,
    summary: "Create offer",
    operation_id: "createOffer",
    security: [%{"bearerAuth" => []}],
    request_body: {"Offer request", "application/json", OfferRequest, required: true},
    responses: [
      created: {"Offer created", "application/json", OfferResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get offer",
    operation_id: "getOffer",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Offer id")],
    responses: [
      ok: {"Offer", "application/json", OfferResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update offer",
    operation_id: "updateOffer",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Offer id")],
    request_body: {"Offer request", "application/json", OfferRequest, required: true},
    responses: [
      ok: {"Offer updated", "application/json", OfferResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete offer",
    operation_id: "deleteOffer",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Offer id")],
    responses: [no_content: "Offer deleted", unauthorized: {"Unauthorized", "application/json", ErrorResponse}, not_found: {"Not found", "application/json", ErrorResponse}]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
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

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, offer} <- Offer.create(params, business_id) do
      conn
      |> put_status(:created)
      |> render(:show, offer: offer)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Offer |> Offer.for_business(business_id) |> Repo.get(id) do
      nil -> {:error, :not_found}
      offer -> render(conn, :show, offer: offer)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
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

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
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
