defmodule Easy.Nutrition.DiaryOptionsTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.{
    Diary,
    DiaryFrozenPlannedItem,
    DiarySlot
  }

  alias Easy.Repo

  import Ecto.Query
  import Easy.Nutrition.DiaryFixtures

  describe "switch_client_option/4" do
    test "switches the active frozen option on the same local day without deleting intake" do
      %{client: client, food: food} = covering_setup(menu: :two_options)
      today = local_today(client)
      ctx = client_ctx(client)

      assert {:ok, live} = Diary.get_client_nutrition_day(ctx, today)
      [option_a, option_b] = hd(live.slots).options
      planned_item_ref = hd(option_a.items).planned_item_ref

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, planned_item_ref: planned_item_ref},
                 Ecto.UUID.generate()
               )

      [frozen] = logged.slots
      assert frozen.meal_id == option_a.meal_id
      assert frozen.revision == 1
      [as_planned] = Enum.filter(frozen.rows, &(&1.status == :as_planned))
      entry_id = as_planned.entry.id
      logged_calories = frozen.logged_calories

      assert {:ok, switched} =
               Diary.switch_client_option(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_id: option_b.meal_id, expected_revision: frozen.revision},
                 Ecto.UUID.generate()
               )

      [slot] = switched.slots
      assert slot.meal_id == option_b.meal_id
      assert slot.revision == 2
      assert slot.planned_calories == hd(option_b.items).nutrients.calories
      assert slot.logged_calories == logged_calories
      assert Enum.map(slot.options, & &1.meal_name) == ["Breakfast A", "Breakfast B"]

      added = Enum.find(slot.rows, &(&1.status == :added))
      assert added.entry.id == entry_id
      assert added.entry.name == food.name
      assert Enum.any?(slot.rows, &(&1.status == :pending and &1.planned.name == food.name))
    end

    test "selecting the active option is idempotent and does not rewrite snapshots or entries" do
      %{client: client} = covering_setup(menu: :two_options)
      today = local_today(client)
      ctx = client_ctx(client)
      {:ok, live} = Diary.get_client_nutrition_day(ctx, today)
      option_a = hd(hd(live.slots).options)
      planned_item_ref = hd(option_a.items).planned_item_ref

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, planned_item_ref: planned_item_ref},
                 Ecto.UUID.generate()
               )

      [frozen] = logged.slots
      entry_id = hd(frozen.rows).entry.id

      assert {:ok, again} =
               Diary.switch_client_option(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_id: option_a.meal_id, expected_revision: frozen.revision},
                 Ecto.UUID.generate()
               )

      [slot] = again.slots
      assert slot.revision == frozen.revision
      assert slot.meal_id == option_a.meal_id

      assert Enum.map(slot.options, &{&1.meal_name, &1.position}) ==
               Enum.map(frozen.options, &{&1.meal_name, &1.position})

      assert hd(slot.rows).entry.id == entry_id
    end

    test "switching back restores the original fulfilment without creating another entry" do
      %{client: client} = covering_setup(menu: :two_options)
      today = local_today(client)
      ctx = client_ctx(client)
      {:ok, live} = Diary.get_client_nutrition_day(ctx, today)
      [option_a, option_b] = hd(live.slots).options
      planned_item_ref = hd(option_a.items).planned_item_ref

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, planned_item_ref: planned_item_ref},
                 Ecto.UUID.generate()
               )

      assert [%{rows: [%{entry: %{id: entry_id}}]}] = logged.slots

      assert {:ok, away} =
               Diary.switch_client_option(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_id: option_b.meal_id, expected_revision: 1},
                 Ecto.UUID.generate()
               )

      assert Enum.any?(hd(away.slots).rows, &(&1.status == :added and &1.entry.id == entry_id))

      assert {:ok, back} =
               Diary.switch_client_option(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_id: option_a.meal_id, expected_revision: 2},
                 Ecto.UUID.generate()
               )

      [slot] = back.slots
      assert slot.revision == 3
      assert [%{status: :as_planned, entry: entry}] = Enum.filter(slot.rows, & &1.entry)
      assert entry.id == entry_id
    end

    test "rejects a stale Diary Slot revision and an option that was not frozen" do
      %{client: client} = covering_setup(menu: :two_options)
      today = local_today(client)
      ctx = client_ctx(client)
      {:ok, live} = Diary.get_client_nutrition_day(ctx, today)
      [option_a, option_b] = hd(live.slots).options

      assert {:ok, _} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, planned_item_ref: hd(option_a.items).planned_item_ref},
                 Ecto.UUID.generate()
               )

      assert {:error, %Ecto.Changeset{action: :stale_revision, data: %DiarySlot{revision: 1}}} =
               Diary.switch_client_option(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_id: option_b.meal_id, expected_revision: 9},
                 Ecto.UUID.generate()
               )

      assert {:error, :not_found} =
               Diary.switch_client_option(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_id: Ecto.UUID.generate(), expected_revision: 1},
                 Ecto.UUID.generate()
               )
    end

    test "rejects switching on a past local date even when the slot is already frozen" do
      %{client: client} = covering_setup(menu: :two_options)
      today = local_today(client)
      ctx = client_ctx(client)
      past = Date.add(today, -1)
      {:ok, live} = Diary.get_client_nutrition_day(ctx, today)
      [option_a, option_b] = hd(live.slots).options

      assert {:ok, _} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, planned_item_ref: hd(option_a.items).planned_item_ref},
                 Ecto.UUID.generate()
               )

      slot = Repo.get_by!(DiarySlot, client_id: client.id, meal_slot: :breakfast)
      slot |> Ecto.Changeset.change(local_date: past) |> Repo.update!()

      assert {:error, :cannot_switch_past_slot} =
               Diary.switch_client_option(
                 ctx,
                 past,
                 %{meal_slot: :breakfast, meal_id: option_b.meal_id, expected_revision: 1},
                 Ecto.UUID.generate()
               )
    end

    test "does not reload Programming and keeps extras when the active option changes" do
      %{client: client, coach: coach} = covering_setup(menu: :two_options)
      today = local_today(client)
      ctx = client_ctx(client)
      extra = insert(:food, business: coach.business, creator: coach, name: "Banana")
      {:ok, live} = Diary.get_client_nutrition_day(ctx, today)
      [option_a, option_b] = hd(live.slots).options

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, planned_item_ref: hd(option_a.items).planned_item_ref},
                 Ecto.UUID.generate()
               )

      assert [%{rows: [%{entry: %{id: fulfilment_id}}]}] = logged.slots

      assert {:ok, with_extra} =
               Diary.add_client_extra(ctx, today, extra_attrs(extra, grams: 80.0), Ecto.UUID.generate())

      extra_id =
        with_extra.slots
        |> hd()
        |> Map.fetch!(:rows)
        |> Enum.find(&(&1.status == :added))
        |> Map.fetch!(:entry)
        |> Map.fetch!(:id)

      Repo.update_all(from(meal in Easy.Nutrition.Meal, where: meal.id == ^option_a.meal_id), set: [name: "Mutated A"])

      assert {:ok, switched} =
               Diary.switch_client_option(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_id: option_b.meal_id, expected_revision: 1},
                 Ecto.UUID.generate()
               )

      [slot] = switched.slots
      assert Enum.map(slot.options, & &1.meal_name) == ["Breakfast A", "Breakfast B"]
      entry_ids = slot.rows |> Enum.map(& &1.entry) |> Enum.reject(&is_nil/1) |> Enum.map(& &1.id) |> Enum.sort()
      assert entry_ids == Enum.sort([fulfilment_id, extra_id])
    end

    test "an identical retry returns the stored result and a changed payload conflicts" do
      %{client: client} = covering_setup(menu: :two_options)
      today = local_today(client)
      ctx = client_ctx(client)
      {:ok, live} = Diary.get_client_nutrition_day(ctx, today)
      [option_a, option_b] = hd(live.slots).options
      key = Ecto.UUID.generate()

      assert {:ok, _} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, planned_item_ref: hd(option_a.items).planned_item_ref},
                 Ecto.UUID.generate()
               )

      attrs = %{meal_slot: :breakfast, meal_id: option_b.meal_id, expected_revision: 1}
      assert {:ok, first} = Diary.switch_client_option(ctx, today, attrs, key)
      assert {:ok, replayed} = Diary.switch_client_option(ctx, today, attrs, key)
      assert replayed == first

      assert {:error, :conflict} =
               Diary.switch_client_option(
                 ctx,
                 today,
                 %{meal_slot: :lunch, meal_id: option_b.meal_id, expected_revision: 1},
                 key
               )
    end

    test "a failed command keeps its idempotency reservation" do
      client = insert(:client)
      today = local_today(client)
      ctx = client_ctx(client)
      key = Ecto.UUID.generate()

      assert {:error, :not_found} =
               Diary.switch_client_option(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_id: Ecto.UUID.generate(), expected_revision: 1},
                 key
               )

      assert {:error, :conflict} =
               Diary.switch_client_option(
                 ctx,
                 today,
                 %{meal_slot: :lunch, meal_id: Ecto.UUID.generate(), expected_revision: 1},
                 key
               )
    end

    test "option selection on an unstarted local day freezes offered options and activates the choice" do
      %{client: client} = covering_setup(menu: :two_options)
      today = local_today(client)
      ctx = client_ctx(client)
      {:ok, live} = Diary.get_client_nutrition_day(ctx, today)
      [_option_a, option_b] = hd(live.slots).options

      assert {:ok, day} =
               Diary.switch_client_option(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_id: option_b.meal_id, expected_revision: 1},
                 Ecto.UUID.generate()
               )

      [slot] = day.slots
      assert slot.meal_id == option_b.meal_id
      assert slot.revision == 1
      assert Enum.map(slot.options, & &1.meal_name) == ["Breakfast A", "Breakfast B"]
      assert Enum.any?(slot.rows, &(&1.status == :pending))
      refute Enum.any?(slot.rows, & &1.entry)
    end
  end

  describe "replace_client_planned_item/4" do
    test "replaces a fulfilment atomically, keeps the frozen planned item, and derives swapped" do
      %{client: client, coach: coach, food: food} = covering_setup()
      substitute = insert(:food, business: coach.business, creator: coach, name: "Eggs", calories_per_100g: 140.0)
      today = local_today(client)
      ctx = client_ctx(client)
      planned_item_ref = live_planned_item_ref(client, today)

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, planned_item_ref: planned_item_ref},
                 Ecto.UUID.generate()
               )

      [row] = hd(logged.slots).rows
      entry_id = row.entry.id
      frozen_id = row.planned.planned_item_ref
      assert row.status == :as_planned
      assert row.entry.food_id == food.id

      assert {:ok, day} =
               Diary.replace_client_planned_item(
                 ctx,
                 today,
                 %{
                   meal_slot: :breakfast,
                   planned_item_ref: planned_item_ref,
                   food_id: substitute.id,
                   portion: %{kind: :gram, grams: 80.0},
                   expected_revision: row.entry.revision
                 },
                 Ecto.UUID.generate()
               )

      [replaced] = Enum.filter(hd(day.slots).rows, & &1.entry)
      assert replaced.status == :swapped
      assert replaced.entry.id == entry_id
      assert replaced.entry.name == "Eggs"
      assert replaced.entry.food_id == substitute.id
      assert replaced.entry.portion.grams == 80.0
      assert replaced.entry.nutrients.calories == 112.0
      assert replaced.planned.planned_item_ref == frozen_id
      assert replaced.planned.food_id == food.id
      assert Repo.aggregate(Easy.Nutrition.DiaryEntry, :count) == 1
    end

    test "a same-source replacement with a different Portion stays as_planned" do
      %{client: client, food: food} = covering_setup()
      today = local_today(client)
      ctx = client_ctx(client)
      planned_item_ref = live_planned_item_ref(client, today)

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, planned_item_ref: planned_item_ref},
                 Ecto.UUID.generate()
               )

      revision = hd(logged.slots).rows |> hd() |> Map.fetch!(:entry) |> Map.fetch!(:revision)

      assert {:ok, day} =
               Diary.replace_client_planned_item(
                 ctx,
                 today,
                 %{
                   meal_slot: :breakfast,
                   planned_item_ref: planned_item_ref,
                   food_id: food.id,
                   portion: %{kind: :gram, grams: 100.0},
                   expected_revision: revision
                 },
                 Ecto.UUID.generate()
               )

      [row] = Enum.filter(hd(day.slots).rows, & &1.entry)
      assert row.status == :as_planned
      assert row.entry.food_id == food.id
      assert row.entry.portion.grams == 100.0
      assert row.entry.nutrients.calories == 200.0
    end

    test "an existing frozen past slot accepts replacement while an unstarted past slot does not" do
      %{client: client, coach: coach} = covering_setup()
      substitute = insert(:food, business: coach.business, creator: coach, name: "Eggs")
      today = local_today(client)
      ctx = client_ctx(client)
      past = Date.add(today, -1)
      planned_item_ref = live_planned_item_ref(client, today)

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, planned_item_ref: planned_item_ref},
                 Ecto.UUID.generate()
               )

      revision = hd(logged.slots).rows |> hd() |> Map.fetch!(:entry) |> Map.fetch!(:revision)
      slot = Repo.get_by!(DiarySlot, client_id: client.id, meal_slot: :breakfast)
      slot |> Ecto.Changeset.change(local_date: past) |> Repo.update!()

      frozen_id =
        DiaryFrozenPlannedItem
        |> DiaryFrozenPlannedItem.for_business(client.business_id)
        |> where([item], item.nutrition_diary_slot_id == ^slot.id)
        |> Repo.one!()
        |> Map.fetch!(:id)

      assert {:ok, day} =
               Diary.replace_client_planned_item(
                 ctx,
                 past,
                 %{
                   meal_slot: :breakfast,
                   planned_item_ref: frozen_id,
                   food_id: substitute.id,
                   portion: %{kind: :gram, grams: 80.0},
                   expected_revision: revision
                 },
                 Ecto.UUID.generate()
               )

      assert Enum.any?(hd(day.slots).rows, &(&1.status == :swapped))

      assert {:error, :cannot_start_past_slot} =
               Diary.replace_client_planned_item(
                 ctx,
                 Date.add(today, -2),
                 %{
                   meal_slot: :breakfast,
                   planned_item_ref: frozen_id,
                   food_id: substitute.id,
                   portion: %{kind: :gram, grams: 80.0},
                   expected_revision: 1
                 },
                 Ecto.UUID.generate()
               )
    end

    test "rejects a future date and a changed idempotency payload" do
      %{client: client, coach: coach} = covering_setup()
      substitute = insert(:food, business: coach.business, creator: coach, name: "Eggs")
      today = local_today(client)
      ctx = client_ctx(client)
      planned_item_ref = live_planned_item_ref(client, today)
      key = Ecto.UUID.generate()

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, planned_item_ref: planned_item_ref},
                 Ecto.UUID.generate()
               )

      revision = hd(logged.slots).rows |> hd() |> Map.fetch!(:entry) |> Map.fetch!(:revision)

      attrs = %{
        meal_slot: :breakfast,
        planned_item_ref: planned_item_ref,
        food_id: substitute.id,
        portion: %{kind: :gram, grams: 80.0},
        expected_revision: revision
      }

      assert {:error, :future_date} =
               Diary.replace_client_planned_item(ctx, Date.add(today, 1), attrs, Ecto.UUID.generate())

      assert {:ok, first} = Diary.replace_client_planned_item(ctx, today, attrs, key)
      assert {:ok, replay} = Diary.replace_client_planned_item(ctx, today, attrs, key)
      assert hd(replay.slots).rows == hd(first.slots).rows

      assert {:error, :conflict} =
               Diary.replace_client_planned_item(
                 ctx,
                 today,
                 Map.put(attrs, :portion, %{kind: :gram, grams: 90.0}),
                 key
               )
    end

    test "a stale replacement reserves its idempotency key" do
      %{client: client, coach: coach} = covering_setup()
      substitute = insert(:food, business: coach.business, creator: coach, name: "Eggs")
      today = local_today(client)
      ctx = client_ctx(client)
      planned_item_ref = live_planned_item_ref(client, today)
      key = Ecto.UUID.generate()

      attrs = %{
        meal_slot: :breakfast,
        planned_item_ref: planned_item_ref,
        food_id: substitute.id,
        portion: %{kind: :gram, grams: 80.0},
        expected_revision: 2
      }

      assert {:error, %Ecto.Changeset{action: :stale_revision}} =
               Diary.replace_client_planned_item(ctx, today, attrs, key)

      assert {:error, :conflict} =
               Diary.replace_client_planned_item(
                 ctx,
                 today,
                 Map.put(attrs, :portion, %{kind: :gram, grams: 90.0}),
                 key
               )
    end
  end
end
