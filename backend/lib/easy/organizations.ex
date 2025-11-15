defmodule Easy.Organizations do
  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Organizations.{Business, Plan, Subscription}
  alias Easy.Auth.Scope
  alias EasyWeb.Authorization

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

  def get_business(%Scope{} = scope, business_id) when is_binary(business_id) do
    case Repo.get(Business, business_id) do
      nil ->
        {:error, :not_found}

      business ->
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

  def create_business(%Scope{user_id: user_id} = _scope, attrs) when is_binary(user_id) do
    attrs_with_owner = Map.put(attrs, :owner_id, user_id)

    %Business{}
    |> Business.create_changeset(attrs_with_owner)
    |> Repo.insert()
  end

  def update_business(%Scope{} = scope, business_id, attrs) when is_binary(business_id) do
    with {:ok, business} <- get_business(scope, business_id),
         :ok <- Authorization.authorize_business_owner(scope, business_id) do
      business
      |> Business.changeset(attrs)
      |> Repo.update()
    end
  end

  def delete_business(%Scope{} = scope, business_id) when is_binary(business_id) do
    with {:ok, business} <- get_business(scope, business_id),
         :ok <- Authorization.authorize_business_owner(scope, business_id) do
      Repo.delete(business)
    end
  end

  def create_business_legacy(user, attrs) do
    attrs_with_owner = Map.put(attrs, :owner_id, user.id)

    %Business{}
    |> Business.create_changeset(attrs_with_owner)
    |> Repo.insert()
  end

  def get_business_legacy(id), do: Repo.get(Business, id)

  def update_business_legacy(%Business{} = business, attrs) do
    business
    |> Business.changeset(attrs)
    |> Repo.update()
  end

  def list_business_coaches(business_id) do
    Easy.Coaches.list_business_coaches(business_id)
  end

  def list_business_clients(business_id) do
    from(c in Easy.Clients.Client,
      where: c.business_id == ^business_id,
      order_by: [desc: c.inserted_at]
    )
    |> Repo.all()
  end

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

  def get_plan(id), do: Repo.get(Plan, id)

  def get_plan_by_slug(slug), do: Repo.get_by(Plan, slug: slug)

  def create_subscription(%Business{id: business_id}, %Plan{id: plan_id}) do
    create_subscription(business_id, plan_id)
  end

  def create_subscription(business_id, plan_id) do
    %Subscription{}
    |> Subscription.create_changeset(business_id, plan_id)
    |> Repo.insert()
  end

  def get_subscription(business_id) do
    from(s in Subscription,
      where: s.business_id == ^business_id and s.status == "active",
      order_by: [desc: s.inserted_at],
      limit: 1
    )
    |> Repo.one()
  end

  def get_subscription_by_id(id), do: Repo.get(Subscription, id)

  def update_subscription(%Subscription{} = subscription, attrs) do
    subscription
    |> Subscription.changeset(attrs)
    |> Repo.update()
  end

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
