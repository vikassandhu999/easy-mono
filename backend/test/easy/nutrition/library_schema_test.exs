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
end
