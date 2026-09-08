defmodule Easy.Nutrition.DiaryLoggingTest do
  use Easy.DataCase, async: true
  import Easy.Nutrition.DiaryFixtures
  alias Easy.Nutrition.{Diary, DiarySlot}

  test "one save logs planned intake and extras and returns direct rows" do
    %{client: client, food: food, today: today} = covering_setup(menu: :two_options)
    ctx = client_ctx(client)
    {:ok, live} = Diary.get_client_nutrition_day(ctx, today)
    [slot] = live.slots
    assert slot.revision == 0
    draft = slot_draft(slot, true)

    extra = %{
      id: Ecto.UUID.generate(),
      food_id: food.id,
      recipe_id: nil,
      planned_item_ref: nil,
      portion: %{kind: :gram, grams: 20},
      notes: "Snack"
    }

    assert {:ok, saved} =
             Diary.save_client_nutrition_day(ctx, today, %{
               slots: [%{draft | entries: draft.entries ++ [extra]}]
             })

    [saved_slot] = saved.slots
    assert saved_slot.revision == 1
    assert length(saved_slot.options) == 2
    assert Enum.map(saved_slot.rows, & &1.status) == [:as_planned, :added]
    assert Enum.all?(saved_slot.rows, &is_binary(&1.entry_id))
    refute Map.has_key?(hd(saved_slot.rows), :entry)
    assert saved.summary.logged.calories == 140
    assert Repo.get!(Easy.Clients.Client, client.id).last_active_at
  end

  test "a retry with an old slot revision conflicts, including after deletion" do
    %{client: client, today: today} = covering_setup()
    ctx = client_ctx(client)
    {:ok, live} = Diary.get_client_nutrition_day(ctx, today)
    request = %{slots: Enum.map(live.slots, &slot_draft(&1, true))}
    {:ok, saved} = Diary.save_client_nutrition_day(ctx, today, request)

    assert {:error, %Ecto.Changeset{action: :stale_revision}} =
             Diary.save_client_nutrition_day(ctx, today, request)

    draft = %{slot_draft(hd(saved.slots)) | entries: []}
    assert {:ok, deleted} = Diary.save_client_nutrition_day(ctx, today, %{slots: [draft]})
    assert hd(deleted.slots).revision == 2
    assert hd(hd(deleted.slots).rows).entry_id == nil

    assert {:error, %Ecto.Changeset{action: :stale_revision}} =
             Diary.save_client_nutrition_day(ctx, today, request)

    assert stored_entries(client) == []
    assert Repo.aggregate(DiarySlot.for_client(client.business_id, client.id), :count) == 1
  end

  test "whole-day save checks every revision before committing any slot" do
    %{client: client, today: today} = covering_setup(menu: :ordered)
    ctx = client_ctx(client)
    {:ok, live} = Diary.get_client_nutrition_day(ctx, today)
    [breakfast, workout] = Enum.map(live.slots, &slot_draft(&1, true))
    {:ok, _} = Diary.save_client_nutrition_day(ctx, today, %{slots: [workout]})

    assert {:error, %Ecto.Changeset{action: :stale_revision}} =
             Diary.save_client_nutrition_day(ctx, today, %{slots: [breakfast, workout]})

    {:ok, day} = Diary.get_client_nutrition_day(ctx, today)
    assert Enum.map(day.slots, & &1.revision) == [0, 1]
    assert Repo.aggregate(DiarySlot.for_client(client.business_id, client.id), :count) == 1
  end

  test "invalid final entry rolls back the complete save and permits a corrected request" do
    %{client: client, today: today} = covering_setup(menu: :ordered)
    ctx = client_ctx(client)
    {:ok, live} = Diary.get_client_nutrition_day(ctx, today)
    drafts = Enum.map(live.slots, &slot_draft(&1, true))

    bad =
      List.update_at(drafts, 1, fn slot ->
        %{slot | entries: Enum.map(slot.entries, &%{&1 | notes: String.duplicate("x", 256)})}
      end)

    assert {:error, %Ecto.Changeset{}} = Diary.save_client_nutrition_day(ctx, today, %{slots: bad})
    assert Repo.aggregate(DiarySlot.for_client(client.business_id, client.id), :count) == 0
    assert {:ok, saved} = Diary.save_client_nutrition_day(ctx, today, %{slots: drafts})
    assert saved.summary.counts.as_planned == 2
  end

  test "duplicate slot names, entry identities and planned references are rejected" do
    %{client: client, today: today} = covering_setup()
    ctx = client_ctx(client)
    {:ok, live} = Diary.get_client_nutrition_day(ctx, today)
    draft = slot_draft(hd(live.slots), true)
    [entry] = draft.entries

    for slots <- [
          [draft, draft],
          [%{draft | entries: [entry, entry]}],
          [%{draft | entries: [entry, %{entry | id: Ecto.UUID.generate()}]}]
        ] do
      assert {:error, %Ecto.Changeset{valid?: false}} = Diary.save_client_nutrition_day(ctx, today, %{slots: slots})
    end

    assert Repo.aggregate(DiarySlot.for_client(client.business_id, client.id), :count) == 0
  end

  test "entry identities are local to a slot and cannot access another client" do
    %{client: client, today: today, food: food} = covering_setup()
    ctx = client_ctx(client)
    {:ok, first} = save_extra(ctx, today, extra_attrs(food))
    row = Enum.find(hd(first.slots).rows, & &1.entry_id)
    entry = entry_draft(row)
    draft = %{meal_slot: :lunch, meal_id: nil, expected_revision: 0, entries: [entry]}

    assert {:ok, copied} = Diary.save_client_nutrition_day(ctx, today, %{slots: [draft]})
    assert length(copied.slots) == 2
    original = hd(first.slots)
    assert hd(copied.slots) == original

    foreign = insert(:client)

    assert {:error, :not_found} =
             Diary.save_client_nutrition_day(client_ctx(foreign), today, %{slots: [draft]})

    assert length(stored_entries(client)) == 2
  end

  test "multiple extras of one food have distinct identities" do
    client = insert(:client)
    food = insert(:food, business: client.business)
    date = local_today(client)
    {:ok, _} = save_extra(client_ctx(client), date, extra_attrs(food))
    {:ok, saved} = save_extra(client_ctx(client), date, extra_attrs(food))
    assert saved.summary.counts.recorded == 2
    assert length(Enum.uniq_by(hd(saved.slots).rows, & &1.entry_id)) == 2
  end

  test "the complete intake preserves requested order after reload" do
    client = insert(:client)
    food = insert(:food, business: client.business)
    ctx = client_ctx(client)
    date = local_today(client)
    {:ok, _} = save_extra(ctx, date, extra_attrs(food, grams: 20))
    {:ok, saved} = save_extra(ctx, date, extra_attrs(food, grams: 80))
    draft = slot_draft(hd(saved.slots))
    reordered = %{draft | entries: Enum.reverse(draft.entries)}

    assert {:ok, saved} = Diary.save_client_nutrition_day(ctx, date, %{slots: [reordered]})
    assert {:ok, loaded} = Diary.get_client_nutrition_day(ctx, date)
    assert loaded == saved
    assert Enum.map(hd(loaded.slots).rows, & &1.portion.grams) == [80.0, 20.0]
  end

  test "the same entry id in another client's slot cannot change the original intake" do
    client = insert(:client)
    other = insert(:client, business: client.business)
    food = insert(:food, business: client.business)
    date = local_today(client)
    {:ok, original} = save_extra(client_ctx(client), date, extra_attrs(food, grams: 20))
    draft = slot_draft(hd(original.slots))
    [entry] = draft.entries
    copy = %{draft | expected_revision: 0, entries: [%{entry | portion: %{kind: :gram, grams: 80}}]}

    assert {:ok, saved} = Diary.save_client_nutrition_day(client_ctx(other), date, %{slots: [copy]})
    assert hd(hd(saved.slots).rows).entry_id == entry.id
    assert hd(hd(saved.slots).rows).portion.grams == 80.0
    assert {:ok, ^original} = Diary.get_client_nutrition_day(client_ctx(client), date)
  end

  test "a new past slot has no reconstructed plan and observes the seven-day correction window" do
    %{client: client, food: food, today: today} = covering_setup(start_offset: -7)
    ctx = client_ctx(client)

    for offset <- 1..7 do
      assert {:ok, day} = save_extra(ctx, Date.add(today, -offset), extra_attrs(food))
      assert [%{options: [], rows: [%{status: :recorded}]}] = day.slots
      assert day.plan_id == nil
    end

    assert {:error, :outside_correction_window} =
             save_extra(ctx, Date.add(today, -8), extra_attrs(food))

    assert {:error, :future_date} = save_extra(ctx, Date.add(today, 1), extra_attrs(food))
  end

  test "only the active client can save their diary" do
    %{coach: coach, client: client, today: today} = covering_setup()
    request = %{slots: [%{meal_slot: :breakfast, meal_id: nil, expected_revision: 0, entries: []}]}

    assert {:error, :not_found} =
             Diary.save_client_nutrition_day(trainer_ctx(coach), today, request)

    Repo.update!(Ecto.Changeset.change(client, status: :inactive))

    assert {:error, :client_inactive} =
             Diary.save_client_nutrition_day(client_ctx(client), today, request)
  end
end
