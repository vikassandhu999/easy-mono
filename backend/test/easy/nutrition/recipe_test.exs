defmodule Easy.Nutrition.RecipeTest do
  use Easy.SchemaCase, async: false

  alias Easy.Ctx
  alias Easy.Nutrition.Recipe
  alias Easy.Recipes

  describe "copy_recipe/2" do
    test "preserves every scalar field on the copy" do
      coach = insert_coach()
      food = insert(:food, business: coach.business, creator: coach)

      source =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          allergens: ["dairy"],
          dietary_tags: ["keto"],
          recipe_ingredients: [build(:recipe_ingredient, food: food)]
        )

      assert {:ok, copy} = Recipes.copy_recipe(ctx(coach), source.id)

      for field <- Recipe.scalar_fields() do
        assert Map.get(copy, field) == Map.get(source, field), "field #{field} not copied"
      end
    end
  end

  describe "create/2" do
    test "rejects recipe ingredients whose food belongs to another business" do
      coach = insert_coach()
      other_coach = insert_coach()
      other_food = insert(:food, business: other_coach.business, creator: other_coach)

      attrs = %{
        "name" => "Cross tenant recipe",
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
