defmodule Easy.Nutrition.MealLogConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Query
  import Easy.Factory

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Identity.User
  alias Easy.MealLogs
  alias Easy.Nutrition.{Food, FoodLogEntry, Meal, MealItem, MealLog, Plan}
  alias Easy.Orgs.{Business, Coach}
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)

    business = insert(:business)
    coach = insert(:coach, business: business)
    client = insert(:client, business: business, creator: coach)

    plan =
      insert(:plan,
        business: business,
        creator: coach.user,
        client: client,
        kind: :client_plan,
        start_date: Date.utc_today()
      )

    meal =
      business.id
      |> Meal.insert_changeset(coach.id, plan.id, %{name: "Concurrent breakfast"})
      |> Repo.insert!()

    food = insert(:food, business: business, creator: coach)

    item =
      business.id
      |> MealItem.insert_changeset(meal.id, %{food_id: food.id, weight_g: 100.0})
      |> Repo.insert!()

    ctx = %Ctx{business_id: business.id, user_id: client.user_id, client_id: client.id}
    user_ids = Enum.uniq([business.owner_id, coach.user_id, client.user_id])

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      cleanup(business.id, user_ids)
    end)

    %{business: business, ctx: ctx, item: item, meal: meal}
  end

  test "two concurrent log-meal calls both succeed and create one fulfilment", ctx do
    parent = self()

    run = fn ->
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        send(parent, {:ready, self()})

        receive do
          :go -> :ok
        end

        MealLogs.log_client_meal(ctx.ctx, %{
          date: Date.utc_today(),
          meal_slot: "breakfast",
          meal_id: ctx.meal.id
        })
      end)
    end

    tasks = [run.(), run.()]

    ready =
      for _ <- tasks,
          do:
            (receive do
               {:ready, pid} -> pid
             end)

    Enum.each(ready, &send(&1, :go))
    results = Enum.map(tasks, &Task.await(&1, 5_000))

    assert Enum.all?(results, &match?({:ok, _}, &1))
    assert results |> Enum.flat_map(fn {:ok, entries} -> entries end) |> length() == 1

    assert Repo.aggregate(
             from(e in FoodLogEntry,
               where: e.business_id == ^ctx.business.id and e.planned_item_id == ^ctx.item.id
             ),
             :count
           ) == 1
  end

  defp cleanup(business_id, user_ids) do
    for schema <- [FoodLogEntry, MealLog, MealItem, Meal, Plan, Food, Client, Coach] do
      Repo.delete_all(from row in schema, where: row.business_id == ^business_id)
    end

    Repo.delete_all(from business in Business, where: business.id == ^business_id)
    Repo.delete_all(from user in User, where: user.id in ^user_ids)
  end
end
