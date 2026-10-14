defmodule Easy.Nutrition.LoggingTest do
  use Easy.DataCase, async: true
  alias Easy.{Ctx, Nutrition, NutritionLogs}
  alias Easy.Nutrition.{FoodLog, FoodServing, NutritionLog, NutritionPreset, NutritionSchedule, Timing}

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")
    food = insert(:food, business: coach.business, name: "Oats", servings: [%FoodServing{label: "bowl", amount: 50}])
    ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    %{coach: trainer_ctx(coach), ctx: ctx, client: client, food: food, today: Date.utc_today()}
  end

  defp entry(food, attrs \\ %{}), do: Map.merge(%{food_id: food.id, amount: 100, unit: "g"}, attrs)
  defp attrs(f, entries \\ nil), do: %{logged_on: f.today, food_logs: entries || [entry(f.food)]}

  defp planned(f, type \\ :meal) do
    content =
      if type == :meal,
        do: %{type: :meal, name: "Breakfast", options: [%{items: [entry(f.food)]}]},
        else: %{type: type, food_id: f.food.id, amount: 100, unit: "g"}

    assert {:ok, %{data: preset}} = Nutrition.create_preset_for_client(f.coach, f.client.id, content)
    schedule = NutritionSchedule.insert_changeset(f.ctx.business_id, f.client.id, preset.id, %{weekdays_mask: 127, from_date: f.today, time: "08:00"}) |> Repo.insert!()
    {preset, schedule}
  end

  defp planned_attrs(f, preset, schedule) do
    option = hd(preset.options)
    item = hd(option.items)

    Map.merge(
      attrs(f, [entry(f.food, %{meal_item_id: item.id})]),
      %{nutrition_schedule_id: schedule.id, scheduled_date: f.today, meal_option_id: option.id}
    )
  end

  @tag criticality: 9
  test "unplanned occasions derive their type and copy all food data", f do
    # WHY: The client records intake without choosing an internal log type or supplying nutrient values.
    assert {:ok, row} =
             NutritionLogs.create_client_nutrition_log(
               f.ctx,
               Map.merge(attrs(f), %{type: :meal, recorded_by: Ecto.UUID.generate(), business_id: Ecto.UUID.generate()})
             )

    assert row.type == :food
    assert row.recorded_by == f.ctx.user_id
    assert row.business_id == f.ctx.business_id
    assert [food] = row.food_logs
    assert food.name == "Oats"
    assert food.basis == :"100g"
    assert food.nutrients == %{"energy_kcal" => 200.0, "protein_g" => 20.0}
    assert [%{label: "bowl", amount: 50.0}] = food.servings
    assert FoodLog.nutrient_values(food) == %{"energy_kcal" => 200.0, "protein_g" => 20.0}

    supplement = insert(:food, business: f.client.business, kind: :supplement, basis: :"1unit", unit_label: "capsule")

    assert {:ok, %{type: :supplement}} =
             NutritionLogs.create_client_nutrition_log(
               f.ctx,
               attrs(f, [entry(supplement, %{amount: 1, unit: "capsule"})])
             )

    assert {:ok, %{type: :meal}} =
             NutritionLogs.create_client_nutrition_log(
               f.ctx,
               attrs(f, [entry(f.food), entry(supplement, %{amount: 1, unit: "capsule"})])
             )
  end

  @tag criticality: 10
  test "a one-item planned meal keeps its option and prescribed item links", f do
    # WHY: One-item meals remain meals and swaps are derived from stable prescription links.
    {preset, schedule} = planned(f)
    input = planned_attrs(f, preset, schedule)
    assert {:ok, row} = NutritionLogs.create_client_nutrition_log(f.ctx, input)
    assert row.type == :meal
    assert row.nutrition_preset_id == preset.id
    assert row.nutrition_schedule_id == schedule.id
    assert row.meal_option_id == hd(preset.options).id
    assert hd(row.food_logs).meal_item_id == hd(hd(preset.options).items).id
    assert {:error, :conflict} = NutritionLogs.create_client_nutrition_log(f.ctx, input)
    assert Repo.aggregate(NutritionLog, :count) == 1
  end

  @tag criticality: 10
  test "corrections use the saved copy, including when the caller omits the item id", f do
    # WHY: Changing the catalogue must never rewrite the nutrients in a prior record.
    assert {:ok, original} = NutritionLogs.create_client_nutrition_log(f.ctx, attrs(f))
    original_entry = hd(original.food_logs)
    assert {:ok, _} = Nutrition.update_food(f.coach, f.food.id, %{name: "Changed", nutrients: %{energy_kcal: 900}, servings: [%{label: "bowl", amount: 200}]})

    assert {:ok, %{data: corrected, undo_token: token}} =
             NutritionLogs.update_client_nutrition_log(f.ctx, original.id, %{food_logs: [entry(f.food, %{amount: 2, unit: "bowl", name: "Forged", nutrients: %{energy_kcal: 1}})]})

    assert [copy] = corrected.food_logs
    assert copy.id == original_entry.id
    assert copy.name == "Oats"
    assert FoodLog.nutrient_values(copy)["energy_kcal"] == 200.0
    assert {:ok, restored} = NutritionLogs.restore_client_nutrition_log(f.ctx, token)
    assert hd(restored.food_logs).amount == 100.0
    assert hd(restored.food_logs).nutrients == original_entry.nutrients
  end

  @tag criticality: 9
  test "replacement keeps the prescribed link and copies the replacement food", f do
    # WHY: A replacement records what was consumed while retaining what it replaced.
    {preset, schedule} = planned(f)
    assert {:ok, original} = NutritionLogs.create_client_nutrition_log(f.ctx, planned_attrs(f, preset, schedule))
    old = hd(original.food_logs)
    replacement = insert(:food, business: f.client.business, name: "Milk", basis: :"100ml", nutrients: %{"energy_kcal" => 50})

    assert {:ok, %{data: corrected}} =
             NutritionLogs.update_client_nutrition_log(f.ctx, original.id, %{
               food_logs: [entry(replacement, %{id: old.id, amount: 200, unit: "ml", meal_item_id: old.meal_item_id})]
             })

    assert [copy] = corrected.food_logs
    assert copy.name == "Milk"
    assert copy.meal_item_id == old.meal_item_id
    assert FoodLog.nutrient_values(copy) == %{"energy_kcal" => 100.0}
  end

  @tag criticality: 10
  test "failed saves have no partial record and invalid corrections keep existing values", f do
    # WHY: Saving one consumption occasion is atomic and never leaves a server draft.
    for input <- [
          attrs(f, []),
          attrs(f, [entry(f.food, %{amount: 0})]),
          attrs(f, [entry(f.food, %{unit: "wrong"})]),
          %{logged_on: f.today, food_logs: [nil]},
          %{food_logs: [entry(f.food)]}
        ] do
      assert {:error, _} = NutritionLogs.create_client_nutrition_log(f.ctx, input)
    end

    assert Repo.aggregate(NutritionLog, :count) == 0
    assert Repo.aggregate(FoodLog, :count) == 0
    assert {:ok, original} = NutritionLogs.create_client_nutrition_log(f.ctx, attrs(f))
    assert {:error, _} = NutritionLogs.update_client_nutrition_log(f.ctx, original.id, %{logged_at: "12:00", food_logs: [entry(f.food, %{amount: -1})]})
    assert {:ok, unchanged} = NutritionLogs.get_client_nutrition_log(f.ctx, original.id)
    assert unchanged.logged_at == nil
    assert hd(unchanged.food_logs).amount == 100.0
  end

  @tag criticality: 10
  test "future dates and nonexistent occurrences cannot be claimed", f do
    # WHY: Future prescriptions are read only and a log can claim only an expected occurrence.
    assert {:error, :future_date} =
             NutritionLogs.create_client_nutrition_log(
               f.ctx,
               Map.put(attrs(f), :logged_on, Date.add(f.today, 1))
             )

    {preset, schedule} = planned(f)
    input = planned_attrs(f, preset, schedule)

    assert {:error, :invalid_occurrence} =
             NutritionLogs.create_client_nutrition_log(
               f.ctx,
               Map.put(input, :scheduled_date, Date.add(f.today, -1))
             )

    assert {:error, :invalid_occurrence} =
             NutritionLogs.create_client_nutrition_log(
               f.ctx,
               Map.delete(input, :scheduled_date)
             )
  end

  @tag criticality: 10
  test "prescribed item links and direct occasion cardinality reject unrelated data", f do
    # WHY: An item cannot falsely claim that it follows another meal option.
    {preset, schedule} = planned(f)
    bad = planned_attrs(f, preset, schedule) |> Map.put(:food_logs, [entry(f.food, %{meal_item_id: Ecto.UUID.generate()})])
    assert {:error, :invalid_nutrition_item} = NutritionLogs.create_client_nutrition_log(f.ctx, bad)
    {direct, direct_schedule} = planned(f, :food)

    input =
      Map.merge(
        attrs(f, [entry(f.food), entry(f.food)]),
        %{nutrition_schedule_id: direct_schedule.id, scheduled_date: f.today, nutrition_preset_id: direct.id}
      )

    assert {:error, :invalid_nutrition_item} = NutritionLogs.create_client_nutrition_log(f.ctx, input)
  end

  @tag criticality: 10
  test "deletion and inverse restore retain exact snapshots and reject reuse or tampering", f do
    # WHY: Undo must recover a deleted record without trusting client-supplied nutrient copies.
    assert {:ok, original} = NutritionLogs.create_client_nutrition_log(f.ctx, attrs(f))
    assert {:ok, %{undo_token: token}} = NutritionLogs.delete_client_nutrition_log(f.ctx, original.id)
    assert {:error, :not_found} = NutritionLogs.get_client_nutrition_log(f.ctx, original.id)
    assert Repo.aggregate(FoodLog, :count) == 0
    assert {:error, :conflict} = NutritionLogs.restore_client_nutrition_log(f.ctx, token <> "tampered")
    assert {:ok, restored} = NutritionLogs.restore_client_nutrition_log(f.ctx, token)
    assert restored.id == original.id
    assert hd(restored.food_logs).id == hd(original.food_logs).id
    assert hd(restored.food_logs).nutrients == hd(original.food_logs).nutrients
    assert {:error, :conflict} = NutritionLogs.restore_client_nutrition_log(f.ctx, token)
    assert {:error, :not_found} = NutritionLogs.delete_client_nutrition_log(f.ctx, Ecto.UUID.generate())
  end

  @tag criticality: 10
  test "a later correction prevents an earlier Undo from overwriting it", f do
    # WHY: Undo must not overwrite changes that followed the offered correction.
    assert {:ok, original} = NutritionLogs.create_client_nutrition_log(f.ctx, attrs(f))
    assert {:ok, %{undo_token: token}} = NutritionLogs.update_client_nutrition_log(f.ctx, original.id, %{logged_at: "10:00"})
    assert {:ok, _} = NutritionLogs.update_client_nutrition_log(f.ctx, original.id, %{logged_at: "11:00"})
    assert {:error, :conflict} = NutritionLogs.restore_client_nutrition_log(f.ctx, token)
    assert {:ok, %{logged_at: ~T[11:00:00]}} = NutritionLogs.get_client_nutrition_log(f.ctx, original.id)
  end

  @tag criticality: 10
  test "all client reads and mutations isolate clients and tenants", f do
    # WHY: Trusted client context must never grant access to another client's data.
    assert {:ok, original} = NutritionLogs.create_client_nutrition_log(f.ctx, attrs(f))
    assert {:ok, %{undo_token: token}} = NutritionLogs.update_client_nutrition_log(f.ctx, original.id, %{logged_at: "10:00"})
    other_client = insert(:client, business: f.client.business)
    foreign = insert(:client)

    for client <- [other_client, foreign] do
      ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
      assert {:ok, %{nutrition_logs: [], count: 0}} = NutritionLogs.list_client_nutrition_logs(ctx)
      assert {:error, :not_found} = NutritionLogs.get_client_nutrition_log(ctx, original.id)
      assert {:error, :not_found} = NutritionLogs.update_client_nutrition_log(ctx, original.id, %{logged_at: "11:00"})
      assert {:error, :not_found} = NutritionLogs.delete_client_nutrition_log(ctx, original.id)
      assert {:error, :conflict} = NutritionLogs.restore_client_nutrition_log(ctx, token)
    end

    foreign_ctx = %Ctx{business_id: foreign.business_id, user_id: foreign.user_id, client_id: foreign.id}
    assert {:error, :not_found} = NutritionLogs.create_client_nutrition_log(foreign_ctx, attrs(f))
    assert {:error, :not_found} = NutritionLogs.get_client_food(foreign_ctx, f.food.id)
    assert {:ok, %{data: []}} = NutritionLogs.list_client_foods(foreign_ctx)
    invalid_ctx = %{f.ctx | business_id: foreign.business_id}
    assert {:error, :not_found} = NutritionLogs.list_client_nutrition_logs(invalid_ctx)
    assert {:error, :not_found} = NutritionLogs.create_client_nutrition_log(invalid_ctx, attrs(f))
    assert {:error, :not_found} = NutritionLogs.update_client_nutrition_log(invalid_ctx, original.id, %{})
    assert {:error, :not_found} = NutritionLogs.delete_client_nutrition_log(invalid_ctx, original.id)
    assert {:error, :not_found} = NutritionLogs.restore_client_nutrition_log(invalid_ctx, token)
  end

  @tag criticality: 9
  test "list reads sort by day and time with items without time last", f do
    # WHY: Recorded intake must have a stable order that matches the daily view.
    assert {:ok, no_time} = NutritionLogs.create_client_nutrition_log(f.ctx, attrs(f))
    assert {:ok, morning} = NutritionLogs.create_client_nutrition_log(f.ctx, Map.put(attrs(f), :logged_at, "08:00"))

    assert {:ok, yesterday} =
             NutritionLogs.create_client_nutrition_log(
               f.ctx,
               Map.put(attrs(f), :logged_on, Date.add(f.today, -1))
             )

    assert {:ok, %{nutrition_logs: rows, count: 3}} = NutritionLogs.list_client_nutrition_logs(f.ctx)
    assert Enum.map(rows, & &1.id) == [yesterday.id, morning.id, no_time.id]
    page = NutritionLogs.list_client_nutrition_logs(f.ctx, logged_on: f.today, limit: 1)
    assert {:ok, %{nutrition_logs: [first], count: 2}} = page
    assert first.id == morning.id
    assert {:error, :invalid_date} = NutritionLogs.list_client_nutrition_logs(f.ctx, logged_on: "bad")
  end

  @tag criticality: 10
  test "a claimed occurrence freezes today's preset and schedule while future uses change", f do
    # WHY: A coach edit after logging must not change the prescription the record followed.
    {preset, schedule} = planned(f)
    assert {:ok, original} = NutritionLogs.create_client_nutrition_log(f.ctx, planned_attrs(f, preset, schedule))
    assert {:ok, %{data: copy}} = Nutrition.update_preset_for_client(f.coach, f.client.id, preset.id, %{name: "New breakfast"})
    refute copy.id == preset.id
    assert Repo.get!(NutritionPreset, preset.id).name == "Breakfast"
    assert Repo.get!(NutritionPreset, preset.id).archived_at
    assert Repo.get!(NutritionSchedule, schedule.id).until_date == f.today
    query = NutritionSchedule.for_client(f.ctx.business_id, f.client.id)
    next = query |> where([s], s.nutrition_preset_id == ^copy.id) |> Repo.one!()
    assert next.from_date == Date.add(f.today, 1)
    assert hd(original.food_logs).meal_item_id == hd(hd(preset.options).items).id
    assert {:ok, %{data: corrected}} = NutritionLogs.update_client_nutrition_log(f.ctx, original.id, %{logged_at: "09:00"})
    assert corrected.nutrition_preset_id == preset.id
    assert {:ok, week} = Nutrition.read_week_for_client(f.coach, f.client.id)

    assert Enum.all?(week.schedules, fn schedule ->
             Enum.any?(week.presets, &(&1.id == schedule.nutrition_preset_id))
           end)
  end

  @tag criticality: 10
  test "today's timing changes in place before logging and keeps today after logging", f do
    # WHY: Same-day history starts with a claimed occurrence rather than an unused prescription.
    {preset, schedule} = planned(f)
    assert {:ok, %{data: same}} = Nutrition.update_schedule_for_client(f.coach, f.client.id, schedule.id, %{time: "09:00"})
    assert same.id == schedule.id
    assert {:ok, _} = NutritionLogs.create_client_nutrition_log(f.ctx, planned_attrs(f, preset, schedule))
    assert {:ok, %{data: later}} = Nutrition.update_schedule_for_client(f.coach, f.client.id, schedule.id, %{time: "10:00"})
    refute later.id == schedule.id
    assert later.from_date == Date.add(f.today, 1)
    assert Repo.get!(NutritionSchedule, schedule.id).time == ~T[09:00:00]
    assert Repo.get!(NutritionSchedule, schedule.id).until_date == f.today
    assert Timing.last_fact(schedule, f.today, true) == f.today
  end

  @tag criticality: 10
  test "a new log prevents an earlier coach Undo from removing its prescription", f do
    # WHY: A pending coach Undo must not delete the prescription after the client claims it.
    {preset, schedule} = planned(f)
    assert {:ok, %{undo_token: token}} = Nutrition.update_preset_for_client(f.coach, f.client.id, preset.id, %{name: "Changed"})
    assert {:ok, _} = NutritionLogs.create_client_nutrition_log(f.ctx, planned_attrs(f, preset, schedule))
    assert {:error, :conflict} = Nutrition.undo_for_client(f.coach, f.client.id, token)
    assert Repo.get!(NutritionPreset, preset.id).name == "Changed"
  end

  @tag criticality: 9
  test "two entries for the same food keep separate copies when ids are omitted", f do
    # WHY: Repeated intake of the same food must not collide or silently reuse a saved item's identity.
    assert {:ok, original} =
             NutritionLogs.create_client_nutrition_log(
               f.ctx,
               attrs(f, [entry(f.food), entry(f.food, %{amount: 50})])
             )

    assert {:ok, _} = Nutrition.update_food(f.coach, f.food.id, %{nutrients: %{energy_kcal: 900}})
    assert {:ok, %{data: corrected}} = NutritionLogs.update_client_nutrition_log(f.ctx, original.id, %{food_logs: [entry(f.food, %{amount: 150}), entry(f.food, %{amount: 75})]})
    assert Enum.map(corrected.food_logs, & &1.id) == Enum.map(original.food_logs, & &1.id)
    assert Enum.map(corrected.food_logs, &FoodLog.nutrient_values(&1)["energy_kcal"]) == [300.0, 150.0]
    assert {:error, %Ecto.Changeset{}} = NutritionLogs.list_client_nutrition_logs(f.ctx, offset: -1)
    assert {:error, %Ecto.Changeset{}} = NutritionLogs.list_client_nutrition_logs(f.ctx, limit: 0)
  end

  @tag criticality: 10
  test "Postgres enforces saved occasion cardinality and the selected option's links", f do
    # WHY: Direct database writes must obey the same intake rules as context operations.
    {preset, schedule} = planned(f)
    {other_preset, _} = planned(f)
    assert {:ok, original} = NutritionLogs.create_client_nutrition_log(f.ctx, planned_attrs(f, preset, schedule))
    assert {:ok, direct} = NutritionLogs.create_client_nutrition_log(f.ctx, attrs(f))
    Repo.query!("SET CONSTRAINTS ALL IMMEDIATE")
    invalid = direct |> change(type: :supplement) |> check_constraint(:type, name: :nutrition_logs_items_valid)
    assert {:error, %Ecto.Changeset{}} = Repo.update(invalid)

    duplicate = Ecto.put_meta(hd(direct.food_logs), state: :built)

    invalid_entry =
      duplicate
      |> change(id: Ecto.UUID.generate(), position: 1)
      |> check_constraint(:nutrition_log_id, name: :nutrition_logs_items_valid)

    assert {:error, %Ecto.Changeset{}} = Repo.insert(invalid_entry)
    wrong_link = hd(hd(other_preset.options).items).id
    invalid = FoodLog.update_changeset(hd(original.food_logs), %{meal_item_id: wrong_link})
    assert {:error, %Ecto.Changeset{}} = Repo.update(invalid)
    assert Repo.get!(NutritionLog, direct.id).type == :food
  end

  @tag criticality: 10
  test "Undo rejects a deleted record after its same-day prescription changed", f do
    # WHY: An inverse operation cannot attach an old record to prescription content that no longer matches.
    {preset, schedule} = planned(f)
    assert {:ok, original} = NutritionLogs.create_client_nutrition_log(f.ctx, planned_attrs(f, preset, schedule))
    assert {:ok, %{undo_token: token}} = NutritionLogs.delete_client_nutrition_log(f.ctx, original.id)
    assert {:ok, %{data: same}} = Nutrition.update_preset_for_client(f.coach, f.client.id, preset.id, %{name: "Changed"})
    assert same.id == preset.id
    assert {:error, :conflict} = NutritionLogs.restore_client_nutrition_log(f.ctx, token)
    assert {:error, :not_found} = NutritionLogs.get_client_nutrition_log(f.ctx, original.id)
  end

  @tag criticality: 10
  test "a coach can undo a future content copy without deleting the prescription used by a log", f do
    # WHY: Undoing coach edits must preserve already-recorded prescription references.
    {preset, schedule} = planned(f)
    assert {:ok, original} = NutritionLogs.create_client_nutrition_log(f.ctx, planned_attrs(f, preset, schedule))
    assert {:ok, %{undo_token: token}} = Nutrition.update_preset_for_client(f.coach, f.client.id, preset.id, %{name: "Future"})
    assert {:ok, _} = Nutrition.undo_for_client(f.coach, f.client.id, token)
    assert {:ok, current} = NutritionLogs.get_client_nutrition_log(f.ctx, original.id)
    assert current.nutrition_preset_id == preset.id
    assert Repo.get!(NutritionPreset, preset.id).name == "Breakfast"
    assert Repo.get!(NutritionPreset, preset.id).archived_at == nil
    assert Repo.get!(NutritionSchedule, schedule.id).until_date == nil
    assert Repo.aggregate(NutritionPreset.for_client(f.ctx.business_id, f.client.id), :count) == 1
  end

  @tag criticality: 10
  test "Undo reports a conflict when another log has claimed the deleted occurrence", f do
    # WHY: A stale Undo must preserve the new record and return the same conflict result as a duplicate save.
    {preset, schedule} = planned(f)
    input = planned_attrs(f, preset, schedule)
    assert {:ok, original} = NutritionLogs.create_client_nutrition_log(f.ctx, input)
    assert {:ok, %{undo_token: token}} = NutritionLogs.delete_client_nutrition_log(f.ctx, original.id)
    assert {:ok, replacement} = NutritionLogs.create_client_nutrition_log(f.ctx, input)
    assert {:error, :conflict} = NutritionLogs.restore_client_nutrition_log(f.ctx, token)
    assert {:error, :not_found} = NutritionLogs.get_client_nutrition_log(f.ctx, original.id)
    assert {:ok, current} = NutritionLogs.get_client_nutrition_log(f.ctx, replacement.id)
    assert current.food_logs == replacement.food_logs
    assert Repo.aggregate(NutritionLog.for_client(f.ctx.business_id, f.client.id), :count) == 1
  end
end
