defmodule Easy.Nutrition.LibraryRecipeTest do
  alias Easy.Nutrition.Portions
  use Easy.SchemaCase
  alias Easy.Nutrition.Library
  alias Easy.Nutrition.{Programming, ProgrammingMenuFixtures, Recipe}
  alias Easy.Repo

  test "ingredient servings resolve into grams and retain their named portion when copied" do
    coach = insert(:coach)

    food =
      insert(:food,
        business: coach.business,
        creator: coach,
        serving_sizes: [
          %{label: "Heaped scoop", amount: 1.0, unit: "scoop", weight_g: 30.0, is_default: true}
        ]
      )

    ctx = trainer_ctx(coach)

    {:ok, recipe} =
      Library.create_recipe(ctx, %{
        name: "Porridge",
        servings_count: 1,
        recipe_ingredients: [
          %{
            food_id: food.id,
            portion: %{kind: :serving, amount: 1.5, unit: "scoop", label: "Heaped scoop"}
          }
        ]
      })

    [ingredient] = recipe.recipe_ingredients
    assert ingredient.portion.kind == :serving
    assert ingredient.portion.grams == nil
    assert ingredient.portion.amount == 1.5
    assert ingredient.portion.label == "Heaped scoop"
    {:ok, copied} = Library.copy_recipe(ctx, recipe.id)
    assert hd(copied.recipe_ingredients).portion.grams == nil
    assert hd(copied.recipe_ingredients).portion.label == "Heaped scoop"
  end

  test "ingredient servings and menu recipe totals follow the current Food without resaving" do
    coach = insert(:coach)
    ctx = trainer_ctx(coach)
    serving = %{label: "Scoop", amount: 1.0, unit: "scoop", weight_g: 30.0, is_default: true}
    food = insert(:food, business: coach.business, creator: coach, calories_per_100g: 100.0, serving_sizes: [serving])

    {:ok, recipe} =
      Library.create_recipe(ctx, %{
        name: "Porridge",
        servings_count: 2,
        recipe_ingredients: [%{food_id: food.id, portion: %{kind: :serving, amount: 2.0, unit: "scoop", label: "Scoop"}}]
      })

    {:ok, plan} = Programming.create_template(ctx, %{name: "Menu"})

    input =
      ProgrammingMenuFixtures.menu(plan,
        meals: [
          ProgrammingMenuFixtures.meal_input("meal", "Meal", [
            ProgrammingMenuFixtures.recipe_item("recipe", recipe.id, %{kind: :serving, amount: 1.0, unit: "serving", label: nil})
          ])
        ]
      )

    {:ok, saved} = Programming.replace_menu(ctx, plan.id, plan.revision, input)
    assert hd(hd(saved.menu.meals).meal_items).nutrients.calories == 30.0
    {:ok, _} = Library.update_food(ctx, food.id, food.revision, %{calories_per_100g: 200.0, serving_sizes: [%{serving | weight_g: 50.0}]})
    {:ok, current_recipe} = Library.get_recipe(ctx, recipe.id)
    assert Library.recipe_nutrients(current_recipe).calories == 200.0
    {:ok, current_plan} = Programming.get_template(ctx, plan.id)
    assert current_plan.revision == saved.revision
    assert hd(hd(current_plan.menu.meals).meal_items).nutrients.calories == 100.0
  end

  describe("create_recipe/2") do
    test "stamps business ownership, creator, and revision 1" do
      coach = insert(:coach)

      assert {:ok, recipe} =
               Library.create_recipe(trainer_ctx(coach), %{name: "Dal tadka", servings_count: 4})

      assert recipe.business_id == coach.business_id
      assert recipe.creator_id == coach.id
      assert recipe.revision == 1
      assert recipe.servings_count == 4
      assert recipe.cooked_weight_g == nil
    end

    test "trusts the coach identity carried by Ctx" do
      coach = insert(:coach)
      ctx = %{trainer_ctx(coach) | user_id: Ecto.UUID.generate()}
      assert {:ok, recipe} = Library.create_recipe(ctx, %{name: "Dal tadka", servings_count: 4})
      assert recipe.creator_id == coach.id
    end

    test "rejects a non-positive servings count" do
      coach = insert(:coach)

      assert {:error, changeset} =
               Library.create_recipe(trainer_ctx(coach), %{name: "Soup", servings_count: 0})

      assert %{servings_count: _} = errors_on(changeset)
    end

    test "rejects a non-positive cooked weight" do
      coach = insert(:coach)

      assert {:error, changeset} =
               Library.create_recipe(trainer_ctx(coach), %{
                 name: "Soup",
                 servings_count: 2,
                 cooked_weight_g: 0
               })

      assert %{cooked_weight_g: _} = errors_on(changeset)
    end

    test "stamps unique positions from ingredient order and requires visible foods" do
      coach = insert(:coach)
      first = insert(:food, business: coach.business, creator: coach, name: "Lentils")
      second = insert(:food, business: coach.business, creator: coach, name: "Onion")

      assert {:ok, recipe} =
               Library.create_recipe(trainer_ctx(coach), %{
                 name: "Dal",
                 servings_count: 2,
                 recipe_ingredients: [
                   %{portion: %{kind: :gram, grams: 100.0}, food_id: first.id},
                   %{portion: %{kind: :gram, grams: 50.0}, food_id: second.id}
                 ]
               })

      assert [
               %{food_id: first_id, portion: %{kind: :gram, grams: 100.0}, position: 0},
               %{food_id: second_id, portion: %{kind: :gram, grams: 50.0}, position: 1}
             ] = recipe.recipe_ingredients

      assert first_id == first.id
      assert second_id == second.id
    end

    test "rejects ingredients whose food is not visible to the business" do
      coach = insert(:coach)
      other = insert(:coach)
      hidden = insert(:food, business: other.business, creator: other)

      assert {:error, changeset} =
               Library.create_recipe(trainer_ctx(coach), %{
                 name: "Cross tenant",
                 servings_count: 1,
                 recipe_ingredients: [
                   %{portion: %{kind: :gram, grams: 100.0}, food_id: hidden.id}
                 ]
               })

      assert changeset == :not_found
    end

    test "rejects a non-positive ingredient weight" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach)

      assert {:error, changeset} =
               Library.create_recipe(trainer_ctx(coach), %{
                 name: "Empty scoop",
                 servings_count: 1,
                 recipe_ingredients: [%{portion: %{kind: :gram, grams: 0}, food_id: food.id}]
               })

      assert changeset == :invalid_portion
    end

    test "does not cast a subrecipe identity" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach)
      nested = insert(:recipe, business: coach.business, creator: coach)

      assert {:ok, recipe} =
               Library.create_recipe(trainer_ctx(coach), %{
                 name: "Stacked",
                 servings_count: 1,
                 recipe_ingredients: [
                   %{
                     portion: %{kind: :gram, grams: 100.0},
                     food_id: food.id,
                     recipe_id: nested.id
                   }
                 ]
               })

      assert hd(recipe.recipe_ingredients).food_id == food.id
      assert hd(recipe.recipe_ingredients).recipe_id == recipe.id
    end
  end

  describe("update_recipe/4") do
    test "replaces metadata and the complete ingredient collection and bumps revision" do
      coach = insert(:coach)
      kept = insert(:food, business: coach.business, creator: coach)
      added = insert(:food, business: coach.business, creator: coach)
      recipe = insert(:recipe, business: coach.business, creator: coach, servings_count: 2)

      insert(:recipe_ingredient,
        business: coach.business,
        recipe: recipe,
        food: kept,
        portion: %{kind: :gram, grams: 80.0},
        position: 0
      )

      assert {:ok, updated} =
               Library.update_recipe(trainer_ctx(coach), recipe.id, recipe.revision, %{
                 name: "New dal",
                 servings_count: 3,
                 cooked_weight_g: 600.0,
                 recipe_ingredients: [
                   %{portion: %{kind: :gram, grams: 120.0}, food_id: added.id},
                   %{portion: %{kind: :gram, grams: 40.0}, food_id: kept.id}
                 ]
               })

      assert updated.name == "New dal"
      assert updated.servings_count == 3
      assert updated.cooked_weight_g == 600.0
      assert updated.revision == recipe.revision + 1
      assert updated.creator_id == coach.id

      assert [
               %{food_id: added_id, portion: %{kind: :gram, grams: 120.0}, position: 0},
               %{food_id: kept_id, portion: %{kind: :gram, grams: 40.0}, position: 1}
             ] = updated.recipe_ingredients

      assert added_id == added.id
      assert kept_id == kept.id
    end

    test "any coach in the business can update another coach's recipe" do
      business = insert(:business)
      creator = insert(:coach, business: business)
      editor = insert(:coach, business: business)
      recipe = insert(:recipe, business: business, creator: creator)

      assert {:ok, updated} =
               Library.update_recipe(trainer_ctx(editor), recipe.id, recipe.revision, %{
                 name: "Shared rename",
                 servings_count: recipe.servings_count
               })

      assert updated.name == "Shared rename"
      assert updated.creator_id == creator.id
    end

    test "a stale expected revision returns the latest revision" do
      coach = insert(:coach)
      recipe = insert(:recipe, business: coach.business, creator: coach)
      ctx = trainer_ctx(coach)

      assert {:ok, _} =
               Library.update_recipe(ctx, recipe.id, recipe.revision, %{
                 name: "First",
                 servings_count: recipe.servings_count
               })

      assert {:error, %Ecto.Changeset{action: :stale_revision, data: %Recipe{revision: 2}}} =
               Library.update_recipe(ctx, recipe.id, recipe.revision, %{
                 name: "Second",
                 servings_count: recipe.servings_count
               })
    end

    test "does not leak another business's recipe" do
      coach = insert(:coach)
      other = insert(:coach)
      recipe = insert(:recipe, business: other.business, creator: other)

      assert {:error, :not_found} =
               Library.update_recipe(trainer_ctx(coach), recipe.id, 1, %{
                 name: "Hacked",
                 servings_count: 1
               })
    end

    test "rolls metadata and ingredients back when replacement fails" do
      coach = insert(:coach)
      other = insert(:coach)
      original_food = insert(:food, business: coach.business, creator: coach)
      hidden_food = insert(:food, business: other.business, creator: other)

      recipe =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          name: "Original",
          servings_count: 2
        )

      original_ingredient =
        insert(:recipe_ingredient,
          business: coach.business,
          recipe: recipe,
          food: original_food,
          portion: %{kind: :gram, grams: 80.0},
          position: 0
        )

      assert {:error, :not_found} =
               Library.update_recipe(trainer_ctx(coach), recipe.id, recipe.revision, %{
                 name: "Should roll back",
                 servings_count: 3,
                 recipe_ingredients: [
                   %{portion: %{kind: :gram, grams: 100.0}, food_id: hidden_food.id}
                 ]
               })

      persisted = Repo.get!(Recipe, recipe.id) |> Repo.preload(:recipe_ingredients)
      assert persisted.name == "Original"
      assert persisted.servings_count == 2
      assert persisted.revision == recipe.revision

      assert [%{id: ingredient_id, food_id: food_id, portion: %{grams: 80.0}}] =
               persisted.recipe_ingredients

      assert ingredient_id == original_ingredient.id
      assert food_id == original_food.id
    end
  end

  describe("delete_recipe/2") do
    test "deletes on the expected revision and rejects a stale one" do
      coach = insert(:coach)
      recipe = insert(:recipe, business: coach.business, creator: coach)
      ctx = trainer_ctx(coach)

      assert {:ok, _} =
               Library.update_recipe(ctx, recipe.id, 1, %{
                 name: "Kept",
                 servings_count: recipe.servings_count
               })

      assert {:ok, _} = Library.delete_recipe(ctx, recipe.id)
      refute Repo.get(Recipe, recipe.id)
    end
  end

  describe("copy_recipe/2") do
    test "duplicates a visible recipe at revision 1 with a distinguishable name" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach)

      source =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          name: "Original bowl",
          servings_count: 3,
          cooked_weight_g: 500.0
        )

      insert(:recipe_ingredient,
        business: coach.business,
        recipe: source,
        food: food,
        portion: %{kind: :gram, grams: 150.0},
        position: 0
      )

      assert {:ok, copy} = Library.copy_recipe(trainer_ctx(coach), source.id)
      assert copy.name == "Original bowl (Copy)"
      assert copy.revision == 1
      refute copy.id == source.id
      assert copy.servings_count == 3
      assert copy.cooked_weight_g == 500.0
      assert [%{food_id: food_id, portion: %{kind: :gram, grams: 150.0}, position: 0}] = copy.recipe_ingredients
      assert food_id == food.id
    end
  end

  describe("list_recipes/2") do
    test "does not list another business's recipes" do
      coach = insert(:coach)
      insert(:recipe, business: coach.business, creator: coach, name: "Ours")
      other = insert(:coach)
      insert(:recipe, business: other.business, creator: other, name: "Theirs")
      assert {:ok, %{count: 1, recipes: [recipe]}} = Library.list_recipes(trainer_ctx(coach))
      assert recipe.name == "Ours"
    end

    test "honors requested page sizes through the shared maximum" do
      coach = insert(:coach)
      insert_list(21, :recipe, business: coach.business, creator: coach)

      assert {:ok, %{count: 21, recipes: recipes}} =
               Library.list_recipes(trainer_ctx(coach), limit: 100)

      assert length(recipes) == 21
    end
  end

  describe("resolve_recipe_portion/2") do
    test "accepts a positive serving portion on every recipe" do
      recipe = insert(:recipe, servings_count: 4, cooked_weight_g: nil)

      assert {:ok, %{amount: 2.0, grams: nil}} =
               Portions.resolve_recipe(recipe, %{kind: :serving, amount: 2, unit: "serving", label: nil})
    end

    test "resolves serving grams when cooked weight exists" do
      recipe = insert(:recipe, servings_count: 4, cooked_weight_g: 800.0)

      assert {:ok, %{amount: 1.0, grams: 200.0}} =
               Portions.resolve_recipe(recipe, %{kind: :serving, amount: 1, unit: "serving", label: nil})
    end

    test "accepts a gram portion only when cooked weight exists" do
      weighed = insert(:recipe, servings_count: 2, cooked_weight_g: 400.0)
      unweighed = insert(:recipe, servings_count: 2, cooked_weight_g: nil)

      assert {:ok, %{kind: :gram, grams: 150.0}} =
               Portions.resolve_recipe(weighed, %{kind: :gram, grams: 150})

      assert {:error, :invalid_portion} =
               Portions.resolve_recipe(unweighed, %{kind: :gram, grams: 150})
    end
  end

  describe("recipe_nutrients/1") do
    test "propagates unknown canonical nutrients and keeps calculation precision" do
      coach = insert(:coach)

      complete =
        insert(:food,
          business: coach.business,
          creator: coach,
          calories_per_100g: 10.16,
          protein_g_per_100g: 2.0,
          carbs_g_per_100g: 3.0,
          fat_g_per_100g: 4.0,
          fiber_g_per_100g: 5.0
        )

      incomplete =
        insert(:food,
          business: coach.business,
          creator: coach,
          calories_per_100g: 20.0,
          protein_g_per_100g: nil,
          carbs_g_per_100g: 1.0,
          fat_g_per_100g: 1.0,
          fiber_g_per_100g: 1.0
        )

      recipe =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          recipe_ingredients: [
            build(:recipe_ingredient,
              business: coach.business,
              food: complete,
              portion: %{kind: :gram, grams: 100.0},
              position: 0
            ),
            build(:recipe_ingredient,
              business: coach.business,
              food: incomplete,
              portion: %{kind: :gram, grams: 50.0},
              position: 1
            )
          ]
        )

      {:ok, loaded} = Library.get_recipe(trainer_ctx(coach), recipe.id)
      nutrients = Library.recipe_nutrients(loaded)
      assert nutrients.calories == 20.16
      assert nutrients.protein == nil
      refute nutrients.complete
    end
  end

  describe("resolve_items/2") do
    test "resolves by source and portion regardless of input order or repetition" do
      coach = insert(:coach)

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          calories_per_100g: 100.0,
          protein_g_per_100g: 10.0,
          carbs_g_per_100g: 20.0,
          fat_g_per_100g: 5.0,
          fiber_g_per_100g: 2.0
        )

      ingredient_food =
        insert(:food,
          business: coach.business,
          creator: coach,
          calories_per_100g: 200.0,
          protein_g_per_100g: 0.0,
          carbs_g_per_100g: 0.0,
          fat_g_per_100g: 0.0,
          fiber_g_per_100g: 0.0
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
              food: ingredient_food,
              portion: %{kind: :gram, grams: 200.0},
              position: 0
            )
          ]
        )

      small = %{kind: :food, id: food.id, portion: %{kind: :gram, grams: 50}}
      large = %{small | portion: %{kind: :gram, grams: 150}}
      serving = %{kind: :recipe, id: recipe.id, portion: %{kind: :serving, amount: 1, unit: "serving", label: nil}}
      specs = [small, serving, large, small]
      assert {:ok, resolved} = Library.resolve_items(trainer_ctx(coach), specs)
      assert {:ok, ^resolved} = Library.resolve_items(trainer_ctx(coach), Enum.reverse(specs))
      assert map_size(resolved) == 3
      assert resolved[large].nutrients.calories == 150.0
      food_result = Map.fetch!(resolved, small)
      recipe_result = Map.fetch!(resolved, serving)

      assert food_result.kind == :food
      assert food_result.item.id == food.id
      assert food_result.portion.grams == 50.0
      assert food_result.nutrients.calories == 50.0
      assert food_result.nutrients.complete
      assert recipe_result.kind == :recipe
      assert recipe_result.item.id == recipe.id
      assert recipe_result.portion.amount == 1.0
      assert recipe_result.portion.grams == 200.0
      assert recipe_result.nutrients.calories == 200.0
    end

    test "does not resolve another business's recipe" do
      coach = insert(:coach)
      other = insert(:coach)
      recipe = insert(:recipe, business: other.business, creator: other)

      assert {:error, :not_found} =
               Library.resolve_items(trainer_ctx(coach), [
                 %{kind: :recipe, id: recipe.id, portion: %{kind: :serving, amount: 1, unit: "serving", label: nil}}
               ])
    end
  end
end
