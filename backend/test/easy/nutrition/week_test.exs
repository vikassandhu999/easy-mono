defmodule Easy.Nutrition.WeekTest do
  use Easy.DataCase, async: true
  alias Easy.Clients.Client
  alias Easy.LocalCalendar
  alias Easy.Nutrition

  alias Easy.Nutrition.{
    Food,
    Nutrient,
    NutritionPreset,
    NutritionSchedule,
    NutritionTargets,
    TargetSchedule,
    Timing,
    Undo,
    Values
  }

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")
    ctx = trainer_ctx(coach)

    {:ok, food} =
      Nutrition.create_food(ctx, %{
        name: "Oats",
        kind: :food,
        basis: :"100g",
        nutrients: %{energy_kcal: 100, protein_g: 10},
        servings: [%{label: "bowl", amount: 50}]
      })

    %{ctx: ctx, client: client, food: food, today: Date.utc_today()}
  end

  defp meal(food, name \\ "Breakfast"),
    do: %{
      type: :meal,
      name: name,
      options: [%{name: "Oats bowl", items: [%{food_id: food.id, amount: 2, unit: "bowl"}]}]
    }

  defp create_meal(f) do
    assert {:ok, %{data: preset}} = Nutrition.create_preset_for_client(f.ctx, f.client.id, meal(f.food))
    preset
  end

  defp schedule(f, preset, attrs) do
    NutritionSchedule.insert_changeset(f.ctx.business_id, f.client.id, preset.id, attrs)
    |> put_change(:coach_id, f.ctx.coach_id)
    |> Repo.insert!()
  end

  defp set(
         f,
         attrs \\ %{name: "Training day", targets: %{energy_kcal: %{min: 2500, max: 2700}, protein_g: %{min: 160}}}
       ) do
    assert {:ok, %{data: row}} = Nutrition.create_targets_for_client(f.ctx, f.client.id, attrs)
    row
  end

  defp target_schedule(f, set, attrs),
    do: TargetSchedule.insert_changeset(f.ctx.business_id, f.client.id, set.id, attrs) |> Repo.insert!()

  test "Undo restores the complete week in a stable order", f do
    assert {:ok, %{data: later}} = Nutrition.create_preset_for_client(f.ctx, f.client.id, meal(f.food, "Zulu"))
    assert {:ok, _} = Nutrition.create_preset_for_client(f.ctx, f.client.id, meal(f.food, "Alpha"))
    training = set(f)
    rest = set(f, %{name: "Rest day", targets: %{}})
    target_schedule(f, training, %{weekdays_mask: 4, from_date: f.today})
    target_schedule(f, rest, %{weekdays_mask: 1, from_date: f.today})

    assert {:ok, before} = Nutrition.read_week_for_client(f.ctx, f.client.id)
    assert Enum.map(before.presets, & &1.name) == ["Alpha", "Zulu"]
    assert Enum.map(before.nutrition_targets, & &1.name) == ["Rest day", "Training day"]
    assert Enum.map(before.target_schedules, & &1.weekdays_mask) == [1, 4]

    assert {:ok, %{undo_token: token}} =
             Nutrition.update_preset_for_client(f.ctx, f.client.id, later.id, %{name: "Changed"})

    assert {:ok, _} = Nutrition.undo_for_client(f.ctx, f.client.id, token)
    assert {:ok, ^before} = Nutrition.read_week_for_client(f.ctx, f.client.id)
  end

  @tag criticality: 9
  test "all food bases, servings, unknown and zero values retain their meaning", f do
    # WHY: Unknown nutrient data must not become a known zero in coaching totals.
    assert {:ok, milk} =
             Nutrition.create_food(f.ctx, %{name: "Milk", kind: :food, basis: :"100ml", nutrients: %{energy_kcal: 50}})

    assert {:ok, capsule} =
             Nutrition.create_food(f.ctx, %{
               name: "Vitamin D",
               kind: :supplement,
               basis: :"1unit",
               unit_label: "capsule",
               nutrients: %{vitamin_d_ug: 50}
             })

    assert {:ok, 0.5} = Food.factor(f.food, 1, "bowl")
    assert {:ok, 2.0} = Food.factor(milk, 200, "ml")
    assert {:ok, 2.0} = Food.factor(capsule, 2, "capsule")
    totals = Values.totals([%{"energy_kcal" => 100, "protein_g" => 0}, %{"energy_kcal" => 50}])
    assert totals["energy_kcal"] == %{value: 150, known_entries: 2, total_entries: 2, incomplete: false}
    assert totals["protein_g"] == %{value: 0, known_entries: 1, total_entries: 2, incomplete: true}
    # No entry lists fat: the key is absent, which means unknown (N32), never a zero total.
    refute Map.has_key?(totals, "fat_g")

    assert {:error, %Ecto.Changeset{}} =
             Nutrition.create_food(f.ctx, %{name: "Unknown", kind: :food, basis: :"100g", nutrients: %{fat_g: nil}})
  end

  @tag criticality: 10
  test "food codes use the shared catalogue and cannot change a prescribed kind or serving", f do
    # WHY: Catalogue edits must leave every saved prescription valid.
    assert {:error, %Ecto.Changeset{}} = Nutrition.update_food(f.ctx, f.food.id, %{nutrients: %{not_registered: 1}})
    Repo.insert!(%Nutrient{code: "custom_mg", name: "Custom", unit: "mg", position: 100})
    assert {:ok, food} = Nutrition.update_food(f.ctx, f.food.id, %{nutrients: %{custom_mg: 2}})
    assert food.nutrients == %{"custom_mg" => 2}
    create_meal(f)
    assert {:error, %Ecto.Changeset{}} = Nutrition.update_food(f.ctx, f.food.id, %{servings: []})

    assert {:ok, %{data: _}} =
             Nutrition.create_preset_for_client(f.ctx, f.client.id, %{
               type: :food,
               food_id: f.food.id,
               amount: 100,
               unit: "g"
             })

    assert {:error, %Ecto.Changeset{}} = Nutrition.update_food(f.ctx, f.food.id, %{kind: :supplement})
  end

  @tag criticality: 10
  test "shared content with a past occurrence copies children, archives old content and splits current schedules", f do
    # WHY: A past prescription must remain readable even when the client logged nothing.
    preset = create_meal(f)
    mask = Timing.bit(Date.day_of_week(f.today))
    old = schedule(f, preset, %{weekdays_mask: mask, from_date: Date.add(f.today, -10), time: "08:00"})
    future = schedule(f, preset, %{weekdays_mask: 127, from_date: Date.add(f.today, 5), time: "10:00"})
    fact = Timing.last_fact(old, f.today)

    assert {:ok, %{data: copy}} =
             Nutrition.update_preset_for_client(f.ctx, f.client.id, preset.id, meal(f.food, "Eggs"))

    refute copy.id == preset.id
    refute hd(copy.options).id == hd(preset.options).id
    assert Repo.get!(NutritionPreset, preset.id).archived_at
    assert Repo.get!(NutritionSchedule, old.id).until_date == fact
    assert Repo.get!(NutritionSchedule, future.id).nutrition_preset_id == copy.id
    assert {:ok, week} = Nutrition.read_week_for_client(f.ctx, f.client.id)
    assert Enum.all?(week.schedules, &(&1.nutrition_preset_id == copy.id))
    assert {:ok, past} = Nutrition.read_week_for_client(f.ctx, f.client.id, on: fact)
    assert [historical] = past.presets
    assert historical.name == "Breakfast"
    assert hd(historical.options).id == hd(preset.options).id
  end

  @tag criticality: 9
  test "an old start date without an actual past occurrence does not create content history", f do
    # WHY: Future-only draft content may change without unused copies.
    preset = create_meal(f)
    tomorrow = Date.add(f.today, 1)

    row =
      schedule(f, preset, %{weekdays_mask: Timing.bit(Date.day_of_week(tomorrow)), from_date: Date.add(f.today, -1)})

    assert Timing.last_fact(row, f.today) == nil
    assert {:ok, %{data: same}} = Nutrition.update_preset_for_client(f.ctx, f.client.id, preset.id, %{name: "Changed"})
    assert same.id == preset.id
    assert Repo.get!(NutritionPreset, preset.id).archived_at == nil
    assert Repo.aggregate(NutritionPreset.for_client(f.ctx.business_id, f.client.id), :count) == 1
  end

  @tag criticality: 10
  test "timing edits keep earlier dates and removal changes only the selected weekday", f do
    # WHY: Editing the repeating week must never rewrite a past schedule fact.
    preset = create_meal(f)
    old = schedule(f, preset, %{weekdays_mask: 127, from_date: Date.add(f.today, -10), time: "08:00"})

    assert {:ok, %{data: changed}} =
             Nutrition.update_schedule_for_client(f.ctx, f.client.id, old.id, %{time: "09:00", weekdays_mask: 127})

    refute changed.id == old.id
    assert Repo.get!(NutritionSchedule, old.id).until_date == Date.add(f.today, -1)
    assert changed.from_date == f.today
    assert {:ok, _} = Nutrition.remove_schedule_for_client(f.ctx, f.client.id, changed.id, 1)
    assert Repo.get!(NutritionSchedule, changed.id).weekdays_mask == 126
    assert {:ok, _} = Nutrition.remove_schedule_for_client(f.ctx, f.client.id, changed.id)
    assert Repo.get(NutritionSchedule, changed.id) == nil
  end

  @tag criticality: 10
  test "direct amount and timing save together even when the shared item is copied", f do
    # WHY: The schedule dialog saves one user action without leaving a half-saved amount.
    assert {:ok, %{data: preset}} =
             Nutrition.create_preset_for_client(f.ctx, f.client.id, %{
               type: :food,
               food_id: f.food.id,
               amount: 100,
               unit: "g"
             })

    old = schedule(f, preset, %{weekdays_mask: 127, from_date: Date.add(f.today, -10), time: "08:00"})

    assert {:ok, %{data: changed}} =
             Nutrition.update_schedule_for_client(f.ctx, f.client.id, old.id, %{amount: 150, unit: "g", time: "09:00"})

    assert changed.time == ~T[09:00:00]
    assert Repo.get!(NutritionPreset, changed.nutrition_preset_id).amount == 150
    assert Repo.get!(NutritionPreset, preset.id).amount == 100
    assert Repo.get!(NutritionSchedule, old.id).time == ~T[08:00:00]
  end

  @tag criticality: 10
  test "Undo restores the complete content edit and rejects a later write or another client", f do
    # WHY: Undo must reverse copied content and timing together without losing concurrent work.
    preset = create_meal(f)
    old = schedule(f, preset, %{weekdays_mask: 127, from_date: Date.add(f.today, -10)})

    assert {:ok, %{data: copy, undo_token: token}} =
             Nutrition.update_preset_for_client(f.ctx, f.client.id, preset.id, meal(f.food, "Changed"))

    assert {:ok, _} = Nutrition.undo_for_client(f.ctx, f.client.id, token)
    assert Repo.get(NutritionPreset, copy.id) == nil
    assert Repo.get!(NutritionPreset, preset.id).archived_at == nil
    assert Repo.get!(NutritionSchedule, old.id).until_date == nil
    assert {:error, :conflict} = Nutrition.undo_for_client(f.ctx, f.client.id, token)

    assert {:ok, %{undo_token: token}} =
             Nutrition.update_preset_for_client(f.ctx, f.client.id, preset.id, %{name: "One"})

    assert {:ok, _} =
             Nutrition.update_preset_for_client(
               f.ctx,
               f.client.id,
               Repo.one!(NutritionPreset.for_client(f.ctx.business_id, f.client.id) |> NutritionPreset.active()).id,
               %{
                 name: "Two"
               }
             )

    assert {:error, :conflict} = Nutrition.undo_for_client(f.ctx, f.client.id, token)
    other = insert(:client, business: f.client.business, coach: f.client.coach)
    assert {:error, :conflict} = Nutrition.undo_for_client(f.ctx, other.id, token)
  end

  @tag criticality: 10
  test "target edits preserve history and assigning a day replaces the whole target set", f do
    # WHY: A client date resolves to one complete set, without adding two target sets together.
    training = set(f)
    old = target_schedule(f, training, %{weekdays_mask: 127, from_date: Date.add(f.today, -14)})

    assert {:ok, %{data: copy}} =
             Nutrition.update_targets_for_client(f.ctx, f.client.id, training.id, %{
               targets: %{energy_kcal: %{min: 3000}}
             })

    assert Repo.get!(NutritionTargets, training.id).targets["energy_kcal"]["min"] == 2500
    assert Repo.get!(TargetSchedule, old.id).until_date == Date.add(f.today, -1)
    rest = set(f, %{name: "Rest", targets: %{energy_kcal: %{min: 2200, max: 2200}}})

    assert {:ok, %{data: week}} =
             Nutrition.assign_targets_for_client(f.ctx, f.client.id, 1, %{nutrition_targets_id: rest.id})

    assert [monday] = Enum.filter(week.target_schedules, &(Bitwise.band(&1.weekdays_mask, 1) != 0))
    assert monday.nutrition_targets_id == rest.id
    assert Enum.any?(week.target_schedules, &(&1.nutrition_targets_id == copy.id and &1.weekdays_mask == 126))

    assert {:ok, %{data: week}} =
             Nutrition.assign_targets_for_client(f.ctx, f.client.id, 1, %{nutrition_targets_id: nil})

    refute Enum.any?(week.target_schedules, &(Bitwise.band(&1.weekdays_mask, 1) != 0))
  end

  @tag criticality: 10
  test "editing a day's own targets and moving a day keep one repeating row per target set", f do
    # WHY: Saving values for a day that already uses the set must not split its weekdays into fragments.
    training = set(f)
    target_schedule(f, training, %{weekdays_mask: 21, from_date: Date.add(f.today, -14)})

    assert {:ok, %{data: week}} =
             Nutrition.assign_targets_for_client(f.ctx, f.client.id, 1, %{
               nutrition_targets_id: training.id,
               target_updates: [%{id: training.id, targets: %{protein_g: %{min: 175}}}]
             })

    assert [%{weekdays_mask: 21} = current] = week.target_schedules
    assert Enum.find(week.nutrition_targets, &(&1.id == current.nutrition_targets_id)).targets["protein_g"]["min"] == 175

    rest = set(f, %{name: "Rest", targets: %{energy_kcal: %{min: 2200}}})
    target_schedule(f, rest, %{weekdays_mask: 2, from_date: f.today})

    assert {:ok, %{data: week}} =
             Nutrition.assign_targets_for_client(f.ctx, f.client.id, 3, %{nutrition_targets_id: rest.id})

    assert week.target_schedules |> Enum.map(&{&1.nutrition_targets_id, &1.weekdays_mask}) |> Enum.sort() ==
             Enum.sort([{current.nutrition_targets_id, 17}, {rest.id, 6}])
  end

  @tag criticality: 10
  test "target dialog edits, creates and assigns atomically and Undo restores all", f do
    # WHY: Switching edited sets in one dialog must not require partial independent saves.
    first = set(f)

    assert {:ok, %{data: week, undo_token: token}} =
             Nutrition.assign_targets_for_client(f.ctx, f.client.id, 3, %{
               nutrition_targets_id: nil,
               target_updates: [%{id: first.id, name: "Edited", targets: %{protein_g: %{min: 180}}}],
               new_targets: %{name: "New", targets: %{fat_g: %{max: 80}}}
             })

    assert Enum.any?(week.nutrition_targets, &(&1.name == "Edited"))
    assert Enum.any?(week.nutrition_targets, &(&1.name == "New"))
    assert {:ok, _} = Nutrition.undo_for_client(f.ctx, f.client.id, token)
    assert Repo.get!(NutritionTargets, first.id).name == "Training day"
    assert Repo.aggregate(TargetSchedule.for_client(f.ctx.business_id, f.client.id), :count) == 0

    assert {:error, %Ecto.Changeset{}} =
             Nutrition.assign_targets_for_client(f.ctx, f.client.id, 3, %{
               nutrition_targets_id: first.id,
               target_updates: [%{id: first.id, name: "Must roll back", targets: %{protein_g: %{min: 190}}}],
               new_targets: %{name: "Bad", targets: %{fat_g: %{min: 90, max: 80}}}
             })

    assert Repo.get!(NutritionTargets, first.id).name == "Training day"
  end

  @tag criticality: 10
  test "all public client operations and nested IDs reject another tenant", f do
    # WHY: Tenant IDs in nested request content must not leak or change another business.
    preset = create_meal(f)
    set = set(f)
    row = schedule(f, preset, %{weekdays_mask: 127, from_date: f.today})
    other = trainer_ctx(insert(:coach))
    assert {:error, :not_found} = Nutrition.read_week_for_client(other, f.client.id)
    assert {:error, :not_found} = Nutrition.list_presets_for_client(other, f.client.id)
    assert {:error, :not_found} = Nutrition.create_preset_for_client(other, f.client.id, meal(f.food))
    assert {:error, :not_found} = Nutrition.update_preset_for_client(other, f.client.id, preset.id, %{name: "No"})
    assert {:error, :not_found} = Nutrition.archive_preset_for_client(other, f.client.id, preset.id)

    assert {:error, :not_found} =
             Nutrition.add_schedule_for_client(other, f.client.id, %{nutrition_preset_id: preset.id, weekdays_mask: 127})

    assert {:error, :not_found} = Nutrition.update_schedule_for_client(other, f.client.id, row.id, %{time: nil})
    assert {:error, :not_found} = Nutrition.remove_schedule_for_client(other, f.client.id, row.id)
    assert {:error, :not_found} = Nutrition.create_targets_for_client(other, f.client.id, %{name: "No", targets: %{}})
    assert {:error, :not_found} = Nutrition.update_targets_for_client(other, f.client.id, set.id, %{name: "No"})

    assert {:error, :not_found} =
             Nutrition.assign_targets_for_client(other, f.client.id, 1, %{nutrition_targets_id: set.id})

    assert {:error, :not_found} = Nutrition.get_food(other, f.food.id)
    assert {:error, :not_found} = Nutrition.update_food(other, f.food.id, %{name: "No"})
    foreign = insert(:food)
    assert {:error, :not_found} = Nutrition.create_preset_for_client(f.ctx, f.client.id, meal(foreign))
    assert {:ok, %{data: []}} = Nutrition.list_foods(other)
  end

  @tag criticality: 9
  test "catalogue and meal paging use literal search, stable cursors, bounds and tenant totals", f do
    # WHY: The picker must find records beyond its first page without crossing tenant scope.
    for name <- ["Oats%", "Oats_", "Oats other"] do
      assert {:ok, _} = Nutrition.create_food(f.ctx, %{name: name, kind: :food, basis: :"100g"})
    end

    assert {:ok, %{data: [literal], count: 1}} = Nutrition.list_foods(f.ctx, search: "%")
    assert literal.name == "Oats%"
    assert {:ok, page} = Nutrition.list_foods(f.ctx, limit: 2)
    assert page.count == 4
    assert length(page.data) == 2
    assert page.next_cursor
    Repo.delete!(List.last(page.data))
    assert {:ok, next} = Nutrition.list_foods(f.ctx, limit: 2, cursor: page.next_cursor)
    assert next.count == 3
    assert length(next.data) == 2
    assert {:error, :invalid_cursor} = Nutrition.list_foods(f.ctx, cursor: "invalid")
    assert {:ok, all} = Nutrition.list_foods(f.ctx, limit: 1000)
    assert length(all.data) == 3

    {:ok, picker_food} =
      Nutrition.create_food(f.ctx, %{
        name: "Picker food",
        kind: :food,
        basis: :"100g",
        servings: [%{label: "bowl", amount: 50}]
      })

    create_meal(%{f | food: picker_food})

    assert {:ok, %{data: [meal], count: 1, next_cursor: nil}} =
             Nutrition.list_presets_for_client(f.ctx, f.client.id, search: "Break", type: "meal")

    assert meal.name == "Breakfast"
  end

  @tag criticality: 10
  test "archive preserves previously ended schedule dates and deletes unused drafts", f do
    # WHY: Archiving current content must not extend or resurrect an earlier prescription.
    preset = create_meal(f)
    ending = Date.add(f.today, -20)
    past = schedule(f, preset, %{weekdays_mask: 127, from_date: Date.add(f.today, -30), until_date: ending})
    live = schedule(f, preset, %{weekdays_mask: 127, from_date: Date.add(f.today, -10)})
    assert {:ok, _} = Nutrition.archive_preset_for_client(f.ctx, f.client.id, preset.id)
    assert Repo.get!(NutritionSchedule, past.id).until_date == ending
    assert Repo.get!(NutritionSchedule, live.id).until_date == Date.add(f.today, -1)
    assert Repo.get!(NutritionPreset, preset.id).archived_at
    draft = create_meal(f)
    future = schedule(f, draft, %{weekdays_mask: 127, from_date: Date.add(f.today, 2)})
    assert {:ok, _} = Nutrition.archive_preset_for_client(f.ctx, f.client.id, draft.id)
    assert Repo.get(NutritionPreset, draft.id) == nil
    assert Repo.get(NutritionSchedule, future.id) == nil
  end

  @tag criticality: 10
  test "Undo cannot restore rows after the client date has changed", f do
    # WHY: A short Undo offer must not delete an occurrence that became a past fact at midnight.
    create_meal(f)
    snapshot = Undo.snapshot(f.ctx, f.client.id)
    token = Undo.token(f.ctx, f.client.id, snapshot, f.today)
    assert {:error, :conflict} = Undo.restore(f.ctx, f.client.id, token, Date.add(f.today, 1))
    assert Undo.snapshot(f.ctx, f.client.id) == snapshot
  end

  @tag criticality: 9
  test "Undo remains available when keyboard focus pauses its offer", f do
    # WHY: An accessible pause must keep the offered action usable while the client date and state match.
    assert {:ok, %{undo_token: token}} = Nutrition.create_preset_for_client(f.ctx, f.client.id, meal(f.food))
    assert {:ok, payload} = Phoenix.Token.decrypt(EasyWeb.Endpoint, "client nutrition undo", token)

    paused_token =
      Phoenix.Token.encrypt(EasyWeb.Endpoint, "client nutrition undo", payload, signed_at: System.system_time(:second) - 60)

    assert {:ok, _} = Nutrition.undo_for_client(f.ctx, f.client.id, paused_token)
    assert {:ok, %{presets: []}} = Nutrition.read_week_for_client(f.ctx, f.client.id)
  end

  @tag criticality: 10
  test "read and history boundaries use the business timezone when the client has none", f do
    # WHY: The same local date must control week reads, history and prescription writes.
    now = DateTime.utc_now()
    default_date = LocalCalendar.to_local_date(now, LocalCalendar.default_timezone())
    zone = Enum.find(["Pacific/Kiritimati", "Etc/GMT+12"], &(LocalCalendar.to_local_date(now, &1) != default_date))
    business = Repo.update!(change(f.client.business, timezone: zone))
    client = Repo.update!(change(f.client, timezone: nil))
    expected = Client.local_date(%{client | business: business}, now)
    assert expected != default_date
    preset = create_meal(f)
    schedule(f, preset, %{weekdays_mask: 127, from_date: Date.add(expected, -3)})
    assert {:ok, week} = Nutrition.read_week_for_client(f.ctx, client.id)
    assert week.today == expected
    assert {:ok, %{data: _}} = Nutrition.update_preset_for_client(f.ctx, client.id, preset.id, %{name: "Changed"})
    assert {:ok, past} = Nutrition.read_week_for_client(f.ctx, client.id, on: Date.add(expected, -1))
    assert past.today == expected
    assert [old] = past.presets
    assert old.name == "Breakfast"
  end

  @tag criticality: 10
  test "assigning a target weekday retains unrelated one-offs and ended rows", f do
    # WHY: Changing the repeating week must not erase an unrelated date or extend its history.
    old = set(f)
    next_day = Date.add(f.today, 1)
    bit = Timing.bit(Date.day_of_week(next_day))
    ended = target_schedule(f, old, %{weekdays_mask: bit, from_date: Date.add(f.today, -7), until_date: f.today})
    one_off_date = Date.add(f.today, 2)
    one_off = target_schedule(f, old, %{date: one_off_date})
    next = set(f, %{name: "New", targets: %{}})

    assert {:ok, _} =
             Nutrition.assign_targets_for_client(f.ctx, f.client.id, Date.day_of_week(next_day), %{
               nutrition_targets_id: next.id
             })

    assert Repo.get!(TargetSchedule, ended.id).until_date == f.today
    assert Repo.get!(TargetSchedule, ended.id).weekdays_mask == bit
    assert Repo.get!(TargetSchedule, one_off.id).date == one_off_date
    assert Repo.get!(TargetSchedule, one_off.id).nutrition_targets_id == old.id
  end

  @tag criticality: 9
  test "known gram conversions use the food basis for capsules and liquids", f do
    # WHY: Foods with a measured mass or density may use grams without changing their nutrient basis.
    assert {:ok, capsule} =
             Nutrition.create_food(f.ctx, %{
               name: "Capsule",
               kind: :supplement,
               basis: :"1unit",
               unit_label: "capsule",
               nutrients: %{vitamin_d_ug: 50},
               servings: [%{label: "g", amount: 2}]
             })

    assert {:ok, 2.0} = Food.factor(capsule, 1, "g")
    assert Values.scale(capsule.nutrients, 2) == %{"vitamin_d_ug" => 100.0}

    assert {:ok, liquid} =
             Nutrition.create_food(f.ctx, %{
               name: "Liquid",
               kind: :food,
               basis: :"100ml",
               nutrients: %{energy_kcal: 50},
               servings: [%{label: "g", amount: 1.25}]
             })

    assert {:ok, 1.0} = Food.factor(liquid, 80, "g")
    assert Values.scale(liquid.nutrients, 1) == %{"energy_kcal" => 50.0}

    assert {:error, %Ecto.Changeset{}} =
             Nutrition.update_food(f.ctx, liquid.id, %{servings: [%{label: "ml", amount: 2}]})
  end

  @tag criticality: 8
  test "clearing required names returns validation errors without changing stored content", f do
    # WHY: Blank or null editor input must be recoverable and must not crash a Save.
    preset = create_meal(f)
    schedule(f, preset, %{weekdays_mask: 127, from_date: Date.add(f.today, 5)})
    assert {:error, %Ecto.Changeset{}} = Nutrition.update_preset_for_client(f.ctx, f.client.id, preset.id, %{name: nil})
    assert Repo.get!(NutritionPreset, preset.id).name == "Breakfast"
    assert {:error, %Ecto.Changeset{}} = Nutrition.update_food(f.ctx, f.food.id, %{name: nil})
    assert Repo.get!(Food, f.food.id).name == "Oats"
    target = set(f)

    assert {:error, %Ecto.Changeset{}} =
             Nutrition.update_targets_for_client(f.ctx, f.client.id, target.id, %{name: nil})

    assert Repo.get!(NutritionTargets, target.id).name == "Training day"
  end
end
