defmodule Easy.Nutrition.RecipeTest do
  use Easy.SchemaCase, async: false

  alias Easy.Ctx
  alias Easy.Nutrition.Recipe
  alias Easy.Recipes

  describe "copy_recipe/2" do
    test "uses distinguishable names and preserves the remaining scalar fields" do
      coach = insert_coach()
      food = insert(:food, business: coach.business, creator: coach)

      source =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          allergens: ["dairy"],
          dietary_tags: ["keto"],
          recipe_ingredients: [
            build(:recipe_ingredient, business: coach.business, food: food)
          ]
        )

      assert {:ok, copy} = Recipes.copy_recipe(ctx(coach), source.id)
      assert {:ok, second_copy} = Recipes.copy_recipe(ctx(coach), copy.id)

      assert copy.name == "#{source.name} (Copy)"
      assert second_copy.name == "#{source.name} (Copy 2)"

      for field <- Recipe.scalar_fields() -- [:name] do
        assert Map.get(copy, field) == Map.get(source, field), "field #{field} not copied"
      end
    end
  end

  describe "create/2" do
    test "trims names and rejects values beyond the API limit" do
      coach = insert_coach()

      assert {:ok, recipe} =
               Recipes.create_recipe(ctx(coach), %{
                 "name" => "  Test Recipe  ",
                 "servings_count" => 1
               })

      assert recipe.name == "Test Recipe"

      assert {:error, create_blank_changeset} =
               Recipes.create_recipe(ctx(coach), %{"name" => "   ", "servings_count" => 1})

      assert "can't be blank" in errors_on(create_blank_changeset).name

      assert {:error, blank_changeset} =
               Recipes.update_recipe(ctx(coach), recipe.id, %{"name" => "   "})

      assert "can't be blank" in errors_on(blank_changeset).name

      assert {:error, changeset} =
               Recipes.create_recipe(ctx(coach), %{
                 "name" => String.duplicate("x", 256),
                 "servings_count" => 1
               })

      assert "should be at most 255 character(s)" in errors_on(changeset).name
    end

    test "rejects recipe ingredients whose food belongs to another business" do
      coach = insert_coach()
      other_coach = insert_coach()
      other_food = insert(:food, business: other_coach.business, creator: other_coach)

      attrs = %{
        "name" => "Cross tenant recipe",
        "servings_count" => 2,
        "recipe_ingredients" => [
          %{"food_id" => other_food.id, "weight_g" => 100.0}
        ]
      }

      assert {:error, changeset} = Recipes.create_recipe(ctx(coach), attrs)
      assert "has invalid food" in errors_on(changeset).recipe_ingredients
    end
  end

  defp ctx(coach), do: Ctx.new(coach.business_id, coach.user_id)

  defp insert_coach do
    business = insert(:business, owner: build(:user, email: unique_email()))
    insert(:coach, business: business, user: build(:user, email: unique_email()))
  end

  defp unique_email do
    "user-#{System.unique_integer([:positive])}@test.com"
  end
end
