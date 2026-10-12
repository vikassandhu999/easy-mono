defmodule Easy.Nutrition.SchemasTest do
  use Easy.SchemaCase, async: true
  alias Easy.Nutrition.{Food, FoodServing, NutritionPreset, NutritionSchedule, NutritionTargets, TargetSchedule, Timing}

  setup do
    %{
      business_id: Ecto.UUID.generate(),
      client_id: Ecto.UUID.generate(),
      parent_id: Ecto.UUID.generate(),
      today: Date.utc_today()
    }
  end

  @tag criticality: 8
  test "food requires a kind and basis, positive unique servings and known numeric values", f do
    # WHY: All portions must convert to one declared nutrient basis.
    assert Food.insert_changeset(f.business_id, %{
             name: "Milk",
             kind: :food,
             basis: :"100ml",
             nutrients: %{protein_g: 0},
             servings: [%{label: "Glass", amount: 200}]
           }).valid?

    for attrs <- [
          %{name: "Food"},
          %{name: "Food", kind: :recipe, basis: :"100g"},
          %{name: "Food", kind: :food, basis: :gram},
          %{name: "Food", kind: :food, basis: :"100g", nutrients: %{protein_g: -1}},
          %{name: "Food", kind: :food, basis: :"100g", servings: [%{label: "cup", amount: 0}]},
          %{name: "Food", kind: :food, basis: :"100g", servings: [%{label: "g", amount: 1}]}
        ] do
      refute Food.insert_changeset(f.business_id, attrs).valid?
    end

    cs =
      Food.insert_changeset(f.business_id, %{
        name: "Food",
        kind: :food,
        basis: :"100g",
        business_id: Ecto.UUID.generate()
      })

    assert get_field(cs, :business_id) == f.business_id
  end

  @tag criticality: 8
  test "meal and direct item shapes remain separate and nested identities come from parents", f do
    # WHY: A meal alternative is a complete choice rather than schedule-owned content.
    attrs = %{
      type: :meal,
      name: "Breakfast",
      business_id: Ecto.UUID.generate(),
      client_id: Ecto.UUID.generate(),
      options: [
        %{
          position: 0,
          items: [%{position: 0, food_id: f.parent_id, amount: 100, unit: "g", business_id: Ecto.UUID.generate()}]
        }
      ]
    }

    cs = NutritionPreset.insert_changeset(f.business_id, f.client_id, attrs)
    assert cs.valid?
    preset = apply_changes(cs)
    assert preset.business_id == f.business_id
    assert preset.client_id == f.client_id
    assert [option] = preset.options
    assert option.business_id == f.business_id
    assert option.nutrition_preset_id == preset.id
    assert [item] = option.items
    assert item.business_id == f.business_id
    assert item.meal_option_id == option.id

    refute NutritionPreset.insert_changeset(f.business_id, f.client_id, %{type: :meal, name: "Empty", options: []}).valid?

    refute NutritionPreset.insert_changeset(f.business_id, f.client_id, %{
             type: :meal,
             name: "Empty option",
             options: [%{position: 0, items: []}]
           }).valid?

    refute NutritionPreset.insert_changeset(f.business_id, f.client_id, %{
             type: :meal,
             name: "Mixed",
             food_id: f.parent_id,
             amount: 1,
             unit: "g",
             options: []
           }).valid?

    refute NutritionPreset.insert_changeset(f.business_id, f.client_id, %{
             type: :food,
             food_id: f.parent_id,
             amount: 0,
             unit: "g"
           }).valid?

    refute NutritionPreset.insert_changeset(
             f.business_id,
             f.client_id,
             Map.merge(attrs, %{type: :food, food_id: f.parent_id, amount: 1, unit: "g"})
           ).valid?
  end

  @tag criticality: 8
  test "targets reject empty, negative and inverted bounds while exact zero is valid", f do
    # WHY: Target wording derives from bounds and omitted nutrients have no target.
    for targets <- [
          %{energy_kcal: %{}},
          %{energy_kcal: %{min: -1}},
          %{energy_kcal: %{min: 10, max: 5}},
          %{energy_kcal: %{min: nil}}
        ] do
      refute NutritionTargets.insert_changeset(f.business_id, f.client_id, %{name: "Targets", targets: targets}).valid?
    end

    cs =
      NutritionTargets.insert_changeset(f.business_id, f.client_id, %{
        name: "Targets",
        targets: %{energy_kcal: %{min: 0, max: 0}},
        client_id: Ecto.UUID.generate()
      })

    assert cs.valid?
    assert get_field(cs, :client_id) == f.client_id
    assert get_field(cs, :targets) == %{"energy_kcal" => %{"min" => 0, "max" => 0}}
  end

  @tag criticality: 8
  test "both schedule concepts require explicit masks and valid inclusive bounds", f do
    # WHY: A missing mask cannot silently become every day.
    for schema <- [NutritionSchedule, TargetSchedule] do
      assert schema.insert_changeset(f.business_id, f.client_id, f.parent_id, %{date: f.today}).valid?

      assert schema.insert_changeset(f.business_id, f.client_id, f.parent_id, %{
               weekdays_mask: 127,
               from_date: f.today,
               until_date: f.today
             }).valid?

      for attrs <- [
            %{from_date: f.today},
            %{weekdays_mask: 0, from_date: f.today},
            %{weekdays_mask: 128, from_date: f.today},
            %{date: f.today, weekdays_mask: 1},
            %{weekdays_mask: 1, from_date: f.today, until_date: Date.add(f.today, -1)}
          ] do
        refute schema.insert_changeset(f.business_id, f.client_id, f.parent_id, attrs).valid?
      end

      cs =
        schema.insert_changeset(f.business_id, f.client_id, f.parent_id, %{
          weekdays_mask: 1,
          from_date: f.today,
          business_id: Ecto.UUID.generate(),
          client_id: Ecto.UUID.generate()
        })

      assert get_field(cs, :business_id) == f.business_id
      assert get_field(cs, :client_id) == f.client_id
    end
  end

  @tag criticality: 7
  test "facts and overlap follow actual weekday occurrences and today is not a fact", f do
    # WHY: An old start date alone does not establish prescription history.
    row = %{date: nil, weekdays_mask: 127, from_date: f.today, until_date: nil}
    assert Timing.last_fact(row, f.today) == nil
    assert Timing.last_fact(%{date: f.today}, f.today) == nil
    assert Timing.last_fact(%{date: Date.add(f.today, -1)}, f.today) == Date.add(f.today, -1)
    refute Timing.overlap?(%{row | weekdays_mask: 1}, %{row | weekdays_mask: 2})
    assert Timing.overlap?(row, %{row | from_date: Date.add(f.today, 1)})
    refute Timing.overlap?(%{row | until_date: f.today}, %{row | from_date: Date.add(f.today, 1)})
  end

  @tag criticality: 8
  test "clearing a serving label returns a required-field error" do
    # WHY: Nullable draft input must not crash a serving edit.
    cs = FoodServing.changeset(%FoodServing{label: "Cup", amount: 100}, %{label: nil})
    refute cs.valid?
    assert errors_on(cs) == %{label: ["can't be blank"]}
  end
end
