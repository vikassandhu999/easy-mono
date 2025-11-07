defmodule EasyWeb.OnboardingController do
  use EasyWeb, :controller

  alias Easy.{Organizations, Coaches, Repo, ApiError}
  alias EasyWeb.ResponseHelpers

  action_fallback EasyWeb.FallbackController

  @moduledoc """
  Onboarding controller for authenticated users to complete their setup.

  Handles:
  - Business creation with coach profile (POST /api/onboarding/business)
  """

  @doc """
  POST /api/onboarding/business

  Creates a business, default subscription, and coach profile for the authenticated user.

  This is the final step in the coach onboarding flow. After registering and verifying
  their email, the user creates their business which automatically:
  1. Creates a Business record with the user as owner
  2. Creates or gets the default free Plan
  3. Creates an active Subscription linking the business to the plan
  4. Creates a Coach profile for the user within the business

  All operations are performed in a database transaction to ensure consistency.

  ## Idempotency
  If the user already owns a business, returns the existing business with 200 OK status
  instead of creating a new one. This makes the endpoint idempotent and safe for retries.

  ## Authentication
  Requires Bearer token in Authorization header.

  ## Parameters
  - name: Business name (required)
  - description: Business description (optional)

  ## Response

  Success - New business created (201):
  ```json
  {
    "business": {
      "id": "456",
      "name": "Coaching Pro",
      "slug": "coaching-pro",
      "description": "Professional coaching services",
      "owner_id": "123",
      "status": "active"
    },
    "coach_profile": {
      "id": "789",
      "user_id": "123",
      "business_id": "456",
      "status": "active",
      "bio": null,
      "specialties": [],
      "credentials": {}
    },
    "subscription": {
      "id": "101",
      "business_id": "456",
      "plan_id": "1",
      "status": "active",
      "plan": {
        "id": "1",
        "name": "Free",
        "slug": "free",
        "price_cents": 0,
        "billing_interval": "month"
      }
    }
  }
  ```

  Success - Existing business returned (200):
  Same response structure as 201, but with existing business data.

  ## Error Responses

  Validation error (422):
  ```json
  {
    "error": {
      "message": "Validation failed",
      "code": "validation_error",
      "details": {
        "name": ["can't be blank"],
        "slug": ["has already been taken"]
      }
    }
  }
  ```

  Unauthorized (401):
  ```json
  {
    "error": {
      "message": "Authentication required",
      "code": "unauthorized"
    }
  }
  ```
  """
  def create_business(conn, params) do
    user = conn.assigns.current_user
    name = params["name"]
    description = params["description"]

    # Check if user already owns a business (idempotent)
    case check_existing_business(user.id) do
      {:ok, existing_business} ->
        # Return existing business with 200 OK (idempotent)
        conn
        |> put_status(:ok)
        |> json(%{
          business: format_business(existing_business.business),
          coach_profile: format_coach(existing_business.coach),
          subscription: format_subscription(existing_business.subscription)
        })

      {:error, :no_business} ->
        # Create business, subscription, and coach profile in a transaction
        case create_business_with_onboarding(user, name, description) do
          {:ok, result} ->
            conn
            |> put_status(:created)
            |> json(%{
              business: format_business(result.business),
              coach_profile: format_coach(result.coach),
              subscription: format_subscription(result.subscription)
            })

          {:error, :business, changeset, _changes} ->
            error = ApiError.validation_error(changeset)
            error = %{error | message: "Business creation failed"}
            render_error(conn, error)

          {:error, :plan, reason, _changes} ->
            error =
              ApiError.unprocessable_entity("Failed to get default plan", %{
                reason: to_string(reason)
              })

            render_error(conn, error)

          {:error, :subscription, changeset, _changes} ->
            error = ApiError.validation_error(changeset)
            error = %{error | message: "Subscription creation failed"}
            render_error(conn, error)

          {:error, :coach, changeset, _changes} ->
            error = ApiError.validation_error(changeset)
            error = %{error | message: "Coach profile creation failed"}
            render_error(conn, error)
        end
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Checks if user already owns a business and returns complete data if found
  defp check_existing_business(user_id) do
    import Ecto.Query

    # Query business with all related entities preloaded in a single query
    query =
      from b in Organizations.Business,
        where: b.owner_id == ^user_id,
        left_join: s in assoc(b, :subscription),
        left_join: p in assoc(s, :plan),
        left_join: c in assoc(b, :coaches),
        where: c.user_id == ^user_id,
        preload: [subscription: {s, plan: p}, coaches: c],
        limit: 1

    case Repo.one(query) do
      nil ->
        {:error, :no_business}

      business ->
        # Extract the coach profile for this user
        coach = Enum.find(business.coaches, fn c -> c.user_id == user_id end)

        {:ok,
         %{
           business: business,
           coach: coach,
           subscription: business.subscription
         }}
    end
  end

  # Creates business, subscription, and coach profile in a transaction
  defp create_business_with_onboarding(user, name, description) do
    Repo.transaction(fn ->
      with {:ok, business} <- create_business_step(user, name, description),
           {:ok, plan} <- get_default_plan_step(),
           {:ok, subscription} <- create_subscription_step(business, plan),
           {:ok, coach} <- create_coach_step(user, business) do
        # Preload plan association in subscription for complete response
        subscription = Repo.preload(subscription, :plan)

        %{
          business: business,
          subscription: subscription,
          coach: coach
        }
      else
        {:error, step, reason} ->
          Repo.rollback({step, reason})
      end
    end)
    |> case do
      {:ok, result} -> {:ok, result}
      {:error, {step, reason}} -> {:error, step, reason, %{}}
    end
  end

  # Step 1: Create business
  defp create_business_step(user, name, description) do
    attrs = %{name: name, description: description}

    case Organizations.create_business(user, attrs) do
      {:ok, business} -> {:ok, business}
      {:error, changeset} -> {:error, :business, changeset}
    end
  end

  # Step 2: Get or create default plan
  defp get_default_plan_step do
    case Organizations.get_or_create_default_plan() do
      {:ok, plan} -> {:ok, plan}
      {:error, reason} -> {:error, :plan, reason}
    end
  end

  # Step 3: Create subscription
  defp create_subscription_step(business, plan) do
    case Organizations.create_subscription(business, plan) do
      {:ok, subscription} -> {:ok, subscription}
      {:error, changeset} -> {:error, :subscription, changeset}
    end
  end

  # Step 4: Create coach profile
  defp create_coach_step(user, business) do
    # Create coach with default active status
    attrs = %{status: "active"}

    case Coaches.create_coach(user, business, attrs) do
      {:ok, coach} -> {:ok, coach}
      {:error, changeset} -> {:error, :coach, changeset}
    end
  end

  # Formats business for JSON response
  defp format_business(business), do: ResponseHelpers.format_business(business)

  # Formats coach for JSON response
  defp format_coach(coach), do: ResponseHelpers.format_coach(coach)

  # Formats subscription with plan for JSON response
  defp format_subscription(subscription), do: ResponseHelpers.format_subscription(subscription)

  # Renders an API error response
  defp render_error(conn, %ApiError{} = error) do
    conn = maybe_add_headers(conn, error)

    conn
    |> put_status(error.status)
    |> json(ApiError.to_json(error))
  end

  # Adds headers from ApiError to the connection if present
  defp maybe_add_headers(conn, %ApiError{headers: nil}), do: conn

  defp maybe_add_headers(conn, %ApiError{headers: headers}) do
    Enum.reduce(headers, conn, fn {key, value}, acc ->
      put_resp_header(acc, key, value)
    end)
  end
end
