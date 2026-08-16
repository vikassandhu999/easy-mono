defmodule Easy.Nutrition.LibraryRecipeTest do
  use Easy.SchemaCase

  alias Easy.Nutrition.Library
  alias Easy.Nutrition.Recipe
  alias Easy.Repo

  describe "create_recipe/2" do
    test "stamps business ownership, creator, and revision 1" do
      coach = insert(:coach)

      assert {:ok, recipe} =
               Library.create_recipe(trainer_ctx(coach), %{
                 name: "Dal tadka",
                 servings_count: 4
               })

      assert recipe.business_id == coach.business_id
      assert recipe.creator_id == coach.id
      assert recipe.revision == 1
      assert recipe.servings_count == 4
      assert recipe.cooked_weight_g == nil
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
                   %{food_id: first.id, weight_g: 100.0},
                   %{food_id: second.id, weight_g: 50.0}
                 ]
               })

      assert [
               %{food_id: first_id, weight_g: 100.0, position: 0},
               %{food_id: second_id, weight_g: 50.0, position: 1}
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
                 recipe_ingredients: [%{food_id: hidden.id, weight_g: 100.0}]
               })

      assert %{recipe_ingredients: ["has invalid food"]} = errors_on(changeset)
    end

    test "rejects a non-positive ingredient weight" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach)

      assert {:error, changeset} =
               Library.create_recipe(trainer_ctx(coach), %{
                 name: "Empty scoop",
                 servings_count: 1,
                 recipe_ingredients: [%{food_id: food.id, weight_g: 0}]
               })

      assert %{recipe_ingredients: [%{weight_g: _}]} = errors_on(changeset)
    end

    test "rejects a subrecipe ingredient" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach)
      nested = insert(:recipe, business: coach.business, creator: coach)

      assert {:error, changeset} =
               Library.create_recipe(trainer_ctx(coach), %{
                 name: "Stacked",
                 servings_count: 1,
                 recipe_ingredients: [%{food_id: food.id, recipe_id: nested.id, weight_g: 100.0}]
               })

      assert %{recipe_ingredients: [%{food_id: _}]} = errors_on(changeset)
    end
  end

  describe "update_recipe/4" do
    test "replaces metadata and the complete ingredient collection and bumps revision" do
      coach = insert(:coach)
      kept = insert(:food, business: coach.business, creator: coach)
      added = insert(:food, business: coach.business, creator: coach)
      recipe = insert(:recipe, business: coach.business, creator: coach, servings_count: 2)

      insert(:recipe_ingredient,
        business: coach.business,
        recipe: recipe,
        food: kept,
        weight_g: 80.0,
        position: 0
      )

      assert {:ok, updated} =
               Library.update_recipe(trainer_ctx(coach), recipe.id, recipe.revision, %{
                 name: "New dal",
                 servings_count: 3,
                 cooked_weight_g: 600.0,
                 recipe_ingredients: [
                   %{food_id: added.id, weight_g: 120.0},
                   %{food_id: kept.id, weight_g: 40.0}
                 ]
               })

      assert updated.name == "New dal"
      assert updated.servings_count == 3
      assert updated.cooked_weight_g == 600.0
      assert updated.revision == recipe.revision + 1
      assert updated.creator_id == coach.id

      assert [
               %{food_id: added_id, weight_g: 120.0, position: 0},
               %{food_id: kept_id, weight_g: 40.0, position: 1}
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
  end

  describe "delete_recipe/3" do
    test "deletes on the expected revision and rejects a stale one" do
      coach = insert(:coach)
      recipe = insert(:recipe, business: coach.business, creator: coach)
      ctx = trainer_ctx(coach)

      assert {:ok, _} =
               Library.update_recipe(ctx, recipe.id, 1, %{
                 name: "Kept",
                 servings_count: recipe.servings_count
               })

      assert {:error, %Ecto.Changeset{action: :stale_revision, data: %Recipe{revision: 2}}} =
               Library.delete_recipe(ctx, recipe.id, 1)

      assert {:ok, _} = Library.delete_recipe(ctx, recipe.id, 2)
      refute Repo.get(Recipe, recipe.id)
    end
  end

  describe "copy_recipe/2" do
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
        weight_g: 150.0,
        position: 0
      )

      assert {:ok, copy} = Library.copy_recipe(trainer_ctx(coach), source.id)
      assert copy.name == "Original bowl (Copy)"
      assert copy.revision == 1
      refute copy.id == source.id
      assert copy.servings_count == 3
      assert copy.cooked_weight_g == 500.0
      assert [%{food_id: food_id, weight_g: 150.0, position: 0}] = copy.recipe_ingredients
      assert food_id == food.id
    end
  end

  describe "list_recipes/2" do
    test "does not list another business's recipes" do
      coach = insert(:coach)
      insert(:recipe, business: coach.business, creator: coach, name: "Ours")
      other = insert(:coach)
      insert(:recipe, business: other.business, creator: other, name: "Theirs")

      assert {:ok, %{count: 1, recipes: [recipe]}} = Library.list_recipes(trainer_ctx(coach))
      assert recipe.name == "Ours"
    end
  end

  describe "resolve_recipe_portion/2" do
    test "accepts a positive serving portion on every recipe" do
      recipe = insert(:recipe, servings_count: 4, cooked_weight_g: nil)

      assert {:ok, %{amount: 2.0, grams: nil}} =
               Library.resolve_recipe_portion(recipe, %{kind: :serving, amount: 2})
    end

    test "resolves serving grams when cooked weight exists" do
      recipe = insert(:recipe, servings_count: 4, cooked_weight_g: 800.0)

      assert {:ok, %{amount: 1.0, grams: 200.0}} =
               Library.resolve_recipe_portion(recipe, %{kind: :serving, amount: 1})
    end

    test "accepts a gram portion only when cooked weight exists" do
      weighed = insert(:recipe, servings_count: 2, cooked_weight_g: 400.0)
      unweighed = insert(:recipe, servings_count: 2, cooked_weight_g: nil)

      assert {:ok, %{grams: 150.0, amount: nil}} =
               Library.resolve_recipe_portion(weighed, %{kind: :gram, grams: 150})

      assert {:error, :invalid_portion} =
               Library.resolve_recipe_portion(unweighed, %{kind: :gram, grams: 150})
    end
  end

  describe "recipe_nutrients/1" do
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
            build(:recipe_ingredient, business: coach.business, food: complete, weight_g: 100.0, position: 0),
            build(:recipe_ingredient, business: coach.business, food: incomplete, weight_g: 50.0, position: 1)
          ]
        )

      {:ok, loaded} = Library.get_recipe(trainer_ctx(coach), recipe.id)
      nutrients = Library.recipe_nutrients(loaded)

      # 10.16 from 100g + 10.0 from 50g of the 20 cal/100g food
      assert nutrients.calories == 20.16
      assert nutrients.protein == nil
      refute nutrients.complete
    end
  end

  describe "resolve_items/2" do
    test "returns food and recipe results in input identity order" do
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
              weight_g: 200.0,
              position: 0
            )
          ]
        )

      assert {:ok, [food_result, recipe_result]} =
               Library.resolve_items(trainer_ctx(coach), [
                 %{kind: :food, id: food.id, portion: %{kind: :gram, grams: 50}},
                 %{kind: :recipe, id: recipe.id, portion: %{kind: :serving, amount: 1}}
               ])

      assert food_result.kind == :food
      assert food_result.item.id == food.id
      assert food_result.portion.grams == 50.0
      assert food_result.nutrients.calories == 50.0
      assert food_result.nutrients.complete

      assert recipe_result.kind == :recipe
      assert recipe_result.item.id == recipe.id
      assert recipe_result.portion.amount == 1.0
      assert recipe_result.portion.grams == 200.0
      # whole recipe is 400 cal from 200g at 200 cal/100g; one of two servings is 200
      assert recipe_result.nutrients.calories == 200.0
    end

    test "does not resolve another business's recipe" do
      coach = insert(:coach)
      other = insert(:coach)
      recipe = insert(:recipe, business: other.business, creator: other)

      assert {:error, :not_found} =
               Library.resolve_items(trainer_ctx(coach), [
                 %{kind: :recipe, id: recipe.id, portion: %{kind: :serving, amount: 1}}
               ])
    end
  end
end
