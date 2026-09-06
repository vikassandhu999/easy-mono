defmodule Easy.Nutrition.DiaryEntryCorrectionsTest do
  alias Easy.Nutrition.Portions
  use Easy.DataCase, async: true
  import Easy.Nutrition.DiaryFixtures
  alias Easy.Nutrition.{Diary, DiarySlot, Library, Portions}

  test "correction scales the frozen basis after the library changes" do
    %{client: client, coach: coach, food: food, today: today} = covering_setup()
    ctx = client_ctx(client)
    {:ok, logged} = save_planned_slot(ctx, today, %{meal_slot: :breakfast})
    [slot] = logged.slots
    draft = slot_draft(slot)
    [entry] = draft.entries
    {:ok, _} = Library.update_food(trainer_ctx(coach), food.id, food.revision, %{calories_per_100g: 900.0})
    changed = %{entry | portion: %{kind: :gram, grams: 100}, notes: "Double"}

    assert {:ok, day} =
             Diary.save_client_nutrition_day(ctx, today, %{slots: [%{draft | entries: [changed]}]})

    [row] = hd(day.slots).rows
    assert row.nutrients.calories == 200
    assert row.notes == "Double"
    assert row.status == :as_planned

    assert {:error, %Ecto.Changeset{action: :stale_revision}} =
             Diary.save_client_nutrition_day(ctx, today, %{slots: [draft]})
  end

  test "serving corrections use the stored serving basis" do
    client = insert(:client)

    food =
      insert(:food,
        business: client.business,
        serving_sizes: [%{label: "Cup", unit: "cup", amount: 1.0, weight_g: 80.0, is_default: true}]
      )

    ctx = client_ctx(client)
    date = local_today(client)

    {:ok, day} =
      save_extra(ctx, date, %{
        meal_slot: :breakfast,
        food_id: food.id,
        portion: %{kind: :serving, amount: 1, unit: "cup", label: "Cup"}
      })

    draft = slot_draft(hd(day.slots))
    [entry] = draft.entries
    edited = %{entry | portion: %{kind: :serving, amount: 2, unit: "cup", label: "Cup"}}

    assert {:ok, corrected} =
             Diary.save_client_nutrition_day(ctx, date, %{slots: [%{draft | entries: [edited]}]})

    [row] = hd(corrected.slots).rows
    assert row.portion == %{kind: :serving, amount: 2.0, unit: "cup", label: "Cup"}
    assert row.nutrients.calories == 320
  end

  test "clearing notes is explicit and omitted entries are deleted" do
    %{client: client, food: food, today: date} = covering_setup()
    ctx = client_ctx(client)
    {:ok, day} = save_extra(ctx, date, Map.put(extra_attrs(food), :notes, "Lunch"))
    draft = slot_draft(hd(day.slots))
    [entry] = draft.entries

    assert {:ok, edited} =
             Diary.save_client_nutrition_day(ctx, date, %{
               slots: [%{draft | entries: [%{entry | notes: nil}]}]
             })

    assert Enum.all?(hd(edited.slots).rows, &is_nil(&1.notes))

    assert {:ok, removed} =
             Diary.save_client_nutrition_day(ctx, date, %{
               slots: [%{slot_draft(hd(edited.slots)) | entries: []}]
             })

    assert removed.summary.has_intake == false
    assert hd(removed.slots).options != []
  end

  test "correction deadlines use the frozen slot timezone and retries cannot bypass them" do
    %{client: client, food: food, today: date} = covering_setup()
    ctx = client_ctx(client)
    {:ok, day} = save_extra(ctx, date, extra_attrs(food))
    [stored] = Repo.all(DiarySlot.for_client(client.business_id, client.id))
    past = Date.add(date, -8)
    move_slot_date(stored, past)

    assert {:error, :outside_correction_window} =
             Diary.save_client_nutrition_day(ctx, past, %{slots: [slot_draft(hd(day.slots))]})
  end

  test "changing the same food between portion options scales frozen nutrition" do
    %{client: client, coach: coach, food: food, today: today} = covering_setup()
    ctx = client_ctx(client)
    {:ok, day} = save_planned_slot(ctx, today, %{meal_slot: :breakfast})

    {:ok, updated} =
      Library.update_food(trainer_ctx(coach), food.id, food.revision, %{
        calories_per_100g: 900.0,
        serving_sizes: [
          %{amount: 1.0, unit: "cup", label: "Cup", weight_g: 100.0, is_default: true},
          %{amount: 1.0, unit: "cup", label: "Small cup", weight_g: 60.0, is_default: false}
        ]
      })

    options = Portions.for_food(updated)
    draft = slot_draft(hd(day.slots))
    [entry] = draft.entries
    picked = %{entry | portion: options.default_portion}
    assert {:ok, changed} = Diary.save_client_nutrition_day(ctx, today, %{slots: [%{draft | entries: [picked]}]})
    assert hd(hd(changed.slots).rows).nutrients.calories == 200.0

    draft = slot_draft(hd(changed.slots))
    [entry] = draft.entries
    small = %{entry | portion: %{kind: :serving, amount: 1, unit: "cup", label: "Small cup"}}
    assert {:ok, changed} = Diary.save_client_nutrition_day(ctx, today, %{slots: [%{draft | entries: [small]}]})
    assert hd(hd(changed.slots).rows).nutrients.calories == 120.0

    draft = slot_draft(hd(changed.slots))
    [entry] = draft.entries
    grams = %{entry | portion: %{kind: :gram, grams: 50}}
    assert {:ok, changed} = Diary.save_client_nutrition_day(ctx, today, %{slots: [%{draft | entries: [grams]}]})
    assert hd(hd(changed.slots).rows).nutrients.calories == 100.0
  end

  test "deleted food still supports corrections in the frozen serving unit" do
    %{client: client, coach: coach, today: today} = covering_setup()
    size = %{amount: 1.0, unit: "cup", label: "Cup", weight_g: 100.0, is_default: true}
    food = insert(:food, business: coach.business, creator: coach, serving_sizes: [size])
    ctx = client_ctx(client)
    portion = %{kind: :serving, amount: 1, unit: "cup", label: "Cup"}
    {:ok, _day} = save_extra(ctx, today, %{meal_slot: :lunch, food_id: food.id, portion: portion})
    {:ok, _} = Library.delete_food(trainer_ctx(coach), food.id)
    {:ok, day} = Diary.get_client_nutrition_day(ctx, today)
    slot = Enum.find(day.slots, &(&1.meal_slot == :lunch))
    draft = slot_draft(slot)
    [entry] = draft.entries
    changed = %{entry | portion: %{kind: :serving, amount: 2, unit: "cup", label: "Cup"}}
    assert {:ok, corrected} = Diary.save_client_nutrition_day(ctx, today, %{slots: [%{draft | entries: [changed]}]})
    row = corrected.slots |> Enum.find(&(&1.meal_slot == :lunch)) |> Map.fetch!(:rows) |> hd()
    assert row.nutrients.calories == 400.0
    assert row.food_id == nil
  end

  test "recipes without cooked weight retain servings and reject invented conversions" do
    client = insert(:client)
    recipe = insert(:recipe, business: client.business, cooked_weight_g: nil)
    ctx = client_ctx(client)
    today = local_today(client)
    portion = %{kind: :serving, amount: 1, unit: "serving", label: nil}
    {:ok, day} = save_extra(ctx, today, %{meal_slot: :lunch, recipe_id: recipe.id, portion: portion})
    draft = slot_draft(hd(day.slots))
    [entry] = draft.entries
    grams = %{entry | portion: %{kind: :gram, grams: 100}}

    assert {:error, :invalid_portion} =
             Diary.save_client_nutrition_day(ctx, today, %{slots: [%{draft | entries: [grams]}]})

    serving = %{entry | portion: %{portion | amount: 2}}

    assert {:ok, changed} =
             Diary.save_client_nutrition_day(ctx, today, %{slots: [%{draft | entries: [serving]}]})

    assert hd(hd(changed.slots).rows).portion.amount == 2.0

    assert {:error, :invalid_portion} =
             Portions.resolve_recipe(
               recipe,
               %{kind: :serving, amount: 1, unit: "cup", label: "Cup"}
             )
  end
end
