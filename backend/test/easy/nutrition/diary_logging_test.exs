defmodule Easy.Nutrition.DiaryLoggingTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.{
    Diary,
    DiaryCommandLedger,
    DiaryFrozenPlannedItem,
    DiarySlot,
    Programming,
    WeekSchedule
  }

  alias Easy.Repo

  import Ecto.Query
  import Easy.Nutrition.DiaryFixtures

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

    test "an invalid entry rolls back its slot and reservation so the key can be retried" do
      client = insert(:client)
      food = insert(:food, business: client.business)
      today = local_today(client)
      key = Ecto.UUID.generate()

      invalid_attrs = Map.put(extra_attrs(food), :notes, String.duplicate("x", 256))

      assert {:error, %Ecto.Changeset{} = changeset} =
               Diary.add_client_extra(client_ctx(client), today, invalid_attrs, key)

      assert {_, validation} = changeset.errors[:notes]
      assert validation[:validation] == :length
      assert validation[:kind] == :max
      assert validation[:count] == 255

      assert Repo.get_by(DiaryCommandLedger, client_id: client.id, idempotency_key: key) == nil

      refute Repo.exists?(
               from(slot in DiarySlot,
                 where: slot.client_id == ^client.id and slot.local_date == ^today
               )
             )

      assert {:ok, day} =
               Diary.add_client_extra(client_ctx(client), today, extra_attrs(food), key)

      assert [%{rows: [%{status: :recorded}]}] = day.slots
      assert %DiaryCommandLedger{} = Repo.get_by!(DiaryCommandLedger, client_id: client.id, idempotency_key: key)
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

    test "only successful commands stamp client activity while error outcomes remain replayable" do
      successful_client = insert(:client)
      food = insert(:food, business: successful_client.business)
      today = local_today(successful_client)

      assert is_nil(Repo.reload(successful_client).last_active_at)

      assert {:ok, _day} =
               Diary.add_client_extra(client_ctx(successful_client), today, extra_attrs(food), Ecto.UUID.generate())

      assert %DateTime{} = Repo.reload(successful_client).last_active_at

      failed_client = insert(:client)
      failed_key = Ecto.UUID.generate()
      missing_food = insert(:food)

      assert {:error, :not_found} =
               Diary.add_client_extra(
                 client_ctx(failed_client),
                 local_today(failed_client),
                 extra_attrs(missing_food),
                 failed_key
               )

      assert is_nil(Repo.reload(failed_client).last_active_at)

      ledger = Repo.get_by!(DiaryCommandLedger, idempotency_key: failed_key)
      assert :erlang.binary_to_term(ledger.outcome) == {:error, :not_found}

      assert {:error, :not_found} =
               Diary.add_client_extra(
                 client_ctx(failed_client),
                 local_today(failed_client),
                 extra_attrs(missing_food),
                 failed_key
               )
    end

    test "ledger lookup returns the stored result after the date leaves the correction window" do
      client = insert(:client)
      food = insert(:food, business: client.business)
      today = local_today(client)
      key = Ecto.UUID.generate()
      attrs = extra_attrs(food)

      assert {:ok, first} = Diary.add_client_extra(client_ctx(client), today, attrs, key)

      stale = Date.add(today, -8)
      ledger = Repo.get_by!(DiaryCommandLedger, idempotency_key: key)

      ledger
      |> Ecto.Changeset.change(fingerprint: DiaryCommandLedger.fingerprint("POST", extra_path(stale), extra_payload(attrs)))
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

    test "bounded cleanup removes at most one thousand expired ledger rows" do
      client = insert(:client)
      now = DateTime.utc_now(:second)

      rows =
        Enum.map(1..1001, fn _index ->
          %{
            id: Ecto.UUID.generate(),
            idempotency_key: Ecto.UUID.generate(),
            fingerprint: "expired",
            expires_at: DateTime.add(now, -1, :second),
            business_id: client.business_id,
            client_id: client.id,
            inserted_at: now,
            updated_at: now
          }
        end)

      assert {1001, nil} = Repo.insert_all(DiaryCommandLedger, rows)
      assert {:ok, 1000} = Diary.purge_expired_command_ledger(now)

      assert Repo.aggregate(
               from(row in DiaryCommandLedger, where: row.client_id == ^client.id),
               :count
             ) == 1
    end
  end

  describe "log_client_planned_item/4" do
    test "rejects a valid Meal Slot that is not scheduled in the covering Menu" do
      %{client: client} = covering_setup()
      today = local_today(client)

      assert {:error, :not_found} =
               Diary.log_client_planned_item(
                 client_ctx(client),
                 today,
                 %{meal_slot: :lunch, planned_item_ref: Ecto.UUID.generate()},
                 Ecto.UUID.generate()
               )

      refute Repo.get_by(DiarySlot, client_id: client.id, local_date: today, meal_slot: :lunch)
    end

    test "logs one planned item as as_planned and freezes the slot on the local day" do
      %{client: client, food: food} = covering_setup()
      today = local_today(client)
      planned_item_ref = live_planned_item_ref(client, today)

      assert {:ok, day} =
               Diary.log_client_planned_item(
                 client_ctx(client),
                 today,
                 %{meal_slot: :breakfast, planned_item_ref: planned_item_ref},
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

    test "keeps the original Menu Item command identity after Menu replacement" do
      %{client: client, coach: coach, plan: plan} = covering_setup()
      today = local_today(client)
      ctx = client_ctx(client)
      planned_item_ref = live_planned_item_ref(client, today)
      extra = insert(:food, business: coach.business, creator: coach)

      assert {:ok, _frozen} =
               Diary.add_client_extra(ctx, today, extra_attrs(extra), Ecto.UUID.generate())

      pattern = hd(plan.day_patterns)

      assert {:ok, _replaced} =
               Programming.replace_menu(trainer_ctx(coach), plan.id, plan.revision, %{
                 meals: [],
                 day_patterns: [%{id: pattern.id, name: pattern.name, position: 0, slots: []}],
                 schedule: Map.new(WeekSchedule.weekdays(), &{&1, pattern.id})
               })

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, planned_item_ref: planned_item_ref},
                 Ecto.UUID.generate()
               )

      assert Enum.any?(hd(logged.slots).rows, &(&1.status == :as_planned))
    end

    test "a second distinct command for the same planned item stores an added extra" do
      %{client: client} = covering_setup()
      today = local_today(client)
      planned_item_ref = live_planned_item_ref(client, today)
      attrs = %{meal_slot: :breakfast, planned_item_ref: planned_item_ref}

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

      planned_item_refs =
        day.slots
        |> hd()
        |> Map.fetch!(:options)
        |> hd()
        |> Map.fetch!(:items)
        |> Enum.map(& &1.planned_item_ref)

      assert length(planned_item_refs) == 2

      Enum.each(planned_item_refs, fn planned_item_ref ->
        assert {:ok, _} =
                 Diary.log_client_planned_item(
                   client_ctx(client),
                   today,
                   %{meal_slot: :breakfast, planned_item_ref: planned_item_ref},
                   Ecto.UUID.generate()
                 )
      end)

      assert {:ok, logged} = Diary.get_client_nutrition_day(client_ctx(client), today)
      rows = hd(logged.slots).rows
      assert Enum.map(rows, & &1.status) == [:as_planned, :as_planned]
      assert Enum.map(rows, & &1.planned.food_id) == [food.id, food.id]
      assert Enum.map(rows, & &1.planned.planned_item_ref) |> Enum.uniq() |> length() == 2
    end

    test "rejects creating a past unstarted slot and accepts fulfilment on an already frozen past slot" do
      %{client: client, coach: coach} = covering_setup(start_offset: -7)
      today = local_today(client)
      past = Date.add(today, -1)
      planned_item_ref = live_planned_item_ref(client, today)
      extra = insert(:food, business: coach.business, creator: coach, name: "Banana")

      assert {:error, :cannot_start_past_slot} =
               Diary.log_client_planned_item(
                 client_ctx(client),
                 past,
                 %{meal_slot: :breakfast, planned_item_ref: planned_item_ref},
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
                 %{meal_slot: :breakfast, planned_item_ref: frozen_id},
                 Ecto.UUID.generate()
               )

      assert day.date == past

      assert Enum.any?(
               hd(day.slots).rows,
               &(&1.status == :as_planned && &1.planned.planned_item_ref == frozen_id)
             )
    end

    test "an identical planned-item retry returns the stored result" do
      %{client: client} = covering_setup()
      today = local_today(client)
      planned_item_ref = live_planned_item_ref(client, today)
      key = Ecto.UUID.generate()
      attrs = %{meal_slot: :breakfast, planned_item_ref: planned_item_ref}

      assert {:ok, first} = Diary.log_client_planned_item(client_ctx(client), today, attrs, key)
      assert {:ok, replay} = Diary.log_client_planned_item(client_ctx(client), today, attrs, key)

      assert hd(replay.slots).rows == hd(first.slots).rows
    end

    test "an old ledger replay normalizes planned item references without dual exposing keys" do
      %{client: client} = covering_setup()
      today = local_today(client)
      planned_item_ref = live_planned_item_ref(client, today)
      key = Ecto.UUID.generate()
      attrs = %{meal_slot: :breakfast, planned_item_ref: planned_item_ref}

      assert {:ok, first} = Diary.log_client_planned_item(client_ctx(client), today, attrs, key)
      ledger = Repo.get_by!(DiaryCommandLedger, idempotency_key: key)

      legacy_day =
        update_in(first.slots, fn slots ->
          Enum.map(slots, fn slot ->
            slot
            |> Map.update!(:options, fn options ->
              Enum.map(options, fn option ->
                Map.update!(option, :items, fn items -> Enum.map(items, &legacy_item/1) end)
              end)
            end)
            |> Map.update!(:rows, fn rows ->
              Enum.map(rows, fn row ->
                Map.update!(row, :planned, fn
                  nil -> nil
                  planned -> legacy_item(planned)
                end)
              end)
            end)
          end)
        end)

      ledger
      |> DiaryCommandLedger.update_changeset(%{outcome: :erlang.term_to_binary({:ok, legacy_day})})
      |> Repo.update!()

      assert {:ok, replay} = Diary.log_client_planned_item(client_ctx(client), today, attrs, key)

      replay_items =
        Enum.flat_map(replay.slots, fn slot ->
          Enum.flat_map(slot.options, & &1.items) ++
            for %{planned: planned} when not is_nil(planned) <- slot.rows, do: planned
        end)

      assert replay_items != []
      assert Enum.all?(replay_items, &Map.has_key?(&1, :planned_item_ref))
      refute Enum.any?(replay_items, &Map.has_key?(&1, :meal_item_id))
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
      [first, _second] = live_planned_item_refs(client, today)

      assert {:ok, _} =
               Diary.log_client_planned_item(
                 client_ctx(client),
                 today,
                 %{meal_slot: :breakfast, planned_item_ref: first},
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

    test "uses each frozen slot timezone for the correction deadline" do
      %{client: client, coach: coach} = covering_setup(timezone: "Pacific/Pago_Pago")
      frozen_today = local_today(client)
      extra = insert(:food, business: coach.business, creator: coach)

      assert {:ok, _day} =
               Diary.add_client_extra(
                 client_ctx(client),
                 frozen_today,
                 extra_attrs(extra),
                 Ecto.UUID.generate()
               )

      date = Date.add(frozen_today, -7)
      slot = Repo.get_by!(DiarySlot, client_id: client.id, meal_slot: :breakfast)

      slot
      |> Ecto.Changeset.change(local_date: date)
      |> Repo.update!()

      Repo.update_all(
        from(row in Easy.Clients.Client, where: row.id == ^client.id),
        set: [timezone: "Pacific/Kiritimati"]
      )

      assert {:ok, frozen_day} = Diary.get_client_nutrition_day(client_ctx(client), date)
      assert frozen_day.applied_timezone == "Pacific/Pago_Pago"
      assert frozen_day.write_eligible

      assert {:ok, corrected} =
               Diary.log_client_planned_day(client_ctx(client), date, Ecto.UUID.generate())

      assert Enum.any?(hd(corrected.slots).rows, &(&1.status == :as_planned))
    end

    test "reports correction eligibility from each frozen slot timezone" do
      %{client: client, coach: coach} = covering_setup(menu: :ordered, timezone: "Pacific/Pago_Pago")
      frozen_today = local_today(client)
      extra = insert(:food, business: coach.business, creator: coach)
      ctx = client_ctx(client)

      for meal_slot <- [:breakfast, :post_workout] do
        assert {:ok, _day} =
                 Diary.add_client_extra(
                   ctx,
                   frozen_today,
                   extra_attrs(extra, slot: meal_slot),
                   Ecto.UUID.generate()
                 )
      end

      date = Date.add(frozen_today, -7)

      Repo.update_all(
        from(slot in DiarySlot, where: slot.client_id == ^client.id and slot.meal_slot == :breakfast),
        set: [local_date: date]
      )

      Repo.update_all(
        from(slot in DiarySlot, where: slot.client_id == ^client.id and slot.meal_slot == :post_workout),
        set: [local_date: date, applied_timezone: "Pacific/Kiritimati"]
      )

      assert {:ok, day} = Diary.get_client_nutrition_day(ctx, date)
      slots = Map.new(day.slots, &{&1.meal_slot, &1})
      assert slots.breakfast.write_eligible
      refute slots.post_workout.write_eligible
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

  defp legacy_item(item) do
    item
    |> Map.put(:meal_item_id, item.planned_item_ref)
    |> Map.delete(:planned_item_ref)
  end
end
