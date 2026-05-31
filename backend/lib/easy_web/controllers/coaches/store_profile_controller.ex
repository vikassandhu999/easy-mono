defmodule EasyWeb.Coaches.StoreProfileController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Storefront.StoreProfile
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, SlugCheckRequest, SlugCheckResponse, StoreProfileRequest, StoreProfileResponse}

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
    %{business_id: business_id} = conn.assigns.claims

    case StoreProfile.get_for_business(business_id) do
      nil -> render(conn, :show, profile: nil)
      profile -> render(conn, :show, profile: profile)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    case StoreProfile.get_for_business(business_id) do
      nil ->
        with {:ok, profile} <- StoreProfile.create(params, business_id) do
          conn
          |> put_status(:created)
          |> render(:show, profile: profile)
        end

      profile ->
        with {:ok, updated} <- StoreProfile.update(profile, params) do
          render(conn, :show, profile: updated)
        end
    end
  end

  @spec check_slug(Plug.Conn.t(), map()) :: Plug.Conn.t() | {:error, Easy.Error.t()}
  def check_slug(conn, %{"slug" => slug}) do
    %{business_id: business_id} = conn.assigns.claims
    available = StoreProfile.slug_available?(slug, business_id)
    json(conn, %{available: available})
  end

  def check_slug(_conn, _params) do
    {:error, Easy.Error.unprocessable("slug is required")}
  end
end
