defmodule Easy.Nutrition.LibrarySchemaTest do
  use Easy.DataCase, async: true

  alias Easy.Repo

  test "the database rejects a non-positive food revision" do
    coach = insert(:coach)

    assert_raise Postgrex.Error, fn ->
      Repo.insert_all("nutrition_foods", [food_row(coach, revision: 0)])
    end
  end

  test "the database rejects a negative canonical nutrient" do
    coach = insert(:coach)

    assert_raise Postgrex.Error, fn ->
      Repo.insert_all("nutrition_foods", [food_row(coach, calories_per_100g: -1.0)])
    end
  end

  test "the database accepts unknown canonical nutrients" do
    coach = insert(:coach)

    {1, nil} = Repo.insert_all("nutrition_foods", [food_row(coach, calories_per_100g: nil)])
  end

  test "the database rejects a non-positive recipe revision" do
    coach = insert(:coach)

    assert_raise Postgrex.Error, fn ->
      Repo.insert_all("nutrition_recipes", [recipe_row(coach, revision: 0)])
    end
  end

  test "the database rejects a non-positive cooked weight" do
    coach = insert(:coach)

    assert_raise Postgrex.Error, fn ->
      Repo.insert_all("nutrition_recipes", [recipe_row(coach, cooked_weight_g: 0.0)])
    end
  end

  test "the database rejects duplicate ingredient positions on one recipe" do
    coach = insert(:coach)
    food = insert(:food, business: coach.business, creator: coach)
    recipe = insert(:recipe, business: coach.business, creator: coach)

    assert_raise Postgrex.Error, fn ->
      Repo.insert_all("nutrition_recipe_ingredients", [
        ingredient_row(recipe, food, position: 0),
        ingredient_row(recipe, food, position: 0)
      ])
    end
  end

  defp food_row(coach, overrides) do
    now = DateTime.utc_now(:second)

    Map.merge(
      %{
        id: Ecto.UUID.dump!(Ecto.UUID.generate()),
        name: "Constraint probe",
        source: "custom",
        revision: 1,
        serving_sizes: [],
        allergens: [],
        dietary_tags: [],
        business_id: Ecto.UUID.dump!(coach.business_id),
        creator_id: Ecto.UUID.dump!(coach.id),
        inserted_at: now,
        updated_at: now
      },
      Map.new(overrides)
    )
  end

  defp recipe_row(coach, overrides) do
    now = DateTime.utc_now(:second)

    Map.merge(
      %{
        id: Ecto.UUID.dump!(Ecto.UUID.generate()),
        name: "Constraint probe",
        servings_count: 1,
        revision: 1,
        allergens: [],
        dietary_tags: [],
        business_id: Ecto.UUID.dump!(coach.business_id),
        creator_id: Ecto.UUID.dump!(coach.id),
        inserted_at: now,
        updated_at: now
      },
      Map.new(overrides)
    )
  end

  defp ingredient_row(recipe, food, overrides) do
    Map.merge(
      %{
        id: Ecto.UUID.dump!(Ecto.UUID.generate()),
        recipe_id: Ecto.UUID.dump!(recipe.id),
        food_id: Ecto.UUID.dump!(food.id),
        business_id: Ecto.UUID.dump!(recipe.business_id),
        weight_g: 50.0,
        position: 0
      },
      Map.new(overrides)
    )
  end
end
