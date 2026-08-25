defmodule Easy.Nutrition.ProgrammingMenuItemsTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.{
    Library,
    Meal,
    Plan,
    Programming
  }

  alias Easy.Repo

  import Easy.Nutrition.ProgrammingMenuFixtures

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
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 menu(template,
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
                 )
               )

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

      assert [
               %{
                 recipe_id: recipe_id,
                 portion_kind: :serving,
                 amount: 1.0,
                 weight_g: 200.0,
                 calories: 200.0
               }
             ] =
               dinner.meal_items

      assert recipe_id == recipe.id
    end

    test "keeps a stored Food serving Portion after Library serving sizes change" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          serving_sizes: [
            %{label: "1 cup", amount: 1.0, unit: "cup", weight_g: 80.0, is_default: true}
          ]
        )

      assert {:ok, replaced} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 menu(template,
                   meals: [
                     meal_input("breakfast", "Breakfast", 0, [
                       food_item("cup", food.id, 0, %{
                         kind: :serving,
                         amount: 1,
                         unit: "cup",
                         label: "1 cup"
                       })
                     ])
                   ]
                 )
               )

      assert [%{unit: "cup", serving_label: "1 cup", weight_g: 80.0}] =
               hd(replaced.meals).meal_items

      assert {:ok, _} =
               Library.update_food(ctx, food.id, food.revision, %{
                 serving_sizes: [
                   %{label: "scoop", amount: 1.0, unit: "scoop", weight_g: 30.0, is_default: true}
                 ]
               })

      assert {:ok, current} = Programming.get_template(ctx, template.id)

      assert [%{unit: "cup", serving_label: "1 cup", weight_g: 80.0}] =
               hd(current.meals).meal_items
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
        menu(template,
          meals: [
            meal_input("one", "One", 0, [
              food_item("hidden", hidden_food.id, 0, %{kind: :gram, grams: 50})
            ])
          ]
        ),
        menu(template,
          meals: [
            meal_input("one", "One", 0, [
              recipe_item("hidden", hidden_recipe.id, 0, %{kind: :serving, amount: 1})
            ])
          ]
        ),
        menu(template,
          meals: [
            meal_input("one", "One", 0, [
              food_item("serving", food.id, 0, %{
                kind: :serving,
                amount: 1,
                unit: "cup",
                label: "1 cup"
              })
            ])
          ]
        )
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
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 menu(template,
                   meals: [
                     meal_input("breakfast", "Breakfast", 0, [
                       food_item("item", food.id, 0, %{kind: :gram, grams: 50})
                     ])
                   ]
                 )
               )

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
            build(:recipe_ingredient,
              business: coach.business,
              food: food,
              weight_g: 200.0,
              position: 0
            )
          ]
        )

      unweighed =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          servings_count: 2,
          cooked_weight_g: nil,
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
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 menu(template,
                   meals: [
                     meal_input("weighed", "Weighed", 0, [
                       recipe_item("grams", weighed.id, 0, %{kind: :gram, grams: 100})
                     ])
                   ]
                 )
               )

      assert [%{portion_kind: :gram, weight_g: 100.0}] = hd(replaced.meals).meal_items

      assert {:error, %Ecto.Changeset{valid?: false}} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 2,
                 menu(replaced,
                   meals: [
                     meal_input("unweighed", "Unweighed", 0, [
                       recipe_item("grams", unweighed.id, 0, %{kind: :gram, grams: 100})
                     ])
                   ]
                 )
               )

      assert {:ok, current} = Programming.get_template(ctx, template.id)
      assert current.revision == 2
      assert [%{name: "Weighed"}] = current.meals
    end
  end
end
