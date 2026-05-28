defmodule Easy.Nutrition.RecipeTest do
  use Easy.SchemaCase, async: false

  alias Easy.Nutrition.Recipe
  alias Easy.Recipes
  alias Easy.Repo

  describe "create/3" do
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

      assert {:error, changeset} = Recipes.create_recipe(coach.business_id, coach.id, attrs)
      assert "has invalid food" in errors_on(changeset).recipe_ingredients
    end
  end

  describe "with_ingredients/1" do
    test "preloads foods through association" do
      coach = insert_coach()
      food = insert(:food, business: coach.business, creator: coach)
      recipe = insert(:recipe, business: coach.business, creator: coach)
      insert(:recipe_ingredient, recipe: recipe, food: food)

      recipe =
        Recipe
        |> Recipe.for_business(coach.business_id)
        |> Recipe.with_ingredients()
        |> Repo.get!(recipe.id)

      assert Ecto.assoc_loaded?(recipe.recipe_ingredients)
      assert Ecto.assoc_loaded?(recipe.foods)
      assert [%{id: food_id}] = recipe.foods
      assert food_id == food.id
    end
  end

  defp insert_coach do
    business = insert(:business, owner: build(:user, email: unique_email()))
    insert(:coach, business: business, user: build(:user, email: unique_email()))
  end

  defp unique_email do
    "user-#{System.unique_integer([:positive])}@test.com"
  end
end
