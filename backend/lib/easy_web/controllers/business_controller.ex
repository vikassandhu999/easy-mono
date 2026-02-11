defmodule EasyWeb.BusinessController do
  alias Easy.Identity.Users
  use EasyWeb, :controller

  alias Easy.Orgs

  def create(conn, params) do
    with {:ok, user} <- Users.get_by_id(conn.assigns.claims.user_id),
         {:ok, business} <- Orgs.create_business(user, params) do
      conn
      |> put_status(:created)
      |> render(:show, business: business)
    end
  end

  def show(conn, _params) do
    with {:ok, business} <- Orgs.get_business(conn.assigns.claims.business_id) do
      conn
      |> put_status(:ok)
      |> render(:show, business: business)
    end
  end

  def update(conn, params) do
    with {:ok, business} <- Orgs.update_business(conn.assigns.claims.business_id, params) do
      conn
      |> put_status(:ok)
      |> render(:show, business: business)
    end
  end
end
