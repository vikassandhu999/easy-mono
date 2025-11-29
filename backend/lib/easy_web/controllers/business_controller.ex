defmodule EasyWeb.BusinessController do
  use EasyWeb, :controller

  alias Easy.Organizations
  alias Easy.Auth.Scope
  alias EasyWeb.FallbackController

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

  @doc """
  PATCH /api/organization

  Updates the current business profile.
  Only the business owner can update the business.
  """
  def update(conn, %{"business" => business_params}) do
    scope = conn.assigns.scope

    Scope.require_business!(scope)
    Scope.require_role!(scope, "coach")

    case Organizations.get_business(scope.business_id) do
      nil ->
        FallbackController.not_found_response(conn, "Business not found")

      business ->
        # Check if user is the owner
        if business.owner_id != scope.user_id do
          FallbackController.forbidden_response(
            conn,
            "Only the business owner can update settings"
          )
        else
          case Organizations.update_business(business, business_params) do
            {:ok, updated_business} ->
              # Preload subscription for JSON response
              updated_business = Easy.Repo.preload(updated_business, subscription: [:plan])
              render(conn, :show, business: updated_business)

            {:error, changeset} ->
              {:error, changeset}
          end
        end
    end
  end
end
