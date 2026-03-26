defmodule EasyWeb.Coaches.StoreProfileController do
  use EasyWeb, :controller

  alias Easy.Storefront.StoreProfile

  def show(conn, _params) do
    %{business_id: business_id} = conn.assigns.claims

    case StoreProfile.get_for_business(business_id) do
      nil -> render(conn, :show, profile: nil)
      profile -> render(conn, :show, profile: profile)
    end
  end

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

  def check_slug(conn, %{"slug" => slug}) do
    %{business_id: business_id} = conn.assigns.claims
    available = StoreProfile.slug_available?(slug, business_id)
    json(conn, %{available: available})
  end

  def check_slug(_conn, _params) do
    {:error, Easy.Error.unprocessable("slug is required")}
  end
end
