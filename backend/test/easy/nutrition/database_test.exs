defmodule Easy.Nutrition.DatabaseTest do
  use Easy.DataCase, async: true
  alias Easy.Nutrition
  alias Easy.Nutrition.{Food, FoodServing, NutritionPreset, NutritionSchedule, NutritionTargets}

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach)
    ctx = trainer_ctx(coach)
    {:ok, food} = Nutrition.create_food(ctx, %{name: "Food", kind: :food, basis: :"100g"})

    {:ok, %{data: preset}} =
      Nutrition.create_preset_for_client(ctx, client.id, %{type: :food, food_id: food.id, amount: 100, unit: "g"})

    %{ctx: ctx, client: client, food: food, preset: preset}
  end

  @tag criticality: 10
  test "Postgres rejects missing masks, invalid bounds and absent direct amounts", f do
    # WHY: A direct database write must obey the same prescription invariants as the API.
    attrs = %{
      business_id: f.ctx.business_id,
      client_id: f.client.id,
      nutrition_preset_id: f.preset.id,
      from_date: Date.utc_today()
    }

    for mask <- [nil, 0, 128] do
      cs =
        change(%NutritionSchedule{}, Map.put(attrs, :weekdays_mask, mask))
        |> check_constraint(:weekdays_mask, name: :nutrition_schedules_timing)

      assert {:error, %Ecto.Changeset{}} = Repo.insert(cs)
    end

    cs = change(f.preset, amount: nil) |> check_constraint(:amount, name: :nutrition_presets_shape)
    assert {:error, %Ecto.Changeset{}} = Repo.update(cs)

    cs =
      change(%NutritionSchedule{}, Map.merge(attrs, %{weekdays_mask: 127, until_date: Date.add(Date.utc_today(), -1)}))
      |> check_constraint(:until_date, name: :nutrition_schedules_timing)

    assert {:error, %Ecto.Changeset{}} = Repo.insert(cs)
  end

  @tag criticality: 10
  test "Postgres checks registered tenant nutrient codes and ordered target bounds", f do
    # WHY: Persisted JSON must not bypass catalogue registration or target integrity.
    cs = change(f.food, nutrients: %{"missing_code" => 1}) |> check_constraint(:nutrients, name: :foods_nutrients_valid)
    assert {:error, %Ecto.Changeset{}} = Repo.update(cs)

    for bounds <- [%{"min" => -1}, %{"min" => 20, "max" => 10}, %{}, %{"min" => nil}] do
      cs =
        change(%NutritionTargets{},
          business_id: f.ctx.business_id,
          client_id: f.client.id,
          name: "Bad",
          targets: %{"energy_kcal" => bounds}
        )
        |> check_constraint(:targets, name: :nutrition_targets_values_valid)

      assert {:error, %Ecto.Changeset{}} = Repo.insert(cs)
    end
  end

  @tag criticality: 10
  test "Postgres requires an option on meals and protects food kind on updates", f do
    # WHY: A malformed aggregate must fail even when callers skip application changesets.
    Repo.query!("SET CONSTRAINTS ALL IMMEDIATE")

    cs =
      change(%NutritionPreset{}, business_id: f.ctx.business_id, client_id: f.client.id, type: :meal, name: "Empty")
      |> check_constraint(:options, name: :nutrition_presets_options_required)

    assert {:error, %Ecto.Changeset{}} = Repo.insert(cs)
    cs = change(f.food, kind: :supplement) |> check_constraint(:kind, name: :foods_prescribed_shape)
    assert {:error, %Ecto.Changeset{}} = Repo.update(cs)
    assert Repo.get!(Food, f.food.id).kind == :food
  end

  @tag criticality: 8
  test "Postgres rejects missing, nonpositive and ambiguous serving amounts", f do
    # WHY: A serving must give one positive conversion into the food basis.
    for servings <- [[%{"label" => "Cup"}], [%{"label" => "Cup", "amount" => 0}], [%{"label" => "g", "amount" => 10}]] do
      cs =
        change(f.food)
        |> put_embed(
          :servings,
          Enum.map(
            servings,
            &struct(FoodServing, %{label: &1["label"], amount: &1["amount"]})
          )
        )
        |> check_constraint(:servings, name: :foods_servings_valid)

      assert {:error, %Ecto.Changeset{}} = Repo.update(cs)
    end
  end

  @tag criticality: 8
  test "Postgres permits a known gram mass while reserving the actual capsule basis unit", f do
    # WHY: A valid mass conversion must satisfy database checks as well as application checks.
    assert {:ok, capsule} =
             Nutrition.create_food(f.ctx, %{
               name: "Capsule",
               kind: :supplement,
               basis: :"1unit",
               unit_label: "capsule",
               servings: [%{label: "g", amount: 2}]
             })

    cs =
      change(capsule)
      |> put_embed(:servings, [%FoodServing{label: "unit", amount: 2}])
      |> check_constraint(:servings, name: :foods_servings_valid)

    assert {:error, %Ecto.Changeset{}} = Repo.update(cs)
  end
end
