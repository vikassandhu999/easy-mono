defmodule Easy.Organizations do
  @moduledoc """
  Organizations context for managing businesses, coaches, plans, and subscriptions.
  """

  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Organizations.{Business, BusinessSettings, Plan, Subscription, Coach}

  ## Business Settings Management

  @doc """
  Gets the settings for a business.
  Creates default settings if they don't exist.
  """
  def get_business_settings(business_id) do
    case Repo.get_by(BusinessSettings, business_id: business_id) do
      nil -> create_business_settings(business_id)
      settings -> {:ok, settings}
    end
  end

  @doc """
  Gets settings by public join code.
  Returns error if code doesn't exist or public join is disabled.
  """
  def get_settings_by_join_code(code) do
    case Repo.get_by(BusinessSettings, public_join_code: code) do
      nil ->
        {:error, :invalid_code}

      %BusinessSettings{public_join_enabled: false} ->
        {:error, :join_disabled}

      settings ->
        {:ok, Repo.preload(settings, business: [:owner])}
    end
  end

  @doc """
  Updates public join settings for a business.
  """
  def update_public_join_settings(business_id, attrs) do
    with {:ok, settings} <- get_business_settings(business_id) do
      settings
      |> BusinessSettings.public_join_changeset(attrs)
      |> Repo.update()
    end
  end

  @doc """
  Updates branding settings for a business.
  """
  def update_branding_settings(business_id, attrs) do
    with {:ok, settings} <- get_business_settings(business_id) do
      settings
      |> BusinessSettings.branding_changeset(attrs)
      |> Repo.update()
    end
  end

  @doc """
  Updates all settings for a business.
  """
  def update_business_settings(business_id, attrs) do
    with {:ok, settings} <- get_business_settings(business_id) do
      settings
      |> BusinessSettings.changeset(attrs)
      |> Repo.update()
    end
  end

  @doc """
  Regenerates the public join code for a business.
  """
  def regenerate_join_code(business_id) do
    with {:ok, settings} <- get_business_settings(business_id) do
      settings
      |> BusinessSettings.regenerate_code_changeset()
      |> Repo.update()
    end
  end

  @doc """
  Enables public join for a business.
  """
  def enable_public_join(business_id) do
    update_public_join_settings(business_id, %{public_join_enabled: true})
  end

  @doc """
  Disables public join for a business.
  """
  def disable_public_join(business_id) do
    update_public_join_settings(business_id, %{public_join_enabled: false})
  end

  @doc """
  Checks if public join is within client limit.
  Returns true if no limit set or under limit.
  """
  def public_join_within_limit?(business_id) do
    with {:ok, settings} <- get_business_settings(business_id) do
      case settings.public_join_client_limit do
        nil ->
          true

        limit ->
          current_count =
            from(c in Easy.Clients.Client,
              where: c.business_id == ^business_id and c.status != "archived",
              select: count(c.id)
            )
            |> Repo.one()

          current_count < limit
      end
    end
  end

  ## Business Management

  @doc """
  Gets a business by ID.
  """
  def get_business(business_id) do
    Repo.get(Business, business_id)
  end

  @doc """
  Gets a business with subscription preloaded.
  """
  def get_business_with_subscription(business_id) do
    case Repo.get(Business, business_id) |> Repo.preload(subscription: [:plan]) do
      nil -> {:error, :not_found}
      business -> {:ok, business}
    end
  end

  @doc """
  Updates a business profile.
  """
  def update_business(%Business{} = business, attrs) do
    business
    |> Business.update_changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Creates a business with an owner and trial subscription.
  """
  def create_business_with_owner(user, attrs) do
    with {:ok, business} <- do_create_business(user, attrs),
         {:ok, plan} <- get_default_plan(),
         {:ok, _subscription} <- create_trial_subscription(business.id, plan.id),
         {:ok, _coach} <- create_coach(business, user, %{}),
         {:ok, _settings} <- create_business_settings(business.id) do
      {:ok, business}
    end
  end

  @doc """
  Creates business settings for a business.
  """
  def create_business_settings(business_id) do
    %BusinessSettings{}
    |> BusinessSettings.create_changeset(%{business_id: business_id})
    |> Repo.insert()
  end

  defp do_create_business(user, attrs) do
    attrs_with_owner = Map.put(attrs, :owner_id, user.id)

    %Business{}
    |> Business.create_changeset(attrs_with_owner)
    |> Repo.insert()
  end

  @doc """
  Lists coaches for a business.
  """
  def list_coaches(business_id) do
    coaches =
      from(c in Coach,
        where: c.business_id == ^business_id,
        preload: [:user]
      )
      |> Repo.all()

    {:ok, coaches}
  end

  @doc """
  Updates a coach profile.
  """
  def update_coach(%Coach{} = coach, attrs) do
    coach
    |> Coach.update_changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Creates a coach for a business.
  """
  def create_coach(business, user, attrs) do
    attrs_with_ids =
      attrs
      |> Map.put(:user_id, user.id)
      |> Map.put(:business_id, business.id)

    %Coach{}
    |> Coach.create_changeset(attrs_with_ids)
    |> Repo.insert()
  end

  ## Plan Management

  @doc """
  Lists all available plans.
  """
  def list_plans do
    {:ok, Repo.all(Plan)}
  end

  @doc """
  Gets the default plan for new businesses.
  """
  def get_default_plan do
    case Repo.get_by(Plan, is_default: true) do
      nil -> {:error, :no_default_plan}
      plan -> {:ok, plan}
    end
  end

  ## Subscription Management

  @doc """
  Gets the active subscription for a business.
  """
  def get_subscription(business_id) do
    subscription =
      from(s in Subscription,
        where: s.business_id == ^business_id and s.status in ["active", "trial"],
        preload: [:plan],
        limit: 1
      )
      |> Repo.one()

    case subscription do
      nil -> {:error, :not_found}
      sub -> {:ok, sub}
    end
  end

  @doc """
  Creates a trial subscription for a business.

  ## Options
  - `trial_days` - Number of days for trial period (default: 30)
  """
  def create_trial_subscription(business_id, plan_id, trial_days \\ 30) do
    %Subscription{}
    |> Subscription.trial_changeset(business_id, plan_id, trial_days)
    |> Repo.insert()
  end

  @doc """
  Checks the subscription status for a business.

  Returns the status as an atom: :active, :trial, :trial_expired, :cancelled, :expired, or :unknown
  """
  def check_subscription_status(business_id) do
    case get_subscription(business_id) do
      {:ok, subscription} -> Subscription.status_atom(subscription)
      {:error, :not_found} -> :unknown
    end
  end

  @doc """
  Checks if a subscription is within the specified limit.

  Queries the database to count actual usage and compares against plan limits.
  """
  def subscription_within_limits?(%Subscription{} = subscription, limit_type) do
    subscription = Repo.preload(subscription, :plan)
    plan_limits = subscription.plan.limits || %{}

    case limit_type do
      :max_coaches ->
        max_coaches = plan_limits["max_coaches"]

        if is_nil(max_coaches) or max_coaches == -1 do
          # Unlimited
          true
        else
          current_coach_count =
            from(c in Coach,
              where: c.business_id == ^subscription.business_id,
              select: count(c.id)
            )
            |> Repo.one()

          current_coach_count < max_coaches
        end

      :max_clients ->
        max_clients = plan_limits["max_clients"]

        if is_nil(max_clients) or max_clients == -1 do
          # Unlimited
          true
        else
          current_client_count =
            from(c in Easy.Clients.Client,
              where: c.business_id == ^subscription.business_id and c.status != "archived",
              select: count(c.id)
            )
            |> Repo.one()

          current_client_count < max_clients
        end

      _ ->
        false
    end
  end
end
