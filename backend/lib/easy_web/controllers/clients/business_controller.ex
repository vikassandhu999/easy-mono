defmodule EasyWeb.Clients.BusinessController do
  use EasyWeb, :controller

  alias Easy.Auth.Scope
  alias Easy.Organizations

  def show(conn, _params) do
    scope = conn.assigns.scope

    unless Scope.is_client?(scope) do
      {:error, Easy.Error.unauthorized("This endpoint is only for clients")}
    else
      business_id = scope.business_id

      with %{} = business <- Organizations.get_business(business_id),
           true <- business_id == business.id or {:error, :forbidden} do
        render(conn, :show, business: business)
      else
        nil -> {:error, :not_found}
        {:error, reason} -> {:error, reason}
        false -> {:error, :forbidden}
      end
    end
  end
end
