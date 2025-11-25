defmodule EasyWeb.BusinessController do
  use EasyWeb, :controller

  alias Easy.Organizations
  alias Easy.Auth.Scope

  @doc """
  GET /api/organization
  GET /api/current-business (deprecated)

  Returns the current business with subscription details.
  """
  def show(conn, _params) do
    scope = conn.assigns.scope

    # Require business context
    Scope.require_business!(scope)

    case Organizations.get_business_with_subscription(scope.business_id) do
      {:ok, business} ->
        render(conn, :show, business: business)

      {:error, :not_found} ->
        {:error, :not_found}
    end
  end

  @doc """
  GET /api/organization/subscription

  Returns detailed subscription information including trial status and plan limits.
  """
  def get_subscription(conn, _params) do
    scope = conn.assigns.scope

    Scope.require_business!(scope)

    case Organizations.get_subscription(scope.business_id) do
      {:ok, subscription} ->
        render(conn, :subscription, subscription: subscription)

      {:error, :not_found} ->
        {:error, :not_found}
    end
  end

  @doc """
  GET /api/organization/coaches

  Returns list of coaches in the current business.
  """
  def list_coaches(conn, _params) do
    scope = conn.assigns.scope

    Scope.require_business!(scope)
    Scope.require_role!(scope, "coach")

    {:ok, coaches} = Organizations.list_coaches(scope.business_id)
    render(conn, :coaches, coaches: coaches)
  end
end
