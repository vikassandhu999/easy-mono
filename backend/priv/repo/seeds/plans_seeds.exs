defmodule Easy.Repo.Seeds.Plans do
  @moduledoc """
  Seeds for subscription plans.
  """
  alias Easy.Repo
  alias Easy.Orgs.Plan

  import Ecto.Query

  @plans [
    %{
      name: "Free",
      slug: "free",
      description: "Free plan with basic features",
      price_cents: 0,
      billing_interval: "month",
      features: %{
        "client_management" => true,
        "basic_reporting" => true
      },
      limits: %{
        "max_coaches" => 1,
        "max_clients" => 10
      },
      is_default: true
    }
  ]

  def run do
    seed_plans()
  end

  defp seed_plans do
    inserted_count =
      @plans
      |> Enum.reduce(0, fn plan_attrs, count ->
        case upsert_plan(plan_attrs) do
          {:ok, _} -> count + 1
          {:skip, _} -> count
        end
      end)

    IO.puts("✓ Seeded #{inserted_count}/#{length(@plans)} Plans")
  end

  defp upsert_plan(%{slug: slug} = attrs) do
    case Repo.one(from p in Plan, where: p.slug == ^slug) do
      nil ->
        %Plan{}
        |> Plan.changeset(attrs)
        |> Repo.insert()

      _existing ->
        {:skip, :already_exists}
    end
  end
end
