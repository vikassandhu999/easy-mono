defmodule Easy.Nutrition.ProgrammingMenuTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.{Meal, MealItem, Plan, Programming}
  alias Easy.Repo

  describe "replace_menu/4" do
    test "creates ordered Meals and Menu Items and resolves Library Portions" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          calories_per_100g: 200.0,
          protein_g_per_100g: 20.0,
          carbs_g_per_100g: 30.0,
          fat_g_per_100g: 5.0,
          fiber_g_per_100g: 2.0,
          serving_sizes: [
            %{label: "1 cup", amount: 1.0, unit: "cup", weight_g: 80.0, is_default: true}
          ]
        )

      recipe =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          servings_count: 2,
          cooked_weight_g: 400.0,
          recipe_ingredients: [
            build(:recipe_ingredient,
              business: coach.business,
              food: food,
              weight_g: 200.0,
              position: 0
            )
          ]
        )

      assert {:ok, replaced} =
               Programming.replace_menu(ctx, template.id, 1, %{
                 meals: [
                   meal_input("dinner", "Dinner", 10, [
                     recipe_item("rice", recipe.id, 20, %{kind: :serving, amount: 1})
                   ]),
                   meal_input("breakfast", "Breakfast", 0, [
                     food_item("yogurt", food.id, 0, %{kind: :gram, grams: 50}),
                     food_item("cup", food.id, 1, %{
                       kind: :serving,
                       amount: 1,
                       unit: "cup",
                       label: "1 cup"
                     })
                   ])
                 ]
               })

      assert replaced.revision == 2
      assert [breakfast, dinner] = replaced.meals
      assert breakfast.name == "Breakfast"
      assert breakfast.position == 0
      assert dinner.name == "Dinner"
      assert dinner.position == 10

      assert [yogurt, cup] = breakfast.meal_items
      assert yogurt.food_id == food.id
      assert yogurt.portion_kind == :gram
      assert yogurt.weight_g == 50.0
      assert yogurt.calories == 100.0
      assert yogurt.protein == 10.0
      assert yogurt.complete

      assert cup.food_id == food.id
      assert cup.portion_kind == :serving
      assert cup.weight_g == 80.0
      assert cup.amount == 1.0
      assert cup.unit == "cup"
      assert cup.serving_label == "1 cup"
      assert cup.calories == 160.0

      assert [%{recipe_id: recipe_id, portion_kind: :serving, amount: 1.0, weight_g: 200.0, calories: 200.0}] =
               dinner.meal_items

      assert recipe_id == recipe.id
    end

    test "retains persisted identities, reorders nodes, and deletes omitted Meals and Menu Items" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      food = insert(:food, business: coach.business, creator: coach)

      assert {:ok, created} =
               Programming.replace_menu(ctx, template.id, 1, %{
                 meals: [
                   meal_input("kept", "Kept", 0, [
                     food_item("kept-item", food.id, 0, %{kind: :gram, grams: 50}),
                     food_item("omitted-item", food.id, 1, %{kind: :gram, grams: 80})
                   ]),
                   meal_input("omitted", "Omitted", 1, [])
                 ]
               })

      [kept, omitted_meal] = created.meals
      [kept_item, omitted_item] = kept.meal_items

      assert {:ok, replaced} =
               Programming.replace_menu(ctx, template.id, 2, %{
                 meals: [
                   persisted_meal(kept.id, "Kept revised", 5, [
                     persisted_item(kept_item.id, :food, food.id, 3, %{kind: :gram, grams: 40})
                   ])
                 ]
               })

      assert [%{id: kept_id, name: "Kept revised", position: 5}] = replaced.meals
      assert kept_id == kept.id
      assert [%{id: kept_item_id, position: 3, weight_g: 40.0}] = hd(replaced.meals).meal_items
      assert kept_item_id == kept_item.id
      assert Repo.get(Meal, omitted_meal.id) == nil
      assert Repo.get(MealItem, omitted_item.id) == nil
    end

    test "rejects a stale revision without changing the Menu" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      food = insert(:food, business: coach.business, creator: coach)

      assert {:ok, _created} =
               Programming.replace_menu(ctx, template.id, 1, %{
                 meals: [meal_input("breakfast", "Breakfast", 0, [])]
               })

      assert {:error, %Ecto.Changeset{action: :stale_revision, data: %Plan{revision: 2}}} =
               Programming.replace_menu(ctx, template.id, 1, %{
                 meals: [
                   meal_input("lunch", "Lunch", 0, [
                     food_item("item", food.id, 0, %{kind: :gram, grams: 50})
                   ])
                 ]
               })

      assert {:ok, current} = Programming.get_template(ctx, template.id)
      assert current.revision == 2
      assert [%{name: "Breakfast", meal_items: []}] = current.meals
      assert Repo.aggregate(MealItem, :count, :id) == 0
    end

    test "rejects another tenant's Food or Recipe and an invalid Portion without partial writes" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      other = insert(:coach)
      hidden_food = insert(:food, business: other.business, creator: other)
      hidden_recipe = insert(:recipe, business: other.business, creator: other)
      food = insert(:food, business: coach.business, creator: coach, serving_sizes: [])

      requests = [
        %{meals: [meal_input("one", "One", 0, [food_item("hidden", hidden_food.id, 0, %{kind: :gram, grams: 50})])]},
        %{
          meals: [
            meal_input("one", "One", 0, [
              recipe_item("hidden", hidden_recipe.id, 0, %{kind: :serving, amount: 1})
            ])
          ]
        },
        %{
          meals: [
            meal_input("one", "One", 0, [
              food_item("serving", food.id, 0, %{kind: :serving, amount: 1, unit: "cup", label: "1 cup"})
            ])
          ]
        }
      ]

      for attrs <- requests do
        assert {:error, reason} = Programming.replace_menu(ctx, template.id, 1, attrs)
        assert reason == :not_found or match?(%Ecto.Changeset{valid?: false}, reason)
        assert Repo.aggregate(Meal.for_plan(template.id), :count, :id) == 0
        assert Repo.get!(Plan, template.id).revision == 1
      end
    end

    test "preserves unknown nutrient fields and full calculation precision" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          calories_per_100g: 33.333,
          protein_g_per_100g: nil,
          carbs_g_per_100g: 10.0,
          fat_g_per_100g: 1.0,
          fiber_g_per_100g: 0.0
        )

      assert {:ok, replaced} =
               Programming.replace_menu(ctx, template.id, 1, %{
                 meals: [
                   meal_input("breakfast", "Breakfast", 0, [
                     food_item("item", food.id, 0, %{kind: :gram, grams: 50})
                   ])
                 ]
               })

      [item] = hd(replaced.meals).meal_items
      assert item.calories == 16.6665
      assert item.protein == nil
      assert item.carbohydrates == 5.0
      refute item.complete
    end

    test "resolves a Recipe gram Portion when cooked weight exists and rejects one when it does not" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      food = insert(:food, business: coach.business, creator: coach, calories_per_100g: 100.0)

      weighed =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          servings_count: 2,
          cooked_weight_g: 400.0,
          recipe_ingredients: [
            build(:recipe_ingredient, business: coach.business, food: food, weight_g: 200.0, position: 0)
          ]
        )

      unweighed =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          servings_count: 2,
          cooked_weight_g: nil,
          recipe_ingredients: [
            build(:recipe_ingredient, business: coach.business, food: food, weight_g: 200.0, position: 0)
          ]
        )

      assert {:ok, replaced} =
               Programming.replace_menu(ctx, template.id, 1, %{
                 meals: [
                   meal_input("weighed", "Weighed", 0, [
                     recipe_item("grams", weighed.id, 0, %{kind: :gram, grams: 100})
                   ])
                 ]
               })

      assert [%{portion_kind: :gram, weight_g: 100.0}] = hd(replaced.meals).meal_items

      assert {:error, %Ecto.Changeset{valid?: false}} =
               Programming.replace_menu(ctx, template.id, 2, %{
                 meals: [
                   meal_input("unweighed", "Unweighed", 0, [
                     recipe_item("grams", unweighed.id, 0, %{kind: :gram, grams: 100})
                   ])
                 ]
               })

      assert {:ok, current} = Programming.get_template(ctx, template.id)
      assert current.revision == 2
      assert [%{name: "Weighed"}] = current.meals
    end

    test "rejects duplicate local references and does not write archived plans" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert {:error, %Ecto.Changeset{valid?: false}} =
               Programming.replace_menu(ctx, template.id, 1, %{
                 meals: [meal_input("same", "One", 0, []), meal_input("same", "Two", 1, [])]
               })

      assert {:ok, archived} = Programming.archive_template(ctx, template.id, 1)

      assert {:error, changeset} =
               Programming.replace_menu(ctx, archived.id, 2, %{meals: [meal_input("one", "One", 0, [])]})

      assert %{archived_at: ["is read-only"]} = errors_on(changeset)
      assert Repo.aggregate(Meal.for_plan(template.id), :count, :id) == 0
    end
  end

  describe "duplicate_template/3" do
    test "copies Meals and Menu Items onto the new Template" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      food = insert(:food, business: coach.business, creator: coach)

      assert {:ok, source} =
               Programming.replace_menu(ctx, template.id, 1, %{
                 meals: [
                   meal_input("breakfast", "Breakfast", 0, [
                     food_item("yogurt", food.id, 0, %{kind: :gram, grams: 50})
                   ])
                 ]
               })

      assert {:ok, copy} = Programming.duplicate_template(ctx, source.id, 2)
      assert [%{name: "Breakfast", id: copy_meal_id, meal_items: [item]}] = copy.meals
      assert copy_meal_id != hd(source.meals).id
      assert item.food_id == food.id
      assert item.weight_g == 50.0
      assert item.id != hd(hd(source.meals).meal_items).id
    end
  end

  defp meal_input(ref, name, position, meal_items) do
    %{local_ref: ref, name: name, position: position, meal_items: meal_items}
  end

  defp persisted_meal(id, name, position, meal_items) do
    %{id: id, name: name, position: position, meal_items: meal_items}
  end

  defp food_item(ref, food_id, position, portion) do
    %{local_ref: ref, kind: :food, food_id: food_id, position: position, portion: portion}
  end

  defp recipe_item(ref, recipe_id, position, portion) do
    %{local_ref: ref, kind: :recipe, recipe_id: recipe_id, position: position, portion: portion}
  end

  defp persisted_item(id, kind, source_id, position, portion) do
    base = %{id: id, kind: kind, position: position, portion: portion}

    case kind do
      :food -> Map.put(base, :food_id, source_id)
      :recipe -> Map.put(base, :recipe_id, source_id)
    end
  end
end
