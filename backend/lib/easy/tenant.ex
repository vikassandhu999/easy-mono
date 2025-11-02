defmodule Easy.Tenant do
  @moduledoc """
  The Tenant context for managing businesses, subscriptions, and plans.
  """

  import Ecto.Query, warn: false
  alias Easy.Repo

  alias Easy.Tenant.{Business, Plan, Price, Subscription}

  # Business functions

  @doc """
  Returns the list of businesses.
  """
  def list_businesses do
    Repo.all(Business)
  end

  @doc """
  Gets a single business by ID.
  Raises `Ecto.NoResultsError` if the Business does not exist.
  """
  def get_business!(id), do: Repo.get!(Business, id)

  @doc """
  Gets a single business by handle.
  """
  def get_business_by_handle(handle) do
    Repo.get_by(Business, handle: handle)
  end

  @doc """
  Creates a business.
  """
  def create_business(attrs \\ %{}) do
    %Business{}
    |> Business.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a business.
  """
  def update_business(%Business{} = business, attrs) do
    business
    |> Business.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a business.
  """
  def delete_business(%Business{} = business) do
    Repo.delete(business)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking business changes.
  """
  def change_business(%Business{} = business, attrs \\ %{}) do
    Business.changeset(business, attrs)
  end

  # Plan functions

  @doc """
  Returns the list of plans with their prices preloaded.
  """
  def list_plans do
    Plan
    |> preload(:prices)
    |> Repo.all()
  end

  @doc """
  Gets a single plan by ID with prices preloaded.
  """
  def get_plan!(id) do
    Plan
    |> preload(:prices)
    |> Repo.get!(id)
  end

  @doc """
  Gets the default plan.
  """
  def get_default_plan do
    Plan
    |> where([p], p.is_default == true)
    |> preload(:prices)
    |> Repo.one()
  end

  @doc """
  Creates a plan.
  """
  def create_plan(attrs \\ %{}) do
    %Plan{}
    |> Plan.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a plan.
  """
  def update_plan(%Plan{} = plan, attrs) do
    plan
    |> Plan.changeset(attrs)
    |> Repo.update()
  end

  # Subscription functions

  @doc """
  Gets a subscription by business_id with plan preloaded.
  """
  def get_subscription(business_id) do
    Subscription
    |> preload(:plan)
    |> Repo.get(business_id)
  end

  @spec create_subscription(
          :invalid
          | %{optional(:__struct__) => none(), optional(atom() | binary()) => any()}
        ) :: any()
  @doc """
  Creates a subscription.
  """
  def create_subscription(attrs \\ %{}) do
    %Subscription{}
    |> Subscription.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a subscription.
  """
  def update_subscription(%Subscription{} = subscription, attrs) do
    subscription
    |> Subscription.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a subscription.
  """
  def delete_subscription(%Subscription{} = subscription) do
    Repo.delete(subscription)
  end

  # Price functions

  @doc """
  Creates a price for a plan.
  """
  def create_price(attrs \\ %{}) do
    %Price{}
    |> Price.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Gets the price amount for a plan in a specific currency.
  """
  def get_plan_price(plan_id, currency_code) do
    Price
    |> where([p], p.plan_id == ^plan_id and p.currency_code == ^currency_code)
    |> Repo.one()
  end
end
