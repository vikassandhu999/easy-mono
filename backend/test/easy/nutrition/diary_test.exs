defmodule Easy.Nutrition.DiaryTest do
  use Easy.DataCase, async: true

  alias Easy.LocalCalendar

  alias Easy.Nutrition.{
    Diary,
    DiaryEntry,
    DiaryFrozenPlannedItem,
    DiarySlot,
    Library,
    Plan,
    Programming,
    WeekSchedule
  }

  alias Easy.Repo

  import Ecto.Query

  describe "get_client_nutrition_day/2" do
    test "returns live Meal Options for an unstarted slot on the client's local day" do
      %{client: client, food: food, plan: plan} = covering_setup()
      today = local_today(client)

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)

      assert day.date == today
      assert day.plan_id == plan.id
      assert day.write_eligible == true
      assert day.targets.calories == plan.target_calories
      refute Enum.any?(day.slots, fn slot -> Enum.any?(slot.rows, &(&1.status in [:pending, :skipped])) end)

      [slot] = day.slots
      assert slot.meal_slot == :breakfast
      assert slot.rows == []
      [option] = slot.options
      assert option.meal_name == "Breakfast"
      [item] = option.items
      assert item.name == food.name
      assert item.kind == :food
    end

    test "returns a successful Nutrition Day with no live guidance when Coverage is missing" do
      client = insert(:client)
      today = local_today(client)

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)
      assert day.date == today
      assert day.plan_id == nil
      assert day.targets == %{calories: nil, protein_g: nil, carbs_g: nil, fat_g: nil, fiber_g: nil}
      assert day.slots == []
      assert day.write_eligible == true
    end

    test "does not join mutable Programming for a past local date with no frozen Diary rows" do
      %{client: client, plan: plan} = covering_setup(start_offset: -7)
      past = Date.add(local_today(client), -1)

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), past)
      assert day.date == past
      assert day.plan_id == nil
      assert day.slots == []
      assert day.write_eligible == true
      assert Repo.get!(Easy.Nutrition.Plan, plan.id).start_date != nil
    end

    test "orders ordinary Meal Slots before the workout group regardless of stored option order" do
      %{client: client} = covering_setup(menu: :ordered)
      today = local_today(client)

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)
      assert Enum.map(day.slots, & &1.meal_slot) == [:breakfast, :post_workout]
    end

    test "lets a future local date be read as live guidance that is write-ineligible" do
      %{client: client, plan: plan} = covering_setup()
      future = Date.add(local_today(client), 1)

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), future)
      assert day.plan_id == plan.id
      assert [%{meal_slot: :breakfast, rows: []}] = day.slots
      assert day.write_eligible == false
    end

    test "identifies today from the Client timezone with Business fallback" do
      business = insert(:business, timezone: "Pacific/Kiritimati")
      coach = insert(:coach, business: business)

      client =
        insert(:client,
          business: business,
          creator: coach,
          assigned_coach: coach,
          timezone: "UTC"
        )

      utc_today = LocalCalendar.to_local_date(DateTime.utc_now(), "UTC")
      assert {:ok, %{count: 1, nutrition_days: [day]}} = Diary.list_client_nutrition_days(client_ctx(client), [])
      assert day.date == utc_today

      Repo.update_all(from(c in Easy.Clients.Client, where: c.id == ^client.id), set: [timezone: ""])
      client = Repo.get!(Easy.Clients.Client, client.id) |> Repo.preload(:business)
      kiritimati_today = LocalCalendar.to_local_date(DateTime.utc_now(), "Pacific/Kiritimati")

      assert {:ok, %{nutrition_days: [fallback]}} = Diary.list_client_nutrition_days(client_ctx(client), [])
      assert fallback.date == kiritimati_today
    end

    test "does not read leftover meal-log rows as Nutrition Day intake" do
      %{client: client, coach: coach, food: food} = covering_setup()
      today = local_today(client)

      log =
        insert(:meal_log,
          client: client,
          business: coach.business,
          date: today,
          meal_slot: "breakfast"
        )

      insert(:food_log_entry,
        meal_log: log,
        business: coach.business,
        food: food,
        food_name: "Leftover oats"
      )

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)
      assert [%{rows: []}] = day.slots
    end
  end

  describe "add_client_extra/4" do
    test "first same-day extra under Coverage freezes every offered option and reports added" do
      %{client: client, coach: coach, food: food} = covering_setup(menu: :two_options)
      extra = insert(:food, business: coach.business, creator: coach, name: "Banana")
      today = local_today(client)

      assert {:ok, day} =
               Diary.add_client_extra(client_ctx(client), today, extra_attrs(extra, grams: 80.0), Ecto.UUID.generate())

      [slot] = Enum.filter(day.slots, &(&1.meal_slot == :breakfast))
      assert Enum.map(slot.options, & &1.meal_name) == ["Breakfast A", "Breakfast B"]
      assert Enum.map(hd(slot.options).items, & &1.name) == [food.name]
      assert Enum.any?(slot.rows, &(&1.status == :pending && &1.planned && &1.planned.name == food.name))
      assert extra_row = Enum.find(slot.rows, &(&1.status == :added))
      assert extra_row.entry.name == "Banana"
      assert extra_row.entry.portion.grams == 80.0
      assert extra_row.entry.nutrients.calories == 160.0
    end

    test "an extra without Coverage creates a slot with no frozen options and is recorded" do
      client = insert(:client)
      food = insert(:food, business: client.business, name: "Yogurt")
      today = local_today(client)

      assert {:ok, day} =
               Diary.add_client_extra(client_ctx(client), today, extra_attrs(food), Ecto.UUID.generate())

      [slot] = day.slots
      assert slot.meal_slot == :breakfast
      assert slot.options == []
      assert [%{status: :recorded, entry: entry}] = slot.rows
      assert entry.name == food.name
      assert entry.food_id == food.id
    end

    test "an unstarted past date in the correction window records an extra without consulting Programming" do
      %{client: client, plan: plan} = covering_setup(start_offset: -7)
      food = insert(:food, business: client.business, name: "Apple")
      past = Date.add(local_today(client), -1)

      assert {:ok, day} =
               Diary.add_client_extra(client_ctx(client), past, extra_attrs(food), Ecto.UUID.generate())

      assert day.plan_id == nil
      assert [%{options: [], rows: [%{status: :recorded}]}] = day.slots
      assert Repo.get!(Easy.Nutrition.Plan, plan.id).start_date != nil
    end

    test "repeated extras of the same Food create distinct Diary Entries" do
      client = insert(:client)
      food = insert(:food, business: client.business, name: "Almonds")
      today = local_today(client)
      attrs = extra_attrs(food, grams: 20.0)

      assert {:ok, first} = Diary.add_client_extra(client_ctx(client), today, attrs, Ecto.UUID.generate())
      assert {:ok, second} = Diary.add_client_extra(client_ctx(client), today, attrs, Ecto.UUID.generate())

      ids =
        second.slots
        |> hd()
        |> Map.fetch!(:rows)
        |> Enum.map(& &1.entry.id)

      assert length(ids) == 2
      assert ids == Enum.uniq(ids)
      assert length(hd(first.slots).rows) == 1
    end

    test "accepts today and the previous seven local dates including the seventh prior date" do
      client = insert(:client)
      food = insert(:food, business: client.business)
      today = local_today(client)

      Enum.each(0..7, fn offset ->
        date = Date.add(today, -offset)

        assert {:ok, day} =
                 Diary.add_client_extra(client_ctx(client), date, extra_attrs(food, slot: :lunch), Ecto.UUID.generate())

        assert day.date == date
        assert day.write_eligible == true
      end)
    end

    test "rejects a future local date and a date eight days before today" do
      client = insert(:client)
      food = insert(:food, business: client.business)
      today = local_today(client)

      assert {:error, :future_date} =
               Diary.add_client_extra(
                 client_ctx(client),
                 Date.add(today, 1),
                 extra_attrs(food),
                 Ecto.UUID.generate()
               )

      assert {:error, :outside_correction_window} =
               Diary.add_client_extra(
                 client_ctx(client),
                 Date.add(today, -8),
                 extra_attrs(food),
                 Ecto.UUID.generate()
               )
    end

    test "an identical idempotency retry returns the stored result" do
      client = insert(:client)
      food = insert(:food, business: client.business, name: "Rice")
      today = local_today(client)
      key = Ecto.UUID.generate()
      attrs = extra_attrs(food)

      assert {:ok, first} = Diary.add_client_extra(client_ctx(client), today, attrs, key)
      assert {:ok, replay} = Diary.add_client_extra(client_ctx(client), today, attrs, key)

      [entry] = hd(first.slots).rows
      [again] = hd(replay.slots).rows
      assert again.entry.id == entry.entry.id
      assert length(hd(replay.slots).rows) == 1
    end

    test "reusing a key with a different payload returns a conflict" do
      client = insert(:client)
      food = insert(:food, business: client.business)
      other = insert(:food, business: client.business, name: "Other")
      today = local_today(client)
      key = Ecto.UUID.generate()

      assert {:ok, _} = Diary.add_client_extra(client_ctx(client), today, extra_attrs(food), key)

      assert {:error, :conflict} =
               Diary.add_client_extra(client_ctx(client), today, extra_attrs(other), key)
    end

    test "ledger lookup returns the stored result after the date leaves the correction window" do
      client = insert(:client)
      food = insert(:food, business: client.business)
      today = local_today(client)
      key = Ecto.UUID.generate()
      attrs = extra_attrs(food)

      assert {:ok, first} = Diary.add_client_extra(client_ctx(client), today, attrs, key)

      stale = Date.add(today, -8)
      ledger = Repo.get_by!(Easy.Nutrition.DiaryCommandLedger, idempotency_key: key)

      ledger
      |> Ecto.Changeset.change(fingerprint: Easy.Nutrition.DiaryCommandLedger.fingerprint("POST", extra_path(stale), extra_payload(attrs)))
      |> Repo.update!()

      assert {:ok, replay} = Diary.add_client_extra(client_ctx(client), stale, attrs, key)

      assert hd(replay.slots).rows |> hd() |> Map.fetch!(:entry) |> Map.fetch!(:id) ==
               hd(first.slots).rows |> hd() |> Map.fetch!(:entry) |> Map.fetch!(:id)
    end

    test "coaches and inactive clients cannot add extras" do
      %{client: client, coach: coach, food: food} = covering_setup()
      today = local_today(client)

      assert {:error, :not_found} =
               Diary.add_client_extra(trainer_ctx(coach), today, extra_attrs(food), Ecto.UUID.generate())

      inactive = insert(:client, status: :inactive, business: client.business)
      extra = insert(:food, business: inactive.business)

      assert {:error, :client_inactive} =
               Diary.add_client_extra(client_ctx(inactive), today, extra_attrs(extra), Ecto.UUID.generate())
    end

    test "bounded cleanup removes ledger rows older than 30 days" do
      client = insert(:client)
      food = insert(:food, business: client.business)
      today = local_today(client)
      key = Ecto.UUID.generate()

      assert {:ok, _} = Diary.add_client_extra(client_ctx(client), today, extra_attrs(food), key)

      ledger = Repo.get_by!(Easy.Nutrition.DiaryCommandLedger, idempotency_key: key)

      ledger
      |> Ecto.Changeset.change(expires_at: DateTime.add(DateTime.utc_now(:second), -1, :day))
      |> Repo.update!()

      assert {:ok, 1} = Diary.purge_expired_command_ledger()
      assert Repo.get(Easy.Nutrition.DiaryCommandLedger, ledger.id) == nil
    end
  end

  describe "log_client_planned_item/4" do
    test "logs one planned item as as_planned and freezes the slot on the local day" do
      %{client: client, food: food} = covering_setup()
      today = local_today(client)
      meal_item_id = live_meal_item_id(client, today)

      assert {:ok, day} =
               Diary.log_client_planned_item(
                 client_ctx(client),
                 today,
                 %{meal_slot: :breakfast, meal_item_id: meal_item_id},
                 Ecto.UUID.generate()
               )

      [slot] = day.slots
      assert slot.meal_slot == :breakfast
      assert Enum.any?(slot.options, &(&1.meal_name == "Breakfast"))
      assert [%{status: :as_planned, planned: planned, entry: entry}] = slot.rows
      assert planned.name == food.name
      assert entry.name == food.name
      assert entry.food_id == food.id
      assert entry.portion.grams == planned.portion.grams
      assert entry.nutrients.calories == planned.nutrients.calories
    end

    test "a second distinct command for the same planned item stores an added extra" do
      %{client: client} = covering_setup()
      today = local_today(client)
      meal_item_id = live_meal_item_id(client, today)
      attrs = %{meal_slot: :breakfast, meal_item_id: meal_item_id}

      assert {:ok, _} = Diary.log_client_planned_item(client_ctx(client), today, attrs, Ecto.UUID.generate())

      assert {:ok, day} =
               Diary.log_client_planned_item(client_ctx(client), today, attrs, Ecto.UUID.generate())

      statuses = day.slots |> hd() |> Map.fetch!(:rows) |> Enum.map(& &1.status) |> Enum.sort()
      assert statuses == [:added, :as_planned]
    end

    test "two planned items sharing one Food stay distinct fulfilments" do
      %{client: client, food: food} = covering_setup(menu: :two_same_food)
      today = local_today(client)

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)
      item_ids = day.slots |> hd() |> Map.fetch!(:options) |> hd() |> Map.fetch!(:items) |> Enum.map(& &1.meal_item_id)
      assert length(item_ids) == 2

      Enum.each(item_ids, fn meal_item_id ->
        assert {:ok, _} =
                 Diary.log_client_planned_item(
                   client_ctx(client),
                   today,
                   %{meal_slot: :breakfast, meal_item_id: meal_item_id},
                   Ecto.UUID.generate()
                 )
      end)

      assert {:ok, logged} = Diary.get_client_nutrition_day(client_ctx(client), today)
      rows = hd(logged.slots).rows
      assert Enum.map(rows, & &1.status) == [:as_planned, :as_planned]
      assert Enum.map(rows, & &1.planned.food_id) == [food.id, food.id]
      assert Enum.map(rows, & &1.planned.meal_item_id) |> Enum.uniq() |> length() == 2
    end

    test "rejects creating a past unstarted slot and accepts fulfilment on an already frozen past slot" do
      %{client: client, coach: coach} = covering_setup(start_offset: -7)
      today = local_today(client)
      past = Date.add(today, -1)
      meal_item_id = live_meal_item_id(client, today)
      extra = insert(:food, business: coach.business, creator: coach, name: "Banana")

      assert {:error, :cannot_start_past_slot} =
               Diary.log_client_planned_item(
                 client_ctx(client),
                 past,
                 %{meal_slot: :breakfast, meal_item_id: meal_item_id},
                 Ecto.UUID.generate()
               )

      assert {:ok, _} =
               Diary.add_client_extra(client_ctx(client), today, extra_attrs(extra), Ecto.UUID.generate())

      slot = Repo.get_by!(DiarySlot, client_id: client.id, meal_slot: :breakfast)
      slot |> Ecto.Changeset.change(local_date: past) |> Repo.update!()

      frozen_id =
        DiaryFrozenPlannedItem
        |> DiaryFrozenPlannedItem.for_business(client.business_id)
        |> where([item], item.nutrition_diary_slot_id == ^slot.id)
        |> Repo.one!()
        |> Map.fetch!(:id)

      assert {:ok, day} =
               Diary.log_client_planned_item(
                 client_ctx(client),
                 past,
                 %{meal_slot: :breakfast, meal_item_id: frozen_id},
                 Ecto.UUID.generate()
               )

      assert day.date == past
      assert Enum.any?(hd(day.slots).rows, &(&1.status == :as_planned && &1.planned.meal_item_id == frozen_id))
    end

    test "an identical planned-item retry returns the stored result" do
      %{client: client} = covering_setup()
      today = local_today(client)
      meal_item_id = live_meal_item_id(client, today)
      key = Ecto.UUID.generate()
      attrs = %{meal_slot: :breakfast, meal_item_id: meal_item_id}

      assert {:ok, first} = Diary.log_client_planned_item(client_ctx(client), today, attrs, key)
      assert {:ok, replay} = Diary.log_client_planned_item(client_ctx(client), today, attrs, key)

      assert hd(replay.slots).rows == hd(first.slots).rows
    end
  end

  describe "log_client_planned_option/4" do
    test "logs every remaining active-option item and is safe to retry" do
      %{client: client, food: food} = covering_setup(menu: :two_same_food)
      today = local_today(client)
      attrs = %{meal_slot: :breakfast}

      assert {:ok, day} =
               Diary.log_client_planned_option(client_ctx(client), today, attrs, Ecto.UUID.generate())

      rows = hd(day.slots).rows
      assert length(rows) == 2
      assert Enum.all?(rows, &(&1.status == :as_planned))
      assert Enum.all?(rows, &(&1.planned.food_id == food.id))

      assert {:ok, again} =
               Diary.log_client_planned_option(client_ctx(client), today, attrs, Ecto.UUID.generate())

      assert Enum.map(hd(again.slots).rows, & &1.entry.id) == Enum.map(rows, & &1.entry.id)
    end

    test "skips already fulfilled items when logging the rest of an option" do
      %{client: client} = covering_setup(menu: :two_same_food)
      today = local_today(client)
      [first, _second] = live_meal_item_ids(client, today)

      assert {:ok, _} =
               Diary.log_client_planned_item(
                 client_ctx(client),
                 today,
                 %{meal_slot: :breakfast, meal_item_id: first},
                 Ecto.UUID.generate()
               )

      assert {:ok, day} =
               Diary.log_client_planned_option(
                 client_ctx(client),
                 today,
                 %{meal_slot: :breakfast},
                 Ecto.UUID.generate()
               )

      assert length(hd(day.slots).rows) == 2
      assert Enum.all?(hd(day.slots).rows, &(&1.status == :as_planned))
    end
  end

  describe "log_client_planned_day/3" do
    test "logs every scheduled active option for the day" do
      %{client: client} = covering_setup(menu: :ordered)
      today = local_today(client)

      assert {:ok, day} =
               Diary.log_client_planned_day(client_ctx(client), today, Ecto.UUID.generate())

      assert Enum.map(day.slots, & &1.meal_slot) == [:breakfast, :post_workout]
      assert Enum.all?(day.slots, fn slot -> Enum.all?(slot.rows, &(&1.status == :as_planned)) end)
    end

    test "a day retry inserts nothing twice" do
      %{client: client} = covering_setup(menu: :ordered)
      today = local_today(client)

      assert {:ok, first} = Diary.log_client_planned_day(client_ctx(client), today, Ecto.UUID.generate())
      assert {:ok, second} = Diary.log_client_planned_day(client_ctx(client), today, Ecto.UUID.generate())

      first_ids = first.slots |> Enum.flat_map(& &1.rows) |> Enum.map(& &1.entry.id) |> Enum.sort()
      second_ids = second.slots |> Enum.flat_map(& &1.rows) |> Enum.map(& &1.entry.id) |> Enum.sort()
      assert second_ids == first_ids
    end
  end

  describe "derived planned statuses" do
    test "unfulfilled active items are pending today and skipped after the local date ends" do
      %{client: client, food: food} = covering_setup()
      today = local_today(client)
      extra = insert(:food, business: client.business, name: "Banana")

      assert {:ok, day} =
               Diary.add_client_extra(client_ctx(client), today, extra_attrs(extra), Ecto.UUID.generate())

      assert Enum.any?(hd(day.slots).rows, &(&1.status == :pending && &1.planned.name == food.name))

      slot = Repo.get_by!(Easy.Nutrition.DiarySlot, client_id: client.id, meal_slot: :breakfast)
      past = Date.add(today, -1)
      slot |> Ecto.Changeset.change(local_date: past) |> Repo.update!()

      assert {:ok, past_day} = Diary.get_client_nutrition_day(client_ctx(client), past)
      assert Enum.any?(hd(past_day.slots).rows, &(&1.status == :skipped && &1.planned.name == food.name))
    end
  end

  describe "switch_client_option/4" do
    test "switches the active frozen option on the same local day without deleting intake" do
      %{client: client, food: food} = covering_setup(menu: :two_options)
      today = local_today(client)
      ctx = client_ctx(client)

      assert {:ok, live} = Diary.get_client_nutrition_day(ctx, today)
      [option_a, option_b] = hd(live.slots).options
      meal_item_id = hd(option_a.items).meal_item_id

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_item_id: meal_item_id},
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
      meal_item_id = hd(option_a.items).meal_item_id

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_item_id: meal_item_id},
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
      meal_item_id = hd(option_a.items).meal_item_id

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_item_id: meal_item_id},
                 Ecto.UUID.generate()
               )

      entry_id = logged.slots |> hd() |> Map.fetch!(:rows) |> hd() |> Map.fetch!(:entry) |> Map.fetch!(:id)

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
                 %{meal_slot: :breakfast, meal_item_id: hd(option_a.items).meal_item_id},
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
                 %{meal_slot: :breakfast, meal_item_id: hd(option_a.items).meal_item_id},
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
                 %{meal_slot: :breakfast, meal_item_id: hd(option_a.items).meal_item_id},
                 Ecto.UUID.generate()
               )

      fulfilment_id = logged.slots |> hd() |> Map.fetch!(:rows) |> hd() |> Map.fetch!(:entry) |> Map.fetch!(:id)

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
                 %{meal_slot: :breakfast, meal_item_id: hd(option_a.items).meal_item_id},
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
      meal_item_id = live_meal_item_id(client, today)

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_item_id: meal_item_id},
                 Ecto.UUID.generate()
               )

      [row] = hd(logged.slots).rows
      entry_id = row.entry.id
      frozen_id = row.planned.meal_item_id
      assert row.status == :as_planned
      assert row.entry.food_id == food.id

      assert {:ok, day} =
               Diary.replace_client_planned_item(
                 ctx,
                 today,
                 %{
                   meal_slot: :breakfast,
                   meal_item_id: meal_item_id,
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
      assert replaced.planned.meal_item_id == frozen_id
      assert replaced.planned.food_id == food.id
      assert Repo.aggregate(Easy.Nutrition.DiaryEntry, :count) == 1
    end

    test "a same-source replacement with a different Portion stays as_planned" do
      %{client: client, food: food} = covering_setup()
      today = local_today(client)
      ctx = client_ctx(client)
      meal_item_id = live_meal_item_id(client, today)

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_item_id: meal_item_id},
                 Ecto.UUID.generate()
               )

      revision = hd(logged.slots).rows |> hd() |> Map.fetch!(:entry) |> Map.fetch!(:revision)

      assert {:ok, day} =
               Diary.replace_client_planned_item(
                 ctx,
                 today,
                 %{
                   meal_slot: :breakfast,
                   meal_item_id: meal_item_id,
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
      meal_item_id = live_meal_item_id(client, today)

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_item_id: meal_item_id},
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
                   meal_item_id: frozen_id,
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
                   meal_item_id: frozen_id,
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
      meal_item_id = live_meal_item_id(client, today)
      key = Ecto.UUID.generate()

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_item_id: meal_item_id},
                 Ecto.UUID.generate()
               )

      revision = hd(logged.slots).rows |> hd() |> Map.fetch!(:entry) |> Map.fetch!(:revision)

      attrs = %{
        meal_slot: :breakfast,
        meal_item_id: meal_item_id,
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
  end

  describe "update_client_entry/5" do
    test "scales frozen nutrients from the stored basis without consulting Library" do
      %{client: client, food: food} = covering_setup()
      today = local_today(client)
      ctx = client_ctx(client)
      meal_item_id = live_meal_item_id(client, today)

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_item_id: meal_item_id},
                 Ecto.UUID.generate()
               )

      entry = hd(logged.slots).rows |> hd() |> Map.fetch!(:entry)
      assert entry.nutrients.calories == 100.0

      Repo.update_all(from(f in Easy.Nutrition.Food, where: f.id == ^food.id), set: [calories_per_100g: 9_000.0])

      assert {:ok, day} =
               Diary.update_client_entry(
                 ctx,
                 today,
                 entry.id,
                 %{
                   expected_revision: entry.revision,
                   portion: %{kind: :gram, grams: 25.0},
                   notes: "half"
                 },
                 Ecto.UUID.generate()
               )

      [row] = Enum.filter(hd(day.slots).rows, & &1.entry)
      assert row.status == :as_planned
      assert row.entry.id == entry.id
      assert row.entry.revision == entry.revision + 1
      assert row.entry.portion.grams == 25.0
      assert row.entry.nutrients.calories == 50.0
      assert row.entry.notes == "half"
    end

    test "rejects a stale entry revision and leaves the row unchanged" do
      client = insert(:client)
      food = insert(:food, business: client.business)
      today = local_today(client)
      ctx = client_ctx(client)

      assert {:ok, logged} = Diary.add_client_extra(ctx, today, extra_attrs(food), Ecto.UUID.generate())
      entry = hd(logged.slots).rows |> hd() |> Map.fetch!(:entry)

      assert {:error, %Ecto.Changeset{action: :stale_revision, data: %Easy.Nutrition.DiaryEntry{revision: 1}}} =
               Diary.update_client_entry(
                 ctx,
                 today,
                 entry.id,
                 %{expected_revision: 9, portion: %{kind: :gram, grams: 10.0}},
                 Ecto.UUID.generate()
               )

      assert {:ok, day} = Diary.get_client_nutrition_day(ctx, today)
      assert hd(day.slots).rows |> hd() |> Map.fetch!(:entry) |> Map.fetch!(:portion) |> Map.fetch!(:grams) == 50.0
    end

    test "an existing slot uses applied_timezone for the correction deadline" do
      client = insert(:client, timezone: "UTC")
      food = insert(:food, business: client.business)
      ctx = client_ctx(client)
      utc_today = LocalCalendar.to_local_date(DateTime.utc_now(), "UTC")

      assert {:ok, logged} = Diary.add_client_extra(ctx, utc_today, extra_attrs(food), Ecto.UUID.generate())
      entry = hd(logged.slots).rows |> hd() |> Map.fetch!(:entry)
      date = Date.add(utc_today, -7)

      slot = Repo.get_by!(DiarySlot, client_id: client.id, meal_slot: :breakfast)

      slot
      |> Ecto.Changeset.change(local_date: date, applied_timezone: "UTC")
      |> Repo.update!()

      Repo.update_all(from(c in Easy.Clients.Client, where: c.id == ^client.id), set: [timezone: "Pacific/Kiritimati"])

      assert {:ok, day} =
               Diary.update_client_entry(
                 ctx,
                 date,
                 entry.id,
                 %{expected_revision: entry.revision, notes: "kept"},
                 Ecto.UUID.generate()
               )

      assert hd(day.slots).rows |> hd() |> Map.fetch!(:entry) |> Map.fetch!(:notes) == "kept"
    end

    test "replays an identical update after the correction window closes" do
      client = insert(:client)
      food = insert(:food, business: client.business)
      today = local_today(client)
      ctx = client_ctx(client)
      key = Ecto.UUID.generate()

      assert {:ok, logged} = Diary.add_client_extra(ctx, today, extra_attrs(food), Ecto.UUID.generate())
      entry = hd(logged.slots).rows |> hd() |> Map.fetch!(:entry)
      attrs = %{expected_revision: entry.revision, notes: "retry"}

      assert {:ok, first} = Diary.update_client_entry(ctx, today, entry.id, attrs, key)

      stale = Date.add(today, -8)
      ledger = Repo.get_by!(Easy.Nutrition.DiaryCommandLedger, idempotency_key: key)

      ledger
      |> Ecto.Changeset.change(
        fingerprint:
          Easy.Nutrition.DiaryCommandLedger.fingerprint(
            "PATCH",
            "/v1/client/nutrition-days/#{Date.to_iso8601(stale)}/entries/#{entry.id}",
            %{expected_revision: entry.revision, portion: nil, notes: "retry"}
          )
      )
      |> Repo.update!()

      assert {:ok, replay} = Diary.update_client_entry(ctx, stale, entry.id, attrs, key)

      assert hd(replay.slots).rows |> hd() |> Map.fetch!(:entry) |> Map.fetch!(:id) ==
               hd(first.slots).rows |> hd() |> Map.fetch!(:entry) |> Map.fetch!(:id)
    end
  end

  describe "delete_client_entry/5" do
    test "deletes at the expected revision and leaves the slot and frozen guidance" do
      %{client: client, food: food} = covering_setup()
      today = local_today(client)
      ctx = client_ctx(client)
      meal_item_id = live_meal_item_id(client, today)

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_item_id: meal_item_id},
                 Ecto.UUID.generate()
               )

      [slot] = logged.slots
      entry_id = hd(slot.rows).entry.id
      option_names = Enum.map(slot.options, & &1.meal_name)

      assert {:ok, day} =
               Diary.delete_client_entry(
                 ctx,
                 today,
                 entry_id,
                 %{expected_revision: 1},
                 Ecto.UUID.generate()
               )

      [remaining] = day.slots
      assert remaining.revision == slot.revision
      assert Enum.map(remaining.options, & &1.meal_name) == option_names
      assert Enum.any?(remaining.rows, &(&1.status == :pending && &1.planned.name == food.name))
      refute Enum.any?(remaining.rows, &(&1.entry && &1.entry.id == entry_id))
      assert Repo.get(Easy.Nutrition.DiaryEntry, entry_id) == nil
      assert Repo.get_by!(DiarySlot, client_id: client.id, meal_slot: :breakfast)
    end

    test "accepts today and the previous seven dates and rejects the eighth and the future" do
      client = insert(:client)
      food = insert(:food, business: client.business)
      today = local_today(client)
      ctx = client_ctx(client)

      Enum.each(0..7, fn offset ->
        date = Date.add(today, -offset)

        assert {:ok, logged} =
                 Diary.add_client_extra(ctx, date, extra_attrs(food, slot: :lunch), Ecto.UUID.generate())

        entry = hd(logged.slots).rows |> hd() |> Map.fetch!(:entry)

        assert {:ok, day} =
                 Diary.delete_client_entry(
                   ctx,
                   date,
                   entry.id,
                   %{expected_revision: entry.revision},
                   Ecto.UUID.generate()
                 )

        assert day.date == date
        assert day.write_eligible == true
      end)

      eighth = Date.add(today, -8)

      assert {:ok, logged} = Diary.add_client_extra(ctx, today, extra_attrs(food), Ecto.UUID.generate())
      entry = hd(logged.slots).rows |> hd() |> Map.fetch!(:entry)
      slot = Repo.get_by!(DiarySlot, client_id: client.id, meal_slot: :breakfast)
      slot |> Ecto.Changeset.change(local_date: eighth) |> Repo.update!()

      assert {:error, :outside_correction_window} =
               Diary.delete_client_entry(
                 ctx,
                 eighth,
                 entry.id,
                 %{expected_revision: entry.revision},
                 Ecto.UUID.generate()
               )
    end
  end

  describe "coach and owner reads" do
    test "return the same Nutrition Day as the client" do
      %{client: client, coach: coach, plan: plan} = covering_setup()
      today = local_today(client)
      business = Repo.preload(coach.business, :owner)
      insert(:coach, user: business.owner, business: business)

      assert {:ok, client_day} = Diary.get_client_nutrition_day(client_ctx(client), today)
      assert {:ok, coach_day} = Diary.get_nutrition_day_for_client(trainer_ctx(coach), client.id, today)
      assert {:ok, owner_day} = Diary.get_nutrition_day_for_client(owner_ctx(business), client.id, today)

      assert client_day.plan_id == plan.id
      assert coach_day == client_day
      assert owner_day == client_day
    end

    test "conceals another tenant's client" do
      %{client: client} = covering_setup()
      other = insert(:coach)

      assert {:error, :not_found} =
               Diary.get_nutrition_day_for_client(trainer_ctx(other), client.id, local_today(client))
    end

    test "conceals a client the coach does not coach" do
      %{client: client, coach: coach} = covering_setup()
      peer = insert(:coach, business: coach.business)

      assert {:error, :not_found} =
               Diary.get_nutrition_day_for_client(trainer_ctx(peer), client.id, local_today(client))
    end

    test "coaches cannot create, replace, update, delete, or switch client Diary data" do
      %{client: client, coach: coach, food: food} = covering_setup(menu: :two_options)
      today = local_today(client)
      ctx = client_ctx(client)
      extra = insert(:food, business: coach.business, creator: coach, name: "Banana")

      assert {:ok, logged} = Diary.add_client_extra(ctx, today, extra_attrs(food), Ecto.UUID.generate())
      slot = hd(logged.slots)
      entry = hd(Enum.filter(slot.rows, & &1.entry)).entry
      option_b = Enum.at(slot.options, 1)
      coach_ctx = trainer_ctx(coach)
      key = Ecto.UUID.generate()

      assert {:error, :not_found} =
               Diary.add_client_extra(coach_ctx, today, extra_attrs(extra), key)

      assert {:error, :not_found} =
               Diary.replace_client_planned_item(
                 coach_ctx,
                 today,
                 Map.merge(extra_attrs(extra), %{meal_item_id: hd(hd(slot.options).items).meal_item_id, expected_revision: 1}),
                 key
               )

      assert {:error, :not_found} =
               Diary.update_client_entry(coach_ctx, today, entry.id, %{expected_revision: 1}, key)

      assert {:error, :not_found} =
               Diary.delete_client_entry(coach_ctx, today, entry.id, %{expected_revision: 1}, key)

      assert {:error, :not_found} =
               Diary.switch_client_option(
                 coach_ctx,
                 today,
                 %{meal_slot: :breakfast, meal_id: option_b.meal_id, expected_revision: slot.revision},
                 key
               )
    end
  end

  describe "list_client_nutrition_days/2" do
    test "paginates a bounded local-date range and reports the full count" do
      client = insert(:client)
      from_date = ~D[2026-08-01]
      to_date = ~D[2026-08-05]

      assert {:ok, %{count: 5, nutrition_days: days}} =
               Diary.list_client_nutrition_days(client_ctx(client),
                 from: from_date,
                 to: to_date,
                 offset: 1,
                 limit: 2
               )

      assert Enum.map(days, & &1.date) == [~D[2026-08-02], ~D[2026-08-03]]
    end

    test "rejects reversed, incomplete, and oversized local-date ranges" do
      client = insert(:client)
      ctx = client_ctx(client)

      assert {:error, :invalid_date_range} =
               Diary.list_client_nutrition_days(ctx, from: ~D[2026-08-10], to: ~D[2026-08-01])

      assert {:error, :incomplete_date_range} = Diary.list_client_nutrition_days(ctx, from: ~D[2026-08-01])
      assert {:error, :incomplete_date_range} = Diary.list_client_nutrition_days(ctx, to: ~D[2026-08-01])

      assert {:error, :date_range_too_wide} =
               Diary.list_client_nutrition_days(ctx, from: ~D[2026-08-01], to: ~D[2026-09-01])
    end

    test "past dates in a range never join mutable Programming" do
      %{client: client, plan: plan} = covering_setup(start_offset: -7)
      past = Date.add(local_today(client), -1)

      assert {:ok, %{nutrition_days: [day]}} =
               Diary.list_client_nutrition_days(client_ctx(client), from: past, to: past)

      assert day.date == past
      assert day.plan_id == nil
      assert day.slots == []
      assert Repo.get!(Plan, plan.id)
    end
  end

  describe "Nutrition Day summaries" do
    test "derive counts, totals, and adherence from the same frozen rows as detail" do
      %{client: client, coach: coach} = covering_setup()
      today = local_today(client)
      ctx = client_ctx(client)
      extra = insert(:food, business: coach.business, creator: coach, name: "Banana")
      meal_item_id = live_meal_item_id(client, today)

      assert {:ok, _} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_item_id: meal_item_id},
                 Ecto.UUID.generate()
               )

      assert {:ok, day} = Diary.add_client_extra(ctx, today, extra_attrs(extra, grams: 50.0), Ecto.UUID.generate())

      assert day.applied_timezone == LocalCalendar.default_timezone()
      assert day.summary.counts.as_planned == 1
      assert day.summary.counts.added == 1
      assert day.summary.counts.swapped == 0
      assert day.summary.counts.skipped == 0
      assert day.summary.has_intake
      assert day.summary.logged.calories == 200.0
      assert day.summary.planned.calories == 100.0
      assert day.summary.adherence == :under
      assert hd(day.slots).applied_timezone == day.applied_timezone
      assert hd(day.slots).logged_calories == day.summary.logged.calories

      assert {:ok, coach_day} = Diary.get_nutrition_day_for_client(trainer_ctx(coach), client.id, today)
      assert coach_day.summary == day.summary
      assert coach_day.applied_timezone == day.applied_timezone
      assert hd(coach_day.slots).rows == hd(day.slots).rows
    end

    test "calorie adherence is unavailable when calories are unknown while other nutrients remain" do
      %{client: client, coach: coach} = covering_setup()
      today = local_today(client)

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          name: "Mystery",
          calories_per_100g: nil,
          protein_g_per_100g: 20.0
        )

      assert {:ok, day} =
               Diary.add_client_extra(client_ctx(client), today, extra_attrs(food, grams: 50.0), Ecto.UUID.generate())

      assert day.summary.has_intake
      assert day.summary.logged.calories == nil
      assert day.summary.logged.protein == 10.0
      assert day.summary.adherence == nil
      assert hd(day.slots).logged_calories == nil
    end

    test "calorie adherence is unavailable when the calorie target is zero" do
      %{client: client, food: food, plan: plan} = covering_setup()
      today = local_today(client)

      plan
      |> Ecto.Changeset.change(target_calories: 0.0)
      |> Repo.update!()

      assert {:ok, day} =
               Diary.add_client_extra(client_ctx(client), today, extra_attrs(food), Ecto.UUID.generate())

      assert day.summary.has_intake
      assert day.targets.calories == 0.0
      assert day.summary.logged.calories
      assert day.summary.adherence == nil
    end

    test "a day without intake reports none adherence" do
      client = insert(:client)
      past = Date.add(local_today(client), -1)

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), past)
      refute day.summary.has_intake
      assert day.summary.adherence == :none
      assert day.applied_timezone == LocalCalendar.default_timezone()
    end
  end

  describe "frozen history durability" do
    test "deleting a Nutrition Template leaves assigned Client Plans and Diary history" do
      %{client: client, coach: coach, food: food, plan: plan} = covering_setup()
      today = local_today(client)
      ctx = trainer_ctx(coach)
      template_id = plan.source_template_id

      assert {:ok, logged} =
               Diary.add_client_extra(client_ctx(client), today, extra_attrs(food), Ecto.UUID.generate())

      template = Repo.get!(Plan, template_id)
      assert {:ok, _} = Programming.delete_template(ctx, template.id, template.revision)
      assert Repo.get(Plan, template.id) == nil
      kept = Repo.get!(Plan, plan.id)
      assert kept.source_template_id == nil

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)

      assert hd(day.slots).rows |> Enum.find(& &1.entry) |> Map.fetch!(:entry) |> Map.fetch!(:id) ==
               hd(logged.slots).rows |> Enum.find(& &1.entry) |> Map.fetch!(:entry) |> Map.fetch!(:id)
    end

    test "deleting a Client Plan leaves Diary history unchanged" do
      %{client: client, coach: coach, food: food, plan: plan} = covering_setup()
      today = local_today(client)

      assert {:ok, logged} =
               Diary.add_client_extra(client_ctx(client), today, extra_attrs(food), Ecto.UUID.generate())

      entry_id = hd(logged.slots).rows |> Enum.find(& &1.entry) |> Map.fetch!(:entry) |> Map.fetch!(:id)
      assert {:ok, _} = Programming.delete_plan(trainer_ctx(coach), plan.id, plan.revision)
      assert Repo.get(Plan, plan.id) == nil

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)
      assert Enum.any?(hd(day.slots).rows, &(&1.entry && &1.entry.id == entry_id))
      assert hd(day.slots).options != []
    end

    test "deleting a Food or Recipe unused by Menus nulls the Diary reference and keeps frozen values" do
      %{client: client, coach: coach} = covering_setup()
      today = local_today(client)
      ctx = trainer_ctx(coach)

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          name: "Banana",
          calories_per_100g: 90.0
        )

      assert {:ok, food_day} =
               Diary.add_client_extra(client_ctx(client), today, extra_attrs(food, grams: 100.0), Ecto.UUID.generate())

      food_entry = hd(food_day.slots).rows |> Enum.find(& &1.entry) |> Map.fetch!(:entry)
      assert food_entry.food_id == food.id

      assert {:ok, _} = Library.delete_food(ctx, food.id, food.revision)
      kept_food = Repo.get!(DiaryEntry, food_entry.id)
      assert kept_food.food_id == nil
      assert kept_food.display_name == "Banana"
      assert kept_food.calories == 90.0
      assert kept_food.complete

      assert {:ok, reread} = Diary.get_client_nutrition_day(client_ctx(client), today)
      row = Enum.find(hd(reread.slots).rows, &(&1.entry && &1.entry.id == food_entry.id))
      assert row.entry.food_id == nil
      assert row.entry.name == "Banana"
      assert row.status == :added

      recipe_food = insert(:food, business: coach.business, creator: coach, name: "Rice")
      lone_recipe = insert(:recipe, business: coach.business, creator: coach, name: "Rice bowl", servings_count: 2)
      insert(:recipe_ingredient, business: coach.business, recipe: lone_recipe, food: recipe_food, weight_g: 100.0)

      assert {:ok, recipe_day} =
               Diary.add_client_extra(
                 client_ctx(client),
                 today,
                 %{meal_slot: :lunch, recipe_id: lone_recipe.id, portion: %{kind: :serving, amount: 1}},
                 Ecto.UUID.generate()
               )

      recipe_entry =
        recipe_day.slots
        |> Enum.flat_map(& &1.rows)
        |> Enum.find(&(&1.entry && &1.entry.kind == :recipe))
        |> Map.fetch!(:entry)

      assert recipe_entry.recipe_id == lone_recipe.id

      assert {:ok, _} = Library.delete_recipe(ctx, lone_recipe.id, lone_recipe.revision)
      kept_recipe = Repo.get!(DiaryEntry, recipe_entry.id)
      assert kept_recipe.recipe_id == nil
      assert kept_recipe.display_name == "Rice bowl"
      assert kept_recipe.amount == 1.0
      assert kept_recipe.complete

      assert {:ok, reread_recipe} = Diary.get_client_nutrition_day(client_ctx(client), today)

      recipe_row =
        reread_recipe.slots
        |> Enum.flat_map(& &1.rows)
        |> Enum.find(&(&1.entry && &1.entry.id == recipe_entry.id))

      assert recipe_row.status == :added
      assert recipe_row.entry.name == "Rice bowl"
      assert recipe_row.entry.recipe_id == nil
      assert recipe_row.entry.nutrients.complete
    end
  end

  describe "inactive client access" do
    test "an inactive client cannot write, while an authorized coach can still read history" do
      %{client: client, coach: coach, food: food} = covering_setup()
      today = local_today(client)

      assert {:ok, logged} =
               Diary.add_client_extra(client_ctx(client), today, extra_attrs(food), Ecto.UUID.generate())

      client
      |> Ecto.Changeset.change(status: :inactive, inactive_reason: :manual)
      |> Repo.update!()

      inactive = Repo.get!(Easy.Clients.Client, client.id)

      assert {:error, :client_inactive} =
               Diary.add_client_extra(client_ctx(inactive), today, extra_attrs(food), Ecto.UUID.generate())

      assert {:ok, coach_day} = Diary.get_nutrition_day_for_client(trainer_ctx(coach), client.id, today)
      assert coach_day.summary.has_intake

      assert hd(coach_day.slots).rows |> Enum.find(& &1.entry) |> Map.fetch!(:entry) |> Map.fetch!(:id) ==
               hd(logged.slots).rows |> Enum.find(& &1.entry) |> Map.fetch!(:entry) |> Map.fetch!(:id)
    end
  end

  defp covering_setup(opts \\ []) do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
    food = insert(:food, business: coach.business, creator: coach, name: "Oats")
    ctx = trainer_ctx(coach)

    {:ok, template} =
      Programming.create_template(ctx, %{"name" => "Cut", "target_calories" => 2000.0})

    menu =
      case Keyword.get(opts, :menu) do
        :ordered -> ordered_menu(template, food)
        :two_options -> two_option_menu(template, food)
        :two_same_food -> two_same_food_menu(template, food)
        _ -> breakfast_menu(template, food)
      end

    {:ok, source} = Programming.replace_menu(ctx, template.id, 1, menu)
    today = local_today(client)
    start_date = Date.add(today, Keyword.get(opts, :start_offset, 0))

    {:ok, plan} =
      Programming.assign_template_to_client(ctx, client.id, source.id, 2, %{
        "start_date" => Date.to_iso8601(start_date),
        "end_date" => nil
      })

    %{coach: coach, client: client, food: food, plan: plan, today: today}
  end

  defp breakfast_menu(plan, food) do
    slot_menu(plan, food, [
      %{meal_slot: :breakfast, local_ref: "breakfast", name: "Breakfast", grams: 50}
    ])
  end

  defp ordered_menu(plan, food) do
    slot_menu(plan, food, [
      %{meal_slot: :post_workout, local_ref: "post", name: "Post workout", grams: 30},
      %{meal_slot: :breakfast, local_ref: "breakfast", name: "Breakfast", grams: 50}
    ])
  end

  defp two_option_menu(plan, food) do
    pattern = hd(plan.day_patterns)

    %{
      meals: [
        %{
          local_ref: "a",
          name: "Breakfast A",
          position: 0,
          meal_items: [
            %{local_ref: "a-item", kind: :food, food_id: food.id, position: 0, portion: %{kind: :gram, grams: 50}}
          ]
        },
        %{
          local_ref: "b",
          name: "Breakfast B",
          position: 1,
          meal_items: [
            %{local_ref: "b-item", kind: :food, food_id: food.id, position: 0, portion: %{kind: :gram, grams: 40}}
          ]
        }
      ],
      day_patterns: [
        %{
          id: pattern.id,
          name: pattern.name,
          position: 0,
          slots: [
            %{
              meal_slot: :breakfast,
              options: [
                %{local_ref: "opt-a", meal_local_ref: "a", position: 0},
                %{local_ref: "opt-b", meal_local_ref: "b", position: 1}
              ]
            }
          ]
        }
      ],
      schedule: Map.new(WeekSchedule.weekdays(), &{&1, pattern.id})
    }
  end

  defp two_same_food_menu(plan, food) do
    pattern = hd(plan.day_patterns)

    %{
      meals: [
        %{
          local_ref: "breakfast",
          name: "Breakfast",
          position: 0,
          meal_items: [
            %{local_ref: "oats-1", kind: :food, food_id: food.id, position: 0, portion: %{kind: :gram, grams: 50}},
            %{local_ref: "oats-2", kind: :food, food_id: food.id, position: 1, portion: %{kind: :gram, grams: 30}}
          ]
        }
      ],
      day_patterns: [
        %{
          id: pattern.id,
          name: pattern.name,
          position: 0,
          slots: [
            %{meal_slot: :breakfast, options: [%{local_ref: "opt", meal_local_ref: "breakfast", position: 0}]}
          ]
        }
      ],
      schedule: Map.new(WeekSchedule.weekdays(), &{&1, pattern.id})
    }
  end

  defp live_meal_item_id(client, date), do: hd(live_meal_item_ids(client, date))

  defp live_meal_item_ids(client, date) do
    {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), date)

    day.slots
    |> hd()
    |> Map.fetch!(:options)
    |> hd()
    |> Map.fetch!(:items)
    |> Enum.map(& &1.meal_item_id)
  end

  defp slot_menu(plan, food, slots) do
    pattern = hd(plan.day_patterns)

    meals =
      Enum.with_index(slots, fn slot, position ->
        %{
          local_ref: slot.local_ref,
          name: slot.name,
          position: position,
          meal_items: [
            %{
              local_ref: "#{slot.local_ref}-item",
              kind: :food,
              food_id: food.id,
              position: 0,
              portion: %{kind: :gram, grams: slot.grams}
            }
          ]
        }
      end)

    options =
      Enum.map(slots, fn slot ->
        %{
          meal_slot: slot.meal_slot,
          options: [%{local_ref: "#{slot.local_ref}-opt", meal_local_ref: slot.local_ref, position: 0}]
        }
      end)

    %{
      meals: meals,
      day_patterns: [%{id: pattern.id, name: pattern.name, position: 0, slots: options}],
      schedule: Map.new(WeekSchedule.weekdays(), &{&1, pattern.id})
    }
  end

  defp extra_attrs(food, opts \\ []) do
    %{
      meal_slot: Keyword.get(opts, :slot, :breakfast),
      food_id: food.id,
      portion: %{kind: :gram, grams: Keyword.get(opts, :grams, 50.0)}
    }
  end

  defp extra_path(date), do: "/v1/client/nutrition-days/#{Date.to_iso8601(date)}/extras"

  defp extra_payload(attrs) do
    %{
      meal_slot: attrs.meal_slot,
      food_id: attrs.food_id,
      recipe_id: nil,
      portion: attrs.portion,
      notes: nil
    }
  end

  defp client_ctx(client) do
    %Easy.Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
  end

  defp local_today(client) do
    timezone = LocalCalendar.applied_timezone(client.timezone, client.business && client.business.timezone)
    LocalCalendar.to_local_date(DateTime.utc_now(), timezone)
  end
end
