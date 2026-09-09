defmodule Easy.Nutrition.RecipeTest do
  use Easy.SchemaCase, async: false
  alias Easy.Nutrition.Library
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient

  test "recipe identity is positional and its creator may be absent" do
    business = insert(:business)
    attrs = %{name: "Recipe", servings_count: 1, business_id: Ecto.UUID.generate(), creator_id: Ecto.UUID.generate()}

    assert {:ok, recipe} = business.id |> Recipe.insert_changeset(nil, attrs) |> Repo.insert()
    assert recipe.business_id == business.id
    assert recipe.creator_id == nil

    assert {:error, changeset} = nil |> Recipe.insert_changeset(nil, attrs) |> Repo.insert()
    assert errors_on(changeset).business_id == ["can't be blank"]
  end

  test "recipe parent failures return changeset errors" do
    business = insert(:business)

    for {business_id, creator_id, field} <- [
          {Ecto.UUID.generate(), nil, :business_id},
          {business.id, Ecto.UUID.generate(), :creator_id}
        ] do
      assert {:error, changeset} =
               business_id
               |> Recipe.insert_changeset(creator_id, %{name: "Recipe", servings_count: 1})
               |> Repo.insert()

      assert errors_on(changeset)[field] == ["does not exist"]
    end
  end

  test "recipe name limits count database characters on create and update" do
    recipe = insert(:recipe)
    name = String.duplicate("é", 128)

    for changeset <- [
          Recipe.insert_changeset(recipe.business_id, nil, %{name: name, servings_count: 1}),
          Recipe.update_changeset(recipe, %{name: name})
        ] do
      assert errors_on(changeset).name == ["should be at most 255 character(s)"]
    end
  end

  test "ingredient parent failures return changeset errors" do
    recipe = insert(:recipe)
    food = insert(:food, business: recipe.business)
    attrs = %{food_id: food.id, portion: %{kind: :gram, grams: 100}}

    for {business_id, recipe_id, field} <- [
          {Ecto.UUID.generate(), recipe.id, :business_id},
          {recipe.business_id, Ecto.UUID.generate(), :recipe_id}
        ] do
      assert {:error, changeset} =
               business_id |> RecipeIngredient.insert_changeset(recipe_id, 0, attrs) |> Repo.insert()

      assert errors_on(changeset)[field] == ["does not exist"]
    end
  end

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
