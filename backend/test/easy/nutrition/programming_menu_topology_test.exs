defmodule Easy.Nutrition.ProgrammingMenuTopologyTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.{Library, Menu, Plan, PlanReader, Programming}
  import Easy.Nutrition.ProgrammingMenuFixtures

  setup do
    coach = insert(:coach)
    ctx = trainer_ctx(coach)
    {:ok, plan} = Programming.create_template(ctx, %{name: "Menu"})
    food = insert(:food, business: coach.business, creator: coach)
    %{coach: coach, ctx: ctx, plan: plan, food: food}
  end

  test "saves shared meals and ordered choices, then moves items without changing identity", c do
    day = hd(c.plan.menu.day_patterns)
    a = meal_input("a", "A", [food_item("a1", c.food.id, %{kind: :gram, grams: 25}), food_item("a2", c.food.id, %{kind: :gram, grams: 50})])
    b = meal_input("b", "B", [])
    rest = uuid("rest")

    input = %{
      meals: [a, b],
      day_patterns: [
        %{id: day.id, name: "Training", slots: [%{meal_slot: :breakfast, meal_ids: [a.id, b.id]}]},
        %{id: rest, name: "Rest", slots: [%{meal_slot: :lunch, meal_ids: [a.id]}]}
      ],
      schedule: Map.put(schedule_for(day.id), :sunday, rest)
    }

    assert {:ok, first} = Programming.replace_menu(c.ctx, c.plan.id, 1, input)
    [first_item, second_item] = a.meal_items
    [training, rest_day] = input.day_patterns

    replacement = %{
      input
      | meals: [%{b | meal_items: [first_item]}, %{a | meal_items: [second_item]}],
        day_patterns: [rest_day, %{training | slots: [%{meal_slot: :breakfast, meal_ids: [b.id, a.id]}]}]
    }

    assert {:ok, saved} = Programming.replace_menu(c.ctx, first.id, 2, replacement)
    assert saved.revision == 3
    assert Enum.map(saved.menu.meals, & &1.id) == [b.id, a.id]
    assert Enum.map(Menu.items(saved.menu), & &1.id) == [first_item.id, second_item.id]
    assert Enum.map(saved.menu.day_patterns, & &1.id) == [rest, day.id]
    assert saved.menu.schedule["sunday"] == rest
    assert List.last(saved.menu.day_patterns).slots |> hd() |> Map.fetch!(:meal_ids) == [b.id, a.id]
    assert hd(saved.menu.day_patterns).slots |> hd() |> Map.fetch!(:meal_ids) == [a.id]
  end

  test "omitting values removes them, while empty and unused meals remain valid", c do
    a = meal_input("a", "A", [food_item("a1", c.food.id, %{kind: :gram, grams: 25})])
    b = meal_input("b", "B", [])
    assert {:ok, saved} = Programming.replace_menu(c.ctx, c.plan.id, 1, menu(c.plan, meals: [a, b]))
    assert {:ok, trimmed} = Programming.replace_menu(c.ctx, saved.id, 2, menu(saved, meals: [%{a | meal_items: []}]))
    assert [%{id: id, meal_items: []}] = trimmed.menu.meals
    assert id == a.id
    assert {:ok, cleared} = Programming.replace_menu(c.ctx, saved.id, 3, menu(saved, meals: []))
    assert cleared.menu.meals == []
    assert map_size(cleared.menu.schedule) == 7
  end

  test "IDs belong to their menu, so copying a document into another plan grants no access to its source", c do
    {:ok, saved} = Programming.replace_menu(c.ctx, c.plan.id, 1, menu(c.plan, meals: [meal_input("a", "A", [])]))
    {:ok, target} = Programming.create_template(c.ctx, %{name: "Target"})
    assert {:ok, copied} = Programming.replace_menu(c.ctx, target.id, 1, Menu.format(saved.menu))
    assert copied.menu == saved.menu
    assert {:ok, _} = Programming.replace_menu(c.ctx, target.id, 2, menu(copied, meals: []))
    assert [_meal] = Repo.get!(Plan, saved.id).menu.meals
    other = insert(:coach)
    assert {:error, :not_found} = Programming.replace_menu(trainer_ctx(other), saved.id, 2, Menu.format(saved.menu))
  end

  test "invalid topology rolls back the entire menu and revision", c do
    day = hd(c.plan.menu.day_patterns)
    meal = meal_input("a", "A", [])

    input = %{
      meals: [meal],
      day_patterns: [%{id: day.id, name: day.name, slots: [%{meal_slot: :breakfast, meal_ids: [meal.id]}]}],
      schedule: schedule_for(day.id)
    }

    bad_slots = [
      [%{meal_slot: :breakfast, meal_ids: []}],
      [%{meal_slot: :brunch, meal_ids: [meal.id]}],
      [%{meal_slot: :breakfast, meal_ids: [uuid("missing")]}],
      [%{meal_slot: :breakfast, meal_ids: [meal.id, meal.id]}],
      [%{meal_slot: :breakfast, meal_ids: [meal.id]}, %{meal_slot: :breakfast, meal_ids: [meal.id]}]
    ]

    bad_menus =
      [
        %{input | meals: [meal, meal]},
        %{input | meals: [%{meal | id: "invalid"}]},
        %{input | day_patterns: []},
        %{input | schedule: Map.delete(input.schedule, :monday)},
        %{input | schedule: Map.put(input.schedule, :monday, nil)},
        %{input | schedule: Map.put(input.schedule, :monday, uuid("missing"))},
        %{input | schedule: Map.put(input.schedule, :extra, day.id)}
      ] ++ Enum.map(bad_slots, fn slots -> %{input | day_patterns: [%{id: day.id, name: day.name, slots: slots}]} end)

    for candidate <- bad_menus do
      assert {:error, %Ecto.Changeset{valid?: false}} = Programming.replace_menu(c.ctx, c.plan.id, 1, candidate)
      assert %{revision: 1, menu: %{meals: []}} = Repo.get!(Plan, c.plan.id)
    end
  end

  test "item kinds and source identities are validated before saving", c do
    item = food_item("item", c.food.id, %{kind: :gram, grams: 50})

    invalid_items = [
      Map.put(item, :recipe_id, uuid("recipe")),
      %{item | food_id: nil},
      %{item | portion: %{kind: :gram, grams: 0}},
      %{item | portion: %{kind: :serving, amount: -1, unit: "cup", label: nil}}
    ]

    for invalid <- invalid_items do
      assert {:error, %Ecto.Changeset{valid?: false}} =
               Programming.replace_menu(c.ctx, c.plan.id, 1, menu(c.plan, meals: [meal_input("meal", "Meal", [invalid])]))

      assert Repo.get!(Plan, c.plan.id).revision == 1
    end
  end

  test "archive and revision conflicts retain the complete saved document", c do
    {:ok, saved} = Programming.replace_menu(c.ctx, c.plan.id, 1, menu(c.plan, meals: [meal_input("a", "A", [])]))
    assert {:error, %{action: :stale_revision}} = Programming.replace_menu(c.ctx, saved.id, 1, menu(saved, meals: []))
    {:ok, archived} = Programming.archive_plan(c.ctx, saved.id)
    assert {:error, %Ecto.Changeset{}} = Programming.replace_menu(c.ctx, saved.id, 3, menu(saved, meals: []))
    assert Repo.get!(Plan, saved.id).menu == archived.menu
  end

  test "Library names and nutrients change together without saving the menu", c do
    {:ok, saved} = Programming.replace_menu(c.ctx, c.plan.id, 1, menu(c.plan, meals: [meal_input("a", "A", [food_item("item", c.food.id, %{kind: :gram, grams: 50})])]))
    assert {:ok, _} = Library.update_food(c.ctx, c.food.id, c.food.revision, %{name: "Renamed", calories_per_100g: 901.25})
    assert {:ok, read} = PlanReader.get_template(c.ctx, saved.id)
    assert [%{name: "Renamed", nutrients: %{calories: 450.625}}] = Menu.items(read.menu)
    assert {:ok, resaved} = Programming.replace_menu(c.ctx, read.id, read.revision, Menu.format(read.menu))
    assert hd(Menu.items(resaved.menu)).nutrients.calories == 450.625
  end

  test "listing copied menu identities resolves each portion independently, including empty menus", c do
    item = food_item("shared-item", c.food.id, %{kind: :gram, grams: 25})
    meal = meal_input("shared-meal", "Meal", [item])
    {:ok, first} = Programming.replace_menu(c.ctx, c.plan.id, 1, menu(c.plan, meals: [meal]))
    {:ok, second} = Programming.duplicate_template(c.ctx, first.id)
    larger = %{meal | meal_items: [%{item | portion: %{kind: :gram, grams: 75}}]}
    {:ok, second} = Programming.replace_menu(c.ctx, second.id, second.revision, menu(second, meals: [larger]))
    {:ok, empty} = Programming.create_template(c.ctx, %{name: "Empty"})

    assert {:ok, %{templates: plans}} = PlanReader.list_templates(c.ctx)
    by_plan = Map.new(plans, &{&1.id, Menu.items(&1.menu)})
    assert [small] = by_plan[first.id]
    assert [large] = by_plan[second.id]
    assert small.id == large.id
    assert small.portion.grams == 25.0
    assert large.portion.grams == 75.0
    assert large.nutrients.calories == small.nutrients.calories * 3
    assert by_plan[empty.id] == []
  end
end
