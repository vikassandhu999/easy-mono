defmodule Easy.Organizations do
  @moduledoc """
  Organizations context handles business and subscription management.

  This is the public API for:
  - Business CRUD operations
  - Plan management
  - Subscription management

  ## Scope-Based Functions

  The new scope-based functions accept an `Easy.Auth.Scope` struct as the first
  parameter and automatically apply authorization checks and business context filtering.
  These functions ensure proper tenant isolation and authorization enforcement.

  ## Legacy Functions

  The older functions without scope parameters are maintained for backward
  compatibility but will be deprecated in future versions. New code should use
  scope-based functions.
  """

  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Organizations.{Business, Plan, Subscription}
  alias Easy.Auth.Scope
  alias EasyWeb.Authorization

  # ============================================
  # SCOPE-BASED BUSINESS QUERY FUNCTIONS
  # ============================================

  @doc """
  Lists all businesses accessible to the scope's user.

  Returns businesses where the user is:
  - The business owner
  - A coach in the business
  - A client in the business

  Automatically filters based on user access, ensuring proper authorization.

  ## Parameters
    - scope: The scope struct containing user context

  ## Returns
    - {:ok, [%Business{}]} on success

  ## Examples

      iex> list_businesses(scope)
      {:ok, [%Business{}, %Business{}]}
  """
  def list_businesses(%Scope{user_id: user_id}) when is_binary(user_id) do
    # Get businesses where user is owner
    owned_businesses =
      from(b in Business,
        where: b.owner_id == ^user_id,
        order_by: [desc: b.inserted_at]
      )
      |> Repo.all()

    # Get businesses where user is a coach
    coach_businesses =
      from(b in Business,
        join: c in Easy.Coaches.Coach,
        on: c.business_id == b.id,
        where: c.user_id == ^user_id,
        order_by: [desc: b.inserted_at]
      )
      |> Repo.all()

    # Get businesses where user is a client
    client_businesses =
      from(b in Business,
        join: cl in Easy.Clients.Client,
        on: cl.business_id == b.id,
        where: cl.user_id == ^user_id,
        order_by: [desc: b.inserted_at]
      )
      |> Repo.all()

    # Combine and deduplicate businesses
    businesses =
      (owned_businesses ++ coach_businesses ++ client_businesses)
      |> Enum.uniq_by(& &1.id)

    {:ok, businesses}
  end

  @doc """
  Gets a business by ID with scope-based authorization.

  Verifies that the scope has access to the requested business.
  Access is granted if:
  - The scope's user_id matches the business owner_id (user owns the business)
  - The scope's business_id matches the requested business_id (user has profile in business)

  ## Parameters
    - scope: The scope struct containing authorization context
    - business_id: The business ID to retrieve (UUID string)

  ## Returns
    - {:ok, %Business{}} on success
    - {:error, :not_found} if business doesn't exist
    - {:error, :forbidden} if scope doesn't have access to the business

  ## Examples

      iex> get_business(scope, "business-uuid")
      {:ok, %Business{}}

      iex> get_business(scope, "other-business-uuid")
      {:error, :forbidden}

      iex> get_business(scope, "nonexistent-uuid")
      {:error, :not_found}
  """
  def get_business(%Scope{} = scope, business_id) when is_binary(business_id) do
    case Repo.get(Business, business_id) do
      nil ->
        {:error, :not_found}

      business ->
        # Check if scope has access to this business
        # Access granted if: user owns the business OR business_id matches scope's business
        cond do
          scope.user_id == business.owner_id ->
            {:ok, business}

          scope.business_id == business_id ->
            {:ok, business}

          # Check if user is a coach or client in this business
          user_has_profile_in_business?(scope.user_id, business_id) ->
            {:ok, business}

          true ->
            {:error, :forbidden}
        end
    end
  end

  # ============================================
  # SCOPE-BASED BUSINESS MUTATION FUNCTIONS
  # ============================================

  @doc """
  Creates a business using scope-based authorization.

  Uses the user_id from the scope as the business owner,
  ensuring the business is created with the correct ownership.

  ## Parameters
    - scope: The scope struct containing user context
    - attrs: Map of business attributes (name, description)

  ## Returns
    - {:ok, %Business{}} on success
    - {:error, changeset} on validation failure

  ## Examples

      iex> create_business(scope, %{name: "Coaching Pro", description: "Professional coaching"})
      {:ok, %Business{}}

      iex> create_business(scope, %{name: ""})
      {:error, %Ecto.Changeset{}}
  """
  def create_business(%Scope{user_id: user_id} = _scope, attrs) when is_binary(user_id) do
    attrs_with_owner = Map.put(attrs, :owner_id, user_id)

    %Business{}
    |> Business.create_changeset(attrs_with_owner)
    |> Repo.insert()
  end

  @doc """
  Updates a business with scope-based authorization.

  Verifies that the scope's user is the owner of the business.
  Only business owners can update business details.

  ## Parameters
    - scope: The scope struct containing authorization context
    - business_id: The business ID to update (UUID string)
    - attrs: Map of attributes to update

  ## Returns
    - {:ok, %Business{}} on success
    - {:error, :not_found} if business doesn't exist
    - {:error, :forbidden} if scope doesn't have permission to update the business
    - {:error, changeset} on validation failure

  ## Examples

      iex> update_business(owner_scope, "business-uuid", %{name: "New Name"})
      {:ok, %Business{}}

      iex> update_business(coach_scope, "business-uuid", %{name: "New Name"})
      {:error, :forbidden}

      iex> update_business(scope, "business-uuid", %{name: ""})
      {:error, %Ecto.Changeset{}}
  """
  def update_business(%Scope{} = scope, business_id, attrs) when is_binary(business_id) do
    with {:ok, business} <- get_business(scope, business_id),
         :ok <- Authorization.authorize_business_owner(scope, business_id) do
      business
      |> Business.changeset(attrs)
      |> Repo.update()
    end
  end

  @doc """
  Deletes a business with scope-based authorization.

  Verifies that the scope's user is the owner of the business.
  Only business owners can delete businesses.

  ## Parameters
    - scope: The scope struct containing authorization context
    - business_id: The business ID to delete (UUID string)

  ## Returns
    - {:ok, %Business{}} on success
    - {:error, :not_found} if business doesn't exist
    - {:error, :forbidden} if scope doesn't have permission to delete the business

  ## Examples

      iex> delete_business(owner_scope, "business-uuid")
      {:ok, %Business{}}

      iex> delete_business(coach_scope, "business-uuid")
      {:error, :forbidden}

      iex> delete_business(scope, "nonexistent-uuid")
      {:error, :not_found}
  """
  def delete_business(%Scope{} = scope, business_id) when is_binary(business_id) do
    with {:ok, business} <- get_business(scope, business_id),
         :ok <- Authorization.authorize_business_owner(scope, business_id) do
      Repo.delete(business)
    end
  end

  # ============================================
  # LEGACY BUSINESS MANAGEMENT
  # ============================================

  @doc """
  Creates a business with the given owner and attributes.

  **DEPRECATED:** Use `create_business/2` with scope parameter instead.
  This legacy function will be removed in a future version.

  ## Parameters
    - user: The user who will own the business
    - attrs: Map of business attributes (name, description)

  ## Returns
    - {:ok, business} on success
    - {:error, changeset} on validation failure

  ## Examples

      iex> create_business_legacy(user, %{name: "Coaching Pro", description: "Professional coaching"})
      {:ok, %Business{}}

      iex> create_business_legacy(user, %{name: ""})
      {:error, %Ecto.Changeset{}}
  """
  def create_business_legacy(user, attrs) do
    attrs_with_owner = Map.put(attrs, :owner_id, user.id)

    %Business{}
    |> Business.create_changeset(attrs_with_owner)
    |> Repo.insert()
  end

  @doc """
  Gets a business by ID.
  Returns the business struct or nil if not found.

  **DEPRECATED:** Use `get_business/2` with scope parameter instead.
  This legacy function will be removed in a future version.

  ## Examples

      iex> get_business_legacy(123)
      %Business{}

      iex> get_business_legacy(999)
      nil
  """
  def get_business_legacy(id), do: Repo.get(Business, id)

  @doc """
  Updates a business with the given attributes.

  **DEPRECATED:** Use `update_business/3` with scope parameter instead.
  This legacy function will be removed in a future version.

  ## Examples

      iex> update_business_legacy(business, %{name: "New Name"})
      {:ok, %Business{}}

      iex> update_business_legacy(business, %{name: ""})
      {:error, %Ecto.Changeset{}}
  """
  def update_business_legacy(%Business{} = business, attrs) do
    business
    |> Business.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Lists all coaches in a business.

  ## Examples

      iex> list_business_coaches(123)
      [%Coach{}, %Coach{}]
  """
  def list_business_coaches(business_id) do
    Easy.Coaches.list_business_coaches(business_id)
  end

  @doc """
  Lists all clients in a business.

  **DEPRECATED:** This legacy function will be removed in a future version.

  ## Parameters
    - business_id: The business ID

  ## Returns
    - List of clients

  ## Examples

      iex> list_business_clients(123)
      [%Client{}, %Client{}]
  """
  def list_business_clients(business_id) do
    # Note: This is a legacy function that takes business_id directly
    # For scope-based queries, use Easy.Clients.list_clients/1 instead
    from(c in Easy.Clients.Client,
      where: c.business_id == ^business_id,
      order_by: [desc: c.inserted_at]
    )
    |> Repo.all()
  end

  # ============================================
  # HELPER FUNCTIONS
  # ============================================

  # Private helper to check if user has a coach or client profile in a business
  defp user_has_profile_in_business?(user_id, business_id) do
    coach_exists =
      from(c in Easy.Coaches.Coach,
        where: c.user_id == ^user_id and c.business_id == ^business_id
      )
      |> Repo.exists?()

    client_exists =
      from(cl in Easy.Clients.Client,
        where: cl.user_id == ^user_id and cl.business_id == ^business_id
      )
      |> Repo.exists?()

    coach_exists or client_exists
  end

  # ============================================
  # PLAN MANAGEMENT
  # ============================================

  @doc """
  Gets or creates the default free plan.

  This ensures there's always a default plan available for new businesses.

  ## Returns
    - {:ok, plan} on success

  ## Examples

      iex> get_or_create_default_plan()
      {:ok, %Plan{name: "Free", slug: "free"}}
  """
  def get_or_create_default_plan do
    case Repo.get_by(Plan, is_default: true) do
      nil ->
        # Create default free plan
        attrs = %{
          name: "Free",
          slug: "free",
          description: "Free plan with basic features",
          price_cents: 0,
          billing_interval: "month",
          features: %{
            "basic_features" => true
          },
          limits: %{
            "max_coaches" => 1,
            "max_clients" => 10
          },
          is_default: true
        }

        %Plan{}
        |> Plan.changeset(attrs)
        |> Repo.insert()

      plan ->
        {:ok, plan}
    end
  end

  @doc """
  Gets a plan by ID.

  ## Examples

      iex> get_plan(123)
      %Plan{}

      iex> get_plan(999)
      nil
  """
  def get_plan(id), do: Repo.get(Plan, id)

  @doc """
  Gets a plan by slug.

  ## Examples

      iex> get_plan_by_slug("free")
      %Plan{}

      iex> get_plan_by_slug("nonexistent")
      nil
  """
  def get_plan_by_slug(slug), do: Repo.get_by(Plan, slug: slug)

  # ============================================
  # SUBSCRIPTION MANAGEMENT
  # ============================================

  @doc """
  Creates a subscription linking a business to a plan.

  ## Parameters
    - business: The business struct or business_id
    - plan: The plan struct or plan_id

  ## Returns
    - {:ok, subscription} on success
    - {:error, changeset} on validation failure

  ## Examples

      iex> create_subscription(business, plan)
      {:ok, %Subscription{}}

      iex> create_subscription(%Business{id: 123}, %Plan{id: 456})
      {:ok, %Subscription{}}
  """
  def create_subscription(%Business{id: business_id}, %Plan{id: plan_id}) do
    create_subscription(business_id, plan_id)
  end

  def create_subscription(business_id, plan_id) do
    %Subscription{}
    |> Subscription.create_changeset(business_id, plan_id)
    |> Repo.insert()
  end

  @doc """
  Gets the active subscription for a business.

  ## Parameters
    - business_id: The business ID

  ## Returns
    - The subscription struct or nil if not found

  ## Examples

      iex> get_subscription(123)
      %Subscription{status: "active"}

      iex> get_subscription(999)
      nil
  """
  def get_subscription(business_id) do
    from(s in Subscription,
      where: s.business_id == ^business_id and s.status == "active",
      order_by: [desc: s.inserted_at],
      limit: 1
    )
    |> Repo.one()
  end

  @doc """
  Gets a subscription by ID.

  ## Examples

      iex> get_subscription_by_id(123)
      %Subscription{}

      iex> get_subscription_by_id(999)
      nil
  """
  def get_subscription_by_id(id), do: Repo.get(Subscription, id)

  @doc """
  Updates a subscription with the given attributes.

  ## Examples

      iex> update_subscription(subscription, %{status: "cancelled"})
      {:ok, %Subscription{}}
  """
  def update_subscription(%Subscription{} = subscription, attrs) do
    subscription
    |> Subscription.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Cancels a subscription.

  Sets the status to "cancelled" and records the cancellation timestamp.

  ## Examples

      iex> cancel_subscription(subscription)
      {:ok, %Subscription{status: "cancelled"}}
  """
  def cancel_subscription(%Subscription{} = subscription) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    subscription
    |> Subscription.changeset(%{
      status: "cancelled",
      cancelled_at: now
    })
    |> Repo.update()
  end
end
