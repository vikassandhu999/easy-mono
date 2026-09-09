defmodule Easy.Nutrition.ProgrammingMenuItemsTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.{Library, Plan, PlanReader, Programming}

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
              portion: %{kind: :gram, grams: 200.0},
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
                     meal_input("dinner", "Dinner", [
                       recipe_item("rice", recipe.id, %{kind: :serving, amount: 1, unit: "serving", label: nil})
                     ]),
                     meal_input("breakfast", "Breakfast", [
                       food_item("yogurt", food.id, %{kind: :gram, grams: 50}),
                       food_item("cup", food.id, %{
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
      assert [dinner, breakfast] = replaced.menu.meals
      assert breakfast.name == "Breakfast"
      assert dinner.name == "Dinner"

      assert [yogurt, cup] = breakfast.meal_items
      assert yogurt.food_id == food.id
      assert yogurt.portion.kind == :gram
      assert yogurt.portion.grams == 50.0
      assert yogurt.nutrients.calories == 100.0
      assert yogurt.nutrients.protein == 10.0
      assert yogurt.nutrients.complete

      assert cup.food_id == food.id
      assert cup.portion.kind == :serving
      assert cup.portion.grams == 80.0
      assert cup.portion.amount == 1.0
      assert cup.portion.unit == "cup"
      assert cup.portion.label == "1 cup"
      assert cup.nutrients.calories == 160.0

      assert [
               %{
                 recipe_id: recipe_id,
                 portion: %{kind: :serving, amount: 1.0, grams: 200.0},
                 nutrients: %{calories: 200.0}
               }
             ] =
               dinner.meal_items

      assert recipe_id == recipe.id
    end

    test "resolves serving weight changes immediately and protects referenced serving identities" do
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
                     meal_input("breakfast", "Breakfast", [
                       food_item("cup", food.id, %{
                         kind: :serving,
                         amount: 1,
                         unit: "cup",
                         label: "1 cup"
                       })
                     ])
                   ]
                 )
               )

      assert [%{portion: %{unit: "cup", label: "1 cup", grams: 80.0}}] =
               hd(replaced.menu.meals).meal_items

      assert {:ok, _} =
               Library.update_food(ctx, food.id, food.revision, %{
                 serving_sizes: [
                   %{label: "1 cup", amount: 1.0, unit: "cup", weight_g: 30.0, is_default: true}
                 ]
               })

      assert {:ok, current} = PlanReader.get_template(ctx, template.id)

      assert [%{portion: %{unit: "cup", label: "1 cup", grams: 30.0}}] =
               hd(current.menu.meals).meal_items
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
            meal_input("one", "One", [
              food_item("hidden", hidden_food.id, %{kind: :gram, grams: 50})
            ])
          ]
        ),
        menu(template,
          meals: [
            meal_input("one", "One", [
              recipe_item("hidden", hidden_recipe.id, %{kind: :serving, amount: 1, unit: "serving", label: nil})
            ])
          ]
        ),
        menu(template,
          meals: [
            meal_input("one", "One", [
              food_item("serving", food.id, %{
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
        assert Repo.get!(Plan, template.id).menu.meals == []
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
                     meal_input("breakfast", "Breakfast", [
                       food_item("item", food.id, %{kind: :gram, grams: 50})
                     ])
                   ]
                 )
               )

      [item] = hd(replaced.menu.meals).meal_items
      assert item.nutrients.calories == 16.6665
      assert item.nutrients.protein == nil
      assert item.nutrients.carbohydrates == 5.0
      refute item.nutrients.complete
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
              portion: %{kind: :gram, grams: 200.0},
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
              portion: %{kind: :gram, grams: 200.0},
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
                     meal_input("weighed", "Weighed", [
                       recipe_item("grams", weighed.id, %{kind: :gram, grams: 100})
                     ])
                   ]
                 )
               )

      assert [%{portion: %{kind: :gram, grams: 100.0}}] = hd(replaced.menu.meals).meal_items

      assert {:error, %Ecto.Changeset{valid?: false}} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 2,
                 menu(replaced,
                   meals: [
                     meal_input("unweighed", "Unweighed", [
                       recipe_item("grams", unweighed.id, %{kind: :gram, grams: 100})
                     ])
                   ]
                 )
               )

      assert {:ok, current} = PlanReader.get_template(ctx, template.id)
      assert current.revision == 2
      assert [%{name: "Weighed"}] = current.menu.meals
    end
  end
end
