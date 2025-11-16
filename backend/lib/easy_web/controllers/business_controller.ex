defmodule EasyWeb.BusinessController do
  use EasyWeb, :controller

  alias Easy.Organizations.Business

  def show(conn, _params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         %Business{} = business <- Easy.Organizations.get_business(business_id) do
      conn
      |> put_status(:ok)
      |> render(:show, business: business)
    else
      nil ->
        {:error, Easy.Error.not_found("Business not found.")}
    end
  end
end
