defmodule Easy.Organizations do
  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Organizations.{Business, Plan, Subscription, Coach}

  def get_business(business_id) do
    Repo.get(Business, business_id, preload: [:subscription])
  end

  def create_business_with_owner(user, attrs) do
    with {:ok, business} <- do_create_business(user, attrs),
         {:ok, plan} <- get_or_create_default_plan(),
         {:ok, _} <- do_create_subscription(business.id, plan.id),
         {:ok, _} <- create_coach(business, user, %{}) do
      {:ok, business}
    end
  end

  defp do_create_business(user, attrs) do
    attrs_with_owner = Map.put(attrs, :owner_id, user.id)

    %Business{}
    |> Business.create_changeset(attrs_with_owner)
    |> Repo.insert()
  end

  # TODO: Figure out subscriptions later,
  # Our structure in golang codebase is well thought so just port that.
  defp get_or_create_default_plan do
    case Repo.get_by(Plan, is_default: true) do
      nil ->
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

  def do_create_subscription(business_id, plan_id) do
    %Subscription{}
    |> Subscription.create_changeset(business_id, plan_id)
    |> Repo.insert()
  end

  def create_coach(business, user, attrs) do
    attrs_with_ids =
      attrs
      |> Map.put(:user_id, user.id)
      |> Map.put(:business_id, business.id)

    %Coach{}
    |> Coach.create_changeset(attrs_with_ids)
    |> Repo.insert()
  end
end
