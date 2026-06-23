defmodule EasyWeb.Coaches.StoreProfileController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Storefront
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, SlugCheckRequest, SlugCheckResponse, StoreProfileRequest, StoreProfileResponse}

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [:update, :check_slug]

  tags ["coach storefront profile"]

  operation :show,
    summary: "Get storefront profile",
    operation_id: "getStorefrontProfile",
    security: [%{"bearerAuth" => []}],
    responses: [ok: {"Store profile", "application/json", StoreProfileResponse}, unauthorized: {"Unauthorized", "application/json", ErrorResponse}]

  operation :update,
    summary: "Update storefront profile",
    operation_id: "updateStorefrontProfile",
    security: [%{"bearerAuth" => []}],
    request_body: {"Store profile request", "application/json", StoreProfileRequest, required: true},
    responses: [
      ok: {"Store profile updated", "application/json", StoreProfileResponse},
      created: {"Store profile created", "application/json", StoreProfileResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :check_slug,
    summary: "Check storefront slug",
    operation_id: "checkStorefrontSlug",
    security: [%{"bearerAuth" => []}],
    request_body: {"Slug check request", "application/json", SlugCheckRequest, required: true},
    responses: [
      ok: {"Slug availability", "application/json", SlugCheckResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    case Storefront.get_store_profile(conn.assigns.ctx) do
      {:ok, profile} -> render(conn, :show, profile: profile)
      {:error, :not_found} -> render(conn, :show, profile: nil)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, profile, status} <- Storefront.upsert_store_profile(conn.assigns.ctx, conn.body_params) do
      case status do
        :created ->
          conn
          |> put_status(:created)
          |> render(:show, profile: profile)

        :updated ->
          render(conn, :show, profile: profile)
      end
    end
  end

  @spec check_slug(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def check_slug(conn, _params) do
    slug = conn.body_params[:slug]
    available = Storefront.check_slug_available(conn.assigns.ctx, slug)
    json(conn, %{available: available})
  end
end
