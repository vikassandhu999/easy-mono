defmodule Easy.Nutrition.DiaryConcurrencyTest do
  alias Easy.Nutrition.DiaryFixtures
  use ExUnit.Case, async: false
  import Ecto.Query
  import Easy.Factory
  alias Easy.Clients.Client
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Identity.User

  alias Easy.Nutrition.{Diary, DiarySlot, Food}

  alias Easy.Orgs.{Business, Coach}
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)
    business = insert(:business)
    coach = insert(:coach, business: business)
    client = insert(:client, business: business, coach: coach)
    food = insert(:food, business: business, creator: coach)
    ctx = %Ctx{business_id: business.id, user_id: client.user_id, client_id: client.id}
    user_ids = Enum.uniq([business.owner_user_id, coach.user_id, client.user_id])

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      cleanup(business.id, user_ids)
    end)

    %{ctx: ctx, food: food, business: business, client: client, coach: coach}
  end

  test "concurrent first saves and edits each have exactly one winner", ctx do
    today = DiaryFixtures.local_today(ctx.client)

    entry = %{
      id: Ecto.UUID.generate(),
      planned_item_ref: nil,
      food_id: ctx.food.id,
      recipe_id: nil,
      portion: %{kind: :gram, grams: 50},
      notes: nil
    }

    draft = %{meal_slot: :breakfast, meal_id: nil, expected_revision: 0, entries: [entry]}
    results = race(ctx.ctx, today, draft)
    assert_one_winner(results)
    {:ok, day} = Enum.find(results, &match?({:ok, _}, &1))
    next = DiaryFixtures.slot_draft(hd(day.slots))
    assert_one_winner(race(ctx.ctx, today, %{next | entries: [%{entry | notes: "Edited"}]}))

    assert length(DiaryFixtures.stored_entries(ctx.client)) ==
             1

    assert Repo.aggregate(from(s in DiarySlot, where: s.business_id == ^ctx.business.id), :count) ==
             1
  end

  defp race(ctx, date, draft) do
    parent = self()

    tasks =
      for _ <- 1..2 do
        Task.async(fn ->
          Sandbox.checkout(Repo, sandbox: false)
          send(parent, {:ready, self()})
          receive do: (:go -> :ok)
          Diary.save_client_nutrition_day(ctx, date, %{slots: [draft]})
        end)
      end

    ready =
      for _ <- tasks do
        receive do: ({:ready, pid} -> pid)
      end

    Enum.each(ready, &send(&1, :go))
    Enum.map(tasks, &Task.await(&1, 5_000))
  end

  defp assert_one_winner(results) do
    assert Enum.count(results, &match?({:ok, _}, &1)) == 1

    assert Enum.count(results, fn
             {:error, :conflict} -> true
             {:error, %Ecto.Changeset{action: :stale_revision}} -> true
             _ -> false
           end) == 1
  end

  defp cleanup(business_id, user_ids) do
    Repo.delete_all(CoachingTerm.for_business(business_id))

    for schema <- [
          DiarySlot,
          Easy.Nutrition.Plan,
          Food,
          Client,
          Coach
        ] do
      Repo.delete_all(from(row in schema, where: row.business_id == ^business_id))
    end

    Repo.delete_all(from(business in Business, where: business.id == ^business_id))
    Repo.delete_all(from(user in User, where: user.id in ^user_ids))
  end
end
