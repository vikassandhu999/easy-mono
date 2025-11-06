defmodule Easy.Organizations do
  @moduledoc """
  Organizations context handles business and subscription management.

  This is the public API for:
  - Business CRUD operations
  - Plan management
  - Subscription management
  """

  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Organizations.{Business, Plan, Subscription}

  # ============================================
  # BUSINESS MANAGEMENT
  # ============================================

  @doc """
  Creates a business with the given owner and attributes.

  ## Parameters
    - user: The user who will own the business
    - attrs: Map of business attributes (name, description)

  ## Returns
    - {:ok, business} on success
    - {:error, changeset} on validation failure

  ## Examples

      iex> create_business(user, %{name: "Coaching Pro", description: "Professional coaching"})
      {:ok, %Business{}}

      iex> create_business(user, %{name: ""})
      {:error, %Ecto.Changeset{}}
  """
  def create_business(user, attrs) do
    attrs_with_owner = Map.put(attrs, :owner_id, user.id)

    %Business{}
    |> Business.create_changeset(attrs_with_owner)
    |> Repo.insert()
  end

  @doc """
  Gets a business by ID.
  Returns the business struct or nil if not found.

  ## Examples

      iex> get_business(123)
      %Business{}

      iex> get_business(999)
      nil
  """
  def get_business(id), do: Repo.get(Business, id)

  @doc """
  Updates a business with the given attributes.

  ## Examples

      iex> update_business(business, %{name: "New Name"})
      {:ok, %Business{}}

      iex> update_business(business, %{name: ""})
      {:error, %Ecto.Changeset{}}
  """
  def update_business(%Business{} = business, attrs) do
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
  Lists all clients in a business with pagination.

  ## Parameters
    - business_id: The business ID
    - opts: Options for pagination and filtering
      - :limit - Number of items per page (default: 50)
      - :offset - Number of items to skip (default: 0)
      - :status - Filter by client status (optional)

  ## Returns
    - List of clients

  ## Examples

      iex> list_business_clients(123, limit: 10, offset: 0)
      [%Client{}, %Client{}]
  """
  def list_business_clients(business_id, opts \\ []) do
    Easy.Clients.list_clients(business_id, opts)
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

  def create_subscription(business_id, plan_id)
      when is_integer(business_id) and is_integer(plan_id) do
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
