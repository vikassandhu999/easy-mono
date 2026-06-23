defmodule EasyWeb.Coaches.OfferController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Offers
  alias OpenApiSpex.Operation
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, OfferListResponse, OfferRequest, OfferResponse}

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [:create, :update]

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
    opts = [
      offset: parse_integer(params, "offset", 0),
      limit: parse_integer(params, "limit", 50)
    ]

    with {:ok, res} <- Offers.list_offers(conn.assigns.ctx, opts) do
      render(conn, :index, offers: res.offers, count: res.count)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, offer} <- Offers.create_offer(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, offer: offer)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, offer} <- Offers.get_offer(conn.assigns.ctx, id) do
      render(conn, :show, offer: offer)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, updated} <- Offers.update_offer(conn.assigns.ctx, id, conn.body_params) do
      render(conn, :show, offer: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, _deleted} <- Offers.delete_offer(conn.assigns.ctx, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
