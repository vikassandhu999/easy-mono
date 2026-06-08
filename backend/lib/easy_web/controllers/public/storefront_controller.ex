defmodule EasyWeb.Public.StorefrontController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Storefront
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    PublicStorefrontResponse,
    StorefrontInquiryRequest,
    StorefrontInquiryResponse
  }

  tags ["public storefront"]

  operation :show,
    summary: "Get public storefront",
    operation_id: "getPublicStorefront",
    parameters: [Operation.parameter(:slug, :path, :string, "Storefront slug")],
    responses: [
      ok: {"Public storefront", "application/json", PublicStorefrontResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :create_inquiry,
    summary: "Create storefront inquiry",
    operation_id: "createStorefrontInquiry",
    parameters: [Operation.parameter(:slug, :path, :string, "Storefront slug")],
    request_body: {"Storefront inquiry request", "application/json", StorefrontInquiryRequest, required: true},
    responses: [
      created: {"Storefront inquiry", "application/json", StorefrontInquiryResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"slug" => slug}) do
    with {:ok, %{profile: profile, offers: offers, testimonials: testimonials}} <-
           Storefront.get_public_profile(slug) do
      render(conn, :show, profile: profile, offers: offers, testimonials: testimonials)
    end
  end

  @spec create_inquiry(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create_inquiry(conn, %{"slug" => slug} = params) do
    with {:ok, client} <- Storefront.create_inquiry(slug, params) do
      conn
      |> put_status(:created)
      |> render(:inquiry, client: client)
    end
  end
end
