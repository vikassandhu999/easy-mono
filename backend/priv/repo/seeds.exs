# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Inside the script, you can read and write to any of your
# repositories directly:
#
#     Easy.Repo.insert!(%Easy.SomeSchema{})
#
# We recommend using the bang functions (`insert!`, `update!`
# and so on) as they will fail if something goes wrong.

alias Easy.Repo
import Ecto.Query

# Create default free plan
# Check if default plan already exists
existing_plan = Repo.one(from p in "plans", where: p.slug == "free", select: count())

if existing_plan == 0 do
  now = DateTime.utc_now() |> DateTime.truncate(:second)

  Repo.insert_all("plans", [
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
      is_default: true,
      inserted_at: now,
      updated_at: now
    }
  ])

  IO.puts("✓ Created default Free plan")
else
  IO.puts("✓ Default Free plan already exists")
end
