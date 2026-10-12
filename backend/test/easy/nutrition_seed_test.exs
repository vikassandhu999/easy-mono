defmodule Easy.NutritionSeedTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.{Food, Nutrient}
  alias Easy.Repo.Seeds.Foods

  Code.require_file("../../priv/repo/seeds/food_seeds.exs", __DIR__)

  test "seeds each tenant once and retains absent nutrients" do
    first = insert(:business)
    second = insert(:business)
    first_foods = Foods.for_business(first)
    second_foods = Foods.for_business(second)
    replay = Foods.for_business(first)

    assert first_foods["Rolled oats"].id == replay["Rolled oats"].id
    refute first_foods["Rolled oats"].id == second_foods["Rolled oats"].id
    assert first_foods["Milk, semi-skimmed"].basis == :"100ml"
    assert first_foods["Vitamin D3 2000 IU"].basis == :"1unit"
    assert first_foods["Vitamin D3 2000 IU"].kind == :supplement
    assert first_foods["Vitamin D3 2000 IU"].nutrients == %{}
    refute Map.has_key?(first_foods["Potatoes, boiled"].nutrients, "fat_g")
    assert first_foods["Creatine monohydrate"].nutrients["energy_kcal"] == 0
    assert Repo.aggregate(Food.for_business(first.id), :count) == 14
    assert Repo.aggregate(Nutrient.for_business(first.id), :count) == length(Nutrient.catalogue())
  end
end
