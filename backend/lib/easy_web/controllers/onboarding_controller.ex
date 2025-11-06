defmodule EasyWeb.OnboardingController do
  use EasyWeb, :controller

  alias Easy.{Organizations, Coaches, Repo}

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

  ## Authentication
  Requires Bearer token in Authorization header.

  ## Parameters
  - name: Business name (required)
  - description: Business description (optional)

  ## Response

  Success (201):
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
    "coach": {
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
        "price_cents": 0
      }
    }
  }
  ```

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

  Business already exists (422):
  ```json
  {
    "error": {
      "message": "User already owns a business",
      "code": "business_exists"
    }
  }
  ```
  """
  def create_business(conn, params) do
    user = conn.assigns.current_user
    name = params["name"]
    description = params["description"]

    # Check if user already owns a business
    case check_existing_business(user.id) do
      {:ok, :no_business} ->
        # Create business, subscription, and coach profile in a transaction
        case create_business_with_onboarding(user, name, description) do
          {:ok, result} ->
            conn
            |> put_status(:created)
            |> json(%{
              business: format_business(result.business),
              coach: format_coach(result.coach),
              subscription: format_subscription(result.subscription, result.plan)
            })

          {:error, :business, changeset, _changes} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{
              error: %{
                message: "Business creation failed",
                code: "validation_error",
                details: translate_changeset_errors(changeset)
              }
            })

          {:error, :plan, reason, _changes} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{
              error: %{
                message: "Failed to get default plan",
                code: "plan_error",
                details: %{reason: to_string(reason)}
              }
            })

          {:error, :subscription, changeset, _changes} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{
              error: %{
                message: "Subscription creation failed",
                code: "validation_error",
                details: translate_changeset_errors(changeset)
              }
            })

          {:error, :coach, changeset, _changes} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{
              error: %{
                message: "Coach profile creation failed",
                code: "validation_error",
                details: translate_changeset_errors(changeset)
              }
            })
        end

      {:error, :business_exists} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          error: %{
            message: "User already owns a business",
            code: "business_exists",
            details: nil
          }
        })
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Checks if user already owns a business
  defp check_existing_business(user_id) do
    import Ecto.Query

    query =
      from b in Organizations.Business,
        where: b.owner_id == ^user_id,
        limit: 1

    case Repo.one(query) do
      nil -> {:ok, :no_business}
      _business -> {:error, :business_exists}
    end
  end

  # Creates business, subscription, and coach profile in a transaction
  defp create_business_with_onboarding(user, name, description) do
    Repo.transaction(fn ->
      with {:ok, business} <- create_business_step(user, name, description),
           {:ok, plan} <- get_default_plan_step(),
           {:ok, subscription} <- create_subscription_step(business, plan),
           {:ok, coach} <- create_coach_step(user, business) do
        %{
          business: business,
          plan: plan,
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
  defp format_business(business) do
    %{
      id: to_string(business.id),
      name: business.name,
      slug: business.slug,
      description: business.description,
      owner_id: to_string(business.owner_id),
      status: business.status
    }
  end

  # Formats coach for JSON response
  defp format_coach(coach) do
    %{
      id: to_string(coach.id),
      user_id: to_string(coach.user_id),
      business_id: to_string(coach.business_id),
      status: coach.status,
      bio: coach.bio,
      specialties: coach.specialties || [],
      credentials: coach.credentials || %{}
    }
  end

  # Formats subscription with plan for JSON response
  defp format_subscription(subscription, plan) do
    %{
      id: to_string(subscription.id),
      business_id: to_string(subscription.business_id),
      plan_id: to_string(subscription.plan_id),
      status: subscription.status,
      started_at: subscription.started_at,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      plan: %{
        id: to_string(plan.id),
        name: plan.name,
        slug: plan.slug,
        price_cents: plan.price_cents,
        billing_interval: plan.billing_interval
      }
    }
  end

  # Translates changeset errors to a map of field => [errors]
  defp translate_changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
