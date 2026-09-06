defmodule Easy.Nutrition.RecipeTest do
  use Easy.SchemaCase, async: false
  alias Easy.Nutrition.Library

  describe("copy_recipe/2") do
    test "uses distinguishable names and preserves the remaining scalar fields" do
      coach = insert_coach()
      food = insert(:food, business: coach.business, creator: coach)

      source =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          allergens: ["dairy"],
          dietary_tags: ["keto"],
          recipe_ingredients: [build(:recipe_ingredient, business: coach.business, food: food)]
        )

      assert {:ok, copy} = Library.copy_recipe(trainer_ctx(coach), source.id)
      assert {:ok, second_copy} = Library.copy_recipe(trainer_ctx(coach), copy.id)
      assert copy.name == "#{source.name} (Copy)"
      assert second_copy.name == "#{source.name} (Copy 2)"
      assert copy.description == source.description
      assert copy.instructions == source.instructions
      assert copy.servings_count == source.servings_count
      assert copy.cooked_weight_g == source.cooked_weight_g
      assert copy.allergens == source.allergens
      assert copy.dietary_tags == source.dietary_tags
    end
  end

  describe("create_recipe/2") do
    test "trims names and rejects values beyond the API limit" do
      coach = insert_coach()

      assert {:ok, recipe} =
               Library.create_recipe(trainer_ctx(coach), %{
                 name: "  Test Recipe  ",
                 servings_count: 1
               })

      assert recipe.name == "Test Recipe"

      assert {:error, create_blank_changeset} =
               Library.create_recipe(trainer_ctx(coach), %{name: "   ", servings_count: 1})

      assert "can't be blank" in errors_on(create_blank_changeset).name

      assert {:error, blank_changeset} =
               Library.update_recipe(trainer_ctx(coach), recipe.id, recipe.revision, %{
                 name: "   "
               })

      assert "can't be blank" in errors_on(blank_changeset).name

      assert {:error, changeset} =
               Library.create_recipe(trainer_ctx(coach), %{
                 name: String.duplicate("x", 256),
                 servings_count: 1
               })

      assert "should be at most 255 character(s)" in errors_on(changeset).name
    end

    test "rejects recipe ingredients whose food belongs to another business" do
      coach = insert_coach()
      other_coach = insert_coach()
      other_food = insert(:food, business: other_coach.business, creator: other_coach)

      attrs = %{
        name: "Cross tenant recipe",
        servings_count: 2,
        recipe_ingredients: [%{portion: %{kind: :gram, grams: 100.0}, food_id: other_food.id}]
      }

      assert {:error, changeset} = Library.create_recipe(trainer_ctx(coach), attrs)
      assert changeset == :not_found
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
