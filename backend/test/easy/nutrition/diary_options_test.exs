defmodule Easy.Nutrition.DiaryOptionsTest do
  use Easy.DataCase, async: true
  import Easy.Nutrition.DiaryFixtures
  alias Easy.Nutrition.{Diary, DiarySlot}

  test "switching preserves actual intake and switching back restores its planned association" do
    %{client: client, today: today} = covering_setup(menu: :two_options)
    ctx = client_ctx(client)
    {:ok, logged} = save_planned_slot(ctx, today, %{meal_slot: :breakfast})
    [slot] = logged.slots
    [a, b] = slot.options
    [original] = slot.rows
    draft = %{slot_draft(slot) | meal_id: b.meal_id}
    {:ok, switched} = Diary.save_client_nutrition_day(ctx, today, %{slots: [draft]})
    [other] = switched.slots
    assert other.revision == 2
    assert Enum.map(other.rows, & &1.status) == [:pending, :added]
    assert List.last(other.rows).entry_id == original.entry_id
    back = %{slot_draft(other) | meal_id: a.meal_id}
    {:ok, restored} = Diary.save_client_nutrition_day(ctx, today, %{slots: [back]})
    assert [%{entry_id: id, status: :as_planned}] = hd(restored.slots).rows
    assert id == original.entry_id

    assert {:error, %Ecto.Changeset{action: :stale_revision}} =
             Diary.save_client_nutrition_day(ctx, today, %{slots: [draft]})
  end

  test "first save may select any offered option and fulfil its items" do
    %{client: client, today: today} = covering_setup(menu: :two_options)
    ctx = client_ctx(client)
    {:ok, day} = Diary.get_client_nutrition_day(ctx, today)
    [slot] = day.slots
    option = List.last(slot.options)

    entries =
      Enum.map(option.items, fn item ->
        Map.merge(Map.drop(item, [:position, :name, :kind, :nutrients]), %{
          id: Ecto.UUID.generate(),
          notes: nil
        })
      end)

    draft = %{slot_draft(slot) | meal_id: option.meal_id, entries: entries}
    assert {:ok, saved} = Diary.save_client_nutrition_day(ctx, today, %{slots: [draft]})
    assert hd(saved.slots).meal_id == option.meal_id
    assert saved.summary.counts.as_planned == 1
  end

  test "options outside the frozen set are rejected and past choices cannot change" do
    %{client: client, today: today} = covering_setup(menu: :two_options)
    ctx = client_ctx(client)
    {:ok, day} = save_planned_slot(ctx, today, %{meal_slot: :breakfast})
    [slot] = day.slots
    draft = slot_draft(slot)

    assert {:error, :not_found} =
             Diary.save_client_nutrition_day(ctx, today, %{
               slots: [%{draft | meal_id: Ecto.UUID.generate()}]
             })

    [stored] = Repo.all(DiarySlot.for_client(client.business_id, client.id))
    past = Date.add(today, -1)
    Repo.update!(Ecto.Changeset.change(stored, local_date: past))
    other = List.last(slot.options)

    assert {:error, :cannot_switch_past_slot} =
             Diary.save_client_nutrition_day(ctx, past, %{
               slots: [%{draft | meal_id: other.meal_id}]
             })

    assert {:ok, _} = Diary.save_client_nutrition_day(ctx, past, %{slots: [draft]})
  end

  test "replacement keeps the planned identity while snapshots and status reflect actual food" do
    %{client: client, today: today, food: food} = covering_setup()
    ctx = client_ctx(client)
    replacement = insert(:food, business: client.business, name: "Banana")
    {:ok, day} = save_planned_slot(ctx, today, %{meal_slot: :breakfast})
    [slot] = day.slots
    draft = slot_draft(slot)
    [original] = draft.entries

    changed = %{
      original
      | food_id: replacement.id,
        portion: %{kind: :gram, grams: 80},
        notes: "Substitute"
    }

    assert {:ok, saved} =
             Diary.save_client_nutrition_day(ctx, today, %{slots: [%{draft | entries: [changed]}]})

    [row] = hd(saved.slots).rows
    assert row.entry_id == original.id
    assert row.planned_item_ref == original.planned_item_ref
    assert row.name == "Banana"
    assert row.status == :swapped
    assert hd(hd(hd(saved.slots).options).items).food_id == food.id
  end
end
