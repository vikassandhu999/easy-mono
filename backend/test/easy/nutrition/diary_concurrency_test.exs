defmodule Easy.Nutrition.DiaryConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Query
  import Easy.Factory

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Identity.User

  alias Easy.Nutrition.{
    Diary,
    DiaryEntry,
    DiaryFrozenOption,
    DiaryFrozenPlannedItem,
    DiarySlot,
    Food,
    Meal,
    Plan
  }

  alias Easy.Orgs.{Business, Coach}
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)

    business = insert(:business)
    coach = insert(:coach, business: business)
    client = insert(:client, business: business, creator: coach)
    food = insert(:food, business: business, creator: coach)
    ctx = %Ctx{business_id: business.id, user_id: client.user_id, client_id: client.id}
    user_ids = Enum.uniq([business.owner_id, coach.user_id, client.user_id])

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      cleanup(business.id, user_ids)
    end)

    %{ctx: ctx, food: food, business: business, client: client, coach: coach}
  end

  test "simultaneous extras with the same key create one Diary Entry", ctx do
    parent = self()
    key = Ecto.UUID.generate()
    today = Date.utc_today()

    attrs = %{
      meal_slot: :breakfast,
      food_id: ctx.food.id,
      portion: %{kind: :gram, grams: 50.0}
    }

    run = fn ->
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        send(parent, {:ready, self()})

        receive do
          :go -> :ok
        end

        Diary.add_client_extra(ctx.ctx, today, attrs, key)
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

    ids =
      results
      |> Enum.map(fn {:ok, day} -> hd(hd(day.slots).rows).entry.id end)
      |> Enum.uniq()

    assert length(ids) == 1

    assert Repo.aggregate(
             from(entry in DiaryEntry, where: entry.business_id == ^ctx.business.id),
             :count
           ) == 1
  end

  test "simultaneous switches with the same revision keep one winner", ctx do
    today = Date.utc_today()
    parent = self()
    {_slot, option_b_id} = seed_two_frozen_options!(ctx.client, ctx.food, ctx.coach, today)
    attrs = %{meal_slot: :breakfast, meal_id: option_b_id, expected_revision: 1}

    run = fn ->
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        send(parent, {:ready, self()})

        receive do
          :go -> :ok
        end

        Diary.switch_client_option(ctx.ctx, today, attrs, Ecto.UUID.generate())
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

    oks = Enum.filter(results, &match?({:ok, _}, &1))
    stales = Enum.filter(results, &match?({:error, %Ecto.Changeset{action: :stale_revision}}, &1))

    assert length(oks) == 1
    assert length(stales) == 1

    {:ok, day} = hd(oks)
    assert hd(day.slots).meal_id == option_b_id
    assert hd(day.slots).revision == 2
  end

  test "simultaneous planned-option taps fulfil each active item once", ctx do
    today = Date.utc_today()
    parent = self()
    seed_frozen_option!(ctx.client, ctx.food, today)
    attrs = %{meal_slot: :breakfast}

    run = fn ->
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        send(parent, {:ready, self()})

        receive do
          :go -> :ok
        end

        Diary.log_client_planned_option(ctx.ctx, today, attrs, Ecto.UUID.generate())
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

    assert Repo.aggregate(
             from(entry in DiaryEntry,
               where: entry.business_id == ^ctx.business.id and not is_nil(entry.frozen_planned_item_id)
             ),
             :count
           ) == 2
  end

  test "simultaneous entry updates with the same revision keep one winner", ctx do
    today = Date.utc_today()
    parent = self()

    {:ok, logged} =
      Diary.add_client_extra(
        ctx.ctx,
        today,
        %{meal_slot: :breakfast, food_id: ctx.food.id, portion: %{kind: :gram, grams: 50.0}},
        Ecto.UUID.generate()
      )

    entry = hd(hd(logged.slots).rows).entry
    attrs = %{expected_revision: entry.revision, notes: "winner"}

    run = fn ->
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        send(parent, {:ready, self()})

        receive do
          :go -> :ok
        end

        Diary.update_client_entry(ctx.ctx, today, entry.id, attrs, Ecto.UUID.generate())
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

    oks = Enum.filter(results, &match?({:ok, _}, &1))
    stales = Enum.filter(results, &match?({:error, %Ecto.Changeset{action: :stale_revision}}, &1))

    assert length(oks) == 1
    assert length(stales) == 1
    {:ok, day} = hd(oks)
    assert hd(hd(day.slots).rows).entry.revision == 2
  end

  defp seed_frozen_option!(client, food, date) do
    {:ok, slot} =
      Repo.insert(
        DiarySlot.insert_changeset(client.business_id, client.id, %{
          local_date: date,
          meal_slot: :breakfast,
          applied_timezone: "Asia/Kolkata",
          has_coverage: true,
          revision: 1
        })
      )

    {:ok, option} =
      Repo.insert(
        DiaryFrozenOption.insert_changeset(client.business_id, slot.id, %{
          position: 0,
          meal_name: "Breakfast"
        })
      )

    for {grams, position} <- [{50.0, 0}, {30.0, 1}] do
      {:ok, _item} =
        Repo.insert(
          DiaryFrozenPlannedItem.insert_changeset(client.business_id, slot.id, option.id, %{
            kind: :food,
            display_name: food.name,
            portion_kind: :gram,
            weight_g: grams,
            calories: grams * 2,
            protein: 1.0,
            carbohydrates: 1.0,
            fat: 1.0,
            fiber: 0.0,
            complete: true,
            position: position,
            food_id: food.id
          })
        )
    end

    {:ok, _} = Repo.update(DiarySlot.update_changeset(slot, %{active_frozen_option_id: option.id}))
    :ok
  end

  defp seed_two_frozen_options!(client, food, coach, date) do
    {:ok, plan} =
      Repo.insert(Plan.insert_changeset(client.business_id, coach.user_id, %{"name" => "Concurrency template"}))

    {:ok, meal_a} =
      Repo.insert(Meal.insert_changeset(client.business_id, plan.id, %{name: "Breakfast A", position: 0}))

    {:ok, meal_b} =
      Repo.insert(Meal.insert_changeset(client.business_id, plan.id, %{name: "Breakfast B", position: 1}))

    {:ok, slot} =
      Repo.insert(
        DiarySlot.insert_changeset(client.business_id, client.id, %{
          local_date: date,
          meal_slot: :breakfast,
          applied_timezone: "Asia/Kolkata",
          has_coverage: true,
          revision: 1
        })
      )

    {:ok, option_a} =
      Repo.insert(
        DiaryFrozenOption.insert_changeset(client.business_id, slot.id, %{
          position: 0,
          meal_name: "Breakfast A",
          nutrition_meal_id: meal_a.id
        })
      )

    {:ok, _option_b} =
      Repo.insert(
        DiaryFrozenOption.insert_changeset(client.business_id, slot.id, %{
          position: 1,
          meal_name: "Breakfast B",
          nutrition_meal_id: meal_b.id
        })
      )

    for {option, grams} <- [{option_a, 50.0}] do
      {:ok, _item} =
        Repo.insert(
          DiaryFrozenPlannedItem.insert_changeset(client.business_id, slot.id, option.id, %{
            kind: :food,
            display_name: food.name,
            portion_kind: :gram,
            weight_g: grams,
            calories: grams * 2,
            protein: 1.0,
            carbohydrates: 1.0,
            fat: 1.0,
            fiber: 0.0,
            complete: true,
            position: 0,
            food_id: food.id
          })
        )
    end

    {:ok, _} = Repo.update(DiarySlot.update_changeset(slot, %{active_frozen_option_id: option_a.id}))
    {slot, meal_b.id}
  end

  defp cleanup(business_id, user_ids) do
    Repo.update_all(from(slot in DiarySlot, where: slot.business_id == ^business_id),
      set: [active_frozen_option_id: nil]
    )

    for schema <- [
          DiaryEntry,
          DiaryFrozenPlannedItem,
          DiaryFrozenOption,
          Easy.Nutrition.DiaryCommandLedger,
          DiarySlot,
          Easy.Nutrition.Meal,
          Easy.Nutrition.Plan,
          Food,
          Client,
          Coach
        ] do
      Repo.delete_all(from row in schema, where: row.business_id == ^business_id)
    end

    Repo.delete_all(from business in Business, where: business.id == ^business_id)
    Repo.delete_all(from user in User, where: user.id in ^user_ids)
  end
end
