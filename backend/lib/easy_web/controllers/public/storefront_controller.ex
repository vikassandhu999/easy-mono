defmodule EasyWeb.Public.StorefrontController do
  use EasyWeb, :controller

  alias Easy.Storefront

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"slug" => slug}) do
    with {:ok, %{profile: profile, offers: offers, testimonials: testimonials}} <-
           Storefront.fetch_public_profile(slug) do
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
