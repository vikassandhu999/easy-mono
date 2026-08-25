defmodule Easy.Nutrition.DiaryEntryCorrectionsTest do
  use Easy.DataCase, async: true

  alias Easy.LocalCalendar

  alias Easy.Nutrition.{
    Diary,
    DiaryCommandLedger,
    DiarySlot
  }

  alias Easy.Repo

  import Ecto.Query
  import Easy.Nutrition.DiaryFixtures

  describe "update_client_entry/5" do
    test "scales a serving correction from the frozen serving basis" do
      client = insert(:client)

      food =
        insert(:food,
          business: client.business,
          calories_per_100g: 200.0,
          serving_sizes: [
            %{label: "1 cup", amount: 1.0, unit: "cup", weight_g: 80.0, is_default: true}
          ]
        )

      today = local_today(client)
      ctx = client_ctx(client)

      assert {:ok, logged} =
               Diary.add_client_extra(
                 ctx,
                 today,
                 %{
                   meal_slot: :breakfast,
                   food_id: food.id,
                   portion: %{kind: :serving, amount: 1.0, unit: "cup", label: "1 cup"}
                 },
                 Ecto.UUID.generate()
               )

      entry = hd(logged.slots).rows |> hd() |> Map.fetch!(:entry)

      assert {:ok, updated} =
               Diary.update_client_entry(
                 ctx,
                 today,
                 entry.id,
                 %{
                   expected_revision: entry.revision,
                   portion: %{kind: :serving, amount: 2.0, unit: "cup", label: "1 cup"}
                 },
                 Ecto.UUID.generate()
               )

      revised = hd(updated.slots).rows |> hd() |> Map.fetch!(:entry)
      assert revised.portion.amount == 2.0
      assert revised.portion.grams == 160.0
      assert revised.nutrients.calories == 320.0
    end

    test "a Portion-only correction preserves the existing note" do
      client = insert(:client)
      food = insert(:food, business: client.business)
      today = local_today(client)
      ctx = client_ctx(client)

      assert {:ok, logged} =
               Diary.add_client_extra(
                 ctx,
                 today,
                 Map.put(extra_attrs(food), :notes, "keep me"),
                 Ecto.UUID.generate()
               )

      entry = hd(logged.slots).rows |> hd() |> Map.fetch!(:entry)

      assert {:ok, updated} =
               Diary.update_client_entry(
                 ctx,
                 today,
                 entry.id,
                 %{expected_revision: entry.revision, portion: %{kind: :gram, grams: 25.0}},
                 Ecto.UUID.generate()
               )

      revised = hd(updated.slots).rows |> hd() |> Map.fetch!(:entry)
      assert revised.notes == "keep me"
    end

    test "scales frozen nutrients from the stored basis without consulting Library" do
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
      ledger = Repo.get_by!(DiaryCommandLedger, idempotency_key: key)

      ledger
      |> Ecto.Changeset.change(
        fingerprint:
          DiaryCommandLedger.fingerprint(
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
      planned_item_ref = live_planned_item_ref(client, today)

      assert {:ok, logged} =
               Diary.log_client_planned_item(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, planned_item_ref: planned_item_ref},
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
end
